'use client'

import RequestsTabs from '@/components/buyer/RequestsTabs'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { getNav } from '@/lib/nav'
import { dealStage } from '@/lib/dealStage'
import { offerComparable, vatTag } from '@/lib/vat'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { readPageCache, writePageCache } from '@/lib/pageCache'
import { rfqDesc, rfqRefLine } from '@/lib/rfqName'
import { arDeals, countLabel } from '@/lib/text'

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

// what the buyer has to do at this stage (null = waiting on the supplier)
function buyerTodo(key: string, locale: string): string | null {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  if (key === 'delivered') return L('Your turn: confirm receipt', 'آپ کی باری: وصولی کی تصدیق کریں', 'مطلوب منك: تأكيد الاستلام')
  if (key === 'received') return L('Your turn: pay the supplier and record it', 'آپ کی باری: سپلائر کو ادائیگی کریں اور درج کریں', 'مطلوب منك: الدفع للمورد وتسجيله')
  return null
}

// «صفقاتي» للمقاول — تجمع كل الصفقات المُرساة (العروض المقبولة) في مكان واحد مع مرحلتها
// ورقم الفاتورة، وترتبط بأمر الشراء/الفاتورة. كانت دورة الصفقة تُفتح فقط من الطلب الأصلي.
export default function ContractorDealsPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'disputed'>('all')
  const [search, setSearch] = useState('')

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
    if (filter === 'active' && (st.done || st.key === 'disputed')) return false
    if (filter === 'disputed' && st.key !== 'disputed') return false
    if (q) {
      const hay = `${d.rfq?.title || ''} ${d.rfq?.product_name || ''} ${d.rfq ? rfqDesc(d.rfq, locale) : ''} ${d.rfq?.ref_no || ''} ${d.supplier?.company_name_ar || ''} ${d.invoice_number || ''} ${statementNo(d)}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
    // the deals waiting on the buyer first (stable otherwise: newest first)
    .map((d: any, i: number) => ({ d, i, todo: buyerTodo(dealStage(d, 'buyer', locale).key, locale) ? 0 : 1 }))
    .sort((a, b) => a.todo - b.todo || a.i - b.i)
    .map(x => x.d)
  const narrowed = deals.length > 0 && (filter !== 'all' || !!q)
  const SAR = L('SAR', 'ریال', 'ر.س')

  return (
    <AppShell title={L('My Deals', 'میری ڈیلز', 'صفقاتي')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <RequestsTabs active="deals" locale={locale} />
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} type="search"
          aria-label={L('Search deals', 'ڈیلز تلاش کریں', 'البحث في الصفقات')}
          className="input-field mb-3 text-base sm:text-sm" placeholder={L('Search deals (material, supplier, request or statement no.)…', 'ڈیلز تلاش کریں (سامان، سپلائر، درخواست یا اسٹیٹمنٹ نمبر)…', 'ابحث في الصفقات (مادة، مورد، رقم الطلب أو عرض السعر)…')} />
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[{ k: 'all', l: L('All', 'سب', 'الكل') }, { k: 'active', l: L('Active', 'جاری', 'جارية') }, { k: 'done', l: L('Completed', 'مکمل', 'مكتملة') }, { k: 'disputed', l: L('Problems', 'مسائل', 'مشكلات') }].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
              className={`shrink-0 min-h-[40px] px-3.5 rounded-xl text-sm font-semibold border transition-all ${filter === f.k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
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
              const todo = buyerTodo(st.key, locale)
              const amount = typeof d._amount === 'number' ? d._amount : offerComparable(d)
              const refLine = d.rfq ? rfqRefLine(d.rfq, locale) : ''
              return (
                <Link key={d.id} href={`/contractor/orders/${d.id}`}
                  className={`block bg-white rounded-2xl p-4 border shadow-sm transition-colors ${todo ? 'border-[#D4A543]/60' : 'border-gray-100 hover:border-[#D4A543]/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }} dir="auto">{d.rfq ? rfqDesc(d.rfq, locale) : L('Deal', 'ڈیل', 'صفقة')}</div>
                      {refLine && <div className="text-xs text-gray-500 mt-0.5" dir="auto">{refLine}</div>}
                      <div className="text-xs text-gray-500 mt-1 truncate"><SellerIcon name="store" className="w-3.5 h-3.5" /> {d.supplier?.company_name_ar || '—'} · <span className="font-bold text-[#8F6820]">{amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span> <span className="text-xs">({vatTag(d, locale)})</span></div>
                    </div>
                    <span className="shrink-0 text-lg leading-none mt-0.5" style={{ color: st.tone }} aria-hidden="true"><Glyph e={st.emoji} /></span>
                  </div>
                  {/* the stage in full (it says what happens next) with a four-step indicator (UX-101) */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {st.key !== 'disputed' && (
                      <span className="flex items-center gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map(n => <span key={n} className="w-2 h-2 rounded-full" style={{ background: n <= st.step ? (st.done ? '#0F6E56' : '#D4A543') : '#E5E7EB' }} />)}
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: st.key === 'disputed' ? '#B91C1C' : st.done ? '#0F6E56' : '#0B2438' }}>{st.label}</span>
                  </div>
                  {todo && (
                    <span className="inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#D4A543', color: '#071827' }}>{todo}</span>
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
