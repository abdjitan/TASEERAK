'use client'
// «الدعم» (owner 2026-11-16): one place to reach Taseerak — the company WhatsApp, or a message to
// the admin team (support_messages thread, answered from /admin/users/<id>).
// ?topic=kind pre-fills a request to change the account type (company ↔ pricing agent), which only
// the admin can approve.
// Inside the app shell (menu + bottom bar, UX-033). A suspended or not-yet-verified seller (the
// middleware lets them reach this page) gets the simple gate header with «back» instead.
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import SupportThread from '@/components/shared/SupportThread'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { askConfirm } from '@/lib/askConfirm'
import { friendlyError } from '@/lib/friendlyError'
import { storedBuyerType } from '@/lib/buyerType'
import GateHeader from '../verify/GateHeader'

const SUPPORT_WHATSAPP = '12135614366'

export default function SupportPage() {
  return <Suspense fallback={<PageLoader />}><Support /></Suspense>
}

function Support() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const search = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [me, setMe] = useState<any>(null) // role + supplier_conversion_requested_at (238)
  const [loaded, setLoaded] = useState(false)
  const [convMsg, setConvMsg] = useState('')
  const [buyerType, setBuyerType] = useState<string | null>(null)
  // the mobile counts as missing only while verifying it is required (UX-117)
  const [phoneRequired, setPhoneRequired] = useState(false)
  useEffect(() => {
    setBuyerType(storedBuyerType())
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }: any) => {
      const uid = data?.user?.id || null
      setUserId(uid)
      if (uid) {
        const [{ data: p }, { data: req }] = await Promise.all([
          sb.from('profiles')
            .select('role, buyer_type, supplier_conversion_requested_at, banned_until, phone_verified_at, email_verified_at')
            .eq('id', uid).maybeSingle(),
          sb.rpc('phone_verify_required'),
        ])
        setMe(p)
        setPhoneRequired(req === true)
      }
      setLoaded(true)
    }, () => setLoaded(true))
  }, [])
  async function askConversion() {
    if (!(await askConfirm(L('Ask to turn your account into a supplier account? Your number and email stay the same; the team reviews the request.', 'اپنے اکاؤنٹ کو سپلائر اکاؤنٹ میں بدلنے کی درخواست کریں؟ آپ کا نمبر اور ای میل وہی رہیں گے؛ ٹیم درخواست کا جائزہ لے گی۔', 'طلب تحويل حسابك إلى حساب مورد؟ يبقى رقمك وبريدك كما هما، ويراجع الفريق الطلب.')))) return
    const { error } = await createClient().rpc('request_supplier_conversion', { p_note: null })
    if (error) { setConvMsg(friendlyError(error.message, L('Could not send the request. Try again.', 'درخواست نہیں بھیجی جا سکی۔ دوبارہ کوشش کریں۔', 'تعذّر إرسال الطلب، حاول مرة أخرى.'), locale)); return }
    setMe((m: any) => ({ ...(m || {}), supplier_conversion_requested_at: new Date().toISOString() }))
    setConvMsg('')
  }
  const topic = search.get('topic')
  const prefill = topic === 'kind'
    ? L('I would like to change my account type (company / pricing agent). Reason: ', 'میں اپنے اکاؤنٹ کی قسم بدلنا چاہتا ہوں (کمپنی / قیمت ایجنٹ)۔ وجہ: ', 'أرغب في تغيير نوع حسابي (شركة / وسيط تسعير). السبب: ')
    : ''
  const waText = encodeURIComponent(L('Hello Taseerak, I need help with: ', 'السلام علیکم تسعیرک، مجھے مدد چاہیے: ', 'مرحباً تسعيرك، أحتاج مساعدة بخصوص: '))

  if (!loaded) return <PageLoader />

  const role = me?.role || 'contractor'
  const banned = !!me?.banned_until && new Date(me.banned_until).getTime() > Date.now() && role !== 'admin'
  const sellerUnverified = role === 'supplier' && ((phoneRequired && !me?.phone_verified_at) || !me?.email_verified_at)
  const atGate = !userId || banned || sellerUnverified
  // «Do you sell building materials?» is for a business buyer only, under the message box (UX-139)
  const homeBuyer = (me?.buyer_type || buyerType) === 'individual'
  const showConversion = role === 'contractor' && !homeBuyer && !banned

  const content = (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* one h1 always; inside the app shell the top bar shows the title, so it is visually hidden (UX-110) */}
      <div className={atGate ? '' : 'sr-only'}>
        <h1 className="text-2xl font-bold text-[#071827]">{L('Support', 'سپورٹ', 'الدعم')}</h1>
      </div>
      <p className="text-sm text-gray-600">{L('Reach the Taseerak team on WhatsApp, or send a message to the admin team here.', 'تسعیرک ٹیم سے واٹس ایپ پر رابطہ کریں، یا یہاں انتظامیہ کو پیغام بھیجیں۔', 'تواصل مع فريق تسعيرك على واتساب، أو أرسل رسالة إلى الإدارة من هنا.')}</p>

      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#0B2438] mb-1">{L('Message the admin team', 'انتظامیہ کو پیغام', 'رسالة إلى الإدارة')}</h2>
        <p className="text-sm text-gray-600 mb-4">{L('Write about any issue or request; the team replies here and you get a notification.', 'کسی بھی مسئلے یا درخواست کے بارے میں لکھیں؛ ٹیم یہیں جواب دے گی اور آپ کو اطلاع ملے گی۔', 'اكتب عن أي مشكلة أو طلب، وسيردّ الفريق هنا ويصلك إشعار.')}</p>
        {topic === 'kind' && (
          <p className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">{L('Changing the account type needs the admin’s approval. Tell us why; we may ask for documents.', 'اکاؤنٹ کی قسم بدلنے کے لیے انتظامیہ کی منظوری ضروری ہے۔ وجہ بتائیں؛ ہم دستاویزات مانگ سکتے ہیں۔', 'تغيير نوع الحساب يحتاج موافقة الإدارة. اذكر السبب، وقد نطلب منك مستندات.')}</p>
        )}
        {userId
          ? <SupportThread userId={userId} viewerRole="user" initialText={prefill} />
          : <p className="text-sm text-gray-600">{L('Sign in to message the team, or use WhatsApp below.', 'ٹیم کو پیغام بھیجنے کے لیے سائن اِن کریں، یا نیچے واٹس ایپ استعمال کریں۔', 'سجّل الدخول لمراسلة الفريق، أو استخدم واتساب أدناه.')}</p>}
      </div>

      <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${waText}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 rounded-2xl p-4 text-white transition hover:brightness-110"
        style={{ background: 'linear-gradient(120deg,#071827,#0B2438)' }}>
        <div className="min-w-0">
          <div className="font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#F5C55B]" aria-hidden />{L('Message the Taseerak team on WhatsApp', 'تسعیرک ٹیم کو واٹس ایپ پر پیغام بھیجیں', 'راسل فريق تسعيرك على واتساب')}</div>
          <div className="text-[13px] text-[#C7CED6] mt-0.5">{L('Taseerak’s official WhatsApp number (an international business number)', 'تسعیرک کا سرکاری واٹس ایپ نمبر (بین الاقوامی کاروباری نمبر)', 'رقم واتساب تسعيرك الرسمي (رقم أعمال دولي)')}: <span dir="ltr">+1 213 561 4366</span></div>
        </div>
        {/* an outline, not a second gold button on the page (UX-142) */}
        <span className="shrink-0 min-h-[44px] inline-flex items-center px-4 rounded-xl text-sm font-bold border border-[#F5C55B] text-[#F5C55B]">{L('Open', 'کھولیں', 'فتح')}</span>
      </a>

      {/* the rules behind the platform, one tap away (UX-160) */}
      <nav aria-label={L('Policies', 'پالیسیاں', 'السياسات')} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href="/terms" className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Terms of use', 'شرائط استعمال', 'شروط الاستخدام')}</a>
        <a href="/privacy" className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Privacy policy', 'رازداری کی پالیسی', 'سياسة الخصوصية')}</a>
        <a href="/deal-protection" className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('How we protect your deal', 'ہم آپ کے سودے کی حفاظت کیسے کرتے ہیں', 'كيف نحمي صفقتك')}</a>
      </nav>

      {showConversion && (
        <div className="rounded-2xl border border-[#D4A543]/40 bg-white p-4">
          <div className="font-bold text-[#071827]">{L('Do you sell building materials?', 'کیا آپ تعمیراتی سامان بیچتے ہیں؟', 'هل تبيع مواد البناء؟')}</div>
          <div className="text-[13px] text-gray-600 mt-0.5">{L('Sell on Taseerak with the same number and email. The team reviews the request; any open request or unfinished deal must be completed first.', 'اسی نمبر اور ای میل سے تسعیرک پر فروخت کریں۔ ٹیم درخواست کا جائزہ لے گی؛ کوئی کھلی درخواست یا نامکمل سودا پہلے مکمل ہونا چاہیے۔', 'بع على تسعيرك بنفس رقمك وبريدك. يراجع الفريق الطلب، ويلزم أولاً إنهاء أي طلب تسعير مفتوح أو صفقة لم تكتمل.')}</div>
          {me?.supplier_conversion_requested_at
            ? <div className="mt-2 text-sm font-bold text-[#0F6E56]">{L('Request sent. We will notify you when it is approved.', 'درخواست بھیج دی گئی۔ منظوری پر ہم آپ کو اطلاع دیں گے۔', 'تم إرسال الطلب، وسنُبلغك عند الموافقة.')}</div>
            : <button type="button" onClick={askConversion} className="mt-3 min-h-[44px] px-4 rounded-xl bg-[#0B2438] text-white text-sm font-bold">{L('Turn my account into a supplier account', 'میرا اکاؤنٹ سپلائر اکاؤنٹ میں بدلیں', 'تحويل حسابي إلى حساب مورد')}</button>}
          {convMsg && <div className="mt-2 text-[13px] text-red-700" role="alert">{convMsg}</div>}
        </div>
      )}
    </div>
  )

  if (atGate) {
    const back = !userId ? { href: '/login', label: L('Sign in', 'سائن اِن', 'تسجيل الدخول') }
      : banned ? { href: '/banned', label: L('Back', 'واپس', 'رجوع') }
      : { href: '/verify', label: L('Back', 'واپس', 'رجوع') }
    return (
      <div dir={dir} className="min-h-screen bg-[#F5F7FA]">
        <GateHeader back={back} />
        <div className="p-4 sm:p-6">{content}</div>
      </div>
    )
  }
  return (
    <AppShell title={L('Support', 'سپورٹ', 'الدعم')} nav={getNav(role, locale, '/support')} userId={userId || undefined} dir={dir}>
      {content}
    </AppShell>
  )
}
