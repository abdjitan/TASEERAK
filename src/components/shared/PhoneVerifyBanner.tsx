'use client'
// «وثّق رقم جوالك» banner (owner 2026-11-17, migration 219): while phone verification is required,
// a signed-in buyer/seller whose mobile isn't verified sees why and where to do it. Quotes and
// awards are refused by the database until then; browsing and the profile still work.
// The email is OPTIONAL for buyers (migration 234, UX-012): a buyer only sees a soft «add your email
// (optional)» card on the home page, with «Later» (30 days). Sellers keep the required wording.
// The check runs once per browser session (cached in sessionStorage; PhoneVerify / EmailVerify
// clear the cache when they succeed), not on every page change.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'

export const VERIFY_BANNER_CACHE = 'tsk_pvb'
const SNOOZE_KEY = 'tsk_email_snooze_until'

type State = { uid: string; show: '' | 'phone' | 'email'; role: string }

function readCache(): State | null {
  try { const v = sessionStorage.getItem(VERIFY_BANNER_CACHE); return v ? JSON.parse(v) : null } catch { return null }
}
function emailSnoozed(): boolean {
  try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now() } catch { return false }
}

export default function PhoneVerifyBanner() {
  const { locale } = useTranslation()
  const pathname = usePathname() || ''
  const [st, setSt] = useState<State | null>(null)
  const [snoozed, setSnoozed] = useState(false)
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  useEffect(() => {
    let on = true
    setSnoozed(emailSnoozed())
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return
      const cached = readCache()
      if (cached && cached.uid === uid) { if (on) setSt(cached); return }
      const [{ data: req }, { data: p }] = await Promise.all([
        supabase.rpc('phone_verify_required'),
        supabase.from('profiles').select('role, phone_verified_at, email_verified_at').eq('id', uid).maybeSingle(),
      ])
      if (!on || !p) return
      // phone first (it gates quotes and deals), then the email (sellers: required; buyers: optional)
      const next: State = { uid, role: p.role || '', show: p.role === 'admin' ? '' : req === true && !p.phone_verified_at ? 'phone' : !p.email_verified_at ? 'email' : '' }
      try { sessionStorage.setItem(VERIFY_BANNER_CACHE, JSON.stringify(next)) } catch {}
      setSt(next)
    })()
    return () => { on = false }
  }, [pathname])

  const show = st?.show || ''
  if (!show || pathname.startsWith('/messages') || pathname.startsWith('/settings') || pathname.startsWith('/admin') || pathname.startsWith('/verify') || pathname.startsWith('/banned')) return null
  const isBuyer = st?.role === 'contractor'

  if (show === 'email' && isBuyer) {
    // optional for buyers: home page only, and «Later» hides it for 30 days
    if (snoozed || pathname !== '/contractor') return null
    const later = () => {
      try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 30 * 24 * 3600 * 1000)) } catch {}
      setSnoozed(true)
    }
    return (
      <div className="ts-no-print print:hidden mb-4 rounded-2xl border border-[#0B2438]/15 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm min-w-0">
          <div className="font-bold text-[#071827]">{L('Add your email (optional)', 'اپنی ای میل شامل کریں (اختیاری)', 'أضف بريدك الإلكتروني (اختياري)')}</div>
          <div className="text-[13px] text-gray-600 mt-0.5">{L('Quotes and deal documents can also reach you by email.', 'قیمتیں اور سودے کی دستاویزات ای میل پر بھی مل سکتی ہیں۔', 'لتصلك العروض ومستندات الصفقات على البريد أيضاً.')}</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={later} className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-bold text-[#0B2438] bg-white hover:bg-gray-50">
            {L('Later', 'بعد میں', 'لاحقاً')}
          </button>
          <Link href="/settings#email" className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-[#0B2438] text-white text-sm font-bold whitespace-nowrap">
            {L('Add email', 'ای میل شامل کریں', 'أضف البريد')}
          </Link>
        </div>
      </div>
    )
  }
  if (show === 'email') return (
    <div className="ts-no-print print:hidden mb-4 rounded-2xl border border-[#0B2438]/20 bg-[#0B2438]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm min-w-0">
        <div className="font-bold text-[#071827]">{L('Verify your email', 'اپنی ای میل تصدیق کریں', 'وثّق بريدك الإلكتروني')}</div>
        <div className="text-[13px] text-gray-600 mt-0.5">{L('A code arrives by email. It is your backup way to sign in and where documents are sent.', 'کوڈ ای میل پر آئے گا۔ یہ سائن اِن کا متبادل طریقہ ہے اور دستاویزات یہیں بھیجی جاتی ہیں۔', 'يصلك رمز على البريد. هو طريقك الاحتياطي لتسجيل الدخول، وتصلك عليه المستندات.')}</div>
      </div>
      <Link href="/settings#email" className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-[#0B2438] text-white text-sm font-bold whitespace-nowrap">
        {L('Verify now', 'ابھی تصدیق کریں', 'وثّق الآن')}
      </Link>
    </div>
  )
  return (
    <div className="ts-no-print print:hidden mb-4 rounded-2xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm min-w-0">
        <div className="font-bold text-[#071827]">{L('Verify your mobile number', 'اپنا موبائل نمبر تصدیق کریں', 'وثّق رقم جوالك')}</div>
        <div className="text-[13px] text-gray-600 mt-0.5">{isBuyer
          ? L('You need it to choose an offer and confirm a deal; a code arrives by text message.', 'آفر منتخب کرنے اور سودا طے کرنے کے لیے ضروری ہے؛ کوڈ ٹیکسٹ میسج سے آئے گا۔', 'مطلوب لاختيار العرض وإتمام الصفقة، ويصلك الرمز برسالة نصية.')
          : L('To verify your account and protect deals. You need it to send quotes and confirm deals; a code arrives by text message.', 'اکاؤنٹ کی تصدیق اور سودوں کے تحفظ کے لیے۔ قیمت بھیجنے اور سودا طے کرنے کے لیے ضروری ہے؛ کوڈ ٹیکسٹ میسج سے آئے گا۔', 'للتحقق من الحساب وحماية الصفقات. مطلوب لتقديم العروض وإتمام الصفقات، ويصلك الرمز برسالة نصية.')}</div>
      </div>
      <Link href="/settings#phone" className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-[#D4A543] text-[#071827] text-sm font-bold whitespace-nowrap">
        {L('Verify now', 'ابھی تصدیق کریں', 'وثّق الآن')}
      </Link>
    </div>
  )
}
