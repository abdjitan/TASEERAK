import type { Metadata } from 'next'
import { FEATURES } from '@/lib/features'
import { createPublicClient } from '@/lib/supabase/server'
import { supplierScore } from '@/lib/supplierScore'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import SuppliersPublic from './SuppliersPublic'

export const dynamic = 'force-dynamic' // عرض وقت الطلب — يتفادى إنشاء عميل Supabase وقت البناء (build-safe)

// The public directory is off at launch, as in the app (round-5 UX-069): no ranking and no
// «reliability out of 100» circles, only the «coming soon» card. Reads FEATURES.suppliersDirectory
// once that switch exists in src/lib/features.ts; until then it stays off.
const DIRECTORY_ON = (FEATURES as any).suppliersDirectory === true

export const metadata: Metadata = DIRECTORY_ON ? {
  title: 'أفضل موردي مواد البناء في السعودية | تسعيرك',
  description: 'لوحة شرف الموردين على منصة تسعيرك: موردون لمواد البناء مرتّبون حسب التوثيق والتقييم ودرجة الموثوقية في جميع مناطق المملكة.',
  alternates: { canonical: '/suppliers' },
  ...(FEATURES.priceBoard ? {} : { robots: { index: false, follow: true } }),
} : {
  title: 'دليل الموردين قريباً | تسعيرك',
  description: 'دليل موردي مواد البناء على تسعيرك قريباً. يمكنك الآن إرسال طلب تسعير فيصل إلى الموردين المختصين بموادك.',
  alternates: { canonical: '/suppliers' },
  robots: { index: false, follow: true },
}

export default async function SuppliersLeaderboard() {
  // جلب غير قاتل: حالة فارغة بدل كسر البناء إذا تعذّر الاتصال
  // The directory of businesses that never joined (gathered from public maps) is not shown while the
  // price board is off (UX-022): no consent from them yet, and it inflated the supplier count.
  let rows: any[] = []
  let listings: any[] = []
  if (DIRECTORY_ON) try {
    const supabase = createPublicClient()
    const [{ data: lb }, dl] = await Promise.all([
      supabase.rpc('get_supplier_leaderboard'),
      FEATURES.priceBoard ? supabase.rpc('get_directory_listings') : Promise.resolve({ data: [] as any[] }),
    ])
    rows = Array.isArray(lb) ? lb : []
    listings = Array.isArray(dl?.data) ? dl.data.filter((l: any) => !l.opted_out) : []
  } catch { rows = []; listings = [] }

  // احسب درجة كل مورد ثم رتّب تنازلياً
  const ranked = rows.map((r: any) => {
    const total = Number(r.total_offers) || 0
    const won = Number(r.won_deals) || 0
    const stats = { total_offers: total, won_rate: total > 0 ? (won / total) * 100 : 0, avg_response_hours: null }
    return { ...r, score: supplierScore({ verification_status: r.verification_status, rating_avg: r.rating_avg }, stats) }
  }).sort((a: any, b: any) => b.score - a.score)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicHeader active="suppliers" />
      <SuppliersPublic ranked={ranked} listings={listings} />
      <PublicFooter />
    </div>
  )
}
