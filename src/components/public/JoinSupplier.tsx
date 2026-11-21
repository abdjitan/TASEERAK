'use client'
// «انضم كمورد» (owner 2026-11-21): the public, shareable supplier sign-up link /join. It never offers
// a buyer sign-up. ?i=<code> tags an invite batch (e.g. wa1) so the admin sees opens and sign-ups
// (migration 241); ?ref= (a user's own invite) passes through to the register page.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import SellerIcon from '@/components/shared/SellerIcon'

export const INVITE_CODE_KEY = 'tsk_invite_code'

export default function JoinSupplier() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [href, setHref] = useState('/register?role=supplier&only=1')

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    const raw = (qs.get('i') || '').toLowerCase()
    const code = /^[a-z0-9_-]{1,24}$/.test(raw) ? raw : 'direct'
    try { localStorage.setItem(INVITE_CODE_KEY, code) } catch {}
    const ref = qs.get('ref')
    if (ref) setHref('/register?role=supplier&only=1&ref=' + encodeURIComponent(ref))
    createClient().rpc('log_invite_open', { p_code: code }).then(() => {}, () => {})
  }, [])


  const points: [string, string][] = [
    [L('Requests that match what you sell', 'آپ کے سامان کے مطابق درخواستیں', 'طلبات تناسب ما تبيعه'), L('Only requests for your materials and your area reach you.', 'صرف آپ کے سامان اور علاقے کی درخواستیں۔', 'لا تصلك إلا طلبات موادك ومنطقتك.')],
    [L('Price from your phone', 'اپنے فون سے قیمت دیں', 'سعّر من جوالك'), L('A price per item, with VAT and delivery, in a minute.', 'ہر آئٹم کی قیمت، ٹیکس اور ڈیلیوری کے ساتھ، ایک منٹ میں۔', 'سعر لكل مادة، مع الضريبة والتوصيل، خلال دقيقة.')],
    [L('Competitors never see your prices', 'حریف آپ کی قیمتیں نہیں دیکھتے', 'منافسوك لا يرون أسعارك'), L('Only the buyer sees your offer.', 'آپ کی پیشکش صرف خریدار دیکھتا ہے۔', 'لا يرى عرضك إلا المشتري.')],
    [L('Free during launch', 'لانچ کے دوران مفت', 'مجاني خلال الإطلاق'), L('No commission and no subscription.', 'کوئی کمیشن یا سبسکرپشن نہیں۔', 'بلا عمولة ولا اشتراك.')],
  ]

  return (
    <div className="min-h-screen bg-canvas" dir={dir}>
      <header className="bg-white border-b border-line">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="تسعيرك" className="h-8 w-auto" />
            <span className="font-extrabold text-navy">تسعير<span className="text-orange">ك</span></span>
          </Link>
          <LanguageSwitcher variant="minimal" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="mb-3 inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#0B2438]/5 text-[#0B2438]"><SellerIcon name="building" className="w-9 h-9" /></div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy leading-snug">{L('Join Taseerak as a supplier', 'بطور سپلائر تسعیرک میں شامل ہوں', 'انضم إلى تسعيرك كمورد')}</h1>
          <p className="text-ink-2 mt-2 text-sm sm:text-base">{L('Shops, companies, distributors, factories and pricing agents: receive price requests from buyers near you.', 'دکانیں، کمپنیاں، ڈسٹری بیوٹرز، فیکٹریاں اور قیمت ایجنٹ: قریبی خریداروں سے قیمت کی درخواستیں حاصل کریں۔', 'للمحلات والشركات والموزّعين والمصانع ووسطاء التسعير: تصلك طلبات تسعير من مشترين قريبين منك.')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {points.map(([h, b]) => (
            <div key={h} className="bg-white rounded-2xl p-4 border border-line">
              <div className="font-bold text-navy text-sm">✓ {h}</div>
              <div className="text-xs text-ink-2 mt-1 leading-relaxed">{b}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-line text-center">
          <Link href={href} className="btn-orange inline-block px-8 py-3 rounded-xl font-extrabold">
            {L('Create a supplier account', 'سپلائر اکاؤنٹ بنائیں', 'أنشئ حساب مورد')}
          </Link>
          <p className="text-sm text-ink-2 mt-4">{L('Already have an account?', 'پہلے سے اکاؤنٹ ہے؟', 'لديك حساب؟')} <Link href="/login" className="font-extrabold text-orange-dark hover:underline">{L('Sign in', 'سائن اِن', 'تسجيل الدخول')}</Link></p>
        </div>
      </main>
    </div>
  )
}
