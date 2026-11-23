'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { dealStage } from '@/lib/dealStage'
import { rfqDisplayName } from '@/lib/rfqName'
import Glyph from '@/components/shared/Glyph'
import { arCount } from '@/lib/text'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import LoadError from '@/components/shared/LoadError'
import { offerComparable } from '@/lib/vat'
import { normalizeText } from '@/lib/normalize'
import { getProductLabel } from '@/types'

// «صفقاتي» للمورّد — الصفقات المُرساة عليه (عروضه المقبولة) مع مرحلتها، وترتبط بصفحة إدارة
// الصفقة (حماية الصفقة: تسليم/استلام/دفع). الهوية تُكشف بعد الترسية فقط.
export default function SupplierDealsPage() {
  const { locale, dir } = useTranslation()
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'disputed'>('all')
  const [search, setSearch] = useState('')
  // round-2 UX-002: never fetch rfqs.title (the buyer's project name stays hidden from suppliers)
  // UX-119: a failed load is said as such (never «no deals yet»); with a cached list, say it may be old
  const [failed, setFailed] = useState(false)
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
      const { data, error } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, ref_no, items, contractor:profiles!contractor_id(company_name_ar))')
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
      const list = (data || []).map((d: any) => ({ ...d, invoice_url: d.invoice_url ?? d.supplier_invoice_url ?? null, ...(awarded[d.id] != null ? { total_price: awarded[d.id] } : {}) }))
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

  const shown = deals.filter((d: any) => {
    const st = dealStage(d, 'supplier', locale)
    if (filter === 'done' && !st.done) return false
    if (filter === 'active' && (st.done || st.key === 'disputed')) return false
    if (filter === 'disputed' && st.key !== 'disputed') return false
    if (search.trim()) {
      // UX-138: the search reads the names as shown in every language, the request number and the invoice, tolerant of spelling
      const names: string[] = [d.rfq?.product_name, ...(Array.isArray(d.rfq?.items) ? d.rfq.items.map((it: any) => it?.product_name) : [])].filter(Boolean)
      const hay = normalizeText([...names, ...names.map((n: string) => getProductLabel(n, locale)), d.rfq ? rfqDisplayName({ ...d.rfq, title: null }, locale) : '', d.rfq?.ref_no ? String(d.rfq.ref_no) : '', d.rfq?.contractor?.company_name_ar || '', d.invoice_number || ''].join(' ')).toLowerCase()
      if (!hay.includes(normalizeText(search.trim()).toLowerCase())) return false
    }
    return true
  })

  return (
    <AppShell title={L('My offers and deals', 'میری آفرز اور ڈیلز', 'عروضي وصفقاتي')} nav={getNav('supplier', locale, '/supplier/deals')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <h1 className="sr-only">{L('My deals', 'میری ڈیلز', 'صفقاتي')}</h1>
        {/* «عروضي وصفقاتي» (owner 2026-10-17, same as the app): offers waiting for the buyer live on the home list */}
        <div role="tablist" className="inline-flex p-1 rounded-xl bg-gray-100 mb-4">
          <a href="/supplier/dashboard?tab=offers&status=pending" role="tab" aria-selected="false" className="inline-flex items-center min-h-[44px] px-4 sm:px-5 rounded-lg text-sm font-bold text-gray-600 hover:text-[#0B2438]">{locale === 'en' ? 'Waiting for the buyer' : locale === 'ur' ? 'خریدار کے فیصلے کی منتظر' : 'بانتظار قرار المشتري'}</a>
          <span role="tab" aria-selected="true" className="inline-flex items-center min-h-[44px] px-4 sm:px-5 rounded-lg text-sm font-bold bg-white shadow-sm text-[#0B2438]">{locale === 'en' ? 'My deals' : locale === 'ur' ? 'میری ڈیلز' : 'صفقاتي'}</span>
        </div>
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} aria-label={L('Search deals', 'ڈیلز تلاش کریں', 'ابحث في الصفقات')}
          className="input-field text-base sm:text-sm mb-3" placeholder={locale === 'en' ? 'Search deals (material, buyer, request or invoice no.)…' : locale === 'ur' ? 'ڈیلز تلاش کریں (مال، خریدار، انوائس نمبر)…' : 'ابحث في الصفقات (المادة، المشتري، رقم الطلب أو الفاتورة)…'} />
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[{ k: 'all', l: locale === 'en' ? 'All' : locale === 'ur' ? 'سب' : 'الكل' }, { k: 'active', l: locale === 'en' ? 'Active' : locale === 'ur' ? 'جاری' : 'جارية' }, { k: 'done', l: locale === 'en' ? 'Completed' : locale === 'ur' ? 'مکمل' : 'مكتملة' }, { k: 'disputed', l: locale === 'en' ? 'Problems' : locale === 'ur' ? 'مسائل' : 'مشكلات' }].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
              className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold border-2 transition-all ${filter === f.k ? 'border-[#D4A543] bg-[#D4A543]/10 text-[#071827]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{f.l}</button>
          ))}
          <span className="text-[13px] text-gray-600 ms-auto">{locale === 'en' ? `${shown.length} deals` : locale === 'ur' ? `${shown.length} ڈیلز` : shown.length === 0 ? 'لا توجد صفقات' : arCount(shown.length, 'صفقة واحدة', 'صفقتان', 'صفقات', 'صفقة')}</span>
        </div>

        {failed && <LoadError onRetry={() => { setLoading(true); load() }} className="mb-4" message={deals.length ? L('Could not refresh; this is the last saved copy.', 'تازہ نہیں ہو سکا؛ یہ آخری محفوظ نسخہ ہے۔', 'تعذّر التحديث، والمعروض آخر نسخة محفوظة.') : undefined} />}
        {failed && deals.length === 0 ? null : shown.length === 0 && deals.length > 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-600">{L('No deals match this search or filter.', 'اس تلاش یا فلٹر سے کوئی ڈیل نہیں ملتی۔', 'لا توجد صفقات تطابق هذا البحث أو التصفية.')}</p>
            <button type="button" onClick={() => { setSearch(''); setFilter('all') }} className="mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Show all deals', 'تمام ڈیلز دکھائیں', 'عرض كل الصفقات')}</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3"><Glyph e="📦" /></div>
            <p className="text-gray-600">{L('No deals yet. Once a buyer chooses one of your offers, the deal appears here.', 'ابھی کوئی ڈیل نہیں۔ جب خریدار آپ کی کوئی آفر چنے گا تو ڈیل یہاں نظر آئے گی۔', 'لا توجد صفقات بعد. عندما يختار أحد المشترين عرضك تظهر الصفقة هنا.')}</p>
            <Link href="/supplier/dashboard" className="inline-flex items-center gap-1 mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{L('Browse requests', 'درخواستیں دیکھیں', 'تصفّح الطلبات')} <span aria-hidden="true">{FWD}</span></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d, 'supplier', locale)
              return (
                <Link key={d.id} href={`/supplier/dashboard/rfq/${d.rfq?.id}#deal`}
                  className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#D4A543]/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm line-clamp-2" style={{ color: '#0B2438' }}>{d.rfq ? rfqDisplayName({ ...d.rfq, title: null }, locale) : L('Deal', 'ڈیل', 'صفقة')}</div>
                    <div className="text-[13px] text-gray-600 mt-0.5 truncate"><Glyph e="👤" /> {d.rfq?.contractor?.company_name_ar || L('Individual buyer', 'انفرادی خریدار', 'مشتري فرد')} · {(+offerComparable(d).toFixed(2)).toLocaleString('en-US')} {L('SAR', 'ریال', 'ر.س')} <span className="text-gray-500">{d.vat_status === 'not_registered' ? L('(final price)', '(حتمی قیمت)', '(سعر نهائي)') : L('incl. VAT', 'ٹیکس سمیت', 'شامل الضريبة')}</span></div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: st.done ? '#0F6E56' : '#0B2438' }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: st.done ? '#0F6E56' : st.key === 'disputed' ? '#DC2626' : '#D4A543' }} aria-hidden />
                      {st.label}
                    </div>
                    {d.invoice_number && <div className="text-[12px] text-gray-500 mt-0.5" dir="ltr">{d.invoice_number}</div>}
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
