'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { TEAM_INVITE_KEY } from '@/lib/sellers'
import Glyph from '@/components/shared/Glyph'
import LoadError from '@/components/shared/LoadError'

// A company team invitation (/team/join/<token>). Shows the company name; a signed-in user
// joins with one tap, otherwise the token is kept and the user is brought back after login.
// UX-027: a new employee signs up in «employee mode» (/register?team=…: no CR, no business name);
// a network error is never shown as «invalid invitation» and never drops the saved token.
export default function JoinTeamPage() {
  const params = useParams()
  const token = String(params?.token || '')
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [me, setMe] = useState<{ name: string; email: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setLoadFailed(false)
    const supabase = createClient()
    try {
      const { data, error: e } = await supabase.rpc('get_company_invite', { p_token: token })
      if (e) throw e
      setInvite(data || null)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        setMe({ name: p?.full_name || '', email: user.email || user.phone || '' })
      } else setMe(null)
      if (!user && (data as any)?.valid) { try { localStorage.setItem(TEAM_INVITE_KEY, token) } catch {} }
    } catch (e) {
      console.error('[team/join] load failed', e)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function join() {
    setBusy(true); setError('')
    const { data, error: e } = await createClient().rpc('accept_company_invite', { p_token: token })
    if (e) {
      // a dropped connection: keep the saved token and offer a retry
      setBusy(false)
      setError(L('Could not join because of the connection. Try again.', 'کنکشن کی وجہ سے شامل نہیں ہو سکے۔ دوبارہ کوشش کریں۔', 'تعذّر الانضمام بسبب الاتصال. حاول مرة أخرى.'))
      return
    }
    const j: any = data || {}
    if (j.ok || j.error === 'invalid_invite' || j.error === 'already_member') { try { localStorage.removeItem(TEAM_INVITE_KEY) } catch {} }
    if (j.ok) { window.location.href = '/supplier/dashboard'; return }
    setBusy(false)
    setError(({
      invalid_invite: L('This invitation is no longer valid. Ask for a new link.', 'یہ دعوت اب درست نہیں۔ نیا لنک مانگیں۔', 'هذه الدعوة لم تعد صالحة. اطلب رابطاً جديداً.'),
      already_member: L('You are already a member of a company team.', 'آپ پہلے سے ٹیم میں ہیں۔', 'أنت عضو في فريق شركة بالفعل.'),
      has_activity: L('This account already has its own requests or offers. Sign in with another account to join the team.', 'اس اکاؤنٹ کی اپنی درخواستیں یا آفرز ہیں۔ شامل ہونے کے لیے دوسرے اکاؤنٹ سے سائن اِن کریں۔', 'لهذا الحساب طلبات أو عروض خاصة به. سجّل الدخول بحساب آخر للانضمام إلى الفريق.'),
      not_allowed: L('This account cannot join the team.', 'یہ اکاؤنٹ شامل نہیں ہو سکتا۔', 'لا يمكن لهذا الحساب الانضمام إلى الفريق.'),
    } as Record<string, string>)[j.error] || L('Could not join. Try again.', 'شامل نہیں ہو سکے۔ دوبارہ کوشش کریں۔', 'تعذّر الانضمام. حاول مرة أخرى.'))
  }

  async function switchAccount() {
    try { localStorage.setItem(TEAM_INVITE_KEY, token) } catch {}
    await createClient().auth.signOut()
    window.location.href = `/login?m=email&next=${encodeURIComponent(`/team/join/${token}`)}`
  }

  const next = encodeURIComponent(`/team/join/${token}`)
  // employee mode: the email sign-up with no account-type step and no commercial registration
  const registerHref = `/register?team=${token}&email=1`

  return (
    <div className="min-h-screen bg-canvas flex flex-col" dir={dir}>
      <div className="flex items-center justify-between p-5">
        <Link href="/" className="flex items-center" aria-label={L('Taseerak home', 'تسعیرک مرکزی صفحہ', 'تسعيرك، الرئيسية')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="h-10 w-auto" />
        </Link>
        <LanguageSwitcher variant="minimal" />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-7 border border-line text-center">
          {loading ? (
            <p className="text-sm text-gray-500">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</p>
          ) : loadFailed ? (
            <LoadError onRetry={load} className="border-0 shadow-none p-2" />
          ) : !invite?.ok || !invite?.valid ? (
            <>
              <div className="text-4xl mb-2 text-gray-500"><Glyph e="⏳" /></div>
              <h1 className="text-lg font-extrabold text-navy">{L('Invitation not valid', 'دعوت درست نہیں', 'الدعوة غير صالحة')}</h1>
              <p className="text-sm text-gray-600 mt-1">{L('It may have been used or expired. Ask the company for a new link.', 'شاید یہ استعمال ہو چکی یا ختم ہو گئی۔ کمپنی سے نیا لنک مانگیں۔', 'ربما استُخدمت أو انتهت صلاحيتها. اطلب من الشركة رابطاً جديداً.')}</p>
              <Link href="/" className="inline-flex items-center justify-center mt-5 min-h-[44px] px-5 rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{L('Back to the home page', 'مرکزی صفحے پر واپس', 'العودة إلى الصفحة الرئيسية')}</Link>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2"><Glyph e="👥" /></div>
              <h1 className="text-xl font-extrabold text-navy leading-snug">
                {L(`Join the team of ${invite.company_name}`, `${invite.company_name} کی ٹیم میں شامل ہوں`, `انضم إلى فريق ${invite.company_name}`)}
              </h1>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {L('You will price requests in the company name from your own account. You do not need a commercial registration.', 'آپ اپنے اکاؤنٹ سے کمپنی کے نام پر قیمتیں دیں گے۔ تجارتی رجسٹریشن کی ضرورت نہیں۔', 'ستسعّر الطلبات باسم الشركة من حسابك الخاص، ولا تحتاج سجلاً تجارياً.')}
              </p>
              {/* UX-146: the invited person knows the role before joining */}
              <p className="mt-3 inline-block text-[13px] font-semibold text-navy rounded-xl bg-[#0B2438]/5 px-3 py-2">{L('Your role: ', 'آپ کا کردار: ', 'دورك: ')}{invite.role === 'admin' ? L('Admin (prices requests and invites members)', 'ایڈمن (قیمتیں دیتا ہے اور اراکین بلاتا ہے)', 'مشرف (يسعّر الطلبات ويدعو أعضاء)') : L('Sales (prices requests)', 'سیلز (درخواستوں کی قیمت دیتا ہے)', 'مبيعات (يسعّر الطلبات)')}</p>
              {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" role="alert">{error}</div>}
              {me ? (
                <>
                  <p className="mt-4 text-[13px] text-gray-700">{L('You will join with the account:', 'آپ اس اکاؤنٹ سے شامل ہوں گے:', 'ستنضم بحساب:')} <b className="text-navy">{me.name || me.email}</b>{me.name && me.email ? <span className="text-gray-500" dir="ltr"> ({me.email})</span> : null}</p>
                  <button type="button" onClick={join} disabled={busy} className="w-full mt-3 min-h-[48px] rounded-xl font-extrabold text-[#071827] disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                    {busy ? L('Joining…', 'شامل ہو رہے ہیں…', 'جارٍ الانضمام…') : L('Join the team', 'ٹیم میں شامل ہوں', 'انضم إلى الفريق')}
                  </button>
                  <button type="button" onClick={switchAccount} className="w-full mt-2 min-h-[44px] rounded-xl font-bold border border-gray-200 text-gray-700 text-sm">
                    {L('Sign out and use another account', 'سائن آؤٹ کر کے دوسرا اکاؤنٹ استعمال کریں', 'تسجيل الخروج والدخول بحساب آخر')}
                  </button>
                </>
              ) : (
                <div className="mt-5 space-y-2">
                  <Link href={registerHref} className="flex items-center justify-center w-full min-h-[48px] rounded-xl font-extrabold text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{L('Create my employee account', 'میرا ملازم اکاؤنٹ بنائیں', 'أنشئ حسابي كموظف')}</Link>
                  <Link href={`/login?m=email&next=${next}`} className="flex items-center justify-center w-full min-h-[44px] rounded-xl font-bold border border-gray-200 text-gray-700">{L('I already have an account', 'میرا اکاؤنٹ ہے', 'لدي حساب')}</Link>
                  <p className="text-[12px] text-gray-500">{L('After signing in you will come back here to join.', 'لاگ ان کے بعد یہاں واپس آئیں گے۔', 'بعد تسجيل الدخول ستعود إلى هنا لإتمام الانضمام.')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
