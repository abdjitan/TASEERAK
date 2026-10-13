'use client'

import { useEffect, useState, type JSX } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SELLER_KINDS, rememberedSignupKind, type SellerKind } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'

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

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role, role_chosen_at, full_name').eq('id', user.id).single()
      if (p?.role_chosen_at || p?.role === 'admin') { window.location.href = '/onboarding'; return }
      if (p?.full_name) setName(p.full_name)
      const k = new URLSearchParams(window.location.search).get('kind') || rememberedSignupKind()
      if (k === 'company' || k === 'independent') { setIntent('provider'); setKind(k) }
      setReady(true)
    })()
  }, [])

  const CARDS: { k: Intent; title: string; sub: string; icon: JSX.Element }[] = [
    {
      k: 'buyer',
      title: L('I need prices', 'مجھے قیمتیں چاہییں', 'أبحث عن أسعار'),
      sub: L('Request material prices from nearby suppliers and compare quotes.', 'قریبی سپلائرز سے قیمتیں منگوائیں اور موازنہ کریں۔', 'اطلب أسعار المواد من الموردين القريبين وقارن العروض.'),
      icon: <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />,
    },
    {
      k: 'provider',
      title: L('I provide material prices', 'میں سامان کی قیمتیں دیتا ہوں', 'أقدّم أسعار المواد'),
      sub: L('Company, shop, factory or independent seller: receive requests near you and quote.', 'قریبی درخواستیں وصول کریں اور قیمت دیں۔', 'شركة أو محل أو مصنع أو بائع مستقل: تصلك الطلبات القريبة منك وتسعّرها.'),
      icon: <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />,
    },
  ]

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

  if (!ready) return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />

  return (
    <div className="min-h-screen flex flex-col" dir={dir} style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between p-5">
        <span className="text-xl font-extrabold text-navy">تسعير<span className="text-orange">ك</span></span>
        <LanguageSwitcher variant="minimal" />
      </div>
      <div className="flex-1 flex justify-center px-4 pb-12">
        <div className="w-full max-w-[460px] space-y-6 animate-slide-up">
          <div>
            <h1 className="text-[26px] font-extrabold text-navy">{L('Welcome to Taseerak', 'تسعیرک میں خوش آمدید', 'أهلاً بك في تسعيرك')}</h1>
            <p className="text-ink-2 text-sm mt-1">{L('Two quick answers and you are in.', 'دو جواب اور آپ اندر ہیں۔', 'إجابتان سريعتان وتبدأ.')}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>}

          <div>
            <label htmlFor="welcome-name" className="block text-[13px] font-bold text-ink-2 mb-1.5">{L('Your name', 'آپ کا نام', 'اسمك')}</label>
            <input id="welcome-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
              className="input-field" placeholder={L('e.g. Mohammed Al-Otaibi', 'مثلاً محمد', 'مثلاً محمد العتيبي')} />
          </div>

          <div className="space-y-3">
            <p className="text-[13px] font-bold text-ink-2">{L('What do you want to do?', 'آپ کیا کرنا چاہتے ہیں؟', 'ماذا تريد أن تفعل؟')}</p>
            {CARDS.map((c) => {
              const on = intent === c.k
              return (
                <button key={c.k} type="button" onClick={() => setIntent(c.k)} aria-pressed={on}
                  className={`w-full text-start flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${on ? 'border-orange bg-orange-50/60 shadow-sm' : 'bg-white hover:border-gray-300'}`}
                  style={on ? undefined : { borderColor: 'var(--line)' }}>
                  <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${on ? 'bg-orange text-white' : 'bg-gray-100 text-navy'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">{c.icon}</svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-extrabold text-navy">{c.title}</span>
                    <span className="block text-[13px] text-ink-2 mt-0.5 leading-relaxed">{c.sub}</span>
                  </span>
                </button>
              )
            })}
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
                      className={`text-start p-3 rounded-xl border-2 transition-all ${on ? 'border-navy bg-navy/5' : 'bg-white'}`}
                      style={on ? undefined : { borderColor: 'var(--line)' }}>
                      <span className="block font-bold text-sm text-navy"><SellerIcon name={info.icon} /> {L(info.en, info.ur, info.ar)}</span>
                      <span className="block text-[11px] text-ink-2 mt-0.5 leading-relaxed">{L(info.sub.en, info.sub.ur, info.sub.ar)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button type="button" onClick={save} disabled={saving} className="btn-orange w-full btn-lg">
            {saving ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ…') : L('Continue', 'جاری رکھیں', 'متابعة')}
          </button>
        </div>
      </div>
    </div>
  )
}
