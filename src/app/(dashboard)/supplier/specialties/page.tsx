'use client'

import { useState, useEffect } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, sortGroupKeys, getSubCategoryLabel } from '@/types'
import { detectSpecialtiesFromText } from '@/lib/classify'
import CatIcon from '@/components/shared/CatIcon'
import SpecialtyPicker from '@/components/shared/SpecialtyPicker'
import SupplierPackPicker from '@/components/shared/SupplierPackPicker'
import { storedSellerKind, sectorName } from '@/lib/sellers'
import Glyph from '@/components/shared/Glyph'
import { compressImage } from '@/lib/compressImage'
import { askConfirm } from '@/lib/askConfirm'
import { arCount } from '@/lib/text'
import { ChevronDown, ChevronUp } from 'lucide-react'


const txt = {
  ar: {
    title: 'تخصصاتي', sub: 'اختر المواد التي تتعامل بها بالضبط — ستصلك الطلبات المطابقة فقط',
    back: '→ رجوع', save: 'احفظ التغييرات', saving: 'جارٍ الحفظ...', saved: 'حُفظت تخصصاتك.',
    selectSectors: 'أو اختر المواد بالتفصيل', thenSpecialties: 'ثم اختر تخصصاتك الدقيقة',
    selected: 'تخصص محدد', noSectors: 'اختر قطاعاً واحداً على الأقل من الأعلى لعرض التخصصات',
    hint: 'كلما حددت تخصصك بدقة، وصلتك طلبات أكثر صلة بعملك',
    loading: 'جارٍ التحميل...',
    suggestTitle: 'لم تجد مادتك في القائمة؟',
    suggestSub: 'اقترح إضافتها وسيراجعها الفريق ويضيفها للقائمة',
    sNamePh: 'اسم المادة (مثال: عزل بولي يوريا)',
    sSectorPh: 'القطاع المناسب (اختياري)',
    sDescPh: 'وصف مختصر أو مواصفات (اختياري)',
    sBtn: '+ إرسال الاقتراح للإدارة',
    sSending: 'جارٍ الإرسال...',
    sSent: 'أُرسل اقتراحك، وسيراجعه الفريق.',
    myReq: 'اقتراحاتي السابقة',
    stPending: 'قيد المراجعة', stApproved: 'تمت الموافقة', stRejected: 'لم تُعتمد',
  },
  en: {
    title: 'My Specialties', sub: 'Select exactly what you supply — you only get matching requests',
    back: '← Back', save: 'Save changes', saving: 'Saving...', saved: 'Your specialties were saved.',
    selectSectors: 'Or choose the materials in detail', thenSpecialties: 'Then pick your exact specialties',
    selected: 'selected', noSectors: 'Select at least one sector above to show specialties',
    hint: 'The more precise your specialties, the more relevant requests you receive',
    loading: 'Loading...',
    suggestTitle: "Didn't find your material?",
    suggestSub: 'Suggest it — our team will review and add it to the list',
    sNamePh: 'Material name (e.g. Polyurea insulation)',
    sSectorPh: 'Relevant sector (optional)',
    sDescPh: 'Short description or specs (optional)',
    sBtn: '+ Send suggestion to admin',
    sSending: 'Sending...',
    sSent: 'Suggestion sent; our team will review it.',
    myReq: 'My previous suggestions',
    stPending: 'Under review', stApproved: 'Approved', stRejected: 'Not approved',
  },
  ur: {
    title: 'میرے تخصصات', sub: 'بالکل وہی منتخب کریں جو آپ فراہم کرتے ہیں',
    back: '→ واپس', save: 'تبدیلیاں محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', saved: 'آپ کے تخصصات محفوظ ہو گئیں۔',
    selectSectors: 'یا تفصیل سے مال منتخب کریں', thenSpecialties: 'پھر اپنے تخصصات منتخب کریں',
    selected: 'منتخب', noSectors: 'تخصصات دکھانے کے لیے کم از کم ایک شعبہ منتخب کریں',
    hint: 'جتنا درست تخصص، اتنی متعلقہ درخواستیں',
    loading: 'لوڈ ہو رہا ہے...',
    suggestTitle: 'اپنا مواد نہیں ملا؟',
    suggestSub: 'تجویز کریں، ٹیم جائزہ لے کر شامل کرے گی',
    sNamePh: 'مواد کا نام',
    sSectorPh: 'متعلقہ شعبہ (اختیاری)',
    sDescPh: 'مختصر تفصیل (اختیاری)',
    sBtn: '+ تجویز بھیجیں',
    sSending: 'بھیجا جا رہا ہے...',
    sSent: 'آپ کی تجویز بھیج دی گئی۔',
    myReq: 'میری پچھلی تجاویز',
    stPending: 'زیر جائزہ', stApproved: 'منظور', stRejected: 'منظور نہیں ہوئی',
  },
}

