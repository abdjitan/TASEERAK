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
      const ck = 'corders_' + session.user.id // last list at once (page cache), refreshed below
      const snap = readPageCache(ck)
      if (snap) { setDeals(snap); setLoading(false); shown = true } else setLoading(true)
      // RLS يعيد فقط العروض المقبولة على طلبات هذا المقاول
      const { data, error } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, title), supplier:profiles(company_name_ar)')
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
      const list = (data || []).map((d: any) => awarded[d.id] != null ? { ...d, total_price: awarded[d.id] } : d)
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
      const hay = `${d.rfq?.title || ''} ${d.rfq?.product_name || ''} ${d.supplier?.company_name_ar || ''} ${d.invoice_number || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const narrowed = deals.length > 0 && (filter !== 'all' || !!q)
  const SAR = L('SAR', 'ریال', 'ر.س')

  return (
    <AppShell title={L('My Deals', 'میری ڈیلز', 'صفقاتي')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <RequestsTabs active="deals" locale={locale} />
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} type="search"
          aria-label={L('Search deals', 'ڈیلز تلاش کریں', 'البحث في الصفقات')}
          className="input-field mb-3" placeholder={L('Search deals (product, supplier, invoice №)…', 'ڈیلز تلاش کریں (مال، سپلائر، انوائس نمبر)…', 'ابحث في الصفقات (منتج، مورّد، رقم فاتورة)…')} />
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[{ k: 'all', l: L('All', 'سب', 'الكل') }, { k: 'active', l: L('Active', 'جاری', 'جارية') }, { k: 'done', l: L('Completed', 'مکمل', 'مكتملة') }, { k: 'disputed', l: L('Problems', 'مسائل', 'مشكلات') }].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${filter === f.k ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={filter === f.k ? { background: f.k === 'disputed' ? '#DC2626' : '#0B2438' } : {}}>{f.l}</button>
          ))}
          {!loadFailed && <span className="text-xs text-gray-400 ms-auto">{shown.length} {L('deals', 'ڈیلز', 'صفقة')}</span>}
        </div>

        {loadFailed ? (
          <LoadError onRetry={load} />
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3"><Glyph e="📦" /></div>
            {narrowed ? (
              <>
                <p className="text-gray-500">{q
                  ? L('No deals match your search.', 'آپ کی تلاش سے کوئی ڈیل نہیں ملی۔', 'لا توجد صفقات تطابق بحثك.')
                  : L('No deals under this filter.', 'اس فلٹر میں کوئی ڈیل نہیں۔', 'لا توجد صفقات ضمن هذا التصنيف.')}</p>
                <button type="button" onClick={() => { setFilter('all'); setSearch('') }} className="inline-block mt-4 text-sm font-bold text-[#8F6820] hover:underline">
                  {L('Show all deals', 'تمام ڈیلز دکھائیں', 'عرض كل الصفقات')}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500">{L('No deals yet — accept an offer to start one.', 'ابھی کوئی ڈیل نہیں — ڈیل شروع کرنے کے لیے کوئی پیشکش قبول کریں۔', 'لا توجد صفقات بعد — اقبل عرضاً لتبدأ صفقة.')}</p>
                <Link href="/contractor" className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-[#8F6820] hover:underline">
                  {L('Go to your requests', 'اپنی درخواستوں پر جائیں', 'اذهب إلى طلباتك')}
                  <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d, 'buyer', locale)
              const amount = offerComparable(d)
              return (
                <Link key={d.id} href={`/contractor/orders/${d.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#D4A543]/40 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{d.rfq?.title || d.rfq?.product_name || L('Deal', 'ڈیل', 'صفقة')}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate"><SellerIcon name="store" className="w-3.5 h-3.5" /> {d.supplier?.company_name_ar || '—'} · <span className="font-semibold text-gray-600">{amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {SAR}</span> <span className="text-[11px]">({vatTag(d, locale)})</span></div>
                    {d.invoice_number && <div className="text-[11px] text-gray-400 font-mono mt-0.5" dir="ltr">{d.invoice_number}</div>}
                  </div>
                  <div className="text-center rounded-xl px-3 py-2 shrink-0 min-w-[92px]" style={{ background: st.tone + '14', color: st.tone }}>
                    <div className="text-lg leading-none"><Glyph e={st.emoji} /></div>
                    <div className="text-[10px] font-bold leading-tight mt-0.5">{st.label.split('—')[0].trim()}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
