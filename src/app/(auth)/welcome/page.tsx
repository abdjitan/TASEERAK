'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SELLER_KINDS, rememberedSignupKind, type SellerKind } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import { Check } from 'lucide-react'
import PageLoader from '@/components/shared/PageLoader'
import { clearShellCard } from '@/components/shared/AppShell'

// After the first WhatsApp OTP: "Do you need prices or provide them?", and for a provider
// "independent or company?", plus a name. Everything else (location, categories, company
// activity, CR) is asked later, when it is needed.
type Intent = 'buyer' | 'provider'

export default function WelcomePage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [kind, setKind] = useState<SellerKind>('company')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [converted, setConverted] = useState(false) // admin turned this buyer into a supplier (238): no buyer choice
  // a former company team member: both choices again, with a word on why he is here (round-5 UX-104)
  const [leftTeam, setLeftTeam] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role, role_chosen_at, full_name').eq('id', user.id).single()
      if (p?.role_chosen_at || p?.role === 'admin') { window.location.href = '/onboarding'; return }
      if (p?.full_name) setName(p.full_name)
      let former = new URLSearchParams(window.location.search).get('left') === 'team'
      if (!former && p?.role === 'supplier') {
        try {
          const { data: m } = await supabase.from('company_members').select('status').eq('user_id', user.id).neq('status', 'active').limit(1)
          former = (m || []).length > 0
        } catch {}
      }
      if (former) setLeftTeam(true)
      else if (p?.role === 'supplier') { setConverted(true); setIntent('provider') }
      const k = new URLSearchParams(window.location.search).get('kind') || rememberedSignupKind()
      if (k === 'company' || k === 'independent') { setIntent('provider'); setKind(k) }
      setReady(true)
    })()
  }, [])

  async function save() {
    setError('')
    if (name.trim().length < 2) { setError(L('Write your name.', 'اپنا نام لکھیں۔', 'اكتب اسمك.')); return }
    if (!intent) { setError(L('Choose what you want to do.', 'منتخب کریں آپ کیا کرنا چاہتے ہیں۔', 'اختر ماذا تريد أن تفعل.')); return }
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('choose_my_role', {
      p_intent: intent, p_full_name: name.trim(), p_provider_type: intent === 'provider' ? (kind === 'independent' ? 'individual' : 'company') : null,
    })
    if (err && !/already_chosen/.test(err.message || '')) {
      setSaving(false)
      setError(L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ. أعد المحاولة.'))
      return
    }
    window.location.href = '/onboarding'
  }

  // the branded loader instead of an empty page while the account is read (UX-135)
  if (!ready) return <PageLoader />

  return (
    <div className="min-h-screen flex flex-col" dir={dir} style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/taseerak-metallic-logo.webp" alt={locale === 'en' ? 'Taseerak' : 'تسعيرك'} className="h-12 w-auto" />
        <LanguageSwitcher variant="minimal" />
      </div>
      <div className="flex-1 flex justify-center px-4 pb-12">
        <div className="w-full max-w-[460px] space-y-6 animate-slide-up">
          <div>
            <h1 className="text-[26px] font-bold text-navy">{L('Welcome to Taseerak', 'تسعیرک میں خوش آمدید', 'أهلاً بك في تسعيرك')}</h1>
            <p className="text-ink-2 text-sm mt-1">{leftTeam
              ? L('You left the company team. Choose how you want to use Taseerak now.', 'آپ نے کمپنی کی ٹیم چھوڑ دی ہے۔ اب منتخب کریں کہ آپ تسعیرک کیسے استعمال کرنا چاہتے ہیں۔', 'غادرت فريق الشركة. اختر كيف تريد استخدام تسعيرك الآن.')
              : L('A few short steps and you are in.', 'چند مختصر قدم اور آپ شروع کر سکتے ہیں۔', 'خطوات قليلة وتبدأ.')}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>}

          <div>
            <label htmlFor="welcome-name" className="block text-[13px] font-bold text-ink-2 mb-1.5">{L('Your name', 'آپ کا نام', 'اسمك')}</label>
            <input id="welcome-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
              className="input-field" placeholder={L('e.g. Mohammed Al-Otaibi', 'مثلاً محمد', 'مثلاً محمد العتيبي')} />
          </div>

          <div className="space-y-3">
            <p className="text-[13px] font-bold text-ink-2">{L('What do you want to do?', 'آپ کیا کرنا چاہتے ہیں؟', 'ماذا تريد أن تفعل؟')}</p>
            {/* buyer-first (owner 2026-11-12, app parity 087454f): one big gold card for buyers, a small row for suppliers */}
            {converted && <p className="text-[13px] font-bold text-[#0F6E56]">{L('Your account is now a supplier account. Choose how you work to continue.', 'آپ کا اکاؤنٹ اب سپلائر اکاؤنٹ ہے۔ جاری رکھنے کے لیے اپنا کام کرنے کا طریقہ منتخب کریں۔', 'أصبح حسابك حساب مورد. اختر طريقة عملك للمتابعة.')}</p>}
            {!converted && <button type="button" onClick={() => setIntent('buyer')} aria-pressed={intent === 'buyer'}
              className={`w-full text-start flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${intent === 'buyer' ? 'shadow-md' : 'hover:shadow-sm'}`}
              style={{ background: intent === 'buyer' ? '#D4A543' : '#FFF8E8', borderColor: '#D4A543', color: '#071827' }}>
              <span className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ background: '#071827', color: '#F5C55B' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" /></svg>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-bold text-lg">{intent === 'buyer' && <Check className="w-5 h-5" strokeWidth={3} aria-hidden />}{L('Request prices', 'قیمتیں منگوائیں', 'اطلب الأسعار')}</span>
                <span className="block text-[13px] mt-0.5 leading-relaxed opacity-80">{L('Request material prices from suppliers and compare quotes.', 'سپلائرز سے سامان کی قیمتیں منگوائیں اور پیشکشوں کا موازنہ کریں۔', 'اطلب أسعار المواد من الموردين وقارن العروض.')}</span>
              </span>
            </button>}
            <button type="button" onClick={() => setIntent('provider')} aria-pressed={intent === 'provider'}
              className={`w-full min-h-[48px] text-start px-4 py-3 rounded-xl border-2 text-sm transition-all ${intent === 'provider' ? 'border-[#D4A543] bg-[#D4A543]/10' : 'bg-white hover:border-gray-300'}`}
              style={intent === 'provider' ? undefined : { borderColor: 'var(--line)' }}>
              {intent === 'provider' && <Check className="inline w-4 h-4 me-1 text-[#0B2438]" strokeWidth={3} aria-hidden />}
              <span className="text-ink-2">{L('Own a shop or supply materials?', 'دکان ہے یا سامان سپلائی کرتے ہیں؟', 'صاحب محل أو مورد مواد؟')}</span>{' '}
              <span className="font-bold" style={{ color: '#8F6820' }}>{L('Register as a supplier', 'سپلائر کے طور پر رجسٹر کریں', 'سجّل كمورد')}</span>
            </button>
          </div>

          {intent === 'provider' && (
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-ink-2">{L('How do you work?', 'آپ کیسے کام کرتے ہیں؟', 'كيف تعمل؟')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['company', 'independent'] as SellerKind[]).map((k) => {
                  const on = kind === k
                  const info = SELLER_KINDS[k]
                  return (
                    <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={on}
                      className={`min-h-[56px] text-start p-3 rounded-xl border-2 transition-all ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'bg-white'}`}
                      style={on ? undefined : { borderColor: 'var(--line)' }}>
                      <span className="flex items-center gap-1 font-bold text-sm text-navy">{on ? <Check className="w-4 h-4" strokeWidth={3} aria-hidden /> : <SellerIcon name={info.icon} />} {L(info.en, info.ur, info.ar)}</span>
                      <span className="block text-[12px] text-ink-2 mt-0.5 leading-relaxed">{L(info.sub.en, info.sub.ur, info.sub.ar)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button type="button" onClick={save} disabled={saving} className="btn-orange w-full btn-lg">
            {saving ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ…') : L('Continue', 'جاری رکھیں', 'متابعة')}
          </button>
          {/* a way out for someone signed in to the wrong account (round-8 UX-111) */}
          <p className="text-center text-[13px] text-ink-2">
            {L('Not your account?', 'یہ آپ کا اکاؤنٹ نہیں؟', 'لست صاحب هذا الحساب؟')}{' '}
            <button type="button" onClick={async () => { clearShellCard(); try { await createClient().auth.signOut() } catch {} ; window.location.href = '/login' }}
              className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] hover:underline">{L('Log out', 'لاگ آؤٹ', 'تسجيل الخروج')}</button>
          </p>
        </div>
      </div>
    </div>
  )
}
