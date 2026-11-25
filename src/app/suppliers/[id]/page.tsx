import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createPublicClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import { tierLabel } from '@/lib/sellers'
import SupplierProfile from './SupplierProfile'
import SupplierLoadFailed from './SupplierLoadFailed'

export const dynamic = 'force-dynamic'


// a network or server failure is not «this supplier does not exist» (round-6 UX-138)
// cache(): generateMetadata and the page share ONE call per request (round-7 UX-235)
const loadSupplier = cache(async (id: string): Promise<{ s: any; failed: boolean }> => {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('get_supplier_public', { p_id: id })
    if (error) return { s: null, failed: true }
    return { s: Array.isArray(data) ? data[0] : data, failed: false }
  } catch { return { s: null, failed: true } }
})
async function getSupplier(id: string) { return (await loadSupplier(id)).s }

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params
  const s = await getSupplier(params.id)
  if (!s) return { title: 'مورد | تسعيرك', robots: { index: false, follow: true } }
  const name = s.company_name_ar || 'مورد'
  return {
    title: `${name} — مورد مواد بناء${s.region ? ' في ' + s.region : ''} | تسعيرك`,
    description: `${name}: مورد ${s.supplier_tier ? tierLabel(s.supplier_tier, 'ar', false) : ''} لمواد البناء${s.region ? ' في ' + s.region : ''} على منصة تسعيرك${s.verification_status === 'verified' ? '، سجلّه التجاري موثّق' : ''}. اطلب تسعيرة الآن.`,
    alternates: { canonical: `/suppliers/${params.id}` },
    // a member's profile stays out of search results until they opt in (UX-115)
    robots: { index: false, follow: true },
  }
}

export default async function SupplierProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { s, failed } = await loadSupplier(params.id)
  if (failed) return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicHeader active="suppliers" />
      <SupplierLoadFailed />
      <PublicFooter />
    </div>
  )
  if (!s) notFound()
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicHeader active="suppliers" />
      <SupplierProfile s={s} />
      <PublicFooter />
    </div>
  )
}
