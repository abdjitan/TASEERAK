import TaxonomyProvider from '@/components/shared/TaxonomyProvider'
import TermsGate from '@/components/shared/TermsGate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TaxonomyProvider>{children}</TaxonomyProvider>
      <TermsGate />
    </div>
  )
}