export default function SpecialtiesPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar
  // UX-144: sector names in the reader's language
  // round-6 UX-106: one sector name on every seller screen (sectorName in src/lib/sellers)
  const secLabel = (k: string) => sectorName(k, locale) || k

  const [user, setUser] = useState<any>(null)
  const [isMember, setIsMember] = useState(false) // team member: sees the company's list, the owner edits it
  const [msgErr, setMsgErr] = useState(false)
  const [loading, setLoading] = useState(true)
  // after a failed load the picker would look empty: Save stays disabled so it can't wipe the real specialties
  const [loadFailed, setLoadFailed] = useState(false)
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
  const [suggestErr, setSuggestErr] = useState(false)
  // UX-124: what was last saved, so the page knows about unsaved changes
  const [savedKey, setSavedKey] = useState('')
  const [showIncluded, setShowIncluded] = useState(false)
  const [suggestSubmitting, setSuggestSubmitting] = useState(false)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [matchCount, setMatchCount] = useState<number | null>(null) // round-6 UX-145
  const [openSector, setOpenSector] = useState<any>(null) // single-open accordion (Step 2)
  // round-8 UX-112 (5): the detailed list (~130 specialties) starts folded for everyone; the cards come first
  const [showDetailed, setShowDetailed] = useState(false)
  // round-8 UX-041: a pricing agent «prices» materials, he does not «sell» them
  const [indep, setIndep] = useState(false)
  useEffect(() => { setIndep(storedSellerKind() === 'independent') }, [])
  // auto-analysis of the CR commercial activity (Wathq)
  const [crActivity, setCrActivity] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [detectMsg, setDetectMsg] = useState('')
  // round-4 UX-139: say «we read your CR and picked…» only when it really happened
  const [autoDetected, setAutoDetected] = useState(false)

  // يقرأ نشاط السجل التجاري ويحدّد التخصصات تلقائياً (يضيف فوق المحدد، لا يحذف)
  function analyzeFromCR(activity: any, name: any, silent = false) {
    const text = [name, activity].filter(Boolean).join(' ')
    const { sectors, specialties } = detectSpecialtiesFromText(text)
    if (!specialties.length) {
      if (!silent) setDetectMsg(locale === 'en' ? "Couldn't detect specialties from your CR activity — pick them manually." : locale === 'ur' ? 'سرگرمی سے تخصصات نہیں ملیں — دستی منتخب کریں۔' : 'لم نتعرّف على تخصصات من نشاط سجلك، فاخترها يدوياً.')
      return
    }
    setMySectors(prev => Array.from(new Set([...prev, ...sectors])))
    setMySpecialties(prev => Array.from(new Set([...prev, ...specialties])))
    setAutoDetected(true)
    if (sectors.length) setOpenSector(sectors[0])
    setDetectMsg(
      locale === 'en' ? `Detected ${specialties.length} specialties across ${sectors.length} sectors from your CR — review, adjust, then save.`
      : locale === 'ur' ? `آپ کے ریکارڈ سے ${specialties.length} تخصصات ${sectors.length} شعبوں میں ملیں — جائزہ لے کر محفوظ کریں۔`
      : `تعرّفنا على ${arCount(specialties.length, 'تخصص واحد', 'تخصصين', 'تخصصات', 'تخصصاً')} في ${arCount(sectors.length, 'قطاع واحد', 'قطاعين', 'قطاعات', 'قطاعاً')} من نشاط سجلك. راجِعها وعدّلها ثم احفظ.`
    )
  }

  async function load() {
    setLoading(true); setLoadFailed(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      // a team member works for the company: read the company's specialties, not the personal account's
      const { data: act, error: actErr } = await supabase.rpc('acting_uid')
      if (actErr) throw actErr
      const actId = (act as any) || session.user.id
      setIsMember(actId !== session.user.id)

      const { data: secs, error: secErr } = await supabase.from('profile_sectors').select('sector').eq('profile_id', actId)
      if (secErr) throw secErr
      const { data: specs, error: specErr } = await supabase.from('profile_specialties').select('specialty').eq('profile_id', actId)
      if (specErr) throw specErr
      setMySectors((secs || []).map(s => s.sector))
      setMySpecialties((specs || []).map(s => s.specialty))
      setSavedKey(selKey((secs || []).map(s => s.sector), (specs || []).map(s => s.specialty)))

      const { data: reqs } = await supabase.from('material_requests')
        .select('*').eq('supplier_id', session.user.id).order('created_at', { ascending: false })
      setMyRequests(reqs || [])

      // اقرأ نشاط السجل التجاري — وحدّد التخصصات تلقائياً أول مرة (إن لم يحفظ المورد شيئاً بعد)
      const { data: prof } = await supabase.from('profiles').select('cr_activity, company_name_ar').eq('id', actId).single()
      setCrActivity(prof?.cr_activity || '')
      setCompanyName(prof?.company_name_ar || '')
      if (actId === session.user.id && prof?.cr_activity && (specs || []).length === 0 && (secs || []).length === 0) {
        analyzeFromCR(prof.cr_activity, prof.company_name_ar, true)
      }
    } catch (e) {
      console.error('[supplier/specialties] load failed:', e)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // UX-124: a sector follows from the specialties chosen in it (a sector header only opens the list)
  function sectorsFor(secs: any[], specs: any[]): string[] {
    const out = new Set<string>(secs)
    for (const sec of Object.keys(SUB_CATEGORIES as any)) if (specs.some(k => k in ((SUB_CATEGORIES as any)[sec] || {}))) out.add(sec)
    return [...out]
  }
  function selKey(secs: any[], specs: any[]) { return JSON.stringify([[...sectorsFor(secs, specs)].sort(), [...specs].sort()]) }
  const dirty = !loading && !loadFailed && !isMember && savedKey !== '' && selKey(mySectors, mySpecialties) !== savedKey
  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    // round-7 UX-070: menu links inside the site skip beforeunload, so they are caught here (capture phase)
    const onClick = async (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      e.preventDefault(); e.stopPropagation()
      // dismissValue (askConfirm, round-7 UX-035): closing the dialog = stay on the page
      const r = await askConfirm(
        locale === 'en' ? 'Your specialties are not saved. Do you want to save them?' : locale === 'ur' ? 'آپ کے تخصصات محفوظ نہیں ہوئے۔ کیا آپ انہیں محفوظ کرنا چاہتے ہیں؟' : 'لم تُحفظ تخصصاتك. هل تريد حفظها؟',
        { okLabel: locale === 'en' ? 'Save' : locale === 'ur' ? 'محفوظ کریں' : 'احفظ', cancelLabel: locale === 'en' ? 'Leave without saving' : locale === 'ur' ? 'محفوظ کیے بغیر نکلیں' : 'اخرج دون حفظ', dismissValue: null },
      )
      if (r === null || r === undefined) return
      if (r === true) { const ok = await handleSave(); if (!ok) return }
      window.removeEventListener('beforeunload', h)
      window.location.href = url.href
    }
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('beforeunload', h); document.removeEventListener('click', onClick, true) }
  }, [dirty]) // eslint-disable-line react-hooks/exhaustive-deps
  // UX-006: the sticky save bar is an action bar (the assistant bubble must not cover it)
  useEffect(() => {
    if (typeof document === 'undefined' || isMember) return
    document.body.dataset.actionbar = '1'
    return () => { delete document.body.dataset.actionbar }
  }, [isMember])

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

  async function handleSave(): Promise<boolean> {
    if (isMember || loadFailed) return false
    // no sector at all: the seller would receive no requests (audit 2026-11-01) — ask first
    if (sectorsFor(mySectors, mySpecialties).length === 0 && !(await askConfirm(locale === 'en'
      ? 'You have not chosen any sector, so no requests will reach you. Save anyway?'
      : locale === 'ur'
        ? 'آپ نے کوئی شعبہ منتخب نہیں کیا، اس لیے آپ کو کوئی درخواست نہیں ملے گی۔ پھر بھی محفوظ کریں؟'
        : 'لم تختر أي قطاع، ولن تصلك أي طلبات تسعير. هل تريد الحفظ على أي حال؟'))) return false
    setSaving(true); setMsg(''); setMsgErr(false)
    const supabase = createClient()

    // حفظ ذرّي: حذف + إضافة داخل معاملة واحدة على الخادم — لو فشلت الإضافة يتراجع الحذف
    // فلا تُمسح تخصصات المورّد بصمت (B12).
    const secs = sectorsFor(mySectors, mySpecialties)
    const { error } = await supabase.rpc('save_supplier_specialties', {
      p_sectors: secs,
      p_specialties: mySpecialties,
    })
    setSaving(false)
    if (error) { setMsgErr(true); setMsg(locale === 'en' ? 'Could not save your specialties. Check your connection and try again.' : locale === 'ur' ? 'آپ کے تخصصات محفوظ نہیں ہو سکے۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔' : 'تعذّر حفظ تخصصاتك. تحقّق من اتصالك وحاول مرة أخرى.'); return false }
    setMySectors(secs)
    setSavedKey(selKey(secs, mySpecialties))
    // round-4 UX-141: one success sign only (the «saved» bar below); no second green message
    setMsg('')
    // round-6 UX-145: tie the choice to real requests: how many open requests in my regions match it now
    setMatchCount(null)
    Promise.resolve(supabase.rpc('get_supplier_feed', { p_sectors: secs.length ? secs : null, p_min_value: 0, p_limit: 150 })).then(({ data, error: fe }: any) => {
      if (fe || !Array.isArray(data)) return
      const n = data.filter((r: any) => {
        if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) return false
        const its = Array.isArray(r.items) && r.items.length ? r.items : [{ sector: r.sector, sub_category: r.sub_category }]
        return its.some((it: any) => (!secs.length || secs.includes(it.sector)) && (!mySpecialties.length || !it.sub_category || mySpecialties.includes(it.sub_category)))
      }).length
      setMatchCount(n)
    }, () => {})
    return true
  }

  async function submitSuggestion() {
    if (!suggestName.trim() || !user) return
    setSuggestSubmitting(true); setSuggestMsg(''); setSuggestErr(false)
    const supabase = createClient()
    let spec_file_url = null
    if (suggestFile) {
      let upFailed = false
      try {
        const upFile = await compressImage(suggestFile) // lighter photos; other files pass through
        const ext = upFile.name.split('.').pop()
        const path = `material-requests/${user.id}/${Date.now()}.${ext}`
        const { data: up, error: upErr } = await supabase.storage.from('licenses').upload(path, upFile, { upsert: true })
        if (up && !upErr) { const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(up.path); spec_file_url = publicUrl }
        else upFailed = true
      } catch { upFailed = true }
      if (upFailed) {
        setSuggestSubmitting(false); setSuggestErr(true)
        setSuggestMsg(locale === 'en' ? 'Could not upload the file — try again, or remove it and send without it.' : locale === 'ur' ? 'فائل اپ لوڈ نہیں ہو سکی — دوبارہ کوشش کریں، یا فائل ہٹا کر بغیر اس کے بھیجیں۔' : 'تعذّر رفع الملف — حاول مجدداً، أو أزله وأرسل الاقتراح بدونه.')
        return
      }
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
    if (error) { setSuggestErr(true); setSuggestMsg(locale === 'en' ? 'Could not send your suggestion. Check your connection and try again.' : locale === 'ur' ? 'آپ کی تجویز نہیں بھیجی جا سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔' : 'تعذّر إرسال اقتراحك. تحقّق من اتصالك وحاول مرة أخرى.'); return }
    setMyRequests(prev => [data, ...prev])
    setSuggestName(''); setSuggestSector(''); setSuggestDesc(''); setSuggestGroup(''); setSuggestFile(null)
    setSuggestMsg(T.sSent)
    setTimeout(() => setSuggestMsg(''), 4000)
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title={T.title} nav={getNav('supplier', locale, '/supplier/specialties')} dir={dir} hideAssistant={!isMember}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{T.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{T.sub}</p>
        </div>

        {isMember && (
          <div className="rounded-xl p-3 mb-5 text-sm bg-[#0B2438]/5 border border-[#0B2438]/15 text-[#0B2438] font-semibold">
            {locale === 'en' ? "These are your company's specialties, shown for reading. The account owner edits them." : locale === 'ur' ? 'یہ آپ کی کمپنی کی تخصصات ہیں، صرف دیکھنے کے لیے۔ اکاؤنٹ کا مالک انہیں بدلتا ہے۔' : 'هذه تخصصات شركتك للاطّلاع فقط، ويعدّلها صاحب الحساب.'}
          </div>
        )}
        {/* round-5 UX-161: the hint box repeated the subtitle; removed */}

        {loadFailed && (
          <LoadError onRetry={load} className="mb-5"
            message={locale === 'en' ? 'We could not load your saved specialties, so saving is disabled to keep them safe. Check your connection and try again.' : locale === 'ur' ? 'آپ کی محفوظ تخصصات لوڈ نہیں ہو سکیں، اس لیے انہیں محفوظ رکھنے کے لیے «محفوظ کریں» بند ہے۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔' : 'تعذّر تحميل تخصصاتك المحفوظة، لذلك عُطّل الحفظ حمايةً لها. تحقّق من اتصالك ثم أعد المحاولة.'} />
        )}

        {/* تحليل النشاط التجاري — يُحدّد التخصصات تلقائياً من السجل التجاري */}
        {/* round-5 UX-161: a team member reads the list only, so no analysis card with a disabled button */}
        {crActivity && !isMember && (
          <div className="rounded-2xl p-4 mb-5 border shadow-sm bg-white" style={{ borderColor: '#0B243826' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: '#0B2438' }}>
                  <Glyph e="🔍" /> {locale === 'en' ? 'Detected from your CR activity' : locale === 'ur' ? 'آپ کے ریکارڈ سے ملا' : 'تحليل نشاطك التجاري'}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {autoDetected
                    ? (locale === 'en' ? 'We read your official CR activity and pre-selected your specialties below. Review and adjust them, then save.'
                      : locale === 'ur' ? 'ہم نے آپ کے سرکاری ریکارڈ کی سرگرمی پڑھ کر نیچے آپ کے تخصصات منتخب کیے۔ جائزہ لے کر محفوظ کریں۔'
                      : 'قرأنا نشاطك في السجل التجاري وحدّدنا تخصصاتك بالأسفل. راجِعها وعدّلها ثم احفظ.')
                    : (locale === 'en' ? 'We can suggest what you sell from your commercial registration activity.'
                      : locale === 'ur' ? 'ہم آپ کی تجارتی رجسٹریشن کی سرگرمی سے تجویز کر سکتے ہیں کہ آپ کیا بیچتے ہیں۔'
                      : 'يمكننا اقتراح ما تبيعه من نشاط سجلك التجاري.')}
                </div>
                {detectMsg && <div className="text-[13px] font-semibold mt-1.5 text-[#0B2438]">{detectMsg}</div>}
              </div>
              <button onClick={() => analyzeFromCR(crActivity, companyName)}
                className="min-h-[44px] px-4 rounded-xl font-bold text-white text-sm shrink-0 hover:shadow transition-all disabled:opacity-50" style={{ background: '#0B2438' }}>
                {autoDetected ? (locale === 'en' ? 'Re-analyze' : locale === 'ur' ? 'دوبارہ تجزیہ' : 'إعادة التحليل') : (locale === 'en' ? 'Suggest from my CR' : locale === 'ur' ? 'میری رجسٹریشن سے تجویز کریں' : 'اقترح من سجلي')}
              </button>
            </div>
          </div>
        )}

        {/* اختيار القطاعات + التخصصات — منتقي موحّد مع «أكمل ملفك» (نفس التصنيفات والأيقونات) */}
        <fieldset disabled={isMember} className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5 min-w-0">
          <p className="text-sm font-bold mb-0.5" style={{ color: '#0B2438' }}>{indep
            ? (locale === 'en' ? 'Quick pick: what do you price?' : locale === 'ur' ? 'فوری انتخاب: آپ کس چیز کی قیمت دیتے ہیں؟' : 'اختيار سريع: ما الذي تسعّره؟')
            : (locale === 'en' ? 'Quick pick: what do you sell?' : locale === 'ur' ? 'فوری انتخاب: آپ کیا بیچتے ہیں؟' : 'اختيار سريع: ماذا تبيع؟')}</p>
          <p className="text-xs text-gray-500 mb-2.5">{locale === 'en' ? 'One tap selects a whole kind of business.' : locale === 'ur' ? 'ایک کلک میں پورا کاروبار۔' : 'بضغطة واحدة تختار جميع مواد هذا النوع من المحلات.'}</p>
          <div className="mb-6"><SupplierPackPicker sectors={mySectors} specialties={mySpecialties} locale={locale} onChange={(n: any) => { setMySectors(n.sectors); setMySpecialties(n.specialties) }} /></div>
          {/* The detailed list (6 sectors, ~130 specialties): open for companies; an independent seller
              usually needs only the cards above, so it starts folded behind «تخصيص دقيق». */}
          {showDetailed ? (<>
            <h2 className="font-bold mb-4 text-sm" style={{ color: '#0B2438' }}>{T.selectSectors}</h2>
            <SpecialtyPicker
              sectors={mySectors} specialties={mySpecialties}
              openSector={openSector} onOpenSector={setOpenSector}
              onToggleSector={toggleSector} onToggleSpecialty={toggleSpecialty}
              locale={locale} dir={dir}
            />
          </>) : (
            <button type="button" onClick={() => setShowDetailed(true)}
              className="w-full inline-flex items-center justify-center gap-1 min-h-[44px] text-sm font-bold py-3 rounded-xl border border-dashed border-gray-300 text-gray-600 hover:border-[#D4A543] hover:text-[#8F6820]">
              {locale === 'en' ? 'Fine-tune exact specialties (optional)' : locale === 'ur' ? 'تفصیلی تخصصات (اختیاری)' : 'تخصيص دقيق للتخصصات (اختياري)'} <ChevronDown className="w-4 h-4" aria-hidden />
            </button>
          )}
        </fieldset>

        {/* UX-124: what the choice includes (a pack selects many specialties at once) */}
        {mySpecialties.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-5">
            <button type="button" onClick={() => setShowIncluded(v => !v)} aria-expanded={showIncluded} className="w-full min-h-[44px] flex items-center justify-between gap-2 text-sm font-bold text-[#0B2438]">
              <span>{locale === 'en' ? `What your choice includes (${mySpecialties.length})` : locale === 'ur' ? `آپ کے انتخاب میں شامل (${mySpecialties.length})` : `ما يشمله اختيارك: ${arCount(mySpecialties.length, 'تخصص واحد', 'تخصصان', 'تخصصات', 'تخصصاً')}`}</span>
              {showIncluded ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}
            </button>
            {showIncluded && (
              <div className="mt-2 space-y-2">
                {Object.keys(SUB_CATEGORIES as any).map(sec => {
                  const keys = mySpecialties.filter(k => k in ((SUB_CATEGORIES as any)[sec] || {}))
                  if (!keys.length) return null
                  return (
                    <div key={sec}>
                      <div className="text-[13px] font-bold text-gray-600 mb-1">{secLabel(sec)}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {keys.map(k => <span key={k} className="text-[12px] px-2 py-1 rounded-full bg-[#D4A543]/10 border border-[#D4A543]/40 text-[#071827]">{getSubCategoryLabel(sec as any, k, locale)}</span>)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : !loadFailed && (
          <div role="status" className="bg-warn-bg rounded-2xl p-5 border border-warn-border text-center text-warn-text text-sm font-semibold mb-5">
            {indep
              ? (locale === 'en' ? 'You have not chosen what you price yet, so no requests will reach you until you choose. Pick a kind of material above or your exact specialties.' : locale === 'ur' ? 'آپ نے ابھی منتخب نہیں کیا کہ آپ کس چیز کی قیمت دیتے ہیں، اس لیے انتخاب تک کوئی درخواست نہیں آئے گی۔ اوپر مال کی قسم یا تخصصات منتخب کریں۔' : 'لم تختر بعد ما تسعّره، ولن تصلك طلبات حتى تختار. اختر نوع المواد من الأعلى أو تخصصاتك الدقيقة.')
              : (locale === 'en' ? 'You have not chosen what you sell yet, so no requests will reach you. Pick a kind of business above or your exact specialties.' : locale === 'ur' ? 'آپ نے ابھی منتخب نہیں کیا کہ آپ کیا بیچتے ہیں، اس لیے کوئی درخواست نہیں آئے گی۔ اوپر کاروبار کی قسم یا تخصصات منتخب کریں۔' : 'لم تختر بعد ما تبيعه، ولن تصلك طلبات حتى تختار. اختر نوع ما تبيعه من الأعلى أو تخصصاتك الدقيقة.')}
          </div>
        )}

        {/* اقتراح مادة جديدة غير موجودة بالقائمة */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold text-sm" style={{ color: '#0B2438' }}>{T.suggestTitle}</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">{T.suggestSub}</p>

          {/* round-7 UX-149: visible labels, the required field marked */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sug-name" className="block text-xs font-bold text-gray-600 mb-1">{locale === 'en' ? 'Material name *' : locale === 'ur' ? 'مواد کا نام *' : 'اسم المادة *'}</label>
              <input id="sug-name" value={suggestName} onChange={e => setSuggestName(e.target.value)} required aria-required="true"
                className="input-field" placeholder={T.sNamePh} />
            </div>
            <div>
              <label htmlFor="sug-sector" className="block text-xs font-bold text-gray-600 mb-1">{locale === 'en' ? 'Sector (optional)' : locale === 'ur' ? 'شعبہ (اختیاری)' : 'القطاع (اختياري)'}</label>
            <select id="sug-sector" value={suggestSector} onChange={e => setSuggestSector(e.target.value)} className="input-field">
              <option value="">{T.sSectorPh}</option>
              {Object.keys(SECTOR_LABELS).map(s => (
                <option key={s} value={s}>{secLabel(s)}</option>
              ))}
            </select>
            </div>
          </div>
          {suggestSector && (() => {
            const gks = sortGroupKeys([...new Set(Object.values((SUB_CATEGORIES as any)[suggestSector] || {}).map((x: any) => x.group))] as string[])
            return (
              <select value={suggestGroup} onChange={e => setSuggestGroup(e.target.value)} className="input-field mt-3" aria-label={locale === 'en' ? 'Which group fits it' : locale === 'ur' ? 'یہ کس گروپ میں آتا ہے' : 'المجموعة المناسبة'}>
                <option value="">{locale === 'en' ? 'Which group / list fits it?' : locale === 'ur' ? 'یہ کس گروپ میں آتا ہے؟' : 'أي مجموعة/قائمة تناسبها؟'}</option>
                {gks.map((g: string) => <option key={g} value={g}>{(() => { const gl = (GROUP_LABELS as any)[g]; return gl ? (locale === 'en' ? gl.en : locale === 'ur' ? gl.ur : gl.ar) : g })()}</option>)}
                <option value="__other__">{locale === 'en' ? 'Not listed — I will describe below' : locale === 'ur' ? 'فہرست میں نہیں — نیچے وضاحت کروں گا' : 'غير مذكورة — أوضّح بالوصف'}</option>
              </select>
            )
          })()}
          <label htmlFor="sug-desc" className="block text-xs font-bold text-gray-600 mt-3 mb-1">{locale === 'en' ? 'Description or specifications (optional)' : locale === 'ur' ? 'تفصیل یا خصوصیات (اختیاری)' : 'الوصف أو المواصفات (اختياري)'}</label>
          <textarea id="sug-desc" value={suggestDesc} onChange={e => setSuggestDesc(e.target.value)}
            className="input-field" rows={2} placeholder={T.sDescPh} />
          {/* round-4 UX-141: a dashed upload area in the page language (no browser «Choose file») */}
          {suggestFile ? (
            <div className="mt-3 flex items-center gap-3 bg-[#0B2438]/5 rounded-xl p-2.5 border border-[#0B2438]/20">
              <span className="text-xl"><Glyph e="📄" /></span>
              <span className="text-xs font-semibold flex-1 truncate text-[#0B2438]">{suggestFile.name}</span>
              <button type="button" onClick={() => setSuggestFile(null)} className="min-h-[44px] px-2 text-xs font-bold text-[#B42318] hover:underline">{locale === 'en' ? 'Remove' : locale === 'ur' ? 'ہٹائیں' : 'إزالة'}</button>
            </div>
          ) : (
            <label className="mt-3 flex items-center gap-3 min-h-[52px] border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-[#D4A543]/50 transition-all">
              <input type="file" className="sr-only" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e => setSuggestFile((e.target as any).files?.[0] || null)} />
              <span className="text-lg"><Glyph e="📤" /></span>
              <span className="text-sm text-gray-600">{locale === 'en' ? 'Attach a photo or the specification file (optional)' : locale === 'ur' ? 'تصویر یا تفصیلات کی فائل منسلک کریں (اختیاری)' : 'أرفق صورة أو ملف المواصفات (اختياري)'}</span>
            </label>
          )}

          {suggestMsg && <div role={suggestErr ? 'alert' : 'status'} className={`text-sm rounded-xl p-2.5 mt-3 border ${suggestErr ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>{suggestMsg}</div>}

          <button onClick={submitSuggestion} disabled={!suggestName.trim() || suggestSubmitting}
            className="mt-3 min-h-[44px] px-5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow"
            style={{ background: '#0B2438' }}>
            {suggestSubmitting ? T.sSending : T.sBtn}
          </button>

          {myRequests.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="text-xs font-bold text-gray-500 mb-2">{T.myReq}</div>
              <div className="space-y-2">
                {myRequests.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <span className="min-w-0">
                      <span className="font-semibold text-gray-700">{r.name}</span>
                      {/* round-6 UX-108: a declined suggestion says why (admin_note), in grey, never red */}
                      {r.status === 'rejected' && r.admin_note && <span className="block text-[12px] text-gray-500 mt-0.5" dir="auto">{r.admin_note}</span>}
                    </span>
                    <span className={`shrink-0 text-[12px] px-2 py-0.5 rounded-full font-bold ${
                      r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'rejected' ? 'bg-gray-100 text-gray-600' :
                      'bg-[#D4A543]/15 text-[#6C531F]'
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
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4 mt-6 z-10">
          {matchCount != null && !msg && (
            <div role="status" className="text-sm rounded-xl p-3 mb-3 text-center border border-[#0B2438]/15 bg-[#0B2438]/5 text-[#0B2438] font-semibold">
              {matchCount > 0
                ? (locale === 'en' ? `Your choice now matches ${matchCount} open request${matchCount === 1 ? '' : 's'} in your area.` : locale === 'ur' ? `آپ کا انتخاب اب آپ کے علاقے کی ${matchCount} کھلی درخواستوں سے ملتا ہے۔` : `تطابق اختيارك الآن ${arCount(matchCount, 'طلباً واحداً مفتوحاً', 'طلبين مفتوحين', 'طلبات مفتوحة', 'طلباً مفتوحاً')} في منطقتك.`)
                : (locale === 'en' ? 'No open request in your area matches your choice right now; we will alert you when one arrives.' : locale === 'ur' ? 'ابھی آپ کے علاقے کی کوئی کھلی درخواست آپ کے انتخاب سے نہیں ملتی؛ آتے ہی ہم بتائیں گے۔' : 'لا يطابق اختيارك طلباً مفتوحاً في منطقتك الآن، وسننبّهك فور وصول طلب مطابق.')}
              {matchCount > 0 && <> <a href="/supplier/dashboard" className="inline-flex items-center min-h-[44px] px-1 font-bold text-[#8F6820] underline">{locale === 'en' ? 'See them' : locale === 'ur' ? 'دیکھیں' : 'اعرضها'}</a></>}
            </div>
          )}
          {msg && <div role={msgErr ? 'alert' : undefined} className={`text-sm rounded-xl p-3 mb-3 text-center border ${msgErr ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{msg}</div>}
          {isMember ? null : dirty || saving ? (
          <button onClick={handleSave} disabled={saving || loadFailed}
            className="w-full min-h-[52px] py-4 rounded-xl font-extrabold text-base disabled:opacity-50 transition-all hover:shadow-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)', color: '#071827' }}>
            {saving ? T.saving : `${T.save} (${mySpecialties.length})`}
          </button>
          ) : !loadFailed && mySpecialties.length > 0 && (
            <div className="w-full min-h-[52px] py-3 rounded-xl text-center font-bold text-base bg-white border border-emerald-200 text-emerald-700 shadow" aria-live="polite">
              {locale === 'en' ? `Specialties saved (${mySpecialties.length})` : locale === 'ur' ? `تخصصات محفوظ ہیں (${mySpecialties.length})` : `التخصصات محفوظة (${mySpecialties.length})`}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
