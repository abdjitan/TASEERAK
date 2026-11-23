'use client'
// Email verification by a 6-digit code (owner 2026-11-17, migration 220): every account verifies its
// email (sellers and buyers). A phone-only buyer adds an email here; once verified it is also the
// sign-in email for the «رمز على البريد» fallback.
import { useState } from 'react'
import { Check } from 'lucide-react'

export default function EmailVerify({ currentEmail, verified, locale, onDone, optional }: {
  currentEmail?: string | null
  verified?: boolean
  locale: string
  onDone?: (email: string) => void
  /** a buyer: the email is optional and is not presented as the backup sign-in (UX-012) */
  optional?: boolean
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const placeholder = !currentEmail || currentEmail.endsWith('@phone.taseerak.com')
  const [email, setEmail] = useState(placeholder ? '' : String(currentEmail))
  const [step, setStep] = useState<'idle' | 'enter' | 'code'>(verified ? 'idle' : 'enter')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(!!verified)
  // «Change» on a verified email can be cancelled (round-5 UX-214)
  const [changing, setChanging] = useState(false)
  const [savedEmail, setSavedEmail] = useState(placeholder ? '' : String(currentEmail))
  // Enter inside the settings form confirms THIS step instead of saving the whole form (round-5 UX-075)
  const onEnter = (fn: () => void, ok: boolean) => (e: any) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (ok) fn()
  }

  async function send() {
    setErr(''); setBusy(true)
    const r = await fetch('/api/email/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, locale }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) {
      setErr(j?.error === 'bad_email' ? L('Enter a valid email.', 'درست ای میل لکھیں۔', 'اكتب بريداً إلكترونياً صحيحاً.')
        : j?.error === 'email_taken' ? L('This email is already used by another account.', 'یہ ای میل کسی اور اکاؤنٹ میں استعمال ہو رہی ہے۔', 'هذا البريد مستخدم في حساب آخر.')
        : j?.error === 'rate_limited' ? L('Too many codes. Try again in an hour.', 'بہت زیادہ کوڈ۔ ایک گھنٹے بعد کوشش کریں۔', 'طلبت رموزاً كثيرة. حاول بعد ساعة.')
        : L('Could not send the code. Try again.', 'کوڈ نہیں بھیجا جا سکا۔', 'تعذّر إرسال الرمز. حاول مرة أخرى.'))
      return
    }
    setCode(''); setStep('code')
  }
  async function confirm() {
    setErr(''); setBusy(true)
    const r = await fetch('/api/email/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) {
      setErr(j?.error === 'expired' ? L('The code expired. Send a new one.', 'کوڈ ختم ہو گیا۔ نیا بھیجیں۔', 'انتهت صلاحية الرمز. أرسل رمزاً جديداً.')
        : j?.error === 'too_many' ? L('Too many tries. Send a new code.', 'بہت زیادہ کوششیں۔ نیا کوڈ بھیجیں۔', 'محاولات كثيرة. أرسل رمزاً جديداً.')
        : j?.error === 'email_taken' ? L('This email is already used by another account.', 'یہ ای میل کسی اور اکاؤنٹ میں استعمال ہو رہی ہے۔', 'هذا البريد مستخدم في حساب آخر.')
        : L('Wrong code.', 'غلط کوڈ۔', 'الرمز غير صحيح.'))
      return
    }
    try { sessionStorage.removeItem('tsk_pvb') } catch {} // the verify banner re-checks
    setDone(true); setStep('idle'); setChanging(false); setSavedEmail(j.email || email); onDone?.(j.email)
  }

  if (done && step === 'idle') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span dir="ltr" className="font-semibold text-gray-700">{email || currentEmail}</span>
        <span className="font-bold text-[#0F6E56] inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden />{L('Email verified', 'ای میل تصدیق شدہ', 'البريد موثّق')}</span>
        <button type="button" onClick={() => { setDone(false); setChanging(true); setStep('enter') }} className="min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Change', 'تبدیل کریں', 'تغيير')}</button>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      {step !== 'code' ? (<>
        <p className="text-[12px] text-gray-600">{optional
          ? L('Optional. We send a 6-digit code to your email to verify it; quotes and deal documents can then reach you there too.', 'اختیاری۔ ہم تصدیق کے لیے آپ کی ای میل پر 6 ہندسوں کا کوڈ بھیجیں گے؛ پھر قیمتیں اور دستاویزات وہاں بھی آئیں گی۔', 'اختياري. نرسل رمزاً من 6 أرقام إلى بريدك لتوثيقه، ثم تصلك عليه العروض ومستندات الصفقات أيضاً.')
          : L('We send a 6-digit code to your email to verify it. It is also your backup way to sign in.', 'ہم تصدیق کے لیے آپ کی ای میل پر 6 ہندسوں کا کوڈ بھیجیں گے۔ یہ سائن اِن کا متبادل طریقہ بھی ہے۔', 'نرسل رمزاً من 6 أرقام إلى بريدك لتوثيقه، وهو أيضاً طريقك الاحتياطي لتسجيل الدخول.')}</p>
        <div className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onEnter(send, !busy && !!email)} type="email" inputMode="email" autoComplete="email" dir="ltr" className="input-field flex-1 min-w-0" placeholder="name@example.com" aria-label={L('Email', 'ای میل', 'البريد الإلكتروني')} />
          <button type="button" onClick={send} disabled={busy || !email} className="min-h-[48px] text-sm px-4 rounded-xl font-bold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0B2438' }}>{busy ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…') : L('Send code', 'کوڈ بھیجیں', 'أرسل الرمز')}</button>
        </div>
        {changing && (
          <button type="button" onClick={() => { setEmail(savedEmail); setErr(''); setChanging(false); setDone(true); setStep('idle') }} className="min-h-[44px] text-[13px] font-bold text-[#0B2438] hover:underline">{L('Cancel', 'منسوخ کریں', 'إلغاء')}</button>
        )}
      </>) : (<>
        <p className="text-[12px] text-gray-600">{L(`Enter the code sent to ${email}`, `${email} پر بھیجا گیا کوڈ لکھیں`, `أدخل الرمز المرسل إلى ${email}`)}</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d٠-٩]/g, '').slice(0, 6))} onKeyDown={onEnter(confirm, !busy && code.length >= 6)} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="input-field flex-1 min-w-0 tracking-[0.4em] text-center font-bold" placeholder="______" aria-label={L('Verification code', 'تصدیقی کوڈ', 'رمز التحقق')} />
          <button type="button" onClick={confirm} disabled={busy || code.length < 6} className="min-h-[48px] text-sm px-5 rounded-xl font-bold disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>{busy ? L('Checking…', 'جانچ ہو رہی ہے…', 'جارٍ التحقق…') : L('Confirm', 'تصدیق', 'تأكيد')}</button>
        </div>
        <button type="button" onClick={() => setStep('enter')} className="min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline">{L('Change the email or resend', 'ای میل بدلیں یا دوبارہ بھیجیں', 'تغيير البريد أو إعادة الإرسال')}</button>
      </>)}
      {err && <p className="text-[12px] font-semibold text-red-600" role="alert">{err}</p>}
    </div>
  )
}
