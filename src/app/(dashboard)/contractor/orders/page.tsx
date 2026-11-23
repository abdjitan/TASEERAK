'use client'

import RequestsTabs from '@/components/buyer/RequestsTabs'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { getNav } from '@/lib/nav'
import { dealStage, buyerTodo } from '@/lib/dealStage'
import { useHomeBuyer } from '@/components/buyer/useHomeBuyer'
import { offerComparable, vatTag, sarLabel } from '@/lib/vat'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { rfqDesc, rfqRefLine } from '@/lib/rfqName'
import { arDeals, countLabel } from '@/lib/text'
import { normalizedIncludes } from '@/lib/normalize'

// The deal's amount, the same as the deal page shows it (UX-018): a per-item award counts only the
// awarded materials, plus the delivery/other charges once confirmed (not while extras_pending),
// with the seller's VAT rule. A whole-offer deal is total_price (which already holds the charges).
function dealAmount(d: any, awardedSum: number | undefined): number {
  if (awardedSum == null) return offerComparable(d)
  const extras = !d.extras_pending && Array.isArray(d.extra_charges)
    ? d.extra_charges.reduce((s: number, e: any) => s + (Number(e?.amount) || 0), 0) : 0
  return offerComparable({ ...d, total_price: awardedSum + extras })
}

// The statement number the deal page prints («ST-…»), one form in lists and search (UX-176)
const statementNo = (d: any) => (d?.invoice_number || '').replace(/^INV-/, 'ST-') || (d?.id ? `ST-${String(d.id).slice(0, 8).toUpperCase()}` : '')
// the purchase-order number on the deal page («PO-…»), searchable too (UX-141)
const poNo = (d: any) => (d?.id ? `PO-${String(d.id).slice(0, 8).toUpperCase()}` : '')

// «صفقاتي» للمقاول — تجمع كل الصفقات المُرساة (العروض المقبولة) في مكان واحد مع مرحلتها
// ورقم الفاتورة، وترتبط بأمر الشراء/الفاتورة. كانت دورة الصفقة تُفتح فقط من الطلب الأصلي.
export default function ContractorDealsPage() {
  return <Suspense fallback={<PageLoader />}><ContractorDeals /></Suspense>
}

