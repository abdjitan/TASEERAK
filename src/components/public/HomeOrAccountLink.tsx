'use client'
import { useTranslation } from '@/i18n'
import { useSignedIn } from './useSignedIn'

// Top link on the public/legal pages: «الرئيسية» for a visitor, «العودة إلى حسابي» for a signed-in
// user (UX-143). /login sends a signed-in user to their own home.
export default function HomeOrAccountLink({ homeLabel }: { homeLabel: string }) {
  const { locale } = useTranslation()
  const signedIn = useSignedIn()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  return (
    <a href={signedIn ? '/login' : '/'} className="min-h-[44px] inline-flex items-center px-2 text-sm font-semibold text-[#0B2438] hover:underline">
      {signedIn ? L('Back to my account', 'اپنے اکاؤنٹ پر واپس', 'العودة إلى حسابي') : homeLabel}
    </a>
  )
}
