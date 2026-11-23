'use client'

import RequestsTabs from '@/components/buyer/RequestsTabs'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { getNav } from '@/lib/nav'
import { getProductLabel, getUnitLabelLong } from '@/types'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { rfqRef, rfqDate, rfqDesc } from '@/lib/rfqName'
import { storedBuyerType } from '@/lib/buyerType'
import { cleanArName } from '@/lib/displayName'
import { formatTimeLeft, deadlineUrgency, urgencyStyle, rfqPurgeInfo } from '@/lib/deadline'
import Glyph from '@/components/shared/Glyph'
import { arCount, arOffers, arRequests, countLabel } from '@/lib/text'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { askConfirm } from '@/lib/askConfirm'
import { rfqState, rfqStatusLabel, rfqStateTone, type RfqState } from '@/lib/rfqState'
import { dealStage } from '@/lib/dealStage'
import { offerComparable, lineComparable, sarLabel } from '@/lib/vat'
import { fileHref } from '@/lib/fileHref'

// «طلباتي»: every request of the buyer with its details — reference, date, materials (with
// pictures), offers received, deadline and status — filterable and searchable; a card opens the
// request page with its offers.

// «cancelled» (owner 2026-10-27): requests the buyer cancelled, kept apart to review or re-request.
// «choose» (UX-020): still open, the pricing deadline passed, and offers are waiting for the buyer's
// choice (they stay choosable for 30 days), so it is not «ended» and shows no deletion date.
type Filter = 'all' | 'choose' | 'open' | 'closed' | 'ended' | 'cancelled'
type State = Exclude<Filter, 'all'>

export default function MyRequestsPage() {
  return <Suspense fallback={<PageLoader />}><MyRequests /></Suspense>
}

