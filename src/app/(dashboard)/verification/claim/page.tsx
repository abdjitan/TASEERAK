'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'
import { normalizeCrInput } from '@/lib/cr'

// «هذا السجل مستخدم في حساب آخر»: the claimant uploads his CR and asks for it (171).
// The current holder is told (with the claimant's name only) and the admin decides.
export default function CrClaimPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [role, setRole] = useState('contractor')
  const [loading, setLoading] = useState(true)
  const [cr, setCr] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [file, setFile] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [mine, setMine] = useState<any[]>([])

  async function loadMine(supabase: any, uid: string) {
    const { data } = await supabase.from('cr_claims').select('id, commercial_registration, status, created_at, admin_note')
      .eq('claimant_id', uid).order('created_at', { ascending: false }).limit(20)
    setMine(data || [])
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role, company_name_ar, full_name, phone').eq('id', session.user.id).single()
      setRole(p?.role || 'contractor')
      setName(p?.full_name || (p?.company_name_ar && p.company_name_ar !== 'شركة جديدة' ? p.company_name_ar : '') || '')
      setContact(p?.phone || '')
      setCr(normalizeCrInput(new URLSearchParams(window.location.search).get('cr')))
      await loadMine(supabase, session.user.id)
      setLoading(false)
    }
    init()
  }, [])

  async function submit(e: any) {
    e.preventDefault()
    setMsg('')
    const digits = normalizeCrInput(cr)
    if (!/^[0-9]{10}$/.test(digits)) { setMsg(L('The CR number must be exactly 10 digits.', 'سی آر نمبر بالکل 10 ہندسوں کا ہونا چاہیے۔', 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط.')); return }
    if (!name.trim()) { setMsg(L('Enter your name or the business name.', 'اپنا یا ادارے کا نام لکھیں۔', 'اكتب اسمك أو اسم المنشأة.')); return }
    if (!file) { setMsg(L('Upload a copy of the commercial registration.', 'تجارتی رجسٹریشن کی کاپی اپ لوڈ کریں۔', 'ارفع صورة السجل التجاري.')); return }
    setSaving(true)
    const fd = new FormData(); fd.append('file', file); fd.append('kind', 'claim')
    const res = await fetch('/api/upload-verification', { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) { setSaving(false); setMsg(j?.message || L('Upload failed.', 'اپ لوڈ ناکام ہو گیا۔', 'تعذّر رفع الملف.')); return }
    const supabase = createClient()
    const { data: claimId, error } = await supabase.rpc('submit_cr_claim', { p_cr: digits, p_name: name.trim(), p_contact: contact.trim() || null, p_file_path: j.path })
    setSaving(false)
    if (error) { setMsg(error.message); return }
    setDone(true)
    // 172: AI read of the claim file for the admin (fire and forget; manual when off/capped)
    fetch('/api/verification/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'claim', claimId }) }).catch(() => {})
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await loadMine(supabase, session.user.id)
  }

  async function withdraw(id: string) {
    const supabase = createClient()
    const { error } = await supabase.rpc('withdraw_cr_claim', { p_claim_id: id })
    if (error) { setMsg(error.message); return }
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
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            {L('Each commercial registration can be used by one account only. If it is registered in another account and it belongs to you, upload a copy and the admin will review it. The other account is told your name only, never your contact details.',
               'ہر تجارتی رجسٹریشن صرف ایک اکاؤنٹ میں استعمال ہو سکتی ہے۔ اگر یہ کسی دوسرے اکاؤنٹ میں درج ہے اور آپ کی ہے تو اس کی کاپی اپ لوڈ کریں، انتظامیہ جائزہ لے گی۔ دوسرے اکاؤنٹ کو صرف آپ کا نام بتایا جاتا ہے، رابطہ نہیں۔',
               'لا يُستخدم السجل التجاري إلا في حساب واحد. إن كان مسجّلاً في حساب آخر وهو لك، فارفع صورته وستراجعه الإدارة. يُبلَّغ الحساب الآخر باسمك فقط، دون بيانات التواصل.')}
          </p>
          {done ? (
            <div className="text-sm rounded-xl p-4 bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ {L('Your request was sent. You will be notified of the decision.', 'آپ کی درخواست بھیج دی گئی۔ فیصلے کی اطلاع دی جائے گی۔', 'أُرسل طلبك، وسيصلك إشعار بالقرار.')}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">{L('CR number', 'سی آر نمبر', 'رقم السجل التجاري')}</label>
                <input value={cr} onChange={(e: any) => setCr(e.target.value)} inputMode="numeric" dir="ltr" maxLength={14} className="input-field font-mono" placeholder="7001234567" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">{L('Your name or the business name', 'آپ کا یا ادارے کا نام', 'اسمك أو اسم المنشأة')}</label>
                <input value={name} onChange={(e: any) => setName(e.target.value)} maxLength={120} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">{L('Phone or email for the admin (optional)', 'انتظامیہ کے لیے فون یا ای میل (اختیاری)', 'جوال أو بريد للتواصل مع الإدارة (اختياري)')}</label>
                <input value={contact} onChange={(e: any) => setContact(e.target.value)} maxLength={200} dir="ltr" className="input-field" />
              </div>
              <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${file ? 'border-[#0B2438] bg-[#0B2438]/5' : 'border-gray-200 hover:border-[#D4A543]/50'}`}>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e: any) => setFile(e.target.files?.[0] ?? null)} />
                <span className="text-2xl">{file ? <Glyph e="📎" /> : <Glyph e="📋" />}</span>
                <div className="text-sm font-semibold text-gray-700">{file ? file.name : L('Upload the CR certificate (PDF or image)', 'سی آر سرٹیفکیٹ اپ لوڈ کریں (PDF یا تصویر)', 'ارفع شهادة السجل التجاري (PDF أو صورة)')}</div>
              </label>
              {msg && <div className="text-sm rounded-xl p-3 bg-red-50 text-red-600 border border-red-200">{msg}</div>}
              <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all hover:shadow-lg" style={{ background: '#D4A543', color: '#0B2438' }}>
                {saving ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…') : L('Send the request', 'درخواست بھیجیں', 'إرسال الطلب')}
              </button>
            </form>
          )}
        </div>

        {mine.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold mb-3" style={{ color: '#0B2438' }}>{L('My requests', 'میری درخواستیں', 'طلباتي')}</h2>
            <div className="space-y-2">
              {mine.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-mono" dir="ltr">{c.commercial_registration}</div>
                    <div className="text-[11px] text-gray-400">{statusLabel(c.status)}{c.admin_note ? ' · ' + c.admin_note : ''}</div>
                  </div>
                  {c.status === 'open' && (
                    <button type="button" onClick={() => withdraw(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
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
