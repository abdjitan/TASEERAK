import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/server'
import { supplierScore, scoreColor, approvalLabel } from '@/lib/supplierScore'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'

export const dynamic = 'force-dynamic'

const TIERS: Record<string, string> = {
  manufacturer: '🏭 مصنع / مورد رئيسي',
  commercial: '🏪 مورد تجاري',
  local: '🏬 مورد محلي',
}

async function getSupplier(id: string) {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase.rpc('get_supplier_public', { p_id: id })
    return Array.isArray(data) ? data[0] : data
  } catch { return null }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const s = await getSupplier(params.id)
  if (!s) return { title: 'مورد | تسعيرك' }
  const name = s.company_name_ar || 'مورد'
  return {
    title: `${name} — مورد مواد بناء${s.region ? ' في ' + s.region : ''} | تسعيرك`,
    description: `${name}: مورد ${TIERS[s.supplier_tier] || ''} لمواد البناء${s.region ? ' في ' + s.region : ''} على منصة تسعيرك${s.verification_status === 'verified' ? '، موثّق عبر واثق' : ''}. اطلب تسعيرة الآن.`,
    alternates: { canonical: `/suppliers/${params.id}` },
  }
}

export default async function SupplierProfilePage({ params }: { params: { id: string } }) {
  const s = await getSupplier(params.id)
  if (!s) notFound()
  const total = Number(s.total_offers) || 0
  const won = Number(s.won_deals) || 0
  const stats = { total_offers: total, won_rate: total > 0 ? (won / total) * 100 : 0, avg_response_hours: null }
  const score = supplierScore({ verification_status: s.verification_status, rating_avg: s.rating_avg }, stats)
  const rating = Number(s.rating_avg) || 0

  return (
    <div className="min-h-screen bg-[#f7f8fa]" dir="rtl">
      <PublicHeader active="suppliers" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/suppliers" className="text-sm text-gray-500 hover:text-[#1B2D5B]">← لوحة شرف الموردين</Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 shrink-0 grid place-items-center rounded-2xl text-2xl" style={{ background: '#1B2D5B' }}>🏢</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold" style={{ color: '#1B2D5B' }}>{s.company_name_ar || 'مورد'}</h1>
                {s.verification_status === 'verified' && <span className="badge text-[11px]" style={{ background: '#0F6E5614', color: '#0F6E56' }}>{s.cr_verification_source === 'wathq' ? '🛡 موثّق عبر واثق' : '✓ موثّق'}</span>}
              </div>
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                <span>{TIERS[s.supplier_tier] || '🏬 مورد'}</span>
                {s.region && <span>📍 {s.region}{s.city ? ` · ${s.city}` : ''}</span>}
              </div>
            </div>
            <div className="shrink-0 text-center">
              <div className="w-16 h-16 grid place-items-center rounded-full font-extrabold text-xl text-white" style={{ background: scoreColor(score) }}>{score}</div>
              <div className="text-[9px] text-gray-400 mt-1">درجة الموثوقية</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { l: 'التقييم', v: rating > 0 ? `⭐ ${rating.toFixed(1)}` : '—', sub: s.rating_count ? `${s.rating_count} تقييم` : '' },
              { l: 'العروض', v: total.toLocaleString('en-US'), sub: 'عرض مقدَّم' },
              { l: 'الصفقات', v: won.toLocaleString('en-US'), sub: 'صفقة منجزة' },
            ].map((k: any) => (
              <div key={k.l} className="rounded-xl bg-[#f7f8fa] p-3 text-center">
                <div className="text-lg font-extrabold" style={{ color: '#1B2D5B' }}>{k.v}</div>
                <div className="text-[11px] text-gray-500">{k.l}</div>
                {k.sub && <div className="text-[9px] text-gray-400">{k.sub}</div>}
              </div>
            ))}
          </div>

          {Array.isArray(s.approvals) && s.approvals.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold text-gray-400 mb-2">🏅 اعتمادات جهات كبرى</div>
              <div className="flex gap-1.5 flex-wrap">
                {s.approvals.map((a: string) => <span key={a} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: '#1B2D5B0d', color: '#1B2D5B' }}>🏅 {approvalLabel(a)}</span>)}
              </div>
            </div>
          )}

          {Array.isArray(s.recent_reviews) && s.recent_reviews.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-400 mb-3">💬 آراء المقاولين</div>
              <div className="space-y-3">
                {s.recent_reviews.map((rv: any, i: number) => (
                  <div key={i} className="rounded-xl bg-[#f7f8fa] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 text-sm" aria-label={`${rv.rating} من 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= rv.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>)}
                      </div>
                      {rv.created_at && <span className="text-[10px] text-gray-400">{new Date(rv.created_at).toLocaleDateString('ar-SA-u-ca-gregory')}</span>}
                    </div>
                    {rv.comment && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{rv.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">اطلب تسعيرة ينافس عليها {s.company_name_ar || 'هذا المورد'} وغيره من أفضل الموردين.</p>
            <Link href="/register" className="inline-block px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ background: '#F5831F' }}>اطلب تسعيرة مجاناً</Link>
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-6">عضو منذ {new Date(s.member_since).toLocaleDateString('ar-SA-u-ca-gregory')}</p>
      </main>
      <PublicFooter />
    </div>
  )
}
