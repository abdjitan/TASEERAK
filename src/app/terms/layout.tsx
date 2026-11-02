import type { Metadata } from 'next'

// The page is a client component, so its title, description and canonical URL live here.
export const metadata: Metadata = {
  title: 'الشروط والأحكام | تسعيرك',
  description: 'الشروط والأحكام التي تنظّم استخدام منصة تسعيرك لطلب أسعار مواد البناء وتقديم العروض.',
  alternates: { canonical: '/terms' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
