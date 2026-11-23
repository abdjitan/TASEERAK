import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/server'
import { supplierScore } from '@/lib/supplierScore'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import { tierLabel } from '@/lib/sellers'
import SupplierProfile from './SupplierProfile'

export const dynamic = 'force-dynamic'


async function getSupplier(id: string) {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase.rpc('get_supplier_public', { p_id: id })
    return Array.isArray(data) ? data[0] : data
  } catch { return null }
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params
  const s = await getSupplier(params.id)
  if (!s) return { title: 'مورد | تسعيرك', robots: { index: false, follow: true } }
  const name = s.company_name_ar || 'مورد'
  return {
    title: `${name} — مورد مواد بناء${s.region ? ' في ' + s.region : ''} | تسعيرك`,
    description: `${name}: مورد ${s.supplier_tier ? tierLabel(s.supplier_tier, 'ar', false) : ''} لمواد البناء${s.region ? ' في ' + s.region : ''} على منصة تسعيرك${s.verification_status === 'verified' ? '، موثّق عبر واثق' : ''}. اطلب تسعيرة الآن.`,
    alternates: { canonical: `/suppliers/${params.id}` },
    // a member's profile stays out of search results until they opt in (UX-115)
    robots: { index: false, follow: true },
  }
}

export default async function SupplierProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const s = await getSupplier(params.id)
  if (!s) notFound()
  const total = Number(s.total_offers) || 0
  const won = Number(s.won_deals) || 0
  const stats = { total_offers: total, won_rate: total > 0 ? (won / total) * 100 : 0, avg_response_hours: null }
  const score = supplierScore({ verification_status: s.verification_status, rating_avg: s.rating_avg }, stats)
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicHeader active="suppliers" />
      <SupplierProfile s={s} score={score} />
      <PublicFooter />
    </div>
  )
}
