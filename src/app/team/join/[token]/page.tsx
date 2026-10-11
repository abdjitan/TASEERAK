'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { PHONE_OTP_ENABLED } from '@/lib/features'
import { TEAM_INVITE_KEY } from '@/lib/sellers'

// A company team invitation (/team/join/<token>). Shows the company name; a signed-in user
// joins with one tap, otherwise the token is kept and the user is brought back after login.
export default function JoinTeamPage() {
  const params = useParams()
  const token = String(params?.token || '')
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase.rpc('get_company_invite', { p_token: token })
      setInvite(data || null)
      const { data: { user } } = await supabase.auth.getUser()
      setSignedIn(!!user)
      if (!user && (data as any)?.valid) { try { localStorage.setItem(TEAM_INVITE_KEY, token) } catch {} }
      setLoading(false)
    })()
  }, [token])

  async function join() {
    setBusy(true); setError('')
    const { data } = await createClient().rpc('accept_company_invite', { p_token: token })
    const j: any = data || {}
    try { localStorage.removeItem(TEAM_INVITE_KEY) } catch {}
    if (j.ok) { window.location.href = '/supplier/dashboard'; return }
    setBusy(false)
    setError(({
      invalid_invite: L('This invitation is no longer valid. Ask for a new link.', 'یہ دعوت اب درست نہیں۔', 'هذه الدعوة لم تعد صالحة. اطلب رابطاً جديداً.'),
      already_member: L('You are already a member of a company team.', 'آپ پہلے سے ٹیم میں ہیں۔', 'أنت عضو في فريق شركة بالفعل.'),
      has_activity: L('This account already has its own requests or offers. Sign in with another account to join the team.', 'یہ اکاؤنٹ پہلے سے استعمال میں ہے۔', 'لهذا الحساب طلبات أو عروض خاصة به. سجّل الدخول بحساب آخر للانضمام إلى الفريق.'),
      not_allowed: L('This account cannot join the team.', 'یہ اکاؤنٹ شامل نہیں ہو سکتا۔', 'لا يمكن لهذا الحساب الانضمام إلى الفريق.'),
    } as Record<string, string>)[j.error] || L('Could not join. Try again.', 'شامل نہیں ہو سکے۔', 'تعذّر الانضمام. حاول مرة أخرى.'))
  }

  const next = encodeURIComponent(`/team/join/${token}`)
  const registerHref = PHONE_OTP_ENABLED ? `/login?next=${next}` : '/register?role=supplier&kind=company'

  return (
    <div className="min-h-screen bg-canvas flex flex-col" dir={dir}>
      <div className="flex items-center justify-between p-5">
        <Link href="/" className="text-xl font-extrabold text-navy">تسعير<span className="text-orange">ك</span></Link>
        <LanguageSwitcher variant="minimal" />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-7 border border-line text-center">
          {loading ? (
            <p className="text-sm text-gray-400">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</p>
          ) : !invite?.ok || !invite?.valid ? (
            <>
              <div className="text-4xl mb-2">⏳</div>
              <h1 className="text-lg font-extrabold text-navy">{L('Invitation not valid', 'دعوت درست نہیں', 'الدعوة غير صالحة')}</h1>
              <p className="text-sm text-gray-500 mt-1">{L('It may have been used or expired. Ask the company for a new link.', 'نیا لنک مانگیں۔', 'ربما استُخدمت أو انتهت صلاحيتها. اطلب من الشركة رابطاً جديداً.')}</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">👥</div>
              <h1 className="text-xl font-extrabold text-navy leading-snug">
                {L('Join the team of', 'ٹیم میں شامل ہوں:', 'انضم إلى فريق')} {invite.company_name}
              </h1>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {L('You will price requests on behalf of the company with your own account.', 'آپ کمپنی کی جانب سے قیمتیں دیں گے۔', 'ستسعّر الطلبات باسم الشركة من خلال حسابك الخاص.')}
              </p>
              {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>}
              {signedIn ? (
                <button type="button" onClick={join} disabled={busy} className="btn-orange w-full mt-5 py-3 rounded-xl font-extrabold disabled:opacity-50">
                  {busy ? L('Joining…', 'شامل ہو رہے ہیں…', 'جارٍ الانضمام…') : L('Join the team', 'ٹیم میں شامل ہوں', 'انضم إلى الفريق')}
                </button>
              ) : (
                <div className="mt-5 space-y-2">
                  <Link href={registerHref} className="btn-orange block w-full py-3 rounded-xl font-extrabold">{L('Create an account', 'اکاؤنٹ بنائیں', 'إنشاء حساب')}</Link>
                  <Link href={`/login?next=${next}`} className="block w-full py-3 rounded-xl font-bold border border-gray-200 text-gray-700">{L('I already have an account', 'میرا اکاؤنٹ ہے', 'لدي حساب')}</Link>
                  <p className="text-[11px] text-gray-400">{L('After signing in you will come back here to join.', 'لاگ ان کے بعد یہاں واپس آئیں گے۔', 'بعد تسجيل الدخول ستعود إلى هنا لإتمام الانضمام.')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
