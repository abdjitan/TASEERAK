'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { dealStage, expectedDeliveryDate, deliveryLate, supplierDealNeedsMe, buyerDisputeOpen, buyerDisputeChip, memberDealLabel, memberDealsNote } from '@/lib/dealStage'
import { rfqDisplayName, rfqRefLine } from '@/lib/rfqName'
import { buyerBasisTag } from '@/lib/vat'
import Glyph from '@/components/shared/Glyph'
import { arCount } from '@/lib/text'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import LoadError from '@/components/shared/LoadError'
import { dealTotal } from '@/lib/dealTotal'
import { normalizeText } from '@/lib/normalize'
import { getProductLabel } from '@/types'

// «صفقاتي» للمورّد — الصفقات المُرساة عليه (عروضه المقبولة) مع مرحلتها، وترتبط بصفحة إدارة
// الصفقة (حماية الصفقة: تسليم/استلام/دفع). الهوية تُكشف بعد الترسية فقط.
// round-8 UX-030: a deal waiting on the owner comes from the shared rule (deliver it, confirm a payment the
// buyer recorded, or answer a problem the buyer reported); the same function as the app.
const dealNeedsMe = (d: any): boolean => supplierDealNeedsMe(d)
// round-6 UX-001/UX-113: the expected delivery day and the «late» check come from one shared rule
// (working days in Riyadh, Fridays skipped; late only after that whole day, never after delivery or receipt)
const deliveryDue = (d: any): Date | null => expectedDeliveryDate(d)
// round-5 UX-178: the statement number the deal page prints («ST-…»), one form everywhere
const statementNo = (d: any) => (d?.invoice_number || '').replace(/^INV-/, 'ST-') || (d?.id ? `ST-${String(d.id).slice(0, 8).toUpperCase()}` : '')

