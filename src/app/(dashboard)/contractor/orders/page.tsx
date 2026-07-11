'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { dealStage } from '@/lib/dealStage'

// «صفقاتي» للمقاول — تجمع كل الصفقات المُرساة (العروض المقبولة) في مكان واحد مع مرحلتها
// ورقم الفاتورة، وترتبط بأمر الشراء/الفاتورة. كانت دورة الصفقة تُفتح فقط من الطلب الأصلي.
export default function ContractorDealsPage() {
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
      // RLS يعيد فقط العروض المقبولة على طلبات هذا المقاول
      const { data } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, title), supplier:profiles(company_name_ar)')
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
      const hay = `${d.rfq?.title || ''} ${d.rfq?.product_name || ''} ${d.supplier?.company_name_ar || ''} ${d.invoice_number || ''}`.toLowerCase()
      if (!hay.includes(search.trim().toLowerCase())) return false
    }
    return true
  })

  return (
    <AppShell title={locale === 'en' ? 'My Deals' : 'صفقاتي'} nav={getNav('contractor', locale, '/contractor/orders')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <input value={search} onChange={(e: any) => setSearch(e.target.value)}
          className="input-field mb-3" placeholder={locale === 'en' ? '🔍 Search deals (product, supplier, invoice №)…' : '🔍 ابحث في الصفقات (منتج، مورّد، رقم فاتورة)…'} />
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[{ k: 'all', l: locale === 'en' ? 'All' : 'الكل' }, { k: 'active', l: locale === 'en' ? 'Active' : 'جارية' }, { k: 'done', l: locale === 'en' ? 'Completed' : 'مكتملة' }, { k: 'disputed', l: locale === 'en' ? 'Disputed' : 'نزاعات' }].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${filter === f.k ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={filter === f.k ? { background: f.k === 'disputed' ? '#DC2626' : '#1B2D5B' } : {}}>{f.l}</button>
          ))}
          <span className="text-xs text-gray-400 ms-auto">{shown.length} {locale === 'en' ? 'deals' : 'صفقة'}</span>
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-500">{locale === 'en' ? 'No deals yet — accept an offer to start one.' : 'لا صفقات بعد — اقبل عرضاً لتبدأ صفقة.'}</p>
            <Link href="/contractor" className="inline-block mt-4 text-sm font-bold text-[#d96f15] hover:underline">{locale === 'en' ? 'Go to your requests →' : 'اذهب لطلباتك ←'}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d)
              return (
                <Link key={d.id} href={`/contractor/orders/${d.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#F5831F]/40 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{d.rfq?.title || d.rfq?.product_name || (locale === 'en' ? 'Deal' : 'صفقة')}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">🏭 {d.supplier?.company_name_ar || '—'} · {Number(d.total_price || 0).toLocaleString('en-US')} {locale === 'en' ? 'SAR' : 'ر.س'}</div>
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
