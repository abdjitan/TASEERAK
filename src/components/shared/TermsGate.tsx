'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import { TERMS_VERSION } from '@/lib/legal'
import { useFocusTrap } from '@/components/shared/useFocusTrap'

// Asks a signed-in user to accept the current terms + privacy version once (migration 176).
// New sign-ups are recorded at signup (terms_version in the user metadata), so they never see it.
// Remembered per device after acceptance so it costs one RPC per session at most.
export default function TermsGate() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  // a failed save says so instead of leaving the user stuck behind a silent dialog (round-6 UX-042)
  const [err, setErr] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  useFocusTrap(boxRef, show, { lockScroll: true })
  const KEY = 'tsk_terms_ok_' + TERMS_VERSION

  useEffect(() => {
    let alive = true
    async function check() {
      try { if (localStorage.getItem(KEY) === '1') return } catch {}
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data, error } = await supabase.rpc('my_terms_status')
      if (error || !alive) return
      if ((data as any)?.accepted) { try { localStorage.setItem(KEY, '1') } catch {} ; return }
      setShow(true)
    }
    check()
    return () => { alive = false }
  }, [KEY])

  async function accept() {
    setSaving(true); setErr('')
    let failed = false
    try {
      const { error } = await createClient().rpc('accept_terms', { p_source: 'web' })
      failed = !!error
    } catch { failed = true }
    setSaving(false)
    if (failed) {
      setErr(L('We could not save your agreement. Check your connection and try again.', 'آپ کی منظوری محفوظ نہیں ہو سکی۔ اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔', 'تعذّر حفظ موافقتك. تحقّق من اتصالك ثم حاول مرة أخرى.'))
      return
    }
    try { localStorage.setItem(KEY, '1') } catch {}
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" dir={dir}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="tg-title" className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[92vh] overflow-y-auto">
        <h2 id="tg-title" className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>
          {L('Updated terms', 'تازہ شرائط', 'تحديث الشروط والأحكام')}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          {L('We updated the Terms and the Privacy Policy for the free beta. Please review and accept them to continue.',
             'ہم نے مفت آزمائشی ورژن کے لیے شرائط اور رازداری کی پالیسی اپ ڈیٹ کی ہیں۔ جاری رکھنے کے لیے انہیں دیکھ کر قبول کریں۔',
             'حدّثنا الشروط والأحكام وسياسة الخصوصية للنسخة التجريبية المجانية. اطّلع عليها ووافق عليها للمتابعة.')}
        </p>
        {/* what changed in this version (TERMS_VERSION 2026-11-24, migration 281) */}
        <div className="rounded-xl bg-[#F5F7FA] border border-gray-200 p-3 mb-4">
          <div className="text-[13px] font-bold text-[#0B2438] mb-1">{L('Main changes', 'اہم تبدیلیاں', 'أبرز التغييرات')}</div>
          <ul className="list-disc ps-5 space-y-1 text-[13px] text-gray-700 leading-relaxed">
            <li>{L('The platform is for people aged 18 or over.', 'پلیٹ فارم 18 سال یا اس سے زیادہ عمر والوں کے لیے ہے۔', 'المنصة لمن بلغ 18 سنة فأكثر.')}</li>
            <li>{L('Whoever opens a business account must be authorised to represent that business.', 'کاروباری اکاؤنٹ کھولنے والے کو اس کاروبار کی نمائندگی کا اختیار ہونا چاہیے۔', 'من يفتح حساب منشأة يجب أن يكون مخوّلاً بتمثيلها.')}</li>
            <li>{L('The buyer’s name and mobile stay hidden from suppliers until an offer is chosen.', 'کسی آفر کے انتخاب تک خریدار کا نام اور موبائل سپلائرز سے پوشیدہ رہتا ہے۔', 'يبقى اسم المشتري ورقم جواله مخفيَّين عن الموردين حتى يختار عرضاً.')}</li>
            <li>{L('When a pricing agent’s offer is chosen, the shop the material comes from is shown to the buyer.', 'قیمت ایجنٹ کی آفر منتخب ہونے پر، جس دکان سے سامان آتا ہے وہ خریدار کو دکھائی جاتی ہے۔', 'عند اختيار عرض وسيط التسعير يظهر للمشتري المحل الذي تأتي منه المواد.')}</li>
          </ul>
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700 mb-5 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={checked} onChange={(e: any) => setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#0B2438] flex-shrink-0" />
          <span>
            {L('I agree to the ', 'میں متفق ہوں ', 'أوافق على ')}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#8F6820' }}>{L('Terms', 'شرائط', 'الشروط والأحكام')}</a>
            {L(' and the ', ' اور ', ' و')}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#8F6820' }}>{L('Privacy Policy', 'رازداری کی پالیسی', 'سياسة الخصوصية')}</a>
          </span>
        </label>
        {err && <p role="alert" className="text-[13px] font-semibold text-[#B42318] mb-3">{err}</p>}
        <button type="button" onClick={accept} disabled={!checked || saving}
          className="w-full min-h-[48px] py-3 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: '#D4A543', color: '#071827' }}>
          {saving ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ…') : L('Accept and continue', 'قبول کریں اور جاری رکھیں', 'موافقة ومتابعة')}
        </button>
      </div>
    </div>
  )
}
