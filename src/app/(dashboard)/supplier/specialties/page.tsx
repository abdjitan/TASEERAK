'use client'

import { useState, useEffect } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, sortGroupKeys } from '@/types'
import { detectSpecialtiesFromText } from '@/lib/classify'
import CatIcon from '@/components/shared/CatIcon'
import SpecialtyPicker from '@/components/shared/SpecialtyPicker'

const SECTOR_ICONS = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️', equipment: '🚜', supply_store: '🏪' }
const SECTOR_COLORS = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#D97706', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }

const txt = {
  ar: {
    title: 'تخصصاتي الدقيقة', sub: 'اختر المواد التي تتعامل بها بالضبط — ستصلك الطلبات المطابقة فقط',
    back: '← رجوع', save: 'حفظ التخصصات', saving: 'جارٍ الحفظ...', saved: '✓ تم الحفظ بنجاح',
    selectSectors: 'أولاً، اختر القطاعات الرئيسية', thenSpecialties: 'ثم اختر تخصصاتك الدقيقة',
    selected: 'تخصص محدد', noSectors: 'اختر قطاعاً واحداً على الأقل من الأعلى لعرض التخصصات',
    hint: '💡 كلما حددت تخصصك بدقة، وصلتك طلبات أكثر صلة بعملك',
    loading: 'جارٍ التحميل...',
    suggestTitle: 'ما لقيت مادتك في القائمة؟',
    suggestSub: 'اقترح إضافتها وسيراجعها الفريق ويضيفها للقائمة',
    sNamePh: 'اسم المادة (مثال: عزل بولي يوريا)',
    sSectorPh: 'القطاع المناسب (اختياري)',
    sDescPh: 'وصف مختصر أو مواصفات (اختياري)',
    sBtn: '+ إرسال الاقتراح للإدارة',
    sSending: 'جارٍ الإرسال...',
    sSent: '✓ تم إرسال اقتراحك، سيراجعه الفريق',
    myReq: 'اقتراحاتي السابقة',
    stPending: 'قيد المراجعة', stApproved: 'تمت الموافقة', stRejected: 'مرفوض',
  },
  en: {
    title: 'My Specialties', sub: 'Select exactly what you supply — you only get matching requests',
    back: '← Back', save: 'Save Specialties', saving: 'Saving...', saved: '✓ Saved successfully',
    selectSectors: 'First, select main sectors', thenSpecialties: 'Then pick your exact specialties',
    selected: 'selected', noSectors: 'Select at least one sector above to show specialties',
    hint: '💡 The more precise your specialties, the more relevant requests you receive',
    loading: 'Loading...',
    suggestTitle: "Didn't find your material?",
    suggestSub: 'Suggest it — our team will review and add it to the list',
    sNamePh: 'Material name (e.g. Polyurea insulation)',
    sSectorPh: 'Relevant sector (optional)',
    sDescPh: 'Short description or specs (optional)',
    sBtn: '+ Send suggestion to admin',
    sSending: 'Sending...',
    sSent: '✓ Suggestion sent, our team will review it',
    myReq: 'My previous suggestions',
    stPending: 'Under review', stApproved: 'Approved', stRejected: 'Rejected',
  },
  ur: {
    title: 'میری مہارتیں', sub: 'بالکل وہی منتخب کریں جو آپ فراہم کرتے ہیں',
    back: '← واپس', save: 'محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', saved: '✓ محفوظ ہو گیا',
    selectSectors: 'پہلے، اہم شعبے منتخب کریں', thenSpecialties: 'پھر اپنی مہارتیں منتخب کریں',
    selected: 'منتخب', noSectors: 'مہارتیں دکھانے کے لیے کم از کم ایک شعبہ منتخب کریں',
    hint: '💡 جتنی درست مہارت، اتنی متعلقہ درخواستیں',
    loading: 'لوڈ ہو رہا ہے...',
    suggestTitle: 'اپنا مواد نہیں ملا؟',
    suggestSub: 'تجویز کریں، ٹیم جائزہ لے کر شامل کرے گی',
    sNamePh: 'مواد کا نام',
    sSectorPh: 'متعلقہ شعبہ (اختیاری)',
    sDescPh: 'مختصر تفصیل (اختیاری)',
    sBtn: '+ تجویز بھیجیں',
    sSending: 'بھیجا جا رہا ہے...',
    sSent: '✓ آپ کی تجویز بھیج دی گئی',
    myReq: 'میری پچھلی تجاویز',
    stPending: 'زیر جائزہ', stApproved: 'منظور', stRejected: 'مسترد',
  },
}