export default function SupplierDealsPage() {
  const { locale, dir } = useTranslation()
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'disputed' | 'closed'>('all')
  const [search, setSearch] = useState('')
  // round-2 UX-002: never fetch rfqs.title (the buyer's project name stays hidden from suppliers)
  // UX-119: a failed load is said as such (never «no deals yet»); with a cached list, say it may be old
  const [failed, setFailed] = useState(false)
  // round-4 UX-080: a team member follows the company's deals; the owner does the steps
  const [isMember, setIsMember] = useState(false)
  const [sellerInfo, setSellerInfo] = useState<{ supplier_tier?: string; provider_type?: string } | null>(null)
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const FWD = dir === 'rtl' ? '←' : '→'

  async function load() {
    setFailed(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const ck = 'sdeals_' + session.user.id // last list at once (page cache), refreshed below
      const snap = readPageCache(ck)
      if (snap) { setDeals(snap); setLoading(false) }
      const { data: actRaw } = await supabase.rpc('acting_uid') // a team member sees the company's deals
      const actId: string = (actRaw as any) || session.user.id
      setIsMember(actId !== session.user.id)
      // round-8 UX-020: the seller kind feeds buyerBasisTag (one basis tag for the same offer on every screen)
      Promise.resolve(supabase.from('profiles').select('supplier_tier, provider_type').eq('id', actId).maybeSingle()).then(({ data: sp }: any) => { if (sp) setSellerInfo(sp) }, () => {})
      const { data, error } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, ref_no, items, created_at, contractor:profiles!contractor_id(company_name_ar, full_name))')
        .eq('supplier_id', actId)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })
        .limit(200)
      if (error) throw error
      // a multi-item request awarded per item: the deal is only the awarded items, not the whole offer
      const ids = (data || []).map((d: any) => d.id)
      const awarded: Record<string, number> = {}
      if (ids.length) {
        const { data: aw } = await supabase.from('rfq_item_awards').select('offer_id, total').in('offer_id', ids)
        for (const a of aw || []) awarded[a.offer_id] = (awarded[a.offer_id] || 0) + (Number(a.total) || 0)
      }
      // UX-033: dealStage reads invoice_url; the seller invoice may be kept as supplier_invoice_url
      // round-5 UX-051: one deal amount everywhere (awarded materials + confirmed extra charges, VAT basis)
      const list = (data || []).map((d: any) => ({ ...d, invoice_url: d.invoice_url ?? d.supplier_invoice_url ?? null, deal_total: dealTotal(d, awarded[d.id] ?? null) }))
      // round-5 UX-072: a team member cannot read the buyer's profile through the join; the reveal RPC
      // (get_rfq_contractor checks acting_uid) gives the name once the company was chosen
      if (actId !== session.user.id) {
        const missing = Array.from(new Set(list.filter((d: any) => d.rfq?.id && !d.rfq?.contractor?.company_name_ar && !d.rfq?.contractor?.full_name).map((d: any) => d.rfq.id as string))).slice(0, 40)
        const names: Record<string, string> = {}
        await Promise.all(missing.map(async (rid: string) => {
          try {
            const { data: c } = await supabase.rpc('get_rfq_contractor', { p_rfq_id: rid })
            const row: any = Array.isArray(c) ? c[0] : c
            if (row?.revealed && row?.company_name_ar) names[rid] = row.company_name_ar
          } catch {}
        }))
        for (const d of list) if (d.rfq?.id && names[d.rfq.id]) d.rfq = { ...d.rfq, contractor: { ...(d.rfq.contractor || {}), company_name_ar: names[d.rfq.id] } }
      }
      if (data || !snap) setDeals(list) // a failed query keeps the cached list
      if (data) writePageCache(ck, list)
      setLoading(false)
    } catch (e) {
      console.error('[supplier/deals] load failed:', e)
      setFailed(true)
      setLoading(false)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageLoader />

  // round-4 UX-080 / round-8 UX-032: the stage in the third person for a team member (shared with the app, handles advance_due)
  const memberLabel = (d: any): string => memberDealLabel(d, locale)

  const shown = deals.filter((d: any) => {
    const st = dealStage(d, 'supplier', locale)
    if (filter === 'done' && !st.done) return false
    if (filter === 'active' && (st.done || st.key === 'disputed' || st.key === 'closed')) return false // UX-178: a cancelled deal is not active
    if (filter === 'disputed' && st.key !== 'disputed') return false
    if (filter === 'closed' && st.key !== 'closed') return false
    if (search.trim()) {
      // UX-138: the search reads the names as shown in every language, the request number and the invoice, tolerant of spelling
      const names: string[] = [d.rfq?.product_name, ...(Array.isArray(d.rfq?.items) ? d.rfq.items.map((it: any) => it?.product_name) : [])].filter(Boolean)
      const hay = normalizeText([...names, ...names.map((n: string) => getProductLabel(n, locale)), d.rfq ? rfqDisplayName({ ...d.rfq, title: null }, locale) : '', d.rfq?.ref_no ? String(d.rfq.ref_no) : '', d.rfq?.contractor?.company_name_ar || '', d.rfq?.contractor?.full_name || '', d.invoice_number || '', statementNo(d)].join(' ')).toLowerCase()
      if (!hay.includes(normalizeText(search.trim()).toLowerCase())) return false
    }
    return true
  })
  // round-5 UX-057: deals waiting on the owner first (the rest keep their newest-first order)
  // round-8 UX-030: a problem the buyer reported comes first of all
  if (!isMember) {
    const w = (d: any) => (buyerDisputeOpen(d) ? 0 : dealNeedsMe(d) ? 1 : 2)
    shown.sort((a: any, b: any) => w(a) - w(b))
  }
  const dloc = locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'

  return (
    <AppShell title={L('My offers and deals', 'میری آفرز اور ڈیلز', 'عروضي وصفقاتي')} nav={getNav('supplier', locale, '/supplier/deals')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <h1 className="sr-only">{L('My offers and deals', 'میری آفرز اور ڈیلز', 'عروضي وصفقاتي')}</h1>
        {/* «عروضي وصفقاتي» (owner 2026-10-17, same as the app): offers waiting for the buyer live on the home list */}
        {/* round-5 UX-171: a plain link (it leaves the page), not a tab that pretends to switch in place */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-bold" style={{ color: '#0B2438' }}>{L('My deals', 'میری ڈیلز', 'صفقاتي')}</h2>
          <Link href="/supplier/dashboard?tab=offers&status=pending" className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl text-sm font-bold text-[#8F6820] hover:underline">
            {L('Offers waiting for the buyer', 'خریدار کے فیصلے کی منتظر آفرز', 'عروض بانتظار قرار المشتري')} <span aria-hidden="true">{FWD}</span>
          </Link>
        </div>
        {isMember && <p className="mb-3 rounded-xl border border-[#0B2438]/15 bg-[#0B2438]/5 px-3 py-2 text-[13px] text-[#0B2438] leading-relaxed">{memberDealsNote(locale)}</p>}
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} aria-label={L('Search deals', 'ڈیلز تلاش کریں', 'ابحث في الصفقات')}
          className="input-field text-base sm:text-sm mb-3" placeholder={locale === 'en' ? 'Search deals (material, buyer, request or invoice no.)…' : locale === 'ur' ? 'ڈیلز تلاش کریں (مال، خریدار، انوائس نمبر)…' : 'ابحث في الصفقات (المادة، المشتري، رقم الطلب أو الفاتورة)…'} />
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* round-7 UX-156: counts on the chips (when above zero), and «ملغاة» when a deal was cancelled */}
          {(() => {
            const stages = deals.map((d: any) => dealStage(d, 'supplier', locale))
            const n = {
              all: deals.length,
              active: stages.filter((st: any) => !st.done && st.key !== 'disputed' && st.key !== 'closed').length,
              done: stages.filter((st: any) => st.done).length,
              disputed: stages.filter((st: any) => st.key === 'disputed').length,
              closed: stages.filter((st: any) => st.key === 'closed').length,
            }
            const chips: { k: 'all' | 'active' | 'done' | 'disputed' | 'closed'; l: string }[] = [
              { k: 'all', l: L('All', 'سب', 'الكل') }, { k: 'active', l: L('Active', 'جاری', 'جارية') }, { k: 'done', l: L('Completed', 'مکمل', 'مكتملة') }, { k: 'disputed', l: L('Problems', 'مسائل', 'مشكلات') },
              { k: 'closed' as const, l: L('Cancelled', 'منسوخ', 'ملغاة') }, // round-8 UX-102 (1): always listed, with its count
            ]
            return chips.map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
                className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold border-2 transition-all ${filter === f.k ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{f.l} ({n[f.k]})</button>
            ))
          })()}
          <span className="text-[13px] text-gray-600 ms-auto">{locale === 'en' ? `${shown.length} deals` : locale === 'ur' ? `${shown.length} ڈیلز` : shown.length === 0 ? 'لا توجد صفقات' : arCount(shown.length, 'صفقة واحدة', 'صفقتان', 'صفقات', 'صفقة')}</span>
        </div>

        {failed && <LoadError onRetry={() => { setLoading(true); load() }} className="mb-4" message={deals.length ? L('Could not refresh; this is the last saved copy.', 'تازہ نہیں ہو سکا؛ یہ آخری محفوظ نسخہ ہے۔', 'تعذّر التحديث، والمعروض آخر نسخة محفوظة.') : undefined} />}
        {failed && deals.length === 0 ? null : shown.length === 0 && deals.length > 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-600">{L('No deals match this search or filter.', 'اس تلاش یا فلٹر سے کوئی ڈیل نہیں ملتی۔', 'لا توجد صفقات تطابق هذا البحث أو التصفية.')}</p>
            <button type="button" onClick={() => { setSearch(''); setFilter('all') }} className="mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>{L('Show all deals', 'تمام ڈیلز دکھائیں', 'عرض كل الصفقات')}</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3"><Glyph e="📦" /></div>
            <p className="text-gray-600">{L('No deals yet. Once a buyer chooses one of your offers, the deal appears here.', 'ابھی کوئی ڈیل نہیں۔ جب خریدار آپ کی کوئی آفر چنے گا تو ڈیل یہاں نظر آئے گی۔', 'لا توجد صفقات بعد. عندما يختار أحد المشترين عرضك تظهر الصفقة هنا.')}</p>
            <Link href="/supplier/dashboard" className="inline-flex items-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>{L('Browse requests', 'درخواستیں دیکھیں', 'تصفّح الطلبات')} <span aria-hidden="true">{FWD}</span></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d, 'supplier', locale)
              const mine = !isMember && dealNeedsMe(d)
              const due = st.key === 'closed' ? null : deliveryDue(d)
              const late = deliveryLate(d)
              const amount = Number(d.deal_total ?? dealTotal(d)) || 0
              return (
                <Link key={d.id} href={`/supplier/dashboard/rfq/${d.rfq?.id || d.rfq_id}#deal`}
                  className={`flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border shadow-sm hover:border-[#D4A543]/50 transition-colors ${mine ? 'border-[#D4A543] border-2' : 'border-gray-100'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="font-bold text-sm line-clamp-2 min-w-0 flex-1" style={{ color: '#0B2438' }}>{d.rfq ? rfqDisplayName({ ...d.rfq, title: null }, locale) : L('Deal', 'ڈیل', 'صفقة')}</div>
                      {!isMember && buyerDisputeOpen(d)
                        ? <span className="shrink-0 text-[12px] font-bold px-2.5 py-0.5 rounded-full border-2 border-red-300 bg-white text-red-800">{buyerDisputeChip(locale)}</span>
                        : mine && <span className="shrink-0 text-[12px] font-bold px-2.5 py-0.5 rounded-full text-[#071827]" style={{ background: '#D4A543' }}>{L('Action needed', 'آپ کی کارروائی درکار', 'مطلوب منك')}</span>}
                    </div>
                    {/* round-5 UX-072: the fallback is «المشتري» (never «مشتري فرد» for a name we could not read) */}
                    <div className="text-[13px] text-gray-600 mt-0.5 flex flex-wrap gap-x-1 min-w-0"><Glyph e="👤" /> {d.rfq?.contractor?.company_name_ar || d.rfq?.contractor?.full_name || L('The buyer', 'خریدار', 'المشتري')} · {(+amount.toFixed(2)).toLocaleString('en-US')} {L('SAR', 'ریال', 'ر.س')} <span className="text-gray-500">{buyerBasisTag({ ...d, supplier: sellerInfo || undefined }, locale)}</span></div>
                    {/* round-8 UX-102 (7): the request number and the day the offer was chosen */}
                    <div className="text-[12px] text-gray-500 mt-0.5 flex flex-wrap gap-x-1">
                      {d.rfq && rfqRefLine(d.rfq, locale) && <span>{rfqRefLine(d.rfq, locale)}</span>}
                      {d.accepted_at && <span>{d.rfq ? '· ' : ''}{L(`Offer chosen on ${new Date(d.accepted_at).toLocaleDateString(dloc, { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })}`, `آفر ${new Date(d.accepted_at).toLocaleDateString(dloc, { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })} کو منتخب ہوئی`, `اختير العرض في ${new Date(d.accepted_at).toLocaleDateString(dloc, { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })}`)}</span>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: st.tone === '#D4A543' ? '#0B2438' : st.tone }}>
                      {/* round-5 UX-178: the stage's own tone (a cancelled deal is grey, never a gold dot) */}
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: st.tone }} aria-hidden />
                      {isMember ? memberLabel(d) : st.label}
                    </div>
                    {late ? (
                      <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-warn-text bg-warn-bg border border-warn-border rounded-full px-2 py-0.5"><Glyph e="⚠" /> {L('Past the delivery date', 'ڈیلیوری کی تاریخ گزر گئی', 'متأخر عن موعد التوصيل')}{due ? ` · ${due.toLocaleDateString(dloc, { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })}` : ''}</div>
                    ) : due && !d.supplier_delivered_at && !d.received_at ? (
                      <div className="mt-1 text-[12px] text-gray-600">{L('Delivery date:', 'ڈیلیوری کی تاریخ:', 'موعد التوصيل:')} {due.toLocaleDateString(dloc, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })}</div>
                    ) : null}
                    {/* round-5 UX-178: the statement number as the deal page prints it */}
                    <div className="text-[12px] text-gray-500 mt-0.5">{L('Statement no.:', 'بیان نمبر:', 'رقم البيان:')} <span className="font-mono" dir="ltr">{statementNo(d)}</span></div>
                  </div>
                  <span className="shrink-0 text-[#8F6820] text-lg" aria-hidden="true">{FWD}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
