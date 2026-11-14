'use client'

// Phone verification (owner 2026-11-14): an SMS code proves the mobile is the user's (Firebase phone
// auth, Google Identity Platform), then our WhatsApp "phone_confirmed" message proves it has WhatsApp.
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FIREBASE_CONFIG, firebaseReady, toE164 } from '@/lib/firebaseConfig'

type Step = 'enter' | 'code' | 'checking' | 'done'

export default function PhoneVerify({ initialPhone, locale, verified, waVerified, onDone, handoff }: {
  handoff?: string // the mobile app's single-use link (/api/phone/start): no site session on that page
  initialPhone?: string
  locale: string
  verified?: boolean
  waVerified?: boolean
  onDone?: (phone: string) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [open, setOpen] = useState(!!handoff)
  const [phone, setPhone] = useState(initialPhone || '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('enter')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wa, setWa] = useState<'unknown' | 'yes' | 'no'>(waVerified ? 'yes' : 'unknown')
  const confirmRef = useRef<any>(null)
  const verifierRef = useRef<any>(null)
  const boxId = useRef('recaptcha-' + Math.random().toString(36).slice(2)).current

  useEffect(() => { setPhone(initialPhone || '') }, [initialPhone])

  async function fb() {
    const { initializeApp, getApps } = await import('firebase/app')
    const { getAuth } = await import('firebase/auth')
    const app = getApps()[0] || initializeApp(FIREBASE_CONFIG)
    const auth = getAuth(app)
    auth.languageCode = locale === 'en' ? 'en' : locale === 'ur' ? 'ur' : 'ar'
    return auth
  }

  async function send() {
    setError('')
    const e164 = toE164(phone)
    if (!e164) { setError(L('Enter a valid mobile number, e.g. 05XXXXXXXX or +962…', 'درست موبائل نمبر لکھیں، مثلاً 05XXXXXXXX', 'أدخل رقم جوال صحيحاً، مثل 05XXXXXXXX أو +962…')); return }
    if (!firebaseReady()) { setError(L('Phone verification is not available yet.', 'فون کی تصدیق ابھی دستیاب نہیں۔', 'توثيق الجوال غير متاح بعد.')); return }
    setBusy(true)
    try {
      const auth = await fb()
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth')
      if (!verifierRef.current) verifierRef.current = new RecaptchaVerifier(auth, boxId, { size: 'invisible' })
      confirmRef.current = await signInWithPhoneNumber(auth, e164, verifierRef.current)
      setStep('code')
    } catch (e: any) {
      const c = String(e?.code || '')
      setError(c.includes('too-many-requests') || c.includes('quota')
        ? L('Too many attempts. Try again later.', 'بہت زیادہ کوششیں۔ بعد میں کوشش کریں۔', 'محاولات كثيرة. حاول لاحقاً.')
        : c.includes('invalid-phone')
          ? L('This number is not valid.', 'یہ نمبر درست نہیں۔', 'هذا الرقم غير صحيح.')
          : L('Could not send the code. Try again.', 'کوڈ نہیں بھیجا جا سکا۔', 'تعذّر إرسال الرمز. حاول مرة أخرى.'))
      try { verifierRef.current?.clear?.() } catch {} ; verifierRef.current = null
    } finally { setBusy(false) }
  }

  async function confirm() {
    setError('')
    const c = code.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x)))
    if (c.length < 6) { setError(L('Enter the 6-digit code.', '6 ہندسوں کا کوڈ لکھیں۔', 'أدخل الرمز المكوّن من 6 أرقام.')); return }
    setBusy(true)
    try {
      const cred = await confirmRef.current.confirm(c)
      const idToken = await cred.user.getIdToken()
      const res = await fetch('/api/phone/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, ...(handoff ? { handoff } : {}) }) })
      const j = await res.json().catch(() => ({}))
      try { const auth = await fb(); const { signOut } = await import('firebase/auth'); await signOut(auth) } catch {}
      if (!res.ok) {
        setError(j?.error === 'phone_taken'
          ? L('This number is already verified on another account.', 'یہ نمبر کسی اور اکاؤنٹ پر تصدیق شدہ ہے۔', 'هذا الرقم موثّق في حساب آخر.')
          : j?.error === 'link_expired'
            ? L('This link has expired. Go back to the app and try again.', 'یہ لنک ختم ہو گیا۔ ایپ میں واپس جا کر دوبارہ کوشش کریں۔', 'انتهت صلاحية هذا الرابط. ارجع إلى التطبيق وحاول مرة أخرى.')
            : L('Could not verify. Try again.', 'تصدیق نہیں ہو سکی۔', 'تعذّر التوثيق. حاول مرة أخرى.'))
        return
      }
      onDone?.(j.phone)
      if (handoff) { setStep('done'); return } // the app re-reads the profile when the browser closes
      setStep('checking')
      watchWhatsApp()
    } catch (e: any) {
      setError(String(e?.code || '').includes('invalid-verification-code')
        ? L('Wrong code.', 'غلط کوڈ۔', 'الرمز غير صحيح.')
        : L('Could not verify. Try again.', 'تصدیق نہیں ہو سکی۔', 'تعذّر التوثيق. حاول مرة أخرى.'))
    } finally { setBusy(false) }
  }

  // Meta reports our phone_confirmed message as delivered → the number has WhatsApp
  function watchWhatsApp() {
    const supabase = createClient()
    let n = 0
    const t = setInterval(async () => {
      n++
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { clearInterval(t); return }
      const { data: p } = await supabase.from('profiles').select('whatsapp_verified_at, wa_check_status').eq('id', user.id).single()
      if (p?.whatsapp_verified_at) { setWa('yes'); setStep('done'); clearInterval(t) }
      else if (p?.wa_check_status === 'no_whatsapp') { setWa('no'); setStep('done'); clearInterval(t) }
      else if (n >= 20) { setStep('done'); clearInterval(t) }
    }, 3000)
  }

  if (verified && !open) {
    return (
      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
        <span className="font-bold text-[#0F6E56]">✓ {L('Mobile verified', 'موبائل تصدیق شدہ', 'الجوال موثّق')}</span>
        {waVerified
          ? <span className="font-bold text-[#0F6E56]">✓ {L('WhatsApp confirmed', 'واٹس ایپ تصدیق شدہ', 'واتساب مؤكَّد')}</span>
          : <span className="text-gray-500">{L('WhatsApp not confirmed yet', 'واٹس ایپ ابھی تصدیق نہیں', 'لم يتأكد الواتساب بعد')}</span>}
        <button type="button" onClick={() => { setOpen(true); setStep('enter') }} className="font-bold text-[#8F6820] hover:underline">{L('Change number', 'نمبر بدلیں', 'تغيير الرقم')}</button>
      </div>
    )
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-[#D4A543] text-[#8F6820] bg-[#D4A543]/10">
        {L('Verify your mobile', 'اپنا موبائل تصدیق کریں', 'وثّق رقم جوالك')}
      </button>
    )
  }
  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      <div id={boxId} />
      {step === 'enter' && (<>
        <p className="text-[12px] text-gray-600">{L('We will send a 6-digit code by SMS. Use a number that has WhatsApp: platform notifications arrive there.', 'ہم SMS سے 6 ہندسوں کا کوڈ بھیجیں گے۔ واٹس ایپ والا نمبر استعمال کریں۔', 'سنرسل رمزاً من 6 أرقام برسالة نصية. استخدم رقماً عليه واتساب، فإشعارات المنصة تصل إليه.')}</p>
        <div className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" className="input-field flex-1" placeholder="05XXXXXXXX / +962…" />
          <button type="button" onClick={send} disabled={busy} className="text-sm px-4 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>{busy ? '…' : L('Send code', 'کوڈ بھیجیں', 'أرسل الرمز')}</button>
        </div>
      </>)}
      {step === 'code' && (<>
        <p className="text-[12px] text-gray-600">{L(`Enter the code sent to ${toE164(phone)}`, `${toE164(phone)} پر بھیجا گیا کوڈ لکھیں`, `أدخل الرمز المرسل إلى ${toE164(phone)}`)}</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="input-field flex-1 tracking-[0.4em] text-center font-bold" placeholder="______" />
          <button type="button" onClick={confirm} disabled={busy} className="text-sm px-4 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>{busy ? '…' : L('Confirm', 'تصدیق', 'تأكيد')}</button>
        </div>
        <button type="button" onClick={() => { setStep('enter'); setCode('') }} className="text-[11px] font-bold text-[#8F6820] hover:underline">{L('Change the number or resend', 'نمبر بدلیں یا دوبارہ بھیجیں', 'تغيير الرقم أو إعادة الإرسال')}</button>
      </>)}
      {step === 'checking' && <p className="text-[12px] text-gray-600">✓ {L('Mobile verified. Checking WhatsApp: we sent you a message from Taseerak…', 'موبائل تصدیق ہو گیا۔ واٹس ایپ چیک ہو رہا ہے…', 'تم توثيق الجوال. نتحقق من الواتساب: أرسلنا لك رسالة من تسعيرك…')}</p>}
      {step === 'done' && (
        <p className={`text-[12px] font-bold ${wa === 'no' ? 'text-amber-700' : 'text-[#0F6E56]'}`}>
          {wa === 'yes' ? '✓ ' + L('Mobile verified and WhatsApp confirmed.', 'موبائل اور واٹس ایپ دونوں تصدیق شدہ۔', 'تم توثيق الجوال وتأكيد الواتساب.')
            : wa === 'no' ? L('Mobile verified, but this number has no WhatsApp. Use a WhatsApp number to receive notifications.', 'موبائل تصدیق ہو گیا لیکن اس نمبر پر واٹس ایپ نہیں۔', 'تم توثيق الجوال، لكن هذا الرقم ليس عليه واتساب. استخدم رقماً عليه واتساب لتصلك الإشعارات.')
            : '✓ ' + L('Mobile verified. WhatsApp will be confirmed when our message arrives.', 'موبائل تصدیق ہو گیا۔', 'تم توثيق الجوال، وسيتأكد الواتساب عند وصول رسالتنا.')}
          {handoff ? ' ' + L('You can go back to the app now.', 'اب آپ ایپ میں واپس جا سکتے ہیں۔', 'يمكنك الآن الرجوع إلى التطبيق.') : ''}
        </p>
      )}
      {error && <p className="text-[12px] font-semibold text-red-600" role="alert">{error}</p>}
    </div>
  )
}
