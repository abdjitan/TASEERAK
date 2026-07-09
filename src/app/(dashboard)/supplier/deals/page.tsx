'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { dealStage } from '@/lib/dealStage'

// «صفقاتي» للمورّد — الصفقات المُرساة عليه (عروضه المقبولة) مع مرحلتها، وترتبط بصفحة إدارة
// الصفقة (حماية الصفقة: تسليم/استلام/دفع). الهوية تُكشف بعد الترسية فقط.
export default function SupplierDealsPage() {
  const { locale, dir } = useTranslation()
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data } = await supabase
        .from('offers')
        .select('*, rfq:rfqs(id, product_name, title, contractor:profiles!contractor_id(company_name_ar))')
        .eq('supplier_id', session.user.id)
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
    if (filter === 'all') return true
    const st = dealStage(d)
    return filter === 'done' ? st.done : !st.done
  })

  return (
    <AppShell title={locale === 'en' ? 'My Deals' : 'صفقاتي'} nav={getNav('supplier', locale, '/supplier/deals')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-5">
          {[{ k: 'all', l: locale === 'en' ? 'All' : 'الكل' }, { k: 'active', l: locale === 'en' ? 'Active' : 'جارية' }, { k: 'done', l: locale === 'en' ? 'Completed' : 'مكتملة' }].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${filter === f.k ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={filter === f.k ? { background: '#0F6E56' } : {}}>{f.l}</button>
          ))}
          <span className="text-xs text-gray-400 ms-auto">{shown.length} {locale === 'en' ? 'deals' : 'صفقة'}</span>
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-500">{locale === 'en' ? 'No deals yet — win an offer to start one.' : 'لا صفقات بعد — افز بعرض لتبدأ صفقة.'}</p>
            <Link href="/supplier/dashboard" className="inline-block mt-4 text-sm font-bold text-[#0F6E56] hover:underline">{locale === 'en' ? 'Browse requests →' : 'تصفّح الطلبات ←'}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((d: any) => {
              const st = dealStage(d)
              return (
                <Link key={d.id} href={`/supplier/dashboard/rfq/${d.rfq?.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#0F6E56]/40 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{d.rfq?.title || d.rfq?.product_name || (locale === 'en' ? 'Deal' : 'صفقة')}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">👤 {d.rfq?.contractor?.company_name_ar || '—'} · {Number(d.total_price || 0).toLocaleString('en-US')} {locale === 'en' ? 'SAR' : 'ر.س'}</div>
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
