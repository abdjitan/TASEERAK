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
  let listings: any[] = []
  try {
    const supabase = createPublicClient()
    const [{ data: lb }, { data: dl }] = await Promise.all([
      supabase.rpc('get_supplier_leaderboard'),
      supabase.rpc('get_directory_listings'),
    ])
    rows = Array.isArray(lb) ? lb : []
    listings = Array.isArray(dl) ? dl : []
  } catch { rows = []; listings = [] }

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
          {(ranked.length > 0 || listings.length > 0) && (
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
              <span>👥 {ranked.length + listings.length} مورد</span>
              {verifiedCount > 0 && <span>✅ {verifiedCount} موثّق</span>}
            </div>
          )}
        </div>

        {ranked.length === 0 && listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="font-bold text-gray-700 mb-1">قريباً</p>
            <p className="text-sm text-gray-400">سيظهر هنا أفضل الموردين بمجرد بدء الصفقات على المنصّة.</p>
            <Link href="/register" className="inline-block mt-5 px-6 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#F5831F' }}>سجّل كمورّد</Link>
          </div>
        ) : (
          <>
            {ranked.length > 0 && <SuppliersDirectory suppliers={ranked} />}
            {listings.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-bold mb-1" style={{ color: '#1B2D5B' }}>موردون في دليلنا</h2>
                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                  موردون معروفون في السوق لم يسجّلوا بعد. هل أحدها نشاطك؟{' '}
                  <Link href="/register" className="underline font-semibold" style={{ color: '#F5831F' }}>سجّله مجاناً</Link>{' '}
                  لاستقبال طلبات التسعير.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {listings.map((l: any) => (
                    <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-800 truncate">{l.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-gray-500">
                          {l.category && <span className="badge badge-gray text-[10px]">{l.category}</span>}
                          {l.region && <span>📍 {l.region}{l.city ? ` · ${l.city}` : ''}</span>}
                          {l.google_rating != null && <span>⭐ {l.google_rating}{l.google_reviews ? ` (${l.google_reviews})` : ''}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap border border-gray-200 rounded-lg px-2 py-1">غير مسجّل</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">
          الدرجة تُحسب من: التوثيق عبر واثق + التقييم + نسبة الفوز بالعروض + النشاط. تتحدّث تلقائياً.
        </p>
      </main>

      <PublicFooter />
    </div>
  )
}
