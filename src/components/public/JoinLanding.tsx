'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { PHONE_OTP_ENABLED } from '@/lib/features'
import { SIGNUP_KIND_KEY } from '@/lib/sellers'

// Invitation landing pages: /join/company (factories, distributors, trading companies, shops)
// and /join/seller (independent sellers, brokers, price agents). They are ordinary public pages:
// the link only pre-selects the account kind at signup, it does not make anything private.

export default function JoinLanding({ kind }: { kind: 'company' | 'independent' }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  // Remember the kind through the signup (the phone flow passes through /login first).
  useEffect(() => { try { localStorage.setItem(SIGNUP_KIND_KEY, kind) } catch {} }, [kind])

  const href = PHONE_OTP_ENABLED ? '/login' : `/register?role=supplier&kind=${kind}`
  const company = kind === 'company'

  const points = company
    ? [
        [L('Requests from buyers near you', 'قریبی خریداروں کی درخواستیں', 'طلبات من مشترين قريبين منك'), L('Only the materials you sell reach you.', 'صرف آپ کا سامان۔', 'لا تصلك إلا طلبات المواد التي تبيعها.')],
        [L('Quote from your phone in a minute', 'ایک منٹ میں قیمت', 'سعّر من جوالك خلال دقيقة'), L('Per item, with VAT and delivery.', 'ہر آئٹم کی قیمت۔', 'سعر لكل مادة، مع الضريبة والتوصيل.')],
        [L('Verified badge', 'تصدیقی بیج', 'شارة «شركات ومصانع معتمدة»'), L('Verify your CR and buyers see you among verified companies.', 'سی آر کی تصدیق کریں۔', 'وثّق سجلك التجاري لتظهر للمشترين ضمن الشركات المعتمدة.')],
        [L('Your team', 'آپ کی ٹیم', 'فريق مبيعاتك'), L('Add your sales staff so they quote on behalf of the company.', 'اپنے ملازمین شامل کریں۔', 'أضف موظفي المبيعات ليقدّموا العروض باسم الشركة.')],
      ]
    : [
        [L('You know the market', 'آپ مارکیٹ جانتے ہیں', 'تعرف السوق والمحلات'), L('Bring prices from shops and suppliers you know.', 'دکانوں سے قیمتیں لائیں۔', 'قدّم أسعاراً من المحلات والموردين الذين تعرفهم.')],
        [L('No shop or CR needed', 'دکان یا سی آر ضروری نہیں', 'لا تحتاج إلى محل أو سجل تجاري'), L('Your trust comes from your ratings.', 'اعتماد ریٹنگ سے۔', 'تُبنى ثقتك من تقييمات المشترين.')],
        [L('Clear and honest', 'واضح اور ایماندار', 'وضوح للمشتري'), L('Each quote says where the price comes from.', 'ہر قیمت کا ذریعہ بتائیں۔', 'كل عرض يوضّح مصدر السعر: من مخزونك أو من محل أو عن طريق وسيط.')],
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
          <div className="text-5xl mb-3">{company ? '🏢' : '🧑‍💼'}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy leading-snug">
            {company
              ? L('Join Taseerak as a company', 'کمپنی کے طور پر شامل ہوں', 'انضم إلى تسعيرك كشركة أو محل')
              : L('Join Taseerak as an independent seller', 'آزاد فروخت کنندہ کے طور پر شامل ہوں', 'انضم إلى تسعيرك كبائع مستقل')}
          </h1>
          <p className="text-ink-2 mt-2 text-sm sm:text-base">
            {company
              ? L('Factories, agents, distributors, trading companies and building-materials shops.', 'فیکٹریاں، ڈسٹری بیوٹرز اور دکانیں۔', 'للمصانع والوكلاء والموزّعين والشركات التجارية ومحلات مواد البناء.')
              : L('Sellers, brokers and price agents who source materials from the market.', 'بروکرز اور پرائس ایجنٹس۔', 'للبائعين والوسطاء ووكلاء الأسعار الذين يوفّرون المواد من السوق.')}
          </p>
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
          <p className="text-sm text-ink-2 mb-4">{L('Free to join. No commission during launch.', 'مفت رجسٹریشن۔', 'التسجيل مجاني، ولا عمولة خلال فترة الإطلاق.')}</p>
          <Link href={href} className="btn-orange inline-block px-8 py-3 rounded-xl font-extrabold">
            {L('Create your account', 'اکاؤنٹ بنائیں', 'أنشئ حسابك')}
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            {L('Already registered?', 'پہلے سے رجسٹرڈ؟', 'لديك حساب؟')} <Link href="/login" className="font-bold text-orange-dark hover:underline">{L('Sign in', 'لاگ ان', 'تسجيل الدخول')}</Link>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {company
              ? <Link href="/join/seller" className="hover:underline">{L('Independent seller? Join here', 'آزاد فروخت کنندہ؟', 'بائع مستقل؟ سجّل من هنا')}</Link>
              : <Link href="/join/company" className="hover:underline">{L('Representing a company or shop? Join here', 'کمپنی؟ یہاں', 'تمثّل شركة أو محلاً؟ سجّل من هنا')}</Link>}
          </p>
        </div>
      </main>
    </div>
  )
}
