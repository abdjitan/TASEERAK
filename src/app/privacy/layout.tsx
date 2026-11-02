import type { Metadata } from 'next'

// The page is a client component, so its title, description and canonical URL live here.
export const metadata: Metadata = {
  title: 'سياسة الخصوصية | تسعيرك',
  description: 'كيف تجمع منصة تسعيرك بياناتك الشخصية وتستخدمها وتحميها، وحقوقك وفق نظام حماية البيانات الشخصية.',
  alternates: { canonical: '/privacy' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
