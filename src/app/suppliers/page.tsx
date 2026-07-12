import type { Metadata } from 'next'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/server'
import { supplierScore } from '@/lib/supplierScore'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import SuppliersDirectory from './SuppliersDirectory'

export const dynamic = 'force-dynamic' // عرض وقت الطلب — يتفادى إنشاء عميل Supabase وقت البناء (build-safe)

export const metadata: Metadata = {
  title: 'أفضل موردي مواد البناء في السعودية | تسعيرك',
  description: 'لوحة شرف الموردين على منصة تسعيرك — موردون موثّقون لمواد البناء مرتّبون حسب التقييم والموثوقية والصفقات المنجزة في جميع مناطق المملكة.',
  alternates: { canonical: '/suppliers' },
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
          <SuppliersDirectory suppliers={ranked} />
        )}

        <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">
          الدرجة تُحسب من: التوثيق عبر واثق + التقييم + نسبة الفوز بالعروض + النشاط. تتحدّث تلقائياً.
        </p>
      </main>

      <PublicFooter />
    </div>
  )
}
