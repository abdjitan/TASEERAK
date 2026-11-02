import type { Metadata } from 'next'

// The page is a client component, so its title, description and canonical URL live here.
export const metadata: Metadata = {
  title: 'إنشاء حساب | تسعيرك',
  description: 'أنشئ حسابك مجاناً في تسعيرك: اطلب أسعار مواد البناء من عدة موردين، أو سجّل مورداً لتستقبل طلبات المشترين.',
  alternates: { canonical: '/register' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
