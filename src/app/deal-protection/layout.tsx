import type { Metadata } from 'next'

// The page is a client component, so its title, description and canonical URL live here.
export const metadata: Metadata = {
  title: 'كيف نحمي صفقتك | تسعيرك',
  description: 'خطوات حماية الصفقة في تسعيرك: من اختيار العرض إلى التسليم والاستلام والدفع، وما تفعله عند وجود مشكلة.',
  alternates: { canonical: '/deal-protection' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
