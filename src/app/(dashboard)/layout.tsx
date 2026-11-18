import TaxonomyProvider from '@/components/shared/TaxonomyProvider'
import TermsGate from '@/components/shared/TermsGate'
import VerifyGateProvider from '@/components/shared/VerifyGate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TaxonomyProvider><VerifyGateProvider>{children}</VerifyGateProvider></TaxonomyProvider>
      <TermsGate />
    </div>
  )
}
