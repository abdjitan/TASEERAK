'use client'

// Phone verification (owner 2026-11-14): an SMS code proves the mobile is the user's (Firebase phone
// auth, Google Identity Platform), then our WhatsApp "phone_confirmed" message proves it has WhatsApp.
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FIREBASE_CONFIG, firebaseReady, toE164 } from '@/lib/firebaseConfig'
import { Check } from 'lucide-react'

// a verified number changes the verify banner, so its once-per-session cache is dropped
function clearBannerCache() { try { sessionStorage.removeItem('tsk_pvb') } catch {} }
const RESEND_AFTER = 60

type Step = 'enter' | 'code' | 'checking' | 'done'

export default function PhoneVerify({ initialPhone, locale, verified, waVerified, onDone, handoff, autoOpen }: {
  handoff?: string // the mobile app's single-use link (/api/phone/start): no site session on that page
  /** open the form at once (the verify gate / phone-verify page), no extra tap (UX-184) */
  autoOpen?: boolean
  initialPhone?: string
  locale: string
  verified?: boolean
  waVerified?: boolean
  onDone?: (phone: string) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [open, setOpen] = useState(!!handoff || (!!autoOpen && !verified))
  // seconds until «resend» is allowed (UX-134/184)
  const [wait, setWait] = useState(0)
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])
  const [phone, setPhone] = useState(initialPhone || '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('enter')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // a provider-side failure (quota, billing, config): not the user's fault, offer support (UX-117)
  const [providerDown, setProviderDown] = useState(false)
  const [wa, setWa] = useState<'unknown' | 'yes' | 'no'>(waVerified ? 'yes' : 'unknown')
  const confirmRef = useRef<any>(null)
  const verifierRef = useRef<any>(null)
  const boxId = useRef('recaptcha-' + Math.random().toString(36).slice(2)).current

  useEffect(() => { setPhone(initialPhone || '') }, [initialPhone])
  // the invisible reCAPTCHA lives outside the React tree so switching screens never detaches it
  useEffect(() => {
    const el = document.createElement('div'); el.id = boxId
    document.body.appendChild(el)
    return () => { try { verifierRef.current?.clear?.() } catch {} ; el.remove() }
  }, [boxId])

  async function fb() {
    const { initializeApp, getApps } = await import('firebase/app')
    const { getAuth } = await import('firebase/auth')
    const app = getApps()[0] || initializeApp(FIREBASE_CONFIG)
    const auth = getAuth(app)
    auth.languageCode = locale === 'en' ? 'en' : locale === 'ur' ? 'ur' : 'ar'
    return auth
  }

  async function send() {
    setError(''); setProviderDown(false)
    const e164 = toE164(phone)
    if (!e164) { setError(L('This mobile number is not accepted. We accept Saudi, UAE and Jordanian numbers (type UAE numbers with +971).', 'یہ موبائل نمبر قبول نہیں۔ ہم سعودی، اماراتی اور اردنی نمبر قبول کرتے ہیں (اماراتی نمبر ‎+971‎ کے ساتھ لکھیں)۔', 'رقم الجوال غير مقبول. نقبل أرقام السعودية والإمارات والأردن (الرقم الإماراتي يُكتب مع ‎+971‎).')); return }
    if (!firebaseReady()) { setProviderDown(true); setError(L('We cannot send the code right now. Try again shortly; if it keeps happening, contact support.', 'ابھی کوڈ نہیں بھیجا جا سکتا۔ تھوڑی دیر بعد کوشش کریں، اور اگر یہ بار بار ہو تو سپورٹ سے رابطہ کریں۔', 'تعذّر إرسال الرمز الآن. حاول بعد قليل، وإن تكرّر ذلك فتواصل مع الدعم.')); return }
    setBusy(true)
    try {
      const auth = await fb()
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth')
      if (!verifierRef.current) verifierRef.current = new RecaptchaVerifier(auth, boxId, { size: 'invisible' })
      confirmRef.current = await signInWithPhoneNumber(auth, e164, verifierRef.current)
      setStep('code')
      setWait(RESEND_AFTER)
    } catch (e: any) {
      console.error('phone-verify send', e?.code, e?.message)
      const c = String(e?.code || '')
      const known = c.includes('too-many-requests') || c.includes('invalid-phone') || c.includes('operation-not-allowed') || c.includes('region') || c.includes('network-request-failed')
      setProviderDown(!known)
      setError(c.includes('too-many-requests')
        ? L('Too many attempts. Try again later.', 'بہت زیادہ کوششیں۔ بعد میں دوبارہ کوشش کریں۔', 'محاولات كثيرة. حاول لاحقاً.')
        : c.includes('invalid-phone')
          ? L('This number is not valid. Type a Saudi number like 05XXXXXXXX.', 'یہ نمبر درست نہیں۔ سعودی نمبر 05XXXXXXXX کی صورت میں لکھیں۔', 'هذا الرقم غير صحيح. اكتب رقماً سعودياً بصيغة 05XXXXXXXX.')
          : c.includes('operation-not-allowed') || c.includes('region')
            ? L('Codes cannot be sent to this country yet. Use a Saudi, UAE or Jordanian number.', 'اس ملک میں ابھی کوڈ نہیں بھیجا جا سکتا۔ سعودی، اماراتی یا اردنی نمبر استعمال کریں۔', 'لا يمكن إرسال الرمز إلى هذه الدولة حالياً. استخدم رقماً سعودياً أو إماراتياً أو أردنياً.')
            : c.includes('network-request-failed')
              ? L('Could not send the code. Check your connection and try again.', 'کوڈ نہیں بھیجا جا سکا۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر إرسال الرمز. تأكّد من اتصالك وحاول مرة أخرى.')
              : L('We cannot send the code right now. Try again shortly; if it keeps happening, contact support.', 'ابھی کوڈ نہیں بھیجا جا سکتا۔ تھوڑی دیر بعد کوشش کریں، اور اگر یہ بار بار ہو تو سپورٹ سے رابطہ کریں۔', 'تعذّر إرسال الرمز الآن. حاول بعد قليل، وإن تكرّر ذلك فتواصل مع الدعم.'))
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
            : j?.error === 'country_not_allowed'
              ? L('Numbers from this country are not accepted yet. Use a Saudi, UAE or Jordanian number.', 'اس ملک کے نمبر ابھی قبول نہیں۔ سعودی، اماراتی یا اردنی نمبر استعمال کریں۔', 'لا نقبل أرقام هذه الدولة حالياً. استخدم رقماً سعودياً أو إماراتياً أو أردنياً.')
              : j?.error === 'stale' || j?.error === 'token_expired'
                ? L('The code took too long. Request a new code and enter it within a few minutes.', 'کوڈ کی مدت ختم ہو گئی۔ نیا کوڈ منگوائیں اور چند منٹ میں درج کریں۔', 'انتهت مهلة الرمز. اطلب رمزاً جديداً وأدخله خلال دقائق.')
                : L('Could not verify. Try again.', 'تصدیق نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر التوثيق. حاول مرة أخرى.'))
        return
      }
      clearBannerCache()
      onDone?.(j.phone)
      if (handoff) { setStep('done'); return } // the app re-reads the profile when the browser closes
      setStep('checking')
      watchWhatsApp()
    } catch (e: any) {
      setError(String(e?.code || '').includes('invalid-verification-code')
        ? L('The code is not correct. Check it and type it again.', 'کوڈ درست نہیں۔ اسے چیک کر کے دوبارہ لکھیں۔', 'الرمز غير صحيح. تحقّق منه وأعد كتابته.')
        : L('Could not verify. Try again.', 'تصدیق نہیں ہو سکی۔ دوبارہ کوشش کریں۔', 'تعذّر التوثيق. حاول مرة أخرى.'))
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px]">
        {initialPhone && <span dir="ltr" className="text-sm font-bold text-[#0B2438]">{initialPhone}</span>}
        <span className="font-bold text-[#0F6E56] inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden />{L('Mobile verified', 'موبائل تصدیق شدہ', 'الجوال موثّق')}</span>
        {waVerified
          ? <span className="font-bold text-[#0F6E56] inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden />{L('WhatsApp confirmed', 'واٹس ایپ تصدیق شدہ', 'واتساب مؤكَّد')}</span>
          : <span className="text-gray-500">{L('WhatsApp not confirmed yet', 'واٹس ایپ ابھی تصدیق نہیں', 'لم يتأكد الواتساب بعد')}</span>}
        <button type="button" onClick={() => { setOpen(true); setStep('enter') }} className="min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Change number', 'نمبر بدلیں', 'تغيير الرقم')}</button>
      </div>
    )
  }
  if (!open) {
    return (
      <>
        <button type="button" disabled={busy} onClick={() => { setOpen(true); if (toE164(phone)) send() }} className="mt-1.5 min-h-[44px] text-[13px] font-bold px-4 rounded-xl border border-[#D4A543] text-[#071827] bg-[#D4A543]/15 disabled:opacity-50">
          {busy ? '…' : L('Verify your mobile', 'اپنا موبائل تصدیق کریں', 'وثّق رقم جوالك')}
        </button>
      </>
    )
  }
  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      {step === 'enter' && busy && <p className="text-[12px] text-gray-600">{L('Sending the code…', 'کوڈ بھیجا جا رہا ہے…', 'جارٍ إرسال الرمز…')}</p>}
      {step === 'enter' && !busy && (<>
        <p className="text-[12px] text-gray-600">{L('We will send a 6-digit code by SMS. Use a number that has WhatsApp: platform notifications arrive there.', 'ہم SMS سے 6 ہندسوں کا کوڈ بھیجیں گے۔ ایسا نمبر استعمال کریں جس پر واٹس ایپ ہو: پلیٹ فارم کی اطلاعات وہیں آتی ہیں۔', 'سنرسل رمزاً من 6 أرقام برسالة نصية. استخدم رقماً عليه واتساب، فإشعارات المنصة تصل إليه.')}</p>
        <div className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" className="input-field flex-1 min-w-0" placeholder="05XXXXXXXX" aria-label={L('Mobile number', 'موبائل نمبر', 'رقم الجوال')} />
          <button type="button" onClick={send} disabled={busy} className="min-h-[48px] text-sm px-4 rounded-xl font-bold text-white disabled:opacity-50 whitespace-nowrap" style={{ background: '#0B2438' }}>{busy ? '…' : L('Send code', 'کوڈ بھیجیں', 'أرسل الرمز')}</button>
        </div>
      </>)}
      {step === 'code' && (<>
        <p className="text-[12px] text-gray-600">{L(`Enter the code sent to ${toE164(phone)}`, `${toE164(phone)} پر بھیجا گیا کوڈ لکھیں`, `أدخل الرمز المرسل إلى ${toE164(phone)}`)}</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="input-field flex-1 min-w-0 tracking-[0.4em] text-center font-bold" placeholder="______" aria-label={L('Verification code', 'تصدیقی کوڈ', 'رمز التحقق')} />
          <button type="button" onClick={confirm} disabled={busy} className="min-h-[48px] text-sm px-5 rounded-xl font-bold disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>{busy ? '…' : L('Confirm', 'تصدیق', 'تأكيد')}</button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4">
          {wait > 0
            ? <span className="text-[12px] text-gray-600 min-h-[44px] inline-flex items-center">{L(`Resend in ${wait} seconds`, `${wait} سیکنڈ بعد دوبارہ بھیجیں`, `إعادة الإرسال بعد ${wait} ثانية`)}</span>
            : <button type="button" onClick={() => { setCode(''); send() }} disabled={busy} className="min-h-[44px] text-[13px] font-bold text-[#8F6820] hover:underline disabled:opacity-50">{L('Resend the code', 'کوڈ دوبارہ بھیجیں', 'أعد إرسال الرمز')}</button>}
          <button type="button" onClick={() => { setStep('enter'); setCode('') }} className="min-h-[44px] text-[13px] font-bold text-[#48596E] hover:underline">{L('Change the number', 'نمبر بدلیں', 'تغيير الرقم')}</button>
        </div>
      </>)}
      {step === 'checking' && <p className="text-[12px] text-gray-600">{L('Mobile verified. Checking WhatsApp: we sent you a message from Taseerak…', 'موبائل تصدیق ہو گیا۔ واٹس ایپ چیک ہو رہا ہے: ہم نے آپ کو تسعیرک کی طرف سے پیغام بھیجا ہے…', 'تم توثيق الجوال. نتحقق من الواتساب: أرسلنا لك رسالة من تسعيرك…')}</p>}
      {step === 'done' && (
        <p className={`text-[12px] font-bold ${wa === 'no' ? 'text-amber-700' : 'text-[#0F6E56]'}`}>
          {wa === 'yes' ? L('Mobile verified and WhatsApp confirmed.', 'موبائل اور واٹس ایپ دونوں تصدیق شدہ۔', 'تم توثيق الجوال وتأكيد الواتساب.')
            : wa === 'no' ? L('Mobile verified, but this number has no WhatsApp. Use a WhatsApp number to receive notifications.', 'موبائل تصدیق ہو گیا، لیکن اس نمبر پر واٹس ایپ نہیں۔ اطلاعات پانے کے لیے واٹس ایپ والا نمبر استعمال کریں۔', 'تم توثيق الجوال، لكن هذا الرقم ليس عليه واتساب. استخدم رقماً عليه واتساب لتصلك الإشعارات.')
            : L('Mobile verified. WhatsApp will be confirmed when our message arrives.', 'موبائل تصدیق ہو گیا۔ ہمارا پیغام پہنچنے پر واٹس ایپ کی تصدیق ہو جائے گی۔', 'تم توثيق الجوال، وسيتأكد الواتساب عند وصول رسالتنا.')}
          {handoff ? ' ' + L('You can go back to the app now.', 'اب آپ ایپ میں واپس جا سکتے ہیں۔', 'يمكنك الآن الرجوع إلى التطبيق.') : ''}
        </p>
      )}
      {error && (providerDown
        ? <p className="text-[12px] font-semibold rounded-lg p-2 bg-amber-50 border border-amber-200 text-amber-900" role="alert">{error} <a href="/support" className="inline-flex items-center min-h-[44px] font-bold underline">{L('Contact support', 'سپورٹ سے رابطہ', 'تواصل مع الدعم')}</a></p>
        : <p className="text-[12px] font-semibold text-red-700" role="alert">{error}</p>)}
      {verified && step !== 'checking' && step !== 'done' && (
        <button type="button" onClick={() => { setOpen(false); setStep('enter'); setCode(''); setError(''); setPhone(initialPhone || '') }}
          className="min-h-[44px] text-[13px] font-bold text-[#48596E] hover:underline">{L('Cancel', 'منسوخ کریں', 'إلغاء')}</button>
      )}
    </div>
  )
}