function ContractorDeals() {
  const { locale, dir } = useTranslation()
  const params = useSearchParams()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'disputed' | 'cancelled'>('all')
  const [search, setSearch] = useState(() => params.get('q') || '') // «متابعة الصفقة» from «طلباتي» (UX-141)
  const [reviewed, setReviewed] = useState<Set<string> | null>(null) // deals the buyer already rated (null = not loaded: no «قيّم المورد» flash, UX-071)
  const home = useHomeBuyer()

  const load = useCallback(async () => {
    setLoadFailed(false)
    let shown = false
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const ck = 'corders2_' + session.user.id // last list at once (page cache), refreshed below
      const snap = readPageCache(ck)
      if (snap) { setDeals(snap); setLoading(false); shown = true } else setLoading(true)
      // RLS يعيد فقط العروض المقبولة على طلبات هذا المقاول
      const { data, error } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, title, ref_no, items, created_at), supplier:profiles(company_name_ar, supplier_tier, provider_type)')
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })
        .limit(200)
      if (error) throw error
      // a multi-item request awarded per item: the deal is only the awarded items, not the whole offer
      const ids = (data || []).map((d: any) => d.id)
      const awarded: Record<string, number> = {}
      if (ids.length) {
        const { data: aw, error: awErr } = await supabase.from('rfq_item_awards').select('offer_id, total').in('offer_id', ids)
        if (awErr) throw awErr
        for (const a of aw || []) awarded[a.offer_id] = (awarded[a.offer_id] || 0) + (Number(a.total) || 0)
      }
      const list = (data || []).map((d: any) => ({ ...d, _amount: dealAmount(d, awarded[d.id]) }))
      setDeals(list)
      writePageCache(ck, list)
      // which received deals still wait for the buyer's rating («قيّم المورد», UX-141)
      const recvIds = list.filter((d: any) => d.received_at).map((d: any) => d.id)
      if (recvIds.length) {
        const { data: revs } = await supabase.from('reviews').select('offer_id').eq('reviewer_id', session.user.id).in('offer_id', recvIds)
        setReviewed(new Set((revs || []).map((r: any) => r.offer_id)))
      } else setReviewed(new Set())
    } catch (e) {
      console.error('[contractor/orders] load failed:', e)
      if (!shown) setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <PageLoader />

  const q = search.trim().toLowerCase()
  const shown = deals.filter((d: any) => {
    const st = dealStage(d, 'buyer', locale)
    if (filter === 'done' && !st.done) return false
    // a deal the admins cancelled is not «جارية» (round-5 UX-031): it has its own filter
    if (filter === 'active' && (st.done || st.key === 'disputed' || st.key === 'closed')) return false
    if (filter === 'disputed' && st.key !== 'disputed') return false
    if (filter === 'cancelled' && st.key !== 'closed') return false
    if (q) {
      // hamza/taa marbuta/alef maqsura folded: «اسمنت» finds «إسمنت» (round-5 UX-033)
      const hay = `${d.rfq?.title || ''} ${d.rfq?.product_name || ''} ${d.rfq ? rfqDesc(d.rfq, locale) : ''} ${d.rfq?.ref_no || ''} RFQ-${d.rfq?.ref_no || ''} ${d.supplier?.company_name_ar || ''} ${d.invoice_number || ''} ${statementNo(d)} ${poNo(d)}`
      if (!normalizedIncludes(hay, q)) return false
    }
    return true
  })
    // the deals waiting on the buyer first (stable otherwise: newest first)
    .map((d: any, i: number) => ({ d, i, todo: buyerTodo(dealStage(d, 'buyer', locale), locale) ? 0 : 1 }))
    .sort((a, b) => a.todo - b.todo || a.i - b.i)
    .map(x => x.d)
  const narrowed = deals.length > 0 && (filter !== 'all' || !!q)
  const SAR = sarLabel(locale)

  return (
    <AppShell title={L('My Deals', 'میری ڈیلز', 'صفقاتي')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <h1 className="sr-only">{L('My Deals', 'میری ڈیلز', 'صفقاتي')}</h1>
        <RequestsTabs active="deals" locale={locale} />
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} type="search"
          aria-label={L('Search deals', 'ڈیلز تلاش کریں', 'البحث في الصفقات')}
          className="input-field mb-3 text-base sm:text-sm" placeholder={home
            ? L('Search by material, supplier or request number…', 'سامان، سپلائر یا درخواست نمبر سے تلاش کریں…', 'ابحث بالمادة أو المورد أو رقم الطلب…')
            : L('Search deals (material, supplier, request or statement no.)…', 'ڈیلز تلاش کریں (سامان، سپلائر، درخواست یا بیان نمبر)…', 'ابحث في الصفقات (مادة، مورد، رقم الطلب أو البيان)…')} />
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[{ k: 'all', l: L('All', 'سب', 'الكل') }, { k: 'active', l: L('Active', 'جاری', 'جارية') }, { k: 'done', l: L('Completed', 'مکمل', 'مكتملة') }, { k: 'disputed', l: L('Problems', 'مسائل', 'مشكلات') }, ...(deals.some((d: any) => !!d.deal_closed_at) ? [{ k: 'cancelled', l: L('Cancelled', 'منسوخ', 'ملغاة') }] : [])].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
              className={`shrink-0 min-h-[44px] px-3.5 rounded-xl text-sm font-semibold border transition-all ${filter === f.k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={filter === f.k ? { background: f.k === 'disputed' ? '#B91C1C' : '#0B2438' } : {}}>{f.l}</button>
          ))}
          {!loadFailed && <span className="shrink-0 text-xs text-gray-500 ms-auto">{countLabel(shown.length, locale, arDeals, 'deal', 'ڈیلز')}</span>}
        </div>

        {loadFailed ? (
          <LoadError onRetry={load} />
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3 text-[#0B2438]"><Glyph e="📦" /></div>
            {narrowed ? (
              <>
                <p className="text-gray-600">{q
                  ? L('No deals match your search.', 'آپ کی تلاش سے کوئی ڈیل نہیں ملی۔', 'لا توجد صفقات تطابق بحثك.')
                  : L('No deals under this filter.', 'اس فلٹر میں کوئی ڈیل نہیں۔', 'لا توجد صفقات ضمن هذا التصنيف.')}</p>
                <button type="button" onClick={() => { setFilter('all'); setSearch('') }} className="inline-flex items-center min-h-[44px] mt-2 text-sm font-bold text-[#8F6820] hover:underline">
                  {L('Show all deals', 'تمام ڈیلز دکھائیں', 'عرض كل الصفقات')}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600">{L('No deals yet. When you choose an offer on one of your requests, the deal appears here.', 'ابھی کوئی ڈیل نہیں۔ جب آپ اپنی کسی درخواست پر آفر منتخب کریں گے تو ڈیل یہاں نظر آئے گی۔', 'لا توجد صفقات بعد. عندما تختار عرضاً على أحد طلباتك تظهر الصفقة هنا.')}</p>
                <Link href="/contractor/rfqs" className="inline-flex items-center justify-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>
                  {L('Go to my requests', 'میری درخواستوں پر جائیں', 'اذهب إلى طلباتي')}
                  <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d, 'buyer', locale)
              const todo = buyerTodo(st, locale)
              const amount = typeof d._amount === 'number' ? d._amount : offerComparable(d)
              const refLine = d.rfq ? rfqRefLine(d.rfq, locale) : ''
              const rateDue = !!reviewed && !!d.received_at && !reviewed.has(d.id) && st.key !== 'disputed' && st.key !== 'closed'
              return (
                <Link key={d.id} href={`/contractor/orders/${d.id}${!todo && rateDue ? '#rate' : ''}`}
                  className={`block bg-white rounded-2xl p-4 border shadow-sm transition-colors ${todo ? 'border-[#D4A543]/60' : 'border-gray-100 hover:border-[#D4A543]/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }} dir="auto">{d.rfq ? rfqDesc(d.rfq, locale) : L('Deal', 'ڈیل', 'صفقة')}</div>
                      {refLine && <div className="text-xs text-gray-500 mt-0.5" dir="auto">{refLine}</div>}
                      <div className="text-xs text-gray-500 mt-1 truncate" dir="auto"><SellerIcon name="store" className="w-3.5 h-3.5" /> {d.supplier?.company_name_ar || '—'}</div>
                      {/* the amount on its own wrapping line, never cut with the supplier name (UX-071) */}
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-baseline gap-x-1"><span className="font-bold text-sm text-[#8F6820]">{amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span> <span className="text-xs">({vatTag(d, locale)})</span></div>
                      {d.extras_pending && Array.isArray(d.extra_charges) && d.extra_charges.length > 0 && (
                        <div className="text-xs font-semibold text-[#8F6820] mt-0.5">{L('+ delivery charges, waiting for the supplier’s confirmation', '+ ڈیلیوری چارجز، سپلائر کی تصدیق کا انتظار', '+ رسوم التوصيل بانتظار تأكيد المورد')}</div>
                      )}
                    </div>
                    <span className="shrink-0 text-lg leading-none mt-0.5" style={{ color: st.tone }} aria-hidden="true"><Glyph e={st.emoji} /></span>
                  </div>
                  {/* the stage in full (it says what happens next) with a four-step indicator (UX-101) */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {st.key !== 'disputed' && st.key !== 'closed' && (
                      <span className="flex items-center gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map(n => <span key={n} className="w-2 h-2 rounded-full" style={{ background: n <= st.step ? (st.done ? '#0F6E56' : '#D4A543') : '#E5E7EB' }} />)}
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: st.key === 'disputed' ? '#B91C1C' : st.done ? '#0F6E56' : st.key === 'closed' ? st.tone : '#0B2438' }}>{st.label}</span>
                  </div>
                  {todo && (
                    <span className="inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#D4A543', color: '#071827' }}>{todo}</span>
                  )}
                  {!todo && rateDue && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2.5 py-1 rounded-full border border-[#D4A543]/60 text-[#8F6820] bg-[#D4A543]/10">
                      <Glyph e="⭐" /> {L('Rate the supplier', 'سپلائر کی ریٹنگ دیں', 'قيّم المورد')}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
