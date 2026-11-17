'use client'
// «وثّق حسابك» (owner 2026-11-17): before anything else a user verifies BOTH the mobile (SMS code)
// and the email (6-digit code). Buyers who signed up by phone verify the email here; those who
// signed up by email verify the mobile here. The middleware sends every protected page here until
// both are done (migration 222 enforces it in the database too).
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PhoneVerify from '@/components/shared/PhoneVerify'
import EmailVerify from '@/components/shared/EmailVerify'

export default function VerifyPage() {
  return <Suspense fallback={null}><Verify /></Suspense>
}

function Verify() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const search = useSearchParams()
  const next = (() => { const n = search.get('next') || ''; return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/verify') ? n : '' })()
  const [p, setP] = useState<any>(null)
  const [email, setEmail] = useState<string>('')

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')
    const { data } = await supabase.from('profiles').select('role, phone, phone_verified_at, whatsapp_verified_at, email_verified_at').eq('id', user.id).single()
    setP(data)
  }
  useEffect(() => { load() }, [])

  const phoneOk = !!p?.phone_verified_at
  const emailOk = !!p?.email_verified_at
  const home = p?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'

  return (
    <div dir={dir} className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#071827]">{L('Verify your account', 'اپنا اکاؤنٹ تصدیق کریں', 'وثّق حسابك')}</h1>
        <p className="text-sm text-gray-500 mt-1">{L('Two quick steps to protect your account and deals: your mobile number and your email.', 'اکاؤنٹ اور سودوں کے تحفظ کے لیے دو آسان قدم: موبائل نمبر اور ای میل۔', 'خطوتان سريعتان لحماية حسابك وصفقاتك: رقم جوالك وبريدك الإلكتروني.')}</p>
      </div>

      <section className={`rounded-2xl border p-4 ${phoneOk ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
        <div className="font-bold text-[#0B2438] mb-1">1. {L('Mobile number', 'موبائل نمبر', 'رقم الجوال')} {phoneOk && <span className="text-[#0F6E56]">✓</span>}</div>
        {p && <PhoneVerify initialPhone={p.phone || ''} locale={locale} verified={phoneOk} waVerified={!!p.whatsapp_verified_at}
          onDone={() => load()} />}
      </section>

      <section className={`rounded-2xl border p-4 ${emailOk ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
        <div className="font-bold text-[#0B2438] mb-2">2. {L('Email', 'ای میل', 'البريد الإلكتروني')} {emailOk && <span className="text-[#0F6E56]">✓</span>}</div>
        {p && <EmailVerify currentEmail={email} verified={emailOk} locale={locale} onDone={() => load()} />}
      </section>

      <button type="button" disabled={!phoneOk || !emailOk}
        onClick={() => { window.location.href = next || home }}
        className="w-full rounded-xl bg-[#D4A543] text-[#071827] font-bold py-3 disabled:opacity-50">
        {phoneOk && emailOk ? L('Continue', 'جاری رکھیں', 'متابعة') : L('Finish both steps to continue', 'جاری رکھنے کے لیے دونوں قدم مکمل کریں', 'أكمل الخطوتين للمتابعة')}
      </button>
    </div>
  )
}
