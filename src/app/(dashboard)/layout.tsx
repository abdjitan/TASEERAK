import TaxonomyProvider from '@/components/shared/TaxonomyProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TaxonomyProvider>{children}</TaxonomyProvider>
    </div>
  )
}
