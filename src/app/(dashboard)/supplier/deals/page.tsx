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

// «صفقاتي» للمورّد — الصفقات المُرساة عليه (عروضه المقبولة) مع مرحلتها، وترتبط بصفحة إدارة
// الصفقة (حماية الصفقة: تسليم/استلام/دفع). الهوية تُكشف بعد الترسية فقط.
export default function SupplierDealsPage() {
  const { locale, dir } = useTranslation()
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'disputed'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: actRaw } = await supabase.rpc('acting_uid') // a team member sees the company's deals
      const actId: string = (actRaw as any) || session.user.id
      const { data } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, title, ref_no, items, contractor:profiles!contractor_id(company_name_ar))')
        .eq('supplier_id', actId)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })
        .limit(200)
      setDeals(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const shown = deals.filter((d: any) => {
    const st = dealStage(d)
    if (filter === 'done' && !st.done) return false
    if (filter === 'active' && (st.done || st.key === 'disputed')) return false
    if (filter === 'disputed' && st.key !== 'disputed') return false
    if (search.trim()) {
      const hay = `${d.rfq?.title || ''} ${d.rfq?.product_name || ''} ${d.rfq?.contractor?.company_name_ar || ''} ${d.invoice_number || ''}`.toLowerCase()
      if (!hay.includes(search.trim().toLowerCase())) return false
    }
    return true
  })

  return (
    <AppShell title={locale === 'en' ? 'My Deals' : locale === 'ur' ? 'میری ڈیلز' : 'صفقاتي'} nav={getNav('supplier', locale, '/supplier/deals')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        {/* «عروضي وصفقاتي» (owner 2026-10-17, same as the app): offers waiting for the buyer live on the home list */}
        <div role="tablist" className="inline-flex p-1 rounded-xl bg-gray-100 mb-4">
          <a href="/supplier/dashboard?tab=offers" role="tab" aria-selected="false" className="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-[#0B2438]">{locale === 'en' ? 'Waiting for decision' : locale === 'ur' ? 'فیصلے کے منتظر' : 'بانتظار القرار'}</a>
          <span role="tab" aria-selected="true" className="px-5 py-2 rounded-lg text-sm font-bold bg-white shadow-sm text-[#0B2438]">{locale === 'en' ? 'My deals' : locale === 'ur' ? 'میری ڈیلز' : 'صفقاتي'}</span>
        </div>
        <input value={search} onChange={(e: any) => setSearch(e.target.value)}
          className="input-field mb-3" placeholder={locale === 'en' ? 'Search deals (product, buyer, invoice №)…' : locale === 'ur' ? 'ڈیلز تلاش کریں (مال، خریدار، انوائس نمبر)…' : 'ابحث في الصفقات (منتج، مشترٍ، رقم فاتورة)…'} />
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[{ k: 'all', l: locale === 'en' ? 'All' : locale === 'ur' ? 'سب' : 'الكل' }, { k: 'active', l: locale === 'en' ? 'Active' : locale === 'ur' ? 'جاری' : 'جارية' }, { k: 'done', l: locale === 'en' ? 'Completed' : locale === 'ur' ? 'مکمل' : 'مكتملة' }, { k: 'disputed', l: locale === 'en' ? 'Problems' : locale === 'ur' ? 'مسائل' : 'مشكلات' }].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${filter === f.k ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={filter === f.k ? { background: f.k === 'disputed' ? '#DC2626' : '#0F6E56' } : {}}>{f.l}</button>
          ))}
          <span className="text-xs text-gray-400 ms-auto">{shown.length} {locale === 'en' ? 'deals' : locale === 'ur' ? 'ڈیلز' : 'صفقة'}</span>
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3"><Glyph e="📦" /></div>
            <p className="text-gray-500">{locale === 'en' ? 'No deals yet — once a buyer accepts one of your offers, the deal appears here.' : locale === 'ur' ? 'ابھی کوئی ڈیل نہیں — جب خریدار آپ کی کوئی پیشکش قبول کرے گا تو ڈیل یہاں نظر آئے گی۔' : 'لا توجد صفقات بعد — عندما يقبل مشترٍ أحد عروضك تظهر الصفقة هنا.'}</p>
            <Link href="/supplier/dashboard" className="inline-block mt-4 text-sm font-bold text-[#0F6E56] hover:underline">{locale === 'en' ? 'Browse requests →' : locale === 'ur' ? 'درخواستیں دیکھیں ←' : 'تصفّح الطلبات ←'}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d)
              return (
                <Link key={d.id} href={`/supplier/dashboard/rfq/${d.rfq?.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#0F6E56]/40 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{d.rfq ? rfqDisplayName({ ...d.rfq, title: null }, locale) : (locale === 'en' ? 'Deal' : locale === 'ur' ? 'ڈیل' : 'صفقة')}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate"><Glyph e="👤" /> {d.rfq?.contractor?.company_name_ar || '—'} · {Number(d.total_price || 0).toLocaleString('en-US')} {locale === 'en' ? 'SAR' : locale === 'ur' ? 'ریال' : 'ر.س'}</div>
                    {d.invoice_number && <div className="text-[11px] text-gray-400 font-mono mt-0.5" dir="ltr">{d.invoice_number}</div>}
                  </div>
                  <div className="text-center rounded-xl px-3 py-2 shrink-0 min-w-[92px]" style={{ background: st.tone + '14', color: st.tone }}>
                    <div className="text-lg leading-none">{st.emoji}</div>
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
