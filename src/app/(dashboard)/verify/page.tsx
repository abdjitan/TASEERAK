'use client'
// «وثّق حسابك» (owner 2026-11-17): before anything else a seller verifies BOTH the mobile (SMS code)
// and the email (6-digit code). A buyer only needs the mobile: the email step is optional for them
// (migration 234, UX-012). The middleware sends every protected page here until the account is
// verified (migration 222 enforces it in the database too).
// A gate, so never a dead end (UX-047): logo, language, sign-out, support, and a retry when loading fails.
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PhoneVerify from '@/components/shared/PhoneVerify'
import EmailVerify from '@/components/shared/EmailVerify'
import GateHeader from './GateHeader'
import { isAccountVerified } from '@/components/shared/verifyRule'

export default function VerifyPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#F5F7FA]"><GateHeader /></div>}><Verify /></Suspense>
}

function Verify() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const search = useSearchParams()
  const next = (() => { const n = search.get('next') || ''; return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/verify') ? n : '' })()
  const [p, setP] = useState<any>(null)
  const [email, setEmail] = useState<string>('')
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  // the admin switch (phone_verify_required): off while the SMS provider is down, then nothing blocks (round-4 UX-089)
  const [required, setRequired] = useState<boolean>(true)
  const [smsDown, setSmsDown] = useState(false)

  async function load() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?next=/verify'; return }
      setEmail(user.email || '')
      const [{ data, error }, { data: req }] = await Promise.all([
        supabase.from('profiles').select('role, phone, phone_verified_at, whatsapp_verified_at, email_verified_at').eq('id', user.id).single(),
        supabase.rpc('phone_verify_required'),
      ])
      if (error || !data) throw error || new Error('no profile')
      setRequired(req === true)
      setP(data)
      setState('ready')
    } catch {
      setState(s => (s === 'ready' ? 'ready' : 'failed'))
    }
  }
  useEffect(() => { load() }, [])

  const isBuyer = p?.role === 'contractor'
  const phoneOk = !!p?.phone_verified_at
  const emailOk = !!p?.email_verified_at || isBuyer // optional for buyers
  const canGo = p ? isAccountVerified(p, required) : false
  const optional = L('(optional)', '(اختیاری)', '(اختياري)')
  const home = p?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'
  const tick = <Check className="inline w-4 h-4 text-[#0F6E56]" aria-label={L('done', 'مکمل', 'تم')} />

  return (
    <div dir={dir} className="min-h-screen bg-[#F5F7FA]">
      <GateHeader />
      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#071827]">{L('Verify your account', 'اپنا اکاؤنٹ تصدیق کریں', 'وثّق حسابك')}</h1>
          <p className="text-sm text-gray-600 mt-1">{isBuyer
            ? L('One quick step to protect your account and deals: your mobile number.', 'اکاؤنٹ اور سودوں کے تحفظ کے لیے ایک آسان قدم: موبائل نمبر۔', 'خطوة واحدة سريعة لحماية حسابك وصفقاتك: رقم جوالك.')
            : L('Two quick steps to protect your account and deals: your mobile number and your email.', 'اکاؤنٹ اور سودوں کے تحفظ کے لیے دو آسان قدم: موبائل نمبر اور ای میل۔', 'خطوتان سريعتان لحماية حسابك وصفقاتك: رقم جوالك وبريدك الإلكتروني.')}</p>
        </div>

        {state === 'loading' && (
          <div className="space-y-3 animate-pulse" aria-busy="true">
            <div className="h-28 rounded-2xl bg-white border border-gray-100" />
            <div className="h-28 rounded-2xl bg-white border border-gray-100" />
          </div>
        )}

        {state === 'failed' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
            <div className="font-bold text-red-800">{L('We could not load your account details.', 'آپ کے اکاؤنٹ کی تفصیلات لوڈ نہیں ہو سکیں۔', 'تعذّر تحميل بيانات حسابك.')}</div>
            <button type="button" onClick={() => { setState('loading'); load() }} className="mt-3 min-h-[44px] px-5 rounded-xl bg-[#0B2438] text-white text-sm font-bold">
              {L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}
            </button>
          </div>
        )}

        {state === 'ready' && p && (<>
          <section className={`rounded-2xl border p-4 ${phoneOk ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
            <div className="font-bold text-[#0B2438] mb-1">1. {L('Mobile number', 'موبائل نمبر', 'رقم الجوال')} {!required && !phoneOk && <span className="font-semibold text-gray-600">{optional}</span>} {phoneOk && tick}</div>
            <PhoneVerify initialPhone={p.phone || ''} locale={locale} verified={phoneOk} waVerified={!!p.whatsapp_verified_at} autoOpen
              onDone={() => load()} onProviderDown={() => setSmsDown(true)} />
          </section>

          <section className={`rounded-2xl border p-4 ${p.email_verified_at ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
            <div className="font-bold text-[#0B2438] mb-2">
              2. {isBuyer || !required ? <>{L('Email', 'ای میل', 'البريد الإلكتروني')} <span className="font-semibold text-gray-600">{optional}</span></> : L('Email', 'ای میل', 'البريد الإلكتروني')} {p.email_verified_at && tick}
            </div>
            <EmailVerify currentEmail={email} verified={!!p.email_verified_at} locale={locale} optional={isBuyer} onDone={() => load()} />
          </section>

          <button type="button" disabled={!canGo}
            onClick={() => { window.location.href = next || home }}
            className="w-full min-h-[48px] rounded-xl bg-[#D4A543] text-[#071827] font-bold py-3 disabled:opacity-50">
            {canGo ? L('Continue', 'جاری رکھیں', 'متابعة')
              : isBuyer ? L('Verify your mobile to continue', 'جاری رکھنے کے لیے موبائل تصدیق کریں', 'وثّق جوالك للمتابعة')
              : L('Finish both steps to continue', 'جاری رکھنے کے لیے دونوں قدم مکمل کریں', 'أكمل الخطوتين للمتابعة')}
          </button>
        </>)}

        {state === 'ready' && required && !phoneOk && smsDown && (
          <p role="status" className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded-xl p-3 leading-relaxed">
            {L('The text-message service is temporarily down, and the admin team has been told. You can continue once an admin pauses this requirement, or contact support.',
              'ٹیکسٹ میسج سروس عارضی طور پر بند ہے، اور انتظامیہ کو اطلاع دے دی گئی ہے۔ منتظم کے اس شرط کو عارضی طور پر روکنے کے بعد آپ جاری رکھ سکتے ہیں، یا سپورٹ سے رابطہ کریں۔',
              'خدمة الرسائل متوقفة مؤقتاً، وقد أُبلغت الإدارة. يمكنك المتابعة بعد أن يوقف المشرف هذا الشرط مؤقتاً، أو التواصل مع الدعم.')}
          </p>
        )}
        {!canGo && <p className="text-sm text-gray-600 text-center">
          {L('Did the code not arrive?', 'کوڈ نہیں ملا؟', 'لم يصلك الرمز؟')}{' '}
          <Link href="/support?topic=sms" className="font-bold text-[#8F6820] underline underline-offset-2 inline-flex min-h-[44px] items-center">{L('Contact support', 'سپورٹ سے رابطہ کریں', 'تواصل مع الدعم')}</Link>
        </p>}
        {/* deleting the account is a right (PDPL) and a store requirement, also before verifying (UX-024) */}
        <p className="text-sm text-gray-600 text-center">
          {L('Changed your mind?', 'ارادہ بدل گیا؟', 'غيّرت رأيك؟')}{' '}
          <a href="/account/delete" className="font-bold text-red-700 underline underline-offset-2 inline-flex min-h-[44px] items-center">{L('Delete my account', 'میرا اکاؤنٹ حذف کریں', 'حذف حسابي')}</a>
        </p>
      </div>
    </div>
  )
}
