'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INVITE_CODE_KEY } from '@/components/public/JoinSupplier'
import Link from 'next/link'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SIGNUP_KIND_KEY } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import { Check } from 'lucide-react'
import PublicFooter from '@/components/public/PublicFooter'
import Glyph from '@/components/shared/Glyph'
import { teamInviteHintText } from '@/lib/cr'

// Invitation landing pages: /join/company (factories, distributors, trading companies, shops)
// and /join/seller (pricing agents). They are ordinary public pages: the link only pre-selects the
// account kind at signup, it does not make anything private.
// UX-123: the button right under the title; sellers sign up and sign in by email (UX-053); the
// promise is the «موثّق» badge for everyone (a shop never gets the «verified companies» tier).

export default function JoinLanding({ kind }: { kind: 'company' | 'independent' }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  // Remember the kind through the signup.
  useEffect(() => { try { localStorage.setItem(SIGNUP_KIND_KEY, kind) } catch {} }, [kind])
  // round-2 UX-077: keep ?ref= and ?i= through to the sign-up (and between the two join pages), and count the open
  const [carry, setCarry] = useState('')
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search)
      const raw = (qs.get('i') || '').toLowerCase()
      const code = /^[a-z0-9_-]{1,24}$/.test(raw) ? raw : ''
      const ref = qs.get('ref') || ''
      const keep = new URLSearchParams()
      if (code) { keep.set('i', code); try { localStorage.setItem(INVITE_CODE_KEY, code) } catch {} }
      if (ref) keep.set('ref', ref)
      setCarry(keep.toString())
      if (code) createClient().rpc('log_invite_open', { p_code: code }).then(() => {}, () => {})
    } catch {}
  }, [])

  // UX-103: an invite link opens a seller-only sign-up (no buyer switch)
  const href = `/register?role=supplier&kind=${kind}&only=1&email=1${carry ? '&' + carry : ''}`
  const company = kind === 'company'
  // round-5 UX-162: the button names the kind (a pricing agent is not called a «supplier»)
  const cta = company
    ? L('Create your company or shop account for free', 'اپنا کمپنی یا دکان کا اکاؤنٹ مفت بنائیں', 'أنشئ حساب شركتك أو محلك مجاناً')
    : L('Create your account as a pricing agent for free', 'قیمت ایجنٹ کے طور پر اپنا اکاؤنٹ مفت بنائیں', 'أنشئ حسابك كوسيط تسعير مجاناً')

  const points = company
    ? [
        [L('Requests from buyers near you', 'قریبی خریداروں کی درخواستیں', 'طلبات من مشترين قريبين منك'), L('Only the materials you sell reach you.', 'صرف آپ کے سامان کی درخواستیں۔', 'لا تصلك إلا طلبات المواد التي تبيعها.')],
        [L('Quote from your phone in a minute', 'ایک منٹ میں فون سے قیمت', 'سعّر من جوالك خلال دقيقة'), L('A price per item, delivery included, in a minute.', 'ہر آئٹم کی قیمت، ڈیلیوری سمیت، ایک منٹ میں۔', 'سعر لكل مادة شامل التوصيل، خلال دقيقة.')],
        [L('«Verified» badge', '«تصدیق شدہ» بیج', 'شارة «موثّق»'), L('Verify your commercial registration and your offers carry the «Verified» badge.', 'اپنی تجارتی رجسٹریشن کی تصدیق کریں اور آپ کی آفرز پر «تصدیق شدہ» بیج آئے گا۔', 'وثّق سجلك التجاري لتحمل عروضك شارة «موثّق».')],
        [L('Your team', 'آپ کی ٹیم', 'فريق مبيعاتك'), L('Add your sales staff so they quote on behalf of the company.', 'اپنے سیلز ملازمین شامل کریں تاکہ وہ کمپنی کی جانب سے قیمت دیں۔', 'أضف موظفي المبيعات ليقدّموا العروض باسم الشركة.')],
      ]
    : [
        [L('For those who know the market without a shop', 'جو مارکیٹ جانتے ہیں مگر دکان نہیں', 'لمن يعرف السوق ولا يملك محلاً'), L('Bring buyers the prices of shops and suppliers you know; the deal is done with the shop’s invoice in the buyer’s name.', 'جن دکانوں کو آپ جانتے ہیں ان کی قیمتیں خریداروں تک لائیں؛ سودا دکان کی خریدار کے نام انوائس سے ہوتا ہے۔', 'قدّم للمشترين أسعار المحلات والموردين الذين تعرفهم، وتتم الصفقة بفاتورة المحل باسم المشتري.')],
        [L('Your sources are protected', 'آپ کے ذرائع محفوظ', 'مصادرك محفوظة'), L('Before the buyer chooses your offer, they see only the shop’s district; after it, the shop name (never its phone).', 'خریدار کے آپ کی آفر چننے سے پہلے وہ صرف دکان کا علاقہ دیکھتا ہے؛ بعد میں دکان کا نام (فون کبھی نہیں)۔', 'قبل أن يختار المشتري عرضك لا يرى إلا حي المحل، وبعده يرى اسم المحل دون رقم هاتفه.')],
        [L('A deal limit that grows', 'بڑھتی ہوئی حد', 'حدّ صفقة يكبر معك'), L('Up to 15,000 SAR per deal at first, then 50,000 after successful deals, then no limit.', 'شروع میں فی سودا 15,000 ریال، کامیاب سودوں کے بعد 50,000، پھر کوئی حد نہیں۔', 'حتى 15,000 ر.س للصفقة في البداية، ثم 50,000 بعد صفقات ناجحة، ثم بلا حد.')],
      ]

  return (
    <div className="min-h-screen bg-canvas" dir={dir}>
      <header className="bg-white border-b border-line">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label={L('Taseerak home', 'تسعیرک مرکزی صفحہ', 'تسعيرك، الرئيسية')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="h-14 w-auto" />
          </Link>
          <LanguageSwitcher variant="minimal" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <div className="text-center mb-6">
          <div className="mb-3 inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#0B2438]/5 text-[#0B2438]"><SellerIcon name={company ? 'building' : 'user'} className="w-8 h-8" /></div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy leading-snug">
            {company
              ? L('Join Taseerak as a company or shop', 'کمپنی یا دکان کے طور پر شامل ہوں', 'انضم إلى تسعيرك كشركة أو محل')
              : L('Join Taseerak as a pricing agent', 'قیمت ایجنٹ کے طور پر شامل ہوں', 'انضم إلى تسعيرك كوسيط تسعير')}
          </h1>
          <p className="text-ink-2 mt-2 text-sm sm:text-base">
            {company
              ? L('Factories, agents, distributors, trading companies and building-materials shops with a commercial registration.', 'تجارتی رجسٹریشن والی فیکٹریاں، ڈسٹری بیوٹرز، تجارتی کمپنیاں اور دکانیں۔', 'للمصانع والوكلاء والموزّعين والشركات التجارية ومحلات مواد البناء التي لديها سجل تجاري.')
              : L('For those who know the market and have no shop: bring shop prices to buyers.', 'جو مارکیٹ جانتے ہیں اور دکان نہیں رکھتے: دکانوں کی قیمتیں خریداروں تک لائیں۔', 'لمن يعرف السوق ولا يملك محلاً: اجلب أسعار المحلات للمشترين.')}
          </p>
          <Link href={href} className="mt-5 flex items-center justify-center w-full sm:max-w-sm sm:mx-auto min-h-[52px] rounded-xl font-extrabold text-[#071827] text-base" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            {cta}
          </Link>
          <p className="text-sm text-ink-2 mt-3">
            {L('Already have an account?', 'پہلے سے اکاؤنٹ ہے؟', 'لديك حساب؟')} <Link href="/login?m=email" className="inline-flex items-center min-h-[44px] font-extrabold text-orange-dark hover:underline">{L('Sign in', 'سائن اِن', 'تسجيل الدخول')}</Link>
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {points.map(([h, b]) => (
            <div key={h} className="bg-white rounded-2xl p-4 border border-line">
              <div className="font-bold text-navy text-sm flex items-center gap-1.5"><Check className="w-4 h-4 text-[#8F6820] shrink-0" aria-hidden />{h}</div>
              <div className="text-[13px] text-ink-2 mt-1 leading-relaxed">{b}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[13px] text-ink-2">
          {L('Free to join. No commission during launch.', 'رجسٹریشن مفت، لانچ کے دوران کوئی کمیشن نہیں۔', 'التسجيل مجاني، ولا عمولة خلال فترة الإطلاق.')}{' '}
          {company
            ? <Link href={`/join/seller${carry ? "?" + carry : ""}`} className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('No shop? Join as a pricing agent', 'دکان نہیں؟ قیمت ایجنٹ کے طور پر شامل ہوں', 'ليس لديك محل؟ سجّل كوسيط تسعير')}</Link>
            : <Link href={`/join/company${carry ? "?" + carry : ""}`} className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Representing a company or shop? Join here', 'کمپنی یا دکان؟ یہاں شامل ہوں', 'تمثّل شركة أو محلاً؟ سجّل من هنا')}</Link>}
        </p>
        {company && <p className="text-center text-[13px] text-ink-2 mt-1"><Glyph e="👥" /> {teamInviteHintText(locale)}</p>}

        {/* round-5 UX-162: a closing call to action, as on /join */}
        <div className="mt-8 rounded-2xl p-6 text-center text-white" style={{ background: 'linear-gradient(135deg,#071827,#102E45)' }}>
          <h2 className="text-xl font-extrabold">{L('Ready to start?', 'شروع کرنے کے لیے تیار ہیں؟', 'جاهز للبدء؟')}</h2>
          <Link href={href} className="mt-4 flex items-center justify-center w-full sm:max-w-sm sm:mx-auto min-h-[52px] px-4 rounded-xl font-extrabold text-[#071827] text-base" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            {cta}
          </Link>
          <p className="text-sm text-white/80 mt-3">{L('Already have an account?', 'پہلے سے اکاؤنٹ ہے؟', 'لديك حساب؟')} <Link href="/login?m=email" className="inline-flex items-center min-h-[44px] font-extrabold text-[#F5C55B] hover:underline">{L('Sign in', 'سائن اِن', 'تسجيل الدخول')}</Link></p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
