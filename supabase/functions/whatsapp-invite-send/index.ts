// whatsapp-invite-send: sends the approved template `supplier_invite` from the Taseerak Cloud API
// number to a list of shops. Admin only (caller's JWT + is_admin()). Legal rules live in the DB
// (migration 200, invite_reserve_send): permanent suppression, one invitation per number ever,
// 50 per Riyadh day. Never sends without the owner's $ approval for the batch: the caller must pass
// approved_usd >= rows × PRICE_PER_INVITE_USD. dry_run lists who would be sent to, sending nothing.
// Body: { rows: [{ phone, shop_name, lang? }], dry_run?: boolean, approved_usd?: number }
// Secrets: WA_INVITE_TOKEN, WA_INVITE_PHONE_NUMBER_ID. Optional: INVITE_TEMPLATE (supplier_invite),
// INVITE_ASSET_BASE (https://taseerak.vercel.app), PRICE_PER_INVITE_USD (0.06), WA_GRAPH_VERSION.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = Deno.env.get('WA_GRAPH_VERSION') || 'v21.0'
const TEMPLATE = Deno.env.get('INVITE_TEMPLATE') || 'supplier_invite'
const ASSET_BASE = Deno.env.get('INVITE_ASSET_BASE') || 'https://taseerak.vercel.app'
const PRICE = Number(Deno.env.get('PRICE_PER_INVITE_USD') || '0.06')
const MAX_ROWS = 50
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  try {
    const auth = req.headers.get('Authorization') || ''
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const { data: { user } } = await asUser.auth.getUser()
    const { data: isAdmin } = await asUser.rpc('is_admin')
    if (!user || isAdmin !== true) return json({ error: 'admin_only' }, 403)

    const body = await req.json().catch(() => ({}))
    const dryRun = body?.dry_run !== false
    const rows: any[] = Array.isArray(body?.rows) ? body.rows.slice(0, MAX_ROWS) : []
    if (!rows.length) return json({ error: 'no_rows' }, 400)
    const estimate = +(rows.length * PRICE).toFixed(2)
    if (!dryRun && !(Number(body?.approved_usd) >= estimate)) return json({ error: 'approval_needed', estimate_usd: estimate }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const token = Deno.env.get('WA_INVITE_TOKEN'), phoneId = Deno.env.get('WA_INVITE_PHONE_NUMBER_ID')
    if (!dryRun && (!token || !phoneId)) return json({ error: 'wa_secrets_missing' }, 400)

    const results: any[] = []
    const seen = new Set<string>()
    let ok = 0
    for (const r of rows) {
      const phone = toE164(r?.phone)
      const shop = String(r?.shop_name || '').replace(/\s+/g, ' ').trim().slice(0, 60)
      const lang = ['ar', 'en', 'ur'].includes(r?.lang) ? r.lang : 'ar'
      if (!shop) { results.push({ phone, status: 'skipped', reason: 'no_shop_name' }); continue }
      if (seen.has(phone)) { results.push({ phone, status: 'skipped', reason: 'duplicate_in_list' }); continue }
      seen.add(phone)

      // Same checks as a real send; in a dry run the daily cap counts this batch too.
      const { data: id, error } = await sb.rpc('invite_reserve_send', { p_phone: phone, p_shop: shop, p_lang: lang, p_by: user.id, p_check_only: dryRun, p_daily_cap: dryRun ? 50 - ok : 50 })
      if (error) { results.push({ phone, shop, status: 'skipped', reason: reasonOf(error.message) }); continue }
      if (dryRun) { ok++; results.push({ phone, shop, lang, status: 'would_send' }); continue }

      const res = await fetch(`https://graph.facebook.com/${GRAPH}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: phone, type: 'template',
          template: {
            name: TEMPLATE, language: { code: lang },
            components: [
              { type: 'header', parameters: [{ type: 'image', image: { link: `${ASSET_BASE}/invite/assets/poster-${lang}.png` } }] },
              { type: 'body', parameters: [{ type: 'text', text: shop }] },
            ],
          },
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (res.ok && out?.messages?.[0]?.id) {
        ok++
        await sb.from('invite_sends').update({ status: 'sent', wa_message_id: out.messages[0].id }).eq('id', id)
        // Opens the chat for the reply bot; never overwrites an existing stage.
        await sb.from('invite_chats').upsert({ phone, shop_name: shop, lang, stage: 'invited' }, { onConflict: 'phone', ignoreDuplicates: true })
        results.push({ phone, shop, status: 'sent' })
      } else {
        const err = String(out?.error?.message || res.status).slice(0, 300)
        await sb.from('invite_sends').update({ status: 'failed', error: err }).eq('id', id)
        results.push({ phone, shop, status: 'failed', reason: err })
      }
      await new Promise((r) => setTimeout(r, 400))
    }
    return json({ dry_run: dryRun, estimate_usd: estimate, count: ok, results })
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500)
  }
})

function toE164(v: unknown) {
  let d = String(v || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('05') && d.length === 10) d = '966' + d.slice(1)
  if (d.startsWith('5') && d.length === 9) d = '966' + d
  return d
}
function reasonOf(msg: string) {
  for (const k of ['suppressed', 'already_invited', 'daily_cap', 'bad_phone']) if (msg.includes(k)) return k
  return msg.slice(0, 120)
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
