'use client'
// «وثّق رقم جوالك» banner (owner 2026-11-17, migration 219): while phone verification is required,
// a signed-in buyer/seller whose mobile isn't verified sees why and where to do it. Quotes and
// awards are refused by the database until then; browsing and the profile still work.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'

export default function PhoneVerifyBanner() {
  const { locale } = useTranslation()
  const pathname = usePathname() || ''
  const [show, setShow] = useState(false)
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  useEffect(() => {
    let on = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: req }, { data: p }] = await Promise.all([
        supabase.rpc('phone_verify_required'),
        supabase.from('profiles').select('role, phone_verified_at').eq('id', user.id).maybeSingle(),
      ])
      if (on) setShow(req === true && !!p && p.role !== 'admin' && !p.phone_verified_at)
    })()
    return () => { on = false }
  }, [pathname])

  if (!show || pathname.startsWith('/settings') || pathname.startsWith('/admin')) return null
  return (
    <div className="mb-4 rounded-2xl border border-[#D4A543]/50 bg-[#D4A543]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm">
        <div className="font-bold text-[#071827]">{L('Verify your mobile number', 'اپنا موبائل نمبر تصدیق کریں', 'وثّق رقم جوالك')}</div>
        <div className="text-xs text-gray-600 mt-0.5">{L('To verify your account and protect deals. You need it to send quotes and confirm deals; a code arrives by text message.', 'اکاؤنٹ کی تصدیق اور سودوں کے تحفظ کے لیے۔ قیمت بھیجنے اور سودا طے کرنے کے لیے ضروری ہے؛ کوڈ ٹیکسٹ میسج سے آئے گا۔', 'للتحقق من الحساب وحماية الصفقات. مطلوب لتقديم العروض وإتمام الصفقات، ويصلك الرمز برسالة نصية.')}</div>
      </div>
      <Link href="/settings#phone" className="px-4 py-2 rounded-xl bg-[#D4A543] text-[#071827] text-sm font-bold whitespace-nowrap">
        {L('Verify now', 'ابھی تصدیق کریں', 'وثّق الآن')}
      </Link>
    </div>
  )
}
