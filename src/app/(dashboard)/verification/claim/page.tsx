'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'
import { normalizeCrInput, crTakenText, crSupportHref } from '@/lib/cr'
import { friendlyError } from '@/lib/friendlyError'
import { askConfirm } from '@/lib/askConfirm'
import LoadError from '@/components/shared/LoadError'

// «هذا السجل مستخدم في حساب آخر». Owner 2026-11-23 (round-4 UX-061): new ownership claims go through
// support (/support?topic=cr&cr=…); this page only lists the requests already sent, with their status.
export default function CrClaimPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [role, setRole] = useState('contractor')
  const [loading, setLoading] = useState(true)
  const [cr, setCr] = useState('')
  const [msg, setMsg] = useState('')
  const [mine, setMine] = useState<any[]>([])
  const [loadFailed, setLoadFailed] = useState(false) // round-5 UX-164: a failed load is never «no requests»

  async function loadMine(supabase: any, uid: string) {
    const { data, error } = await supabase.from('cr_claims').select('id, commercial_registration, status, created_at, admin_note')
      .eq('claimant_id', uid).order('created_at', { ascending: false }).limit(20)
    if (error) { setLoadFailed(true); return }
    setLoadFailed(false)
    setMine(data || [])
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole(p?.role || 'contractor')
      setCr(normalizeCrInput(new URLSearchParams(window.location.search).get('cr')))
      await loadMine(supabase, session.user.id)
      setLoading(false)
    }
    init()
  }, [])

  async function withdraw(id: string) {
    if (!(await askConfirm(L('Withdraw the request to prove ownership of the registration? If you need it later, contact support again.', 'رجسٹریشن کی ملکیت ثابت کرنے کی درخواست واپس لیں؟ اگر بعد میں ضرورت ہو تو دوبارہ سپورٹ سے رابطہ کریں۔', 'سحب طلب إثبات ملكية السجل؟ إن احتجت إليه لاحقاً فتواصل مع الدعم من جديد.'), { okLabel: L('Withdraw', 'واپس لیں', 'سحب الطلب'), cancelLabel: L('Keep it', 'رہنے دیں', 'إبقاء الطلب') }))) return
    const supabase = createClient()
    const { error } = await supabase.rpc('withdraw_cr_claim', { p_claim_id: id })
    if (error) { setMsg(friendlyError(error.message, L('Could not withdraw the request. Check your connection and try again.', 'درخواست واپس نہیں لی جا سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر سحب الطلب. تحقّق من اتصالك وحاول مرة أخرى.'), locale)); return }
    setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await loadMine(supabase, session.user.id)
  }

  if (loading) return <PageLoader />

  const statusLabel = (s: string) => s === 'open' ? L('Under review', 'زیرِ جائزہ', 'قيد المراجعة')
    : s === 'approved' ? L('Approved', 'منظور', 'مقبول') : s === 'withdrawn' ? L('Withdrawn', 'واپس لیا گیا', 'مسحوب') : L('Not approved', 'منظور نہیں', 'غير مقبول')

  return (
    <AppShell title={L('Commercial registration request', 'تجارتی رجسٹریشن کی درخواست', 'طلب تحقق من سجل تجاري')} nav={getNav(role, locale, '/settings')} dir={dir}>
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h1 className="text-lg font-bold mb-1" style={{ color: '#0B2438' }}><Glyph e="📋" /> {L('Is this registration yours?', 'کیا یہ رجسٹریشن آپ کی ہے؟', 'هل هذا السجل لك؟')}</h1>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {crTakenText(locale).msg} {L('The support team checks the documents with you and transfers the registration when it is yours.', 'سپورٹ ٹیم آپ کے ساتھ دستاویزات کی جانچ کرتی ہے اور آپ کی ہونے پر رجسٹریشن منتقل کرتی ہے۔', 'يراجع فريق الدعم المستندات معك، وينقل السجل إلى حسابك إن ثبت أنه لك.')}
          </p>
          {/* round-6 UX-108: which registration this is about, with a way to correct a mistyped number */}
          {cr && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f4f6f9] px-3 py-2 text-sm">
              <span className="text-gray-700">{L('Commercial registration: ', 'تجارتی رجسٹریشن: ', 'السجل التجاري: ')}<b className="text-[#0B2438]" dir="ltr">{cr}</b></span>
              <a href={role === 'supplier' ? '/settings?tab=docs' : '/settings'} className="inline-flex items-center min-h-[44px] px-1 font-bold text-[#8F6820] underline underline-offset-2">{L('Correct the number', 'نمبر درست کریں', 'تصحيح الرقم')}</a>
            </div>
          )}
          <a href={crSupportHref(cr, { signedIn: true })} className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-extrabold text-sm" style={{ background: '#D4A543', color: '#071827' }}>
            {crTakenText(locale).cta}
          </a>
          {msg && <div role="alert" className="mt-4 text-sm rounded-xl p-3 bg-red-50 text-red-700 border border-red-200">{msg}</div>}
        </div>

        {loadFailed && <LoadError onRetry={async () => { const supabase = createClient(); const { data: { session } } = await supabase.auth.getSession(); if (session) await loadMine(supabase, session.user.id) }} />}
        {!loadFailed && mine.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold mb-3" style={{ color: '#0B2438' }}>{L('My requests', 'میری درخواستیں', 'طلباتي')}</h2>
            <div className="space-y-2">
              {mine.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="min-w-0">
                    <div dir="ltr">{c.commercial_registration}</div>
                    <div className="text-[12px] text-gray-500">{statusLabel(c.status)}{c.admin_note ? ' · ' + c.admin_note : ''}</div>
                  </div>
                  {c.status === 'open' && (
                    <button type="button" onClick={() => withdraw(c.id)} className="min-h-[44px] text-xs px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0">
                      {L('Withdraw', 'واپس لیں', 'سحب الطلب')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
