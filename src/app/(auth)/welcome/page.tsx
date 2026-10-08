'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

// After the first WhatsApp OTP: one question, "What do you want to do?", plus a name.
// Everything else (location, categories, CR) is asked later, when it is needed.
type Intent = 'buyer' | 'provider' | 'agent'

const PROVIDER_TYPES = [
  { k: 'retail_shop', ar: 'محل مواد بناء', en: 'Retail shop', ur: 'دکان' },
  { k: 'distributor', ar: 'موزّع', en: 'Distributor', ur: 'ڈسٹری بیوٹر' },
  { k: 'trading_company', ar: 'شركة تجارية', en: 'Trading company', ur: 'تجارتی کمپنی' },
  { k: 'manufacturer', ar: 'مصنع', en: 'Manufacturer', ur: 'فیکٹری' },
  { k: 'dealer', ar: 'تاجر', en: 'Dealer', ur: 'ڈیلر' },
  { k: 'individual', ar: 'فرد عنده بضاعة', en: 'Individual seller', ur: 'انفرادی فروخت کنندہ' },
]

export default function WelcomePage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [ptype, setPtype] = useState('retail_shop')
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
      setReady(true)
    })()
  }, [])

  const CARDS: { k: Intent; title: string; sub: string; icon: JSX.Element }[] = [
    {
      k: 'buyer',
      title: L('I need a price', 'مجھے قیمت چاہیے', 'أحتاج سعر'),
      sub: L('Contractor, company, shop or owner: request prices and compare quotes.', 'قیمتیں منگوائیں اور موازنہ کریں۔', 'مقاول، شركة، محل، أو صاحب مشروع: اطلب أسعار وقارن العروض.'),
      icon: <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />,
    },
    {
      k: 'provider',
      title: L('I sell materials / provide prices', 'میں سامان بیچتا ہوں / قیمت دیتا ہوں', 'أبيع مواد أو أقدّم أسعار'),
      sub: L('Shop, distributor, factory or individual: receive requests near you and quote.', 'قریبی درخواستیں وصول کریں اور قیمت دیں۔', 'محل، موزّع، مصنع، أو فرد: تصلك الطلبات القريبة منك وتسعّرها.'),
      icon: <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />,
    },
    {
      k: 'agent',
      title: L('I am a price agent', 'میں پرائس ایجنٹ ہوں', 'أنا وكيل أسعار'),
      sub: L('You know shops and suppliers: collect their prices and submit a market quote.', 'دکانوں سے قیمتیں جمع کریں اور مارکیٹ کوٹ دیں۔', 'تعرف محلات وموردين: اجمع أسعارهم وقدّم عرض سعر من السوق.'),
      icon: <path d="M16 11a4 4 0 1 0-8 0M12 3v4M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1M17 8l3-3M7 8 4 5" />,
    },
  ]

  async function save() {
    setError('')
    if (name.trim().length < 2) { setError(L('Write your name.', 'اپنا نام لکھیں۔', 'اكتب اسمك.')); return }
    if (!intent) { setError(L('Choose what you want to do.', 'منتخب کریں آپ کیا کرنا چاہتے ہیں۔', 'اختر ماذا تريد أن تفعل.')); return }
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('choose_my_role', {
      p_intent: intent, p_full_name: name.trim(), p_provider_type: intent === 'provider' ? ptype : null,
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
            <h1 className="text-[26px] font-extrabold text-navy">{L('Welcome to Taseerak', 'تسعیرک میں خوش آمدید', 'أهلاً فيك بتسعيرك')}</h1>
            <p className="text-ink-2 text-sm mt-1">{L('Two quick answers and you are in.', 'دو جواب اور آپ اندر ہیں۔', 'جوابين سريعين وبتبلّش.')}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3" role="alert">{error}</div>}

          <div>
            <label htmlFor="welcome-name" className="block text-[13px] font-bold text-ink-2 mb-1.5">{L('Your name', 'آپ کا نام', 'اسمك')}</label>
            <input id="welcome-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
              className="input-field" placeholder={L('e.g. Mohammed Al-Otaibi', 'مثلاً محمد', 'مثلاً محمد العتيبي')} />
          </div>

          <div className="space-y-3">
            <p className="text-[13px] font-bold text-ink-2">{L('What do you want to do?', 'آپ کیا کرنا چاہتے ہیں؟', 'شو بدك تعمل؟')}</p>
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
              <p className="text-[13px] font-bold text-ink-2">{L('Which describes you?', 'آپ کون ہیں؟', 'شو بتوصف حالك؟')}</p>
              <div className="flex flex-wrap gap-2">
                {PROVIDER_TYPES.map((p) => (
                  <button key={p.k} type="button" onClick={() => setPtype(p.k)} aria-pressed={ptype === p.k}
                    className={`px-3.5 py-2 rounded-full text-sm font-bold border transition-all ${ptype === p.k ? 'bg-navy text-white border-navy' : 'bg-white text-ink-2'}`}
                    style={ptype === p.k ? undefined : { borderColor: 'var(--line)' }}>
                    {(p as any)[locale] || p.ar}
                  </button>
                ))}
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
