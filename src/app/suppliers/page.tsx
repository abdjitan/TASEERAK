import type { Metadata } from 'next'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/server'
import { supplierScore, scoreColor, approvalLabel } from '@/lib/supplierScore'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'

export const dynamic = 'force-dynamic' // عرض وقت الطلب — يتفادى إنشاء عميل Supabase وقت البناء (build-safe)

export const metadata: Metadata = {
  title: 'أفضل موردي مواد البناء في السعودية | تسعيرك',
  description: 'لوحة شرف الموردين على منصة تسعيرك — موردون موثّقون لمواد البناء مرتّبون حسب التقييم والموثوقية والصفقات المنجزة في جميع مناطق المملكة.',
  alternates: { canonical: '/suppliers' },
}

const TIERS: Record<string, string> = {
  manufacturer: '🏭 مصنع / مورد رئيسي',
  commercial: '🏪 مورد تجاري',
  local: '🏬 مورد محلي',
}

function rankBadge(i: number) {
  if (i === 0) return { e: '🥇', c: '#D4AF37' }
  if (i === 1) return { e: '🥈', c: '#9CA3AF' }
  if (i === 2) return { e: '🥉', c: '#CD7F32' }
  return { e: `${i + 1}`, c: '#1B2D5B' }
}

export default async function SuppliersLeaderboard() {
  // جلب غير قاتل: حالة فارغة بدل كسر البناء إذا تعذّر الاتصال
  let rows: any[] = []
  try {
    const supabase = createPublicClient()
    const { data } = await supabase.rpc('get_supplier_leaderboard')
    rows = Array.isArray(data) ? data : []
  } catch { rows = [] }

  // احسب درجة كل مورد ثم رتّب تنازلياً
  const ranked = rows.map((r: any) => {
    const total = Number(r.total_offers) || 0
    const won = Number(r.won_deals) || 0
    const stats = { total_offers: total, won_rate: total > 0 ? (won / total) * 100 : 0, avg_response_hours: null }
    return { ...r, score: supplierScore({ verification_status: r.verification_status, rating_avg: r.rating_avg }, stats) }
  }).sort((a: any, b: any) => b.score - a.score)

  const verifiedCount = ranked.filter((r: any) => r.verification_status === 'verified').length

  return (
    <div className="min-h-screen bg-[#f7f8fa]" dir="rtl">
      <PublicHeader active="suppliers" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* الترويسة */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: '#1B2D5B' }}>🏆 لوحة شرف الموردين</h1>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            موردون لمواد البناء على منصة تسعيرك، مرتّبون حسب التوثيق والتقييم والصفقات المنجزة. كل مورد يحصل على «درجة موثوقية» من ١٠٠.
          </p>
          {ranked.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
              <span>👥 {ranked.length} مورد</span>
              <span>✅ {verifiedCount} موثّق</span>
            </div>
          )}
        </div>

        {ranked.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="font-bold text-gray-700 mb-1">قريباً</p>
            <p className="text-sm text-gray-400">سيظهر هنا أفضل الموردين بمجرد بدء الصفقات على المنصّة.</p>
            <Link href="/register" className="inline-block mt-5 px-6 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#F5831F' }}>سجّل كمورّد</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ranked.map((r: any, i: number) => {
              const rb = rankBadge(i)
              const rating = Number(r.rating_avg) || 0
              return (
                <div key={r.supplier_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  {/* الترتيب */}
                  <div className="w-10 h-10 shrink-0 grid place-items-center rounded-xl font-extrabold text-lg" style={{ color: rb.c, background: `${rb.c}14` }}>{rb.e}</div>

                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{r.company_name_ar || 'مورد'}</span>
                      {r.verification_status === 'verified' && <span className="badge text-[10px]" style={{ background: '#0F6E5614', color: '#0F6E56' }}>✓ موثّق</span>}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{TIERS[r.supplier_tier] || '🏬 مورد'}</span>
                      {r.region && <span>📍 {r.region}</span>}
                      {rating > 0 && <span>⭐ {rating.toFixed(1)}</span>}
                      <span>📦 {r.total_offers} عرض</span>
                      <span>🤝 {r.won_deals} صفقة</span>
                    </div>
                    {Array.isArray(r.approvals) && r.approvals.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {r.approvals.slice(0, 4).map((a: string) => (
                          <span key={a} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#1B2D5B0d', color: '#1B2D5B' }}>🏅 {approvalLabel(a)}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* الدرجة */}
                  <div className="shrink-0 text-center">
                    <div className="w-14 h-14 grid place-items-center rounded-full font-extrabold text-lg text-white" style={{ background: scoreColor(r.score) }}>{r.score}</div>
                    <div className="text-[9px] text-gray-400 mt-1">من ١٠٠</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">
          الدرجة تُحسب من: التوثيق عبر واثق + التقييم + نسبة الفوز بالعروض + النشاط. تتحدّث تلقائياً.
        </p>
      </main>

      <PublicFooter />
    </div>
  )
}