function MyRequests() {
  const { locale, dir } = useTranslation()
  const params = useSearchParams()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const home = storedBuyerType() === 'individual'
  const pname = (n: any) => (home && locale === 'ar' ? cleanArName(String(n || '')) : getProductLabel(n, locale))
  const [loading, setLoading] = useState(true)
  const [rfqs, setRfqs] = useState<any[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  // ?filter= and ?q= open the list already narrowed (links from the home page and the deals list)
  const [filter, setFilter] = useState<Filter>(() => {
    const f = params.get('filter') || ''
    return (['all', 'choose', 'open', 'closed', 'ended', 'cancelled'] as string[]).includes(f) ? (f as Filter) : 'all'
  })
  const [q, setQ] = useState(() => params.get('q') || '')
  // offers on requests still waiting for a choice (lowest price on the card, UX-003) and the
  // accepted offers of chosen requests (deal in progress / completed, UX-048)
  const [offersBy, setOffersBy] = useState<Record<string, any[]>>({})
  const [dealsBy, setDealsBy] = useState<Record<string, any[]>>({})
  const [deleting, setDeleting] = useState(false)
  // select mode: tick requests (or all shown) and cancel them in one go
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [cancelling, setCancelling] = useState(false)
  // result of a bulk action, shown in a bar above the list (was alert(), UX-105/149)
  const [status, setStatus] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoadFailed(false)
    let shown = false
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { window.location.href = '/login?next=/contractor/rfqs'; return }
      // show the last list at once (page cache), then refresh it below
      const snap = readPageCache('rfqs_' + session.user.id)
      if (snap) { setRfqs(snap); setLoading(false); shown = true } else setLoading(true)
      const { data, error } = await sb.from('rfqs').select('*, rfq_item_awards(count)').eq('contractor_id', session.user.id).order('created_at', { ascending: false }).limit(300)
      if (error) throw error
      setRfqs(data || [])
      writePageCache('rfqs_' + session.user.id, data || [])
      try {
        const list: any[] = data || []
        const waiting = list.filter((r: any) => r.status === 'open' && Number(r.offer_count) > 0).map((r: any) => r.id).slice(0, 80)
        const closed = list.filter((r: any) => r.status === 'closed').map((r: any) => r.id).slice(0, 120)
        const [offs, acc] = await Promise.all([
          waiting.length ? sb.from('offers').select('rfq_id, status, total_price, vat_included, vat_status, item_prices').in('rfq_id', waiting) : Promise.resolve({ data: [] } as any),
          closed.length ? sb.from('offers').select('id, rfq_id, supplier_delivered_at, received_at, payment_status, payment_confirmed_at, dispute_status').in('rfq_id', closed).eq('status', 'accepted') : Promise.resolve({ data: [] } as any),
        ])
        const om: Record<string, any[]> = {}
        for (const o of (offs?.data || [])) if (!['rejected', 'withdrawn', 'cancelled'].includes(o.status)) (om[o.rfq_id] ||= []).push(o)
        const dm: Record<string, any[]> = {}
        for (const o of (acc?.data || [])) (dm[o.rfq_id] ||= []).push(o)
        setOffersBy(om); setDealsBy(dm)
      } catch (e) { console.warn('[contractor/rfqs] offers summary failed:', e) }
    } catch (e) {
      console.error('[contractor/rfqs] load failed:', e)
      if (!shown) setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const offersOf = (r: any) => Number(r?.offer_count || 0)
  // the shared reading of a request (src/lib/rfqState.ts, UX-003). A request the housekeeping job
  // set to «expired» (30 days after the deadline) can no longer be chosen from, so it is ended.
  const rstate = (r: any): RfqState => (r.status === 'expired' ? 'expired_empty' : rfqState(r))
  const stateOf = (r: any): State => {
    const s = rstate(r)
    return s === 'cancelled' ? 'cancelled' : s === 'closed' ? 'closed' : s === 'offers_expired' ? 'choose' : s === 'expired_empty' ? 'ended' : 'open'
  }
  // every accepted deal of a chosen request is paid and confirmed (UX-048)
  const dealDoneOf = (r: any) => { const d = dealsBy[r.id] || []; return d.length > 0 && d.every((o: any) => dealStage(o).done) }
  const sar = (n: number) => `${Math.round(n).toLocaleString('en-US')} ${sarLabel(locale)}`
  // «أقل سعر» for one material, «أفضل مجموع» for several, or «سُعّرت k من n» (UX-003)
  function bestLine(r: any, items: any[]): string {
    const offs = offersBy[r.id] || []
    if (!offs.length) return ''
    const n = Math.max(1, items.length)
    if (n === 1) {
      const min = Math.min(...offs.map(offerComparable).filter((x: number) => x > 0))
      return isFinite(min) ? L(`Lowest price: ${sar(min)}`, `کم ترین قیمت: ${sar(min)}`, `أقل سعر: ${sar(min)}`) : ''
    }
    const priced = new Set<number>()
    let best = Infinity
    for (const o of offs) {
      const list = (Array.isArray(o.item_prices) ? o.item_prices : []).filter((e: any) => Number(e?.total) > 0)
      list.forEach((e: any, i: number) => priced.add(Number.isInteger(e.item_index) ? e.item_index : i))
      if (list.length >= n) { const tot = list.reduce((sum: number, e: any) => sum + lineComparable(e.total, o), 0); if (tot > 0 && tot < best) best = tot }
    }
    if (isFinite(best)) return L(`Best total: ${sar(best)}`, `بہترین کل: ${sar(best)}`, `أفضل مجموع: ${sar(best)}`)
    const k = Math.min(priced.size, n)
    return k ? L(`${k} of ${n} items priced`, `${n} میں سے ${k} اشیاء کی قیمت آئی`, `سُعّرت ${k} من ${n}`) : ''
  }
  // a request with a selected material, or offers still to choose from, gets no deletion date (192, UX-020)
  const purgeOf = (r: any) => (Number(r?.rfq_item_awards?.[0]?.count) > 0 || stateOf(r) === 'choose' ? null : rfqPurgeInfo(r, locale))

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, choose: 0, open: 0, closed: 0, ended: 0, cancelled: 0 }
    for (const r of rfqs) { const s = stateOf(r); c[s]++; if (s !== 'cancelled') c.all++ }
    return c
  }, [rfqs]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = rfqs.filter(r => {
    if (filter === 'all' ? stateOf(r) === 'cancelled' : stateOf(r) !== filter) return false
    const t = q.trim().toLowerCase()
    if (!t) return true
    const items = Array.isArray(r.items) ? r.items : []
    const has = (v: any) => String(v || '').toLowerCase().includes(t)
    return has(rfqRef(r)) || has(rfqRef(r, locale)) || has(r.ref_no) || has(r.title) || has(r.product_name)
      || items.some((it: any) => has(it.product_name) || has(getProductLabel(it.product_name, locale)))
  })

  // Delete every ended request at once. A request with an accepted offer or an awarded item is a
  // deal and is kept. Offers the buyer never chose are named in the confirmation (UX-020).
  async function deleteEnded() {
    const ended = rfqs.filter(r => stateOf(r) === 'ended')
    if (!ended.length) return
    setStatus(null)
    const withOffers = ended.filter(r => offersOf(r) > 0).length
    const base = L(`Delete all ${ended.length} ended requests? This cannot be undone.`, `تمام ${ended.length} ختم شدہ درخواستیں حذف کریں؟ یہ واپس نہیں ہو سکتا۔`,
      `حذف كل الطلبات المنتهية (${ended.length})؟ لا يمكن التراجع عن ذلك.`)
    const warn = withOffers ? '\n' + L(`${withOffers} of them have offers you did not choose; their offers and conversations will be deleted permanently.`,
      `ان میں سے ${withOffers} میں ایسی آفرز ہیں جو آپ نے منتخب نہیں کیں؛ ان کی آفرز اور گفتگو ہمیشہ کے لیے حذف ہو جائیں گی۔`,
      `منها ${arCount(withOffers, 'طلب واحد فيه', 'طلبان فيهما', 'طلبات فيها', 'طلباً فيها')} عروض لم تخترها، وستُحذف عروضها ومحادثاتها نهائياً.`) : ''
    if (!(await askConfirm(base + warn, { danger: true, okLabel: L('Delete permanently', 'ہمیشہ کے لیے حذف کریں', 'حذف نهائياً'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setDeleting(true)
    const sb = createClient()
    const ids = ended.map(r => r.id)
    const [{ data: acc }, { data: aw }] = await Promise.all([
      sb.from('offers').select('rfq_id').in('rfq_id', ids).eq('status', 'accepted'),
      sb.from('rfq_item_awards').select('rfq_id').in('rfq_id', ids),
    ])
    const keep = new Set([...(acc || []), ...(aw || [])].map((x: any) => x.rfq_id))
    const go = ids.filter(id => !keep.has(id))
    // all at once (was one by one); each result is checked so a failure is reported, not hidden
    const res = await Promise.all(go.map(id => sb.rpc('delete_rfq', { p_rfq_id: id }).then(({ error }: any) => !error, () => false)))
    const gone = go.filter((_, k) => res[k])
    const failed = go.length - gone.length
    setRfqs(prev => prev.filter(r => !gone.includes(r.id)))
    setDeleting(false)
    const kept = keep.size
    const parts: string[] = []
    if (gone.length) parts.push(L(`${gone.length} request(s) deleted.`, `${gone.length} درخواستیں حذف ہو گئیں۔`, `حُذف ${arRequests(gone.length)}.`))
    if (kept) parts.push(L(`${kept} request(s) were kept because they have a deal.`, `${kept} درخواستیں رکھی گئیں کیونکہ ان میں سودا ہو چکا ہے۔`, `أُبقي ${arRequests(kept)} لأنها تتضمّن صفقة.`))
    if (failed) parts.push(L(`${failed} request(s) could not be deleted. Check your connection and try again.`, `${failed} درخواستیں حذف نہیں ہو سکیں۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔`, `تعذّر حذف ${arRequests(failed)}. تحقّق من الاتصال وحاول مرة أخرى.`))
    if (parts.length) setStatus({ tone: failed ? 'err' : kept ? 'warn' : 'ok', text: parts.join(' ') })
  }

  // a request can be cancelled unless it's already a deal (closed / accepted offer / awarded item)
  const cancellable = (r: any) => ['open', 'ended', 'choose'].includes(stateOf(r))
  function toggle(id: string) { setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  async function cancelSelected() {
    const pick = rfqs.filter(r => sel.has(r.id) && cancellable(r))
    if (!pick.length) return
    setStatus(null)
    const one = pick.length === 1
    if (!(await askConfirm(L(`Cancel ${one ? 'the selected request' : `${pick.length} requests`}? Cancelling stops new offers; the request stays in your history under «Cancelled», where you can review it or request it again.`,
      `${one ? 'منتخب درخواست' : `${pick.length} درخواستیں`} منسوخ کریں؟ منسوخی سے نئی آفرز بند ہو جاتی ہیں؛ درخواست «منسوخ» میں محفوظ رہتی ہے۔`,
      `إلغاء ${one ? 'الطلب المحدد' : arRequests(pick.length)}؟ الإلغاء يوقف استقبال العروض، ويبقى الطلب في سجلك ضمن «الملغاة» ويمكنك مراجعته أو طلبه مرة أخرى.`),
      { danger: true, okLabel: one ? L('Yes, cancel the request', 'ہاں، درخواست منسوخ کریں', 'نعم، ألغِ الطلب') : L('Yes, cancel the requests', 'ہاں، درخواستیں منسوخ کریں', 'نعم، ألغِ الطلبات'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setCancelling(true)
    const sb = createClient()
    const ids = pick.map(r => r.id)
    const [{ data: acc }, { data: aw }] = await Promise.all([
      sb.from('offers').select('rfq_id').in('rfq_id', ids).eq('status', 'accepted'),
      sb.from('rfq_item_awards').select('rfq_id').in('rfq_id', ids),
    ])
    const keep = new Set([...(acc || []), ...(aw || [])].map((x: any) => x.rfq_id))
    const go = ids.filter(id => !keep.has(id))
    const { error } = go.length ? await sb.from('rfqs').update({ status: 'cancelled' }).in('id', go) : { error: null }
    setCancelling(false)
    if (error) { setStatus({ tone: 'err', text: L('Could not cancel. Check your connection and try again.', 'منسوخ نہیں ہو سکا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر الإلغاء. تحقّق من الاتصال وحاول مرة أخرى.') }); return }
    setRfqs(prev => prev.map(r => go.includes(r.id) ? { ...r, status: 'cancelled' } : r))
    setSel(new Set()); setSelecting(false)
    const parts: string[] = []
    if (go.length) parts.push(L(`${go.length} request(s) cancelled. You will find them under «Cancelled».`, `${go.length} درخواستیں منسوخ ہو گئیں، «منسوخ» میں دیکھیں۔`, `أُلغي ${arRequests(go.length)}، وتجدها ضمن «الملغاة».`))
    if (keep.size) parts.push(L(`${keep.size} request(s) were kept because they have a deal.`, `${keep.size} درخواستیں رکھی گئیں کیونکہ ان میں سودا ہو چکا ہے۔`, `أُبقي ${arRequests(keep.size)} لأنها تتضمّن صفقة.`))
    if (parts.length) setStatus({ tone: keep.size ? 'warn' : 'ok', text: parts.join(' ') })
  }

  // one status name and colour per request, the same on every buyer screen (UX-048): gold = waits
  // for the buyer, navy = running, green = completed, neutral = ended; never red
  const badge = (r: any) => {
    const s = rstate(r)
    const done = s === 'closed' && dealDoneOf(r)
    const tone = rfqStateTone(s, done)
    return { t: rfqStatusLabel(r.status === 'expired' ? { ...r, offer_count: 0 } : r, locale, { dealDone: done }), bg: tone.bg, fg: tone.fg }
  }

  if (loading) return <PageLoader />

  const tabs: [Filter, string][] = [
    ['all', L('All', 'سب', 'الكل')],
    ...(counts.choose > 0 ? [['choose', L('Waiting for your choice', 'آپ کے انتخاب کی منتظر', 'بانتظار اختيارك')] as [Filter, string]] : []),
    ['open', L('Open', 'کھلی', 'مفتوحة')],
    ['closed', L('Deals', 'ڈیلز', 'الصفقات')],
    ['ended', L('Ended', 'ختم', 'منتهية')],
    ['cancelled', L('Cancelled', 'منسوخ', 'الملغاة')],
  ]
  const selectable = shown.filter(cancellable)
  const showBulk = filter !== 'cancelled' && filter !== 'closed' && selectable.length > 0
  const showDeleteEnded = filter === 'ended' && counts.ended > 0

  return (
    <AppShell title={L('My requests', 'میری درخواستیں', 'طلباتي')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-5xl mx-auto space-y-3">
        {/* row 1: the requests/deals tabs and the main action (UX-105) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <RequestsTabs active="requests" locale={locale} />
          <Link href="/contractor/rfq/quick" className="btn-orange mb-4 inline-flex items-center min-h-[44px] px-4 rounded-xl font-bold text-sm">+ {L('New request', 'نئی درخواست', 'طلب جديد')}</Link>
        </div>
        {/* row 2: search */}
        <input value={q} onChange={e => setQ(e.target.value)} className="input-field w-full text-base sm:text-sm" type="search"
          aria-label={L('Search requests', 'درخواستیں تلاش کریں', 'البحث في الطلبات')}
          placeholder={L('Search by request number or material…', 'درخواست نمبر یا سامان سے تلاش…', 'ابحث برقم الطلب أو المادة…')} />
        {/* row 3: filters (scrollable) and the bulk tools */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setFilter(k); setSel(new Set()); setStatus(null) }} aria-pressed={filter === k}
              className={`shrink-0 min-h-[44px] px-3.5 rounded-xl text-sm font-bold border transition-all ${filter === k ? 'text-white border-transparent' : k === 'choose' ? 'bg-[#D4A543]/15 border-[#D4A543]/50 text-[#071827]' : 'bg-white border-gray-200 text-gray-600'}`}
              style={filter === k ? { background: '#0B2438' } : undefined}>
              {label} <span className="opacity-70">({counts[k]})</span>
            </button>
          ))}
        </div>
        {showDeleteEnded || showBulk ? (
          <div className="flex items-center gap-2 flex-wrap">
            {showDeleteEnded && (
              <button type="button" onClick={deleteEnded} disabled={deleting}
                className="min-h-[44px] px-3.5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50">
                <Glyph e="🗑" /> {deleting ? L('Deleting…', 'حذف ہو رہا ہے…', 'جارٍ الحذف…') : L(`Delete all ended (${counts.ended})`, `تمام ختم شدہ حذف کریں (${counts.ended})`, `حذف كل المنتهية (${counts.ended})`)}
              </button>
            )}
            {showBulk && (!selecting ? (
              <button type="button" onClick={() => setSelecting(true)}
                className="min-h-[44px] px-3.5 rounded-xl text-sm font-bold border border-gray-200 bg-white text-gray-700 hover:border-[#0B2438]">
                {L('Select to cancel', 'منسوخی کے لیے منتخب کریں', 'تحديد للإلغاء')}
              </button>
            ) : (<>
              <button type="button" onClick={() => setSel(prev => prev.size === selectable.length ? new Set() : new Set(selectable.map(r => r.id)))}
                className="min-h-[44px] px-3.5 rounded-xl text-sm font-bold border border-gray-200 bg-white text-gray-700">
                {sel.size === selectable.length ? L('Clear all', 'سب ہٹائیں', 'إلغاء التحديد') : L('Select all', 'سب منتخب', 'تحديد الكل')}
              </button>
              <button type="button" onClick={cancelSelected} disabled={!sel.size || cancelling}
                className="min-h-[44px] px-3.5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40">
                {cancelling ? L('Cancelling…', 'منسوخ ہو رہا ہے…', 'جارٍ الإلغاء…') : L(`Cancel selected requests (${sel.size})`, `منتخب درخواستیں منسوخ کریں (${sel.size})`, `إلغاء الطلبات المحددة (${sel.size})`)}
              </button>
              <button type="button" onClick={() => { setSelecting(false); setSel(new Set()) }} className="min-h-[44px] px-3 text-sm font-bold text-gray-600 hover:underline">
                {L('Done', 'ختم', 'تم')}
              </button>
            </>))}
          </div>
        ) : null}

        {status && (
          <div role="status" className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm ${status.tone === 'err' ? 'bg-red-50 border-red-200 text-red-800' : status.tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <span>{status.text}</span>
            <button type="button" onClick={() => setStatus(null)} aria-label={L('Close', 'بند کریں', 'إغلاق')} className="shrink-0 min-w-[44px] min-h-[44px] -my-2 -me-2 grid place-items-center rounded-lg hover:bg-black/5"><Glyph e="✕" /></button>
          </div>
        )}
        {filter === 'choose' && (
          <p className="text-sm text-gray-600">{L('The pricing time ended on these requests, but their offers can still be chosen for 30 days. Open a request to compare and choose.', 'ان درخواستوں پر قیمتوں کا وقت ختم ہو گیا، لیکن ان کی آفرز 30 دن تک منتخب کی جا سکتی ہیں۔ موازنہ اور انتخاب کے لیے درخواست کھولیں۔', 'انتهت مهلة التسعير على هذه الطلبات، لكن يمكنك اختيار أحد عروضها خلال 30 يوماً. افتح الطلب لتقارن وتختار.')}</p>
        )}
        {(filter === 'ended' || filter === 'cancelled') && shown.some(r => purgeOf(r)) && (
          <p className="text-xs text-gray-600">{purgeOf(shown.find(r => purgeOf(r)))?.hint}</p>
        )}
        {loadFailed ? (
          <LoadError onRetry={load} />
        ) : shown.length === 0 ? (
          rfqs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-gray-100">
              <div className="text-4xl mb-2 text-[#0B2438]"><Glyph e="🧾" /></div>
              <p className="text-gray-700 font-semibold">{L('You have not sent any request yet. Write what you need, and suppliers will send you their prices for free.', 'آپ نے ابھی کوئی درخواست نہیں بھیجی۔ جو چاہیے لکھیں، سپلائرز مفت میں اپنی قیمتیں بھیجیں گے۔', 'لم ترسل أي طلب بعد. اكتب ما تحتاجه، وسيرسل لك الموردون أسعارهم مجاناً.')}</p>
              <Link href="/contractor/rfq/quick" className="inline-flex items-center justify-center mt-4 min-h-[44px] px-6 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>
                {L('Request prices now', 'ابھی قیمتیں منگوائیں', 'اطلب أسعاراً الآن')}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-600">
              <div className="text-4xl mb-2"><Glyph e="🔎" /></div>
              <p>{L('No requests match.', 'کوئی درخواست نہیں ملی۔', 'لا توجد طلبات مطابقة.')}</p>
              {(q.trim() || filter !== 'all') && (
                <button type="button" onClick={() => { setQ(''); setFilter('all'); setStatus(null) }}
                  className="mt-3 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>
                  {L('Show all requests', 'تمام درخواستیں دیکھیں', 'عرض كل الطلبات')}
                </button>
              )}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {shown.map(r => {
              const items: any[] = Array.isArray(r.items) && r.items.length ? r.items : [{ product_name: r.product_name, quantity: r.quantity, unit: r.unit, sector: r.sector }]
              const b = badge(r)
              const st = stateOf(r)
              const open = st === 'open'
              const u = open && r.expires_at ? urgencyStyle(deadlineUrgency(r.expires_at)) : null
              const offers = offersOf(r)
              // ended without a deal → deleted after the retention period (closed = deal here: offers aren't loaded)
              const purge = purgeOf(r)
              const canPick = selecting && cancellable(r)
              const rs = rstate(r)
              const best = rs === 'offers' || rs === 'offers_expired' ? bestLine(r, items) : ''
              const deals = dealsBy[r.id] || []
              return (
                <div key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow transition-all ${sel.has(r.id) ? 'border-[#0B2438] ring-2 ring-[#0B2438]/15' : st === 'choose' ? 'border-[#D4A543]/60' : 'border-gray-100 hover:border-[#D4A543]/50'} ${selecting && !cancellable(r) ? 'opacity-50' : ''}`}>
                  <Link href={`/contractor/rfq/${r.id}`} aria-pressed={selecting ? sel.has(r.id) : undefined}
                    onClick={(e: any) => { if (selecting) { e.preventDefault(); if (cancellable(r)) toggle(r.id) } }}
                    className="block p-4 sm:p-5 rounded-2xl">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        {canPick && (
                          <span aria-hidden className={`mt-0.5 w-6 h-6 rounded-[5px] border-2 grid place-items-center text-xs font-bold shrink-0 ${sel.has(r.id) ? 'bg-[#0B2438] border-[#0B2438] text-white' : 'border-gray-400 bg-white'}`}>{sel.has(r.id) ? <Glyph e="✓" /> : null}</span>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-navy" dir="auto">{rfqDesc(r, locale)}</div>
                          <div className="text-xs text-gray-500 mt-0.5" dir="auto">
                            <span className="font-bold text-[#8F6820]">{rfqRef(r, locale)}</span>{rfqRef(r) ? ' · ' : ''}{rfqDate(r, locale)}{r.city || r.region ? ` · ${r.city || r.region}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: b.bg, color: b.fg }}>{b.t}</span>
                        {/* the offers count where it helps; an ended request without offers says so below (UX-003) */}
                        {(st === 'open' || st === 'choose') && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${offers ? 'bg-[#D4A543]/10 text-[#8F6820] border-[#D4A543]/30' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {offers ? countLabel(offers, locale, arOffers, 'offer', 'آفرز') : L('Waiting for offers', 'آفرز کا انتظار', 'بانتظار العروض')}
                          </span>
                        )}
                        {u && <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: u.bg, color: u.fg, border: `1px solid ${u.border}` }}><Glyph e="⏰" /> {formatTimeLeft(r.expires_at, locale)}</span>}
                        {purge && <span title={purge.hint} className={`text-xs font-bold px-2.5 py-1 rounded-full border ${purge.soon ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}><Glyph e="🗑" /> {purge.label}</span>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {items.slice(0, 6).map((it: any, k: number) => (
                        <div key={k} className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 pe-3 ps-1.5 py-1.5 max-w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={it.photo_url ? fileHref(it.photo_url) : productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category)}
                            className={`w-9 h-9 rounded-lg bg-white shrink-0 ${it.photo_url ? 'object-cover' : 'object-contain'}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 truncate max-w-[12rem]" dir="auto">{pname(it.product_name)}</div>
                            <div className="text-xs text-gray-500">{Number(it.quantity || 0).toLocaleString('en-US')} {getUnitLabelLong(it.unit, locale)}</div>
                          </div>
                        </div>
                      ))}
                      {items.length > 6 && <span className="self-center text-xs text-gray-500">+{items.length - 6}</span>}
                    </div>
                    {best && <div className="mt-3 text-[13px] font-extrabold text-[#0B2438]">{best}</div>}
                    {st === 'choose' && (
                      <div className="mt-2 text-sm font-bold text-[#071827]">
                        {L('Open the request and choose one of the offers', 'درخواست کھولیں اور کوئی آفر منتخب کریں', 'افتح الطلب واختر أحد العروض')} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
                      </div>
                    )}
                    {st === 'ended' && (
                      <div className="mt-3 text-sm text-gray-600">
                        {offers ? L('This request ended without a choice.', 'یہ درخواست انتخاب کے بغیر ختم ہو گئی۔', 'انتهى هذا الطلب دون اختيار عرض.') : L('The deadline passed and no offers arrived.', 'مہلت ختم ہو گئی اور کوئی آفر نہیں آئی۔', 'انتهت المهلة، لم تصل عروض.')}
                      </div>
                    )}
                  </Link>
                  {/* a real link next to the card, reachable by keyboard (was a nested fake link, UX-105) */}
                  {(st === 'cancelled' || st === 'ended') && !selecting && (
                    <div className="px-4 sm:px-5 pb-4 -mt-1 flex justify-end">
                      <Link href={`/contractor/rfq/quick?from=${r.id}`}
                        className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>
                        <Glyph e="🔁" /> <span className="ms-1.5">{st === 'ended' ? L('Send the request again', 'درخواست دوبارہ بھیجیں', 'أعد إرسال الطلب') : L('Request again', 'دوبارہ منگوائیں', 'اطلب مرة أخرى')}</span>
                      </Link>
                    </div>
                  )}
                  {/* a chosen request leads to its deal (UX-141) */}
                  {st === 'closed' && !selecting && (
                    <div className="px-4 sm:px-5 pb-4 -mt-1 flex justify-end">
                      <Link href={deals.length === 1 ? `/contractor/orders/${deals[0].id}` : `/contractor/orders${r.ref_no ? `?q=${encodeURIComponent(String(r.ref_no))}` : ''}`}
                        className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>
                        {L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')} <span aria-hidden="true" className="ms-1.5 inline-block rtl:rotate-180">→</span>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
