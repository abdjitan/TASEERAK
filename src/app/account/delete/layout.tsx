import type { Metadata } from 'next'

// The page is a client component, so its title, description and canonical URL live here.
export const metadata: Metadata = {
  title: 'حذف الحساب | تسعيرك',
  description: 'كيف تحذف حسابك في تسعيرك وبياناتك المرتبطة به، من التطبيق أو بمراسلة الدعم.',
  alternates: { canonical: '/account/delete' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
