'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import { TERMS_VERSION } from '@/lib/legal'

// Asks a signed-in user to accept the current terms + privacy version once (migration 176).
// New sign-ups are recorded at signup (terms_version in the user metadata), so they never see it.
// Remembered per device after acceptance so it costs one RPC per session at most.
export default function TermsGate() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
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
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('accept_terms', { p_source: 'web' })
    setSaving(false)
    if (error) return
    try { localStorage.setItem(KEY, '1') } catch {}
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" dir={dir}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#0B2438' }}>
          {L('Updated terms', 'تازہ شرائط', 'تحديث الشروط والأحكام')}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          {L('We updated the Terms and the Privacy Policy for the free beta. Please review and accept them to continue.',
             'ہم نے مفت آزمائشی ورژن کے لیے شرائط اور رازداری کی پالیسی اپ ڈیٹ کی ہیں۔ جاری رکھنے کے لیے انہیں دیکھ کر قبول کریں۔',
             'حدّثنا الشروط والأحكام وسياسة الخصوصية للنسخة التجريبية المجانية. اطّلع عليها ووافق عليها للمتابعة.')}
        </p>
        <label className="flex items-start gap-2 text-sm text-gray-700 mb-5 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e: any) => setChecked(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0B2438] flex-shrink-0" />
          <span>
            {L('I agree to the ', 'میں متفق ہوں ', 'أوافق على ')}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#9D7425' }}>{L('Terms', 'شرائط', 'الشروط والأحكام')}</a>
            {L(' and the ', ' اور ', ' و')}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#9D7425' }}>{L('Privacy Policy', 'رازداری کی پالیسی', 'سياسة الخصوصية')}</a>
          </span>
        </label>
        <button type="button" onClick={accept} disabled={!checked || saving}
          className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: '#D4A543', color: '#0B2438' }}>
          {saving ? '…' : L('Accept and continue', 'قبول کریں اور جاری رکھیں', 'موافقة ومتابعة')}
        </button>
      </div>
    </div>
  )
}
