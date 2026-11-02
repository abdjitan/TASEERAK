import type { Metadata } from 'next'

// The page is a client component, so its title, description and canonical URL live here.
export const metadata: Metadata = {
  title: 'تسجيل الدخول | تسعيرك',
  description: 'ادخل إلى حسابك في تسعيرك لمتابعة طلبات التسعير والعروض والصفقات في مكان واحد.',
  alternates: { canonical: '/login' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