export default function SpecialtiesPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [mySectors, setMySectors] = useState<any[]>([])
  const [mySpecialties, setMySpecialties] = useState<any[]>([])
  // suggest-a-material
  const [suggestName, setSuggestName] = useState('')
  const [suggestSector, setSuggestSector] = useState('')
  const [suggestDesc, setSuggestDesc] = useState('')
  const [suggestGroup, setSuggestGroup] = useState('')
  const [suggestFile, setSuggestFile] = useState<any>(null)
  const [suggestMsg, setSuggestMsg] = useState('')
  const [suggestSubmitting, setSuggestSubmitting] = useState(false)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [openSector, setOpenSector] = useState<any>(null) // single-open accordion (Step 2)
  // auto-analysis of the CR commercial activity (Wathq)
  const [crActivity, setCrActivity] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [detectMsg, setDetectMsg] = useState('')

  // يقرأ نشاط السجل التجاري ويحدّد التخصصات تلقائياً (يضيف فوق المحدد، لا يحذف)
  function analyzeFromCR(activity: any, name: any, silent = false) {
    const text = [name, activity].filter(Boolean).join(' ')
    const { sectors, specialties } = detectSpecialtiesFromText(text)
    if (!specialties.length) {
      if (!silent) setDetectMsg(locale === 'en' ? "Couldn't detect specialties from your CR activity — pick them manually." : locale === 'ur' ? 'سرگرمی سے مہارتیں نہیں ملیں — دستی منتخب کریں۔' : 'ما تعرّفنا على تخصصات من نشاط سجلك — اخترها يدوياً.')
      return
    }
    setMySectors(prev => Array.from(new Set([...prev, ...sectors])))
    setMySpecialties(prev => Array.from(new Set([...prev, ...specialties])))
    if (sectors.length) setOpenSector(sectors[0])
    setDetectMsg(
      locale === 'en' ? `✓ Detected ${specialties.length} specialties across ${sectors.length} sectors from your CR — review, adjust, then save.`
      : locale === 'ur' ? `✓ آپ کے ریکارڈ سے ${specialties.length} مہارتیں ${sectors.length} شعبوں میں ملیں — جائزہ لے کر محفوظ کریں۔`
      : `✓ تعرّفنا على ${specialties.length} تخصص في ${sectors.length} قطاع من نشاط سجلك — راجِعها وعدّل ثم احفظ.`
    )
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)

      const { data: secs } = await supabase.from('profile_sectors').select('sector').eq('profile_id', session.user.id)
      setMySectors((secs || []).map(s => s.sector))

      const { data: specs } = await supabase.from('profile_specialties').select('specialty').eq('profile_id', session.user.id)
      setMySpecialties((specs || []).map(s => s.specialty))

      const { data: reqs } = await supabase.from('material_requests')
        .select('*').eq('supplier_id', session.user.id).order('created_at', { ascending: false })
      setMyRequests(reqs || [])

      // اقرأ نشاط السجل التجاري — وحدّد التخصصات تلقائياً أول مرة (إن لم يحفظ المورد شيئاً بعد)
      const { data: prof } = await supabase.from('profiles').select('cr_activity, company_name_ar').eq('id', session.user.id).single()
      setCrActivity(prof?.cr_activity || '')
      setCompanyName(prof?.company_name_ar || '')
      if (prof?.cr_activity && (specs || []).length === 0 && (secs || []).length === 0) {
        analyzeFromCR(prof.cr_activity, prof.company_name_ar, true)
      }

      setLoading(false)
    }
    load()
  }, [])

  function toggleSector(sector: any) {
    setMySectors(prev => {
      if (prev.includes(sector)) {
        // إزالة القطاع + تخصصاته الفرعية
        const subKeys = Object.keys((SUB_CATEGORIES as any)[sector] || {})
        setMySpecialties(s => s.filter(sp => !subKeys.includes(sp)))
        return prev.filter(x => x !== sector)
      }
      setOpenSector(sector) // افتح القطاع الجديد تلقائياً (وأغلق الباقي)
      return [...prev, sector]
    })
  }

  function toggleSpecialty(key: any) {
    setMySpecialties(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const supabase = createClient()

    // حفظ ذرّي: حذف + إضافة داخل معاملة واحدة على الخادم — لو فشلت الإضافة يتراجع الحذف
    // فلا تُمسح تخصصات المورّد بصمت (B12).
    const { error } = await supabase.rpc('save_supplier_specialties', {
      p_sectors: mySectors,
      p_specialties: mySpecialties,
    })
    setSaving(false)
    if (error) { setMsg('تعذّر الحفظ، حاول مرة أخرى'); return }
    setMsg(T.saved)
    setTimeout(() => { window.location.href = '/supplier/dashboard' }, 1200)
  }

  async function submitSuggestion() {
    if (!suggestName.trim() || !user) return
    setSuggestSubmitting(true); setSuggestMsg('')
    const supabase = createClient()
    let spec_file_url = null
    if (suggestFile) {
      try {
        const ext = suggestFile.name.split('.').pop()
        const path = `material-requests/${user.id}/${Date.now()}.${ext}`
        const { data: up } = await supabase.storage.from('licenses').upload(path, suggestFile, { upsert: true })
        if (up) { const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(up.path); spec_file_url = publicUrl }
      } catch {}
    }
    const { data, error } = await supabase.from('material_requests').insert({
      supplier_id: user.id,
      name: suggestName.trim(),
      sector: suggestSector || null,
      sub_category: (suggestGroup && suggestGroup !== '__other__') ? suggestGroup : null,
      description: suggestDesc.trim() || null,
      spec_file_url,
    }).select().single()
    setSuggestSubmitting(false)
    if (error) { setSuggestMsg('حدث خطأ، حاول مرة أخرى'); return }
    setMyRequests(prev => [data, ...prev])
    setSuggestName(''); setSuggestSector(''); setSuggestDesc(''); setSuggestGroup(''); setSuggestFile(null)
    setSuggestMsg(T.sSent)
    setTimeout(() => setSuggestMsg(''), 4000)
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title={T.title} nav={getNav('supplier', locale, '/supplier/specialties')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>{T.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{T.sub}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700">{T.hint}</div>

        {/* تحليل النشاط التجاري — يُحدّد التخصصات تلقائياً من السجل التجاري */}
        {crActivity && (
          <div className="rounded-2xl p-4 mb-5 border shadow-sm" style={{ background: 'linear-gradient(135deg,#0F6E5608,#1B2D5B08)', borderColor: '#0F6E5633' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: '#0F6E56' }}>
                  🔍 {locale === 'en' ? 'Detected from your CR activity' : locale === 'ur' ? 'آپ کے ریکارڈ سے ملا' : 'تحليل نشاطك التجاري'}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {locale === 'en' ? 'We read your official CR activity and pre-selected your specialties below — review and adjust freely, then save.'
                  : locale === 'ur' ? 'ہم نے آپ کے سرکاری ریکارڈ سے مہارتیں منتخب کیں — جائزہ لے کر محفوظ کریں۔'
                  : 'قرأنا نشاطك في السجل التجاري وحدّدنا تخصصاتك بالأسفل تلقائياً — راجِعها وعدّل بحرية ثم احفظ.'}
                </div>
                {detectMsg && <div className="text-xs font-semibold mt-1.5" style={{ color: '#0F6E56' }}>{detectMsg}</div>}
              </div>
              <button onClick={() => analyzeFromCR(crActivity, companyName)}
                className="px-4 py-2 rounded-xl font-bold text-white text-xs shrink-0 hover:shadow transition-all" style={{ background: '#0F6E56' }}>
                {locale === 'en' ? '↻ Re-analyze' : locale === 'ur' ? '↻ دوبارہ' : '↻ إعادة التحليل'}
              </button>
            </div>
          </div>
        )}

        {/* اختيار القطاعات + التخصصات — منتقي موحّد مع «أكمل ملفك» (نفس التصنيفات والأيقونات) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-4 text-sm" style={{ color: '#1B2D5B' }}>{T.selectSectors}</h2>
          <SpecialtyPicker
            sectors={mySectors} specialties={mySpecialties}
            openSector={openSector} onOpenSector={setOpenSector}
            onToggleSector={toggleSector} onToggleSpecialty={toggleSpecialty}
            locale={locale} dir={dir}
          />
        </div>

        {mySectors.length === 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-400 text-sm">
            {T.noSectors}
          </div>
        )}

        {/* اقتراح مادة جديدة غير موجودة بالقائمة */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{T.suggestTitle}</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">{T.suggestSub}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={suggestName} onChange={e => setSuggestName(e.target.value)}
              className="input-field" placeholder={T.sNamePh} />
            <select value={suggestSector} onChange={e => setSuggestSector(e.target.value)} className="input-field">
              <option value="">{T.sSectorPh}</option>
              {Object.keys(SECTOR_LABELS).map(s => (
                <option key={s} value={s}>{(SECTOR_ICONS as any)[s]} {(SECTOR_LABELS as any)[s]}</option>
              ))}
            </select>
          </div>
          {suggestSector && (() => {
            const gks = sortGroupKeys([...new Set(Object.values((SUB_CATEGORIES as any)[suggestSector] || {}).map((x: any) => x.group))] as string[])
            return (
              <select value={suggestGroup} onChange={e => setSuggestGroup(e.target.value)} className="input-field mt-3">
                <option value="">{locale === 'en' ? 'Which group / list fits it?' : 'أي مجموعة/قائمة تناسبها؟'}</option>
                {gks.map((g: string) => <option key={g} value={g}>{(GROUP_LABELS as any)[g]?.ar || g}</option>)}
                <option value="__other__">{locale === 'en' ? 'Not listed — I will describe below' : 'غير مذكورة — أوضّح بالوصف'}</option>
              </select>
            )
          })()}
          <textarea value={suggestDesc} onChange={e => setSuggestDesc(e.target.value)}
            className="input-field mt-3" rows={2} placeholder={T.sDescPh} />
          <label className="block mt-3">
            <span className="text-xs font-bold text-gray-500">{locale === 'en' ? 'Attach product details (photo / spec / PDF)' : 'أرفق تفاصيل المنتج (صورة / مواصفة / PDF)'}</span>
            <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e => setSuggestFile((e.target as any).files?.[0] || null)} className="input-field mt-1 text-sm" />
          </label>

          {suggestMsg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mt-3">{suggestMsg}</div>}

          <button onClick={submitSuggestion} disabled={!suggestName.trim() || suggestSubmitting}
            className="mt-3 px-5 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow"
            style={{ background: '#0F6E56' }}>
            {suggestSubmitting ? T.sSending : T.sBtn}
          </button>

          {myRequests.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="text-xs font-bold text-gray-500 mb-2">{T.myReq}</div>
              <div className="space-y-2">
                {myRequests.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <span className="font-semibold text-gray-700">{r.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status === 'approved' ? T.stApproved : r.status === 'rejected' ? T.stRejected : T.stPending}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="sticky bottom-4 mt-6">
          {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 mb-3 text-center">{msg}</div>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-50 transition-all hover:shadow-lg shadow-lg"
            style={{ background: '#F5831F' }}>
            {saving ? T.saving : `${T.save} (${mySpecialties.length})`}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
