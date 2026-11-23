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
// round-5 UX-098/100/101: a buyer or seller account is warned before it becomes an employee account;
// an unusable link says why (already a member, expired, revoked, the owner's own link); an account with
// its own activity is sent to create a new employee account. get_company_invite may return reason,
// is_owner, used_by_me (newer server); when absent the page falls back to what it can tell itself.
type Me = { id: string; name: string; email: string; role: string; providerType: string; actingUid: string; freshEmployee: boolean }

export default function JoinTeamPage() {
  const params = useParams()
  const token = String(params?.token || '')
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errCode, setErrCode] = useState('')

  async function load() {
    setLoading(true); setLoadFailed(false)
    const supabase = createClient()
    try {
      const { data, error: e } = await supabase.rpc('get_company_invite', { p_token: token })
      if (e) throw e
      setInvite(data || null)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [{ data: p }, act] = await Promise.all([
          supabase.from('profiles').select('full_name, role, provider_type').eq('id', user.id).maybeSingle(),
          Promise.resolve(supabase.rpc('acting_uid')).then((r: any) => r, () => ({ data: null })),
        ])
        const meta: any = user.user_metadata || {}
        setMe({
          id: user.id, name: p?.full_name || '', email: user.email || user.phone || '',
          role: String(p?.role || ''), providerType: String(p?.provider_type || ''),
          actingUid: String((act as any)?.data || user.id),
          // an account just created from this invitation (/register?team=…) is already an employee account
          freshEmployee: !!meta.team_invite,
        })
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
    setBusy(true); setError(''); setErrCode('')
    const { data, error: e } = await createClient().rpc('accept_company_invite', { p_token: token })
    if (e) {
      // a dropped connection: keep the saved token and offer a retry
      setBusy(false)
      setError(L('Could not join because of the connection. Try again.', 'کنکشن کی وجہ سے شامل نہیں ہو سکے۔ دوبارہ کوشش کریں۔', 'تعذّر الانضمام بسبب الاتصال. حاول مرة أخرى.'))
      return
    }
    const j: any = data || {}
    if (j.ok || j.error === 'invalid_invite' || j.error === 'already_member') { try { localStorage.removeItem(TEAM_INVITE_KEY) } catch {} }
    if (j.ok) { window.location.href = '/supplier/dashboard?joined=1'; return }
    setBusy(false)
    setErrCode(String(j.error || ''))
    setError(({
      invalid_invite: L('This invitation is no longer valid. Ask for a new link.', 'یہ دعوت اب درست نہیں۔ نیا لنک مانگیں۔', 'هذه الدعوة لم تعد صالحة. اطلب رابطاً جديداً.'),
      already_member: L('You are already a member of a company team. To join another team, leave your current team first from the Team page.', 'آپ پہلے سے کسی کمپنی کی ٹیم کے رکن ہیں۔ دوسری ٹیم میں شامل ہونے کے لیے پہلے ٹیم کے صفحے سے موجودہ ٹیم چھوڑیں۔', 'أنت عضو في فريق شركة بالفعل. وإن أردت الانضمام إلى فريق آخر، فغادر فريقك الحالي أولاً من صفحة فريق العمل.'),
      // round-5 UX-101: say why, and what to do (a new employee account)
      has_activity: L('This account has its own requests or offers, so it cannot become an employee account. Create a new account with a different email address and mobile number.', 'اس اکاؤنٹ کی اپنی درخواستیں یا آفرز ہیں، اس لیے اسے ملازم اکاؤنٹ میں تبدیل نہیں کیا جا سکتا۔ کسی دوسرے ای میل اور موبائل نمبر سے نیا اکاؤنٹ بنائیں۔', 'لهذا الحساب طلبات أو عروض خاصة به، فلا يمكن تحويله إلى حساب موظف. أنشئ حساباً جديداً ببريد إلكتروني ورقم جوال آخرين.'),
      not_allowed: L('This account cannot join the team.', 'یہ اکاؤنٹ ٹیم میں شامل نہیں ہو سکتا۔', 'لا يمكن لهذا الحساب الانضمام إلى الفريق.'),
    } as Record<string, string>)[j.error] || L('Could not join. Try again.', 'شامل نہیں ہو سکے۔ دوبارہ کوشش کریں۔', 'تعذّر الانضمام. حاول مرة أخرى.'))
  }

  // employee mode: the email sign-up with no account-type step and no commercial registration
  const registerHref = `/register?team=${token}&email=1`
  const next = encodeURIComponent(`/team/join/${token}`)

  async function switchAccount() {
    try { localStorage.setItem(TEAM_INVITE_KEY, token) } catch {}
    await createClient().auth.signOut()
    window.location.href = `/login?m=email&next=${next}`
  }
  // round-5 UX-098/101: sign out, then open the employee sign-up for this invitation
  async function newEmployeeAccount() {
    try { localStorage.setItem(TEAM_INVITE_KEY, token) } catch {}
    await createClient().auth.signOut()
    window.location.href = registerHref
  }

  const company = String(invite?.company_name || '') || L('the company', 'کمپنی', 'الشركة')
  const memberAlready = !!me && (invite?.used_by_me === true || (me.actingUid && me.actingUid !== me.id))
  const isOwner = invite?.is_owner === true
  const reason: string = String(invite?.reason || '')
  // round-5 UX-098: a buyer or seller account (not one just created for this invitation) is warned first
  const convertsAccount = !!me && !me.freshEmployee && (me.role === 'contractor' || (me.role === 'supplier' && !!me.providerType))

  const goldBtn = 'flex items-center justify-center w-full min-h-[48px] px-4 rounded-xl font-extrabold text-[#071827] disabled:opacity-50'
  const goldBg = { background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }
  const secondaryBtn = 'flex items-center justify-center w-full min-h-[44px] px-4 rounded-xl font-bold border border-gray-200 text-gray-700 text-sm'
  const navyBtn = 'inline-flex items-center justify-center mt-5 min-h-[44px] px-5 rounded-xl font-bold text-white text-sm'

  // round-5 UX-100: one screen per reason the link cannot be used
  function unusable() {
    let icon = '⏳', title = L('The invitation is not valid', 'دعوت درست نہیں ہے', 'الدعوة غير صالحة')
    let body = L('It may have been used or expired. Ask the company for a new link.', 'شاید یہ استعمال ہو چکی یا ختم ہو گئی۔ کمپنی سے نیا لنک مانگیں۔', 'ربما استُخدمت أو انتهت صلاحيتها. اطلب من الشركة رابطاً جديداً.')
    let action = <Link href="/" className={navyBtn} style={{ background: '#0B2438' }}>{L('Back to the home page', 'مرکزی صفحے پر واپس', 'العودة إلى الصفحة الرئيسية')}</Link>
    if (memberAlready) {
      icon = '👥'
      title = L(`You are already a member of the ${company} team`, `آپ پہلے سے ${company} کی ٹیم کے رکن ہیں`, `أنت عضو في فريق ${company} بالفعل`)
      body = invite?.used_by_me === true || !invite?.company_name
        ? L('You can price the company’s requests from your dashboard.', 'آپ اپنے ڈیش بورڈ سے کمپنی کی درخواستوں کی قیمت دے سکتے ہیں۔', 'يمكنك تسعير طلبات الشركة من لوحتك.')
        : L('To join another team, leave your current team first from the Team page.', 'دوسری ٹیم میں شامل ہونے کے لیے پہلے ٹیم کے صفحے سے موجودہ ٹیم چھوڑیں۔', 'وإن أردت الانضمام إلى فريق آخر، فغادر فريقك الحالي أولاً من صفحة فريق العمل.')
      action = <Link href="/supplier/dashboard" className={navyBtn} style={{ background: '#0B2438' }}>{L('Go to your dashboard', 'اپنے ڈیش بورڈ پر جائیں', 'الانتقال إلى لوحتك')}</Link>
    } else if (isOwner) {
      icon = '📨'
      title = L('This is your invitation link', 'یہ آپ کا دعوتی لنک ہے', 'هذا رابط الدعوة الخاص بك')
      body = L('This is an invitation link for your employees: send it to the employee to open it from their own account.', 'یہ آپ کے ملازمین کے لیے دعوتی لنک ہے: اسے ملازم کو بھیجیں تاکہ وہ اپنے اکاؤنٹ سے کھولے۔', 'هذا رابط دعوة لموظفيك، فأرسله إلى الموظف ليفتحه من حسابه.')
      action = <Link href="/supplier/team" className={navyBtn} style={{ background: '#0B2438' }}>{L('Go to the Team page', 'ٹیم کے صفحے پر جائیں', 'الانتقال إلى صفحة فريق العمل')}</Link>
    } else if (reason === 'expired') {
      title = L('This link has expired', 'اس لنک کی میعاد ختم ہو گئی', 'انتهت صلاحية هذا الرابط')
      body = L(`Ask ${company} for a new invitation link.`, `${company} سے نیا دعوتی لنک مانگیں۔`, `اطلب من ${company} رابط دعوة جديداً.`)
    } else if (reason === 'revoked') {
      icon = '🚫'
      title = L('The company cancelled this link', 'کمپنی نے یہ لنک منسوخ کر دیا', 'ألغت الشركة هذا الرابط')
      body = L(`If you still need to join, ask ${company} for a new link.`, `اگر آپ کو اب بھی شامل ہونا ہے تو ${company} سے نیا لنک مانگیں۔`, `إن كنت ما زلت تريد الانضمام، فاطلب من ${company} رابطاً جديداً.`)
    } else if (reason === 'used') {
      title = L('This link has already been used', 'یہ لنک پہلے ہی استعمال ہو چکا ہے', 'استُخدم هذا الرابط من قبل')
      body = L(`Each link is for one employee. Ask ${company} for a new link.`, `ہر لنک ایک ملازم کے لیے ہے۔ ${company} سے نیا لنک مانگیں۔`, `كل رابط لموظف واحد. اطلب من ${company} رابطاً جديداً.`)
    }
    return (
      <>
        <div className="text-4xl mb-2 text-gray-500"><Glyph e={icon} /></div>
        <h1 className="text-lg font-extrabold text-navy">{title}</h1>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{body}</p>
        {action}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col" dir={dir}>
      <div className="flex items-center justify-between p-5">
        <Link href="/" className="flex items-center" aria-label={L('Taseerak home', 'تسعیرک مرکزی صفحہ', 'تسعيرك، الرئيسية')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك — Taseerak" className="h-14 w-auto" />
        </Link>
        <LanguageSwitcher variant="minimal" />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-7 border border-line text-center">
          {loading ? (
            <p className="text-sm text-gray-500">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</p>
          ) : loadFailed ? (
            <LoadError onRetry={load} className="border-0 shadow-none p-2" />
          ) : !invite?.ok || !invite?.valid || isOwner || memberAlready ? (
            unusable()
          ) : (
            <>
              <div className="text-4xl mb-2"><Glyph e="👥" /></div>
              <h1 className="text-xl font-extrabold text-navy leading-snug">
                {L(`Join the team of ${company}`, `${company} کی ٹیم میں شامل ہوں`, `انضم إلى فريق ${company}`)}
              </h1>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {L('You will price requests in the company name from your own account. You do not need a commercial registration.', 'آپ اپنے اکاؤنٹ سے کمپنی کے نام پر قیمتیں دیں گے۔ تجارتی رجسٹریشن کی ضرورت نہیں۔', 'ستسعّر الطلبات باسم الشركة من حسابك الخاص، ولا تحتاج سجلاً تجارياً.')}
              </p>
              <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">{L('After a buyer chooses the company offer, the account owner manages the deal and the conversations with buyers.', 'خریدار کے کمپنی کی آفر چننے کے بعد، اکاؤنٹ کا مالک سودا اور خریداروں سے بات چیت سنبھالتا ہے۔', 'بعد اختيار المشتري لعرض الشركة، يدير صاحب الحساب الصفقة والمحادثات مع المشترين.')}</p>
              {/* UX-146: the invited person knows the role before joining */}
              <p className="mt-3 inline-block text-[13px] font-semibold text-navy rounded-xl bg-[#0B2438]/5 px-3 py-2">{L('Your role: ', 'آپ کا کردار: ', 'دورك: ')}{invite.role === 'admin' ? L('Admin (prices requests and invites members)', 'ایڈمن (قیمتیں دیتا ہے اور اراکین بلاتا ہے)', 'مشرف (يسعّر الطلبات ويدعو أعضاء)') : L('Sales (prices requests)', 'سیلز (درخواستوں کی قیمت دیتا ہے)', 'مبيعات (يسعّر الطلبات)')}</p>
              {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 text-start leading-relaxed" role="alert">{error}
                {errCode === 'already_member' && <Link href="/supplier/dashboard" className="mt-2 flex items-center justify-center min-h-[44px] rounded-xl font-bold text-white text-sm" style={{ background: '#0B2438' }}>{L('Go to your dashboard', 'اپنے ڈیش بورڈ پر جائیں', 'الانتقال إلى لوحتك')}</Link>}
              </div>}
              {me ? (
                errCode === 'has_activity' ? (
                  // round-5 UX-101: the join button is gone; the way forward is a new employee account
                  <div className="mt-4 space-y-2">
                    <button type="button" onClick={newEmployeeAccount} className={goldBtn} style={goldBg}>{L('Create a new employee account', 'نیا ملازم اکاؤنٹ بنائیں', 'أنشئ حساب موظف جديداً')}</button>
                    <button type="button" onClick={switchAccount} className={secondaryBtn}>{L('Sign out and use another account', 'سائن آؤٹ کر کے دوسرا اکاؤنٹ استعمال کریں', 'تسجيل الخروج والدخول بحساب آخر')}</button>
                  </div>
                ) : convertsAccount ? (
                  // round-5 UX-098: joining turns this buyer / seller account into an employee account, for good
                  <>
                    <div role="note" className="mt-4 text-start text-[13px] text-[#071827] bg-[#D4A543]/10 border border-[#D4A543]/50 rounded-xl p-3 leading-relaxed">
                      <p><Glyph e="⚠" /> {L(`This account (${me.name || me.email}) will become an employee account of ${company}, and you will no longer be able to request prices or sell in your own name from it. We recommend creating a new employee account.`, `یہ اکاؤنٹ (${me.name || me.email}) ${company} کا ملازم اکاؤنٹ بن جائے گا، اور آپ اس سے اپنے نام پر قیمتیں نہیں منگوا سکیں گے اور نہ بیچ سکیں گے۔ نیا ملازم اکاؤنٹ بنانا بہتر ہے۔`, `سيتحوّل هذا الحساب (${me.name || me.email}) إلى حساب موظف لدى ${company}، ولن تستطيع طلب الأسعار أو البيع باسمك منه. يُنصح بإنشاء حساب موظف جديد.`)}</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      <button type="button" onClick={newEmployeeAccount} className={goldBtn} style={goldBg}>{L('Create a new employee account', 'نیا ملازم اکاؤنٹ بنائیں', 'أنشئ حساب موظف جديداً')}</button>
                      <button type="button" onClick={join} disabled={busy} className={`${secondaryBtn} disabled:opacity-50`}>
                        {busy ? L('Joining…', 'شامل ہو رہے ہیں…', 'جارٍ الانضمام…') : L('Join with this account anyway', 'پھر بھی اسی اکاؤنٹ سے شامل ہوں', 'انضم بهذا الحساب على أي حال')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-[13px] text-gray-700">{L('You will join with the account:', 'آپ اس اکاؤنٹ سے شامل ہوں گے:', 'ستنضم بحساب:')} <b className="text-navy">{me.name || me.email}</b>{me.name && me.email ? <span className="text-gray-500" dir="ltr"> ({me.email})</span> : null}</p>
                    <button type="button" onClick={join} disabled={busy} className={`${goldBtn} mt-3`} style={goldBg}>
                      {busy ? L('Joining…', 'شامل ہو رہے ہیں…', 'جارٍ الانضمام…') : L('Join the team', 'ٹیم میں شامل ہوں', 'انضم إلى الفريق')}
                    </button>
                    <button type="button" onClick={switchAccount} className={`${secondaryBtn} mt-2`}>
                      {L('Sign out and use another account', 'سائن آؤٹ کر کے دوسرا اکاؤنٹ استعمال کریں', 'تسجيل الخروج والدخول بحساب آخر')}
                    </button>
                  </>
                )
              ) : (
                <div className="mt-5 space-y-2">
                  <Link href={registerHref} className={goldBtn} style={goldBg}>{L('Create my employee account', 'میرا ملازم اکاؤنٹ بنائیں', 'أنشئ حسابي كموظف')}</Link>
                  <Link href={`/login?m=email&next=${next}`} className={secondaryBtn}>{L('I already have an account', 'میرا اکاؤنٹ ہے', 'لدي حساب')}</Link>
                  <p className="text-[12px] text-gray-500">{L('After signing in you will come back here to join.', 'سائن اِن کے بعد آپ شامل ہونے کے لیے یہاں واپس آئیں گے۔', 'بعد تسجيل الدخول ستعود إلى هنا لإتمام الانضمام.')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
