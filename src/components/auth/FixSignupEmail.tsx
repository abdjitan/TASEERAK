'use client'
// An account whose e-mail is not confirmed yet: resend the link, or correct a mistyped address
// (owner 2026-11-22: «gmail.comm» left a seller stuck). Uses the e-mail + password typed at sign-up/sign-in.
import { useState } from 'react'
import { emailTypoSuggestion } from '@/lib/emailTypo'

export default function FixSignupEmail({ email, password, locale, captchaToken, onFixed }: {
  email: string; password: string; locale: string; captchaToken?: string; onFixed?: (newEmail: string) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [open, setOpen] = useState(false)
  const [newEmail, setNewEmail] = useState(emailTypoSuggestion(email) || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function resend() {
    setBusy(true); setMsg(null)
    // through our API (the browser's own resend needs a CAPTCHA); the password proves the account
    const r = await fetch('/api/auth/fix-signup-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, action: 'resend' }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    setMsg(!j?.ok ? { ok: false, text: L('Could not resend now. Try again in a minute.', 'ابھی دوبارہ نہیں بھیج سکے۔ ایک منٹ بعد کوشش کریں۔', 'تعذّر الإرسال الآن. حاول بعد دقيقة.') }
      : { ok: true, text: L(`We sent a new link to ${email}.`, `${email} پر نیا لنک بھیج دیا۔`, `أرسلنا رابطاً جديداً إلى ${email}.`) })
  }

  async function fix() {
    const target = newEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(target)) { setMsg({ ok: false, text: L('Write a valid email.', 'درست ای میل لکھیں۔', 'اكتب بريداً صحيحاً.') }); return }
    setBusy(true); setMsg(null)
    const r = await fetch('/api/auth/fix-signup-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, newEmail: target, captchaToken }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (j?.ok) {
      setMsg({ ok: true, text: L(`Done. We sent the confirmation link to ${target}. Open it, then sign in with this email.`, `ہو گیا۔ ہم نے تصدیقی لنک ${target} پر بھیج دیا۔ اسے کھولیں، پھر اسی ای میل سے سائن اِن کریں۔`, `تم. أرسلنا رابط التأكيد إلى ${target}. افتحه، ثم سجّل الدخول بهذا البريد.`) })
      onFixed?.(target)
      return
    }
    const e = j?.error
    setMsg({ ok: false, text:
      e === 'email_taken' ? L('This email already has an account.', 'اس ای میل کا اکاؤنٹ پہلے سے ہے۔', 'هذا البريد مسجّل بحساب آخر.')
      : e === 'already_confirmed' ? L('Your email is already confirmed: just sign in.', 'آپ کی ای میل تصدیق شدہ ہے، سائن اِن کریں۔', 'بريدك مؤكَّد مسبقاً: سجّل الدخول مباشرة.')
      : e === 'bad_credentials' ? L('The password does not match this email.', 'پاس ورڈ اس ای میل سے میل نہیں کھاتا۔', 'كلمة المرور لا تطابق هذا البريد.')
      : e === 'rate' ? L('Too many tries. Try again later.', 'بہت زیادہ کوششیں، بعد میں کوشش کریں۔', 'محاولات كثيرة، حاول لاحقاً.')
      : e === 'too_old' ? L('This sign-up is too old: contact Support.', 'یہ رجسٹریشن پرانی ہے، سپورٹ سے رابطہ کریں۔', 'هذا التسجيل قديم: تواصل مع الدعم.')
      : L('Could not change the email. Try again or contact Support.', 'ای میل نہیں بدل سکی۔ دوبارہ کوشش کریں یا سپورٹ سے رابطہ کریں۔', 'تعذّر تعديل البريد. حاول مرة أخرى أو تواصل مع الدعم.') })
  }

  return (
    <div className="mt-3 rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/5 p-3 text-start text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" onClick={resend} disabled={busy} className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] underline disabled:opacity-50">{L('Resend the link', 'لنک دوبارہ بھیجیں', 'أعد إرسال الرابط')}</button>
        <button type="button" onClick={() => setOpen(o => !o)} className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] underline">{L('Wrong email? Correct it', 'ای میل غلط ہے؟ درست کریں', 'كتبت بريدك خطأ؟ صحّحه')}</button>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="text-[12px] text-gray-600">{L('Your account was saved with:', 'آپ کا اکاؤنٹ اس ای میل سے محفوظ ہے:', 'حُفظ حسابك بالبريد:')} <b dir="ltr">{email}</b></div>
          <input type="email" dir="ltr" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input-field text-sm" placeholder="name@gmail.com" autoComplete="email" />
          <button type="button" onClick={fix} disabled={busy} className="w-full min-h-11 rounded-xl text-sm font-extrabold disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>
            {busy ? '…' : L('Correct and send the link', 'درست کریں اور لنک بھیجیں', 'صحّح وأرسل الرابط')}
          </button>
        </div>
      )}
      {msg && <p className={`mt-2 text-[13px] font-semibold ${msg.ok ? 'text-[#0F6E56]' : 'text-red-700'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </div>
  )
}
