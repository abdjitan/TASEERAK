// Menu badges beside «الرسائل» (round-7 UX-099, UX-244): the same counts the app shows on its tabs.
// - buyer «طلباتي وصفقاتي» (/contractor/rfqs): open requests that received an offer (they wait for a
//   choice) + deals waiting on the buyer (confirm receipt, then pay).
// - seller «الرئيسية» (/supplier/dashboard): matching open requests not priced yet.
// - seller «عروضي وصفقاتي» (/supplier/deals): offers with an open discount request or an unanswered
//   question + (owner only) deals to deliver or whose payment to confirm.
// - «الدعم» (/support): replies from the Taseerak team not read yet.
// Every page renders its own AppShell, so the counts sit in a module cache for 60 seconds.
import { dealStage } from '@/lib/dealStage'
import { offerNeedsSupplier } from '@/lib/sellers'

export type NavBadges = Record<string, number>

const cache: { uid: string; role: string; at: number; data: NavBadges } = { uid: '', role: '', at: 0, data: {} }
const TTL = 60_000

export function cachedNavBadges(uid: string | undefined, role: string | null): NavBadges | null {
  if (!uid || !role || cache.uid !== uid || cache.role !== role) return null
  return cache.data
}

/** Forget the cache (after reading the support thread, for example) so the next read is fresh. */
export function invalidateNavBadges() { cache.at = 0 }

function expired(iso?: string | null): boolean {
  return !!iso && new Date(iso).getTime() < Date.now()
}

async function supportUnread(supabase: any, uid: string): Promise<number> {
  const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true })
    .eq('user_id', uid).eq('sender', 'admin').eq('read_by_user', false)
  return count || 0
}

async function buyerCounts(supabase: any, uid: string): Promise<NavBadges> {
  const [{ data: rfqs }, { data: deals }, support] = await Promise.all([
    supabase.from('rfqs').select('id, offer_count').eq('contractor_id', uid).eq('status', 'open').gt('offer_count', 0).limit(200),
    // RLS returns only accepted offers on this buyer's requests
    supabase.from('offers').select('*, rfq:rfqs!inner(contractor_id)')
      .eq('status', 'accepted').eq('rfq.contractor_id', uid).limit(200),
    supportUnread(supabase, uid),
  ])
  const toAct = (deals || []).filter((d: any) => { const k = dealStage(d).key; return k === 'delivered' || k === 'received' }).length
  return { '/contractor/rfqs': (rfqs || []).length + toAct, '/support': support }
}

async function supplierCounts(supabase: any, uid: string): Promise<NavBadges> {
  const { data: acting } = await supabase.rpc('acting_uid')
  const actId = String(acting || uid)
  const isMember = actId !== uid
  const [{ data: secRows }, { data: specRows }, { data: dismissals }, { data: offers }, support] = await Promise.all([
    supabase.from('profile_sectors').select('sector').eq('profile_id', actId),
    supabase.from('profile_specialties').select('specialty').eq('profile_id', actId),
    supabase.from('rfq_dismissals').select('rfq_id').eq('supplier_id', actId),
    supabase.from('offers').select('*, rfq:rfqs(status)')
      .eq('supplier_id', actId).order('created_at', { ascending: false }).limit(200),
    supportUnread(supabase, uid),
  ])
  const sectors: string[] = (secRows || []).map((r: any) => r.sector)
  const specs: string[] = (specRows || []).map((r: any) => r.specialty)
  const { data: feed } = await supabase.rpc('get_supplier_feed', { p_sectors: sectors.length ? sectors : null, p_min_value: 0, p_limit: 150 })
  const offered = new Set((offers || []).map((o: any) => o.rfq_id))
  const dismissed = new Set((dismissals || []).map((d: any) => d.rfq_id))
  const toPrice = (feed || []).filter((r: any) => {
    if (offered.has(r.id) || dismissed.has(r.id) || expired(r.expires_at)) return false
    const its = Array.isArray(r.items) && r.items.length ? r.items : [{ sector: r.sector, sub_category: r.sub_category }]
    return its.some((it: any) => (!sectors.length || sectors.includes(it.sector)) && (!specs.length || !it.sub_category || specs.includes(it.sub_category)))
  }).length
  const toReply = (offers || []).filter((o: any) => offerNeedsSupplier(o)).length
    + (isMember ? 0 : (offers || []).filter((o: any) => {
      if (o.status !== 'accepted') return false
      const st = dealStage(o, 'supplier')
      return st.key === 'accepted' || (st.key === 'paid' && !st.done)
    }).length)
  return { '/supplier/dashboard': toPrice, '/supplier/deals': toReply, '/support': support }
}

/** The badge counts for this role; a failed read keeps the last counts instead of showing zero. */
export async function fetchNavBadges(supabase: any, uid: string, role: string | null, force = false): Promise<NavBadges> {
  if (!role || role === 'admin') return {}
  if (!force && cache.uid === uid && cache.role === role && Date.now() - cache.at < TTL) return cache.data
  try {
    const data = role === 'supplier' ? await supplierCounts(supabase, uid) : await buyerCounts(supabase, uid)
    Object.assign(cache, { uid, role, at: Date.now(), data })
    return data
  } catch {
    return cache.uid === uid ? cache.data : {}
  }
}
