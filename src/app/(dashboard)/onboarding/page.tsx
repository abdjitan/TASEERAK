'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PageLoader from '@/components/shared/PageLoader'
import DistrictField from '@/components/shared/DistrictField'
import SpecialtyPicker from '@/components/shared/SpecialtyPicker'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { REGIONS, SECTOR_LABELS, SUB_CATEGORIES, getRegionLabel, CITIES_BY_REGION } from '@/types'

// ── إعداد ملفك التجاري (Progressive profiling) ────────────────────────────
// تُعبّأ هنا البيانات المنقولة خارج التسجيل: الموقع + القطاعات + (للمقاول: الدرجة)
// + (للمورّد: التخصصات + التصنيف + الحد الأدنى). التوثيق (السجل/المستندات) في الإعدادات.
// كل الجداول يديرها المستخدم لنفسه عبر RLS (profile_id = auth.uid()).
const SECTOR_TR: Record<string, any> = {
  civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'تعمیراتی' },
  electrical: { en: 'Electrical', ur: 'برقی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
  equipment: { en: 'Machinery', ur: 'مشینری' }, supply_store: { en: 'Supply Store', ur: 'سپلائی اسٹور' },
}
// نفس ألوان المنتقي (SpecialtyPicker) — لإبراز القطاع المحدّد بلونه الخاص بهدوء بدل البرتقالي الصاخب.
const SECTOR_COLORS: Record<string, string> = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#D97706', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }

const TR = {
  ar: {
    title: 'إعداد ملفك التجاري', subC: 'أضف موقعك ومجالات عملك لتصلك أفضل العروض', subS: 'أضف موقعك وتخصصاتك لتظهر للمقاولين وتصلك الطلبات المطابقة',
    location: 'الموقع', region: 'المنطقة', selectRegion: '-- اختر --', city: 'المدينة', district: 'الحي',
    sectorsTitleC: 'قطاعات عملك', sectorsHintC: 'اختر القطاعات التي تعمل فيها',
    sectorsTitleS: 'تخصصاتك والمواد', sectorsHintS: 'اختر قطاعاتك ثم حدّد ما توردّه بالضبط',
    classTitle: 'تصنيف شركتك', classHint: 'مصنع = مورّد رئيسي للمشاريع الكبرى · تجاري = وسيط ومستودع · محلي = موزّع صغير. اختر الأنسب لعملك.',
    manufacturer: 'مصنع / مورد رئيسي', commercial: 'مورد تجاري', local: 'مورد محلي',
    minOrder: 'الحد الأدنى لقيمة الطلب (ر.س) — اختياري', minOrderPh: 'مثال: 50000', minOrderHint: 'اتركه فارغاً لقبول كل الطلبات — أو حدّده ليُفلتر الطلبات حسب قدرتك التوريدية.',
    gradeTitle: 'درجة تصنيف شركتك', gradeSub: 'من رخصتك (وزارة الشؤون البلدية) — يستخدمها الموردون لفلترة الطلبات حسب حجم المشروع. اختياري.',
    verifyTitle: 'وثّق نشاطك التجاري', verifyBody: 'يتطلب استقبال الطلبات وتقديم العروض المسعّرة توثيق سجلك التجاري ومستنداتك.', verifyCta: 'أكمل التوثيق ←',
    addMatTitle: 'لا تجد مادة توردّها بالقائمة؟', addMatPh: 'اسم المادة...', addMatBtn: 'إضافة', remove: 'إزالة',
    save: 'حفظ ومتابعة ←', saving: 'جارٍ الحفظ...', later: 'لاحقاً', selected: 'محدد',
    needLoc: 'اختر المنطقة والمدينة', needSector: 'اختر قطاعاً واحداً على الأقل', saved: 'تم حفظ ملفك ✓',
    progress: 'اكتمال ملفك', stepLocation: 'الموقع', stepSectors: 'القطاعات', stepSpecialties: 'التخصصات', stepVerify: 'التوثيق (لاحقاً)',
    warn: 'بدون تحديد موقعك وقطاعاتك وتخصصاتك لن تظهر للمقاولين ولن تصلك أي طلبات مطابقة.',
    company: 'ملف الشركة', required: 'مطلوب', optional: 'اختياري',
  },
  en: {
    title: 'Set up your business profile', subC: 'Add your location and work areas to get the best offers', subS: 'Add your location and specialties to appear to contractors and receive matching requests',
    location: 'Location', region: 'Region', selectRegion: '-- Select --', city: 'City', district: 'District',
    sectorsTitleC: 'Your sectors', sectorsHintC: 'Select the sectors you work in',
    sectorsTitleS: 'Specialties & materials', sectorsHintS: 'Select your sectors then pick exactly what you supply',
    classTitle: 'Company classification', classHint: 'Factory = major project supplier · Commercial = wholesaler/warehouse · Local = small distributor. Pick what fits.',
    manufacturer: 'Factory / Major Supplier', commercial: 'Commercial Supplier', local: 'Local Supplier',
    minOrder: 'Min order value (SAR) — optional', minOrderPh: 'e.g. 50000', minOrderHint: 'Leave empty to accept all requests — or set it to filter by your supply capacity.',
    gradeTitle: 'Company grade', gradeSub: 'From your license (Ministry of Municipal Affairs) — suppliers use it to filter by project size. Optional.',
    verifyTitle: 'Verify your business', verifyBody: 'Receiving requests and submitting priced offers requires verifying your CR and documents.', verifyCta: 'Complete verification →',
    addMatTitle: "Can't find a material you supply?", addMatPh: 'Material name...', addMatBtn: 'Add', remove: 'Remove',
    save: 'Save & continue →', saving: 'Saving...', later: 'Later', selected: 'selected',
    needLoc: 'Select region and city', needSector: 'Select at least one sector', saved: 'Profile saved ✓',
    progress: 'Profile completion', stepLocation: 'Location', stepSectors: 'Sectors', stepSpecialties: 'Specialties', stepVerify: 'Verification (later)',
    warn: "Without your location, sectors and specialties you won't appear to contractors and won't receive any matching requests.",
    company: 'Company profile', required: 'Required', optional: 'Optional',
  },
  ur: {
    title: 'اپنی کاروباری پروفائل ترتیب دیں', subC: 'بہترین آفرز کے لیے اپنا مقام اور کام کے شعبے شامل کریں', subS: 'ٹھیکیداروں کو نظر آنے اور مماثل درخواستیں وصول کرنے کے لیے مقام اور مہارتیں شامل کریں',
    location: 'مقام', region: 'علاقہ', selectRegion: '-- منتخب کریں --', city: 'شہر', district: 'علاقہ',
    sectorsTitleC: 'آپ کے شعبے', sectorsHintC: 'وہ شعبے منتخب کریں جہاں آپ کام کرتے ہیں',
    sectorsTitleS: 'مہارتیں اور مواد', sectorsHintS: 'اپنے شعبے منتخب کریں پھر بالکل وہی چنیں جو فراہم کرتے ہیں',
    classTitle: 'کمپنی کی درجہ بندی', classHint: 'فیکٹری = بڑا سپلائر · تجارتی = ہول سیلر · مقامی = چھوٹا ڈسٹری بیوٹر۔ مناسب منتخب کریں۔',
    manufacturer: 'فیکٹری / بڑا سپلائر', commercial: 'تجارتی سپلائر', local: 'مقامی سپلائر',
    minOrder: 'کم از کم آرڈر قیمت (ریال) — اختیاری', minOrderPh: 'مثال: 50000', minOrderHint: 'تمام درخواستوں کے لیے خالی چھوڑیں یا اپنی صلاحیت کے مطابق مقرر کریں۔',
    gradeTitle: 'کمپنی کا درجہ', gradeSub: 'آپ کے لائسنس سے — سپلائرز پروجیکٹ سائز کے مطابق فلٹر کرتے ہیں۔ اختیاری۔',
    verifyTitle: 'اپنے کاروبار کی تصدیق کریں', verifyBody: 'درخواستیں وصول کرنے اور قیمت والی آفرز دینے کے لیے CR اور دستاویزات کی تصدیق ضروری ہے۔', verifyCta: 'تصدیق مکمل کریں →',
    addMatTitle: 'فہرست میں کوئی مواد نہیں؟', addMatPh: 'مواد کا نام...', addMatBtn: 'شامل کریں', remove: 'ہٹائیں',
    save: 'محفوظ کریں اور جاری رکھیں →', saving: 'محفوظ ہو رہا ہے...', later: 'بعد میں', selected: 'منتخب',
    needLoc: 'علاقہ اور شہر منتخب کریں', needSector: 'کم از کم ایک شعبہ منتخب کریں', saved: 'پروفائل محفوظ ✓',
    progress: 'پروفائل تکمیل', stepLocation: 'مقام', stepSectors: 'شعبے', stepSpecialties: 'مہارتیں', stepVerify: 'تصدیق (بعد میں)',
    warn: 'مقام، شعبوں اور مہارتوں کے بغیر آپ ٹھیکیداروں کو نظر نہیں آئیں گے اور کوئی درخواست موصول نہیں ہوگی۔',
    company: 'کمپنی پروفائل', required: 'ضروری', optional: 'اختیاری',
  },
}

export default function OnboardingPage() {
  const { locale, dir } = useTranslation()
  const t = TR[locale] || TR.ar
  const supabase = createClient()
  const sl = (s: any) => locale === 'ar' ? (SECTOR_LABELS as any)[s] : (SECTOR_TR[s]?.[locale] || (SECTOR_LABELS as any)[s])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState('')
  const [role, setRole] = useState<'contractor' | 'supplier'>('contractor')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [sectors, setSectors] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [openSector, setOpenSector] = useState<string | null>(null)
  const [supplierTier, setSupplierTier] = useState<'manufacturer' | 'commercial' | 'local'>('local')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [contractorGrade, setContractorGrade] = useState<'A' | 'B' | 'C' | 'D' | ''>('')
  const [extraMaterials, setExtraMaterials] = useState<{ sector: string; name: string }[]>([])
  const [extraMaterialInput, setExtraMaterialInput] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUid(session.user.id)
      const metaRole = (session.user.user_metadata as any)?.role
      const { data: p } = await supabase.from('profiles').select('role, region, city, district, supplier_tier, min_order_value, contractor_grade').eq('id', session.user.id).single()
      setRole(((p?.role || metaRole) === 'supplier') ? 'supplier' : 'contractor')
      if (p) {
        setRegion(p.region || ''); setCity(p.city || ''); setDistrict(p.district || '')
        if (p.supplier_tier) setSupplierTier(p.supplier_tier)
        if (p.min_order_value) setMinOrderValue(String(p.min_order_value))
        if (p.contractor_grade) setContractorGrade(p.contractor_grade)
      }
      const [{ data: ps }, { data: psp }] = await Promise.all([
        supabase.from('profile_sectors').select('sector').eq('profile_id', session.user.id),
        supabase.from('profile_specialties').select('specialty').eq('profile_id', session.user.id),
      ])
      if (ps) setSectors(ps.map((r: any) => r.sector))
      if (psp) setSpecialties(psp.map((r: any) => r.specialty))
      setLoading(false)
    })()
  }, [])

  function toggleSector(s: string) {
    if (sectors.includes(s)) {
      const subKeys = Object.keys((SUB_CATEGORIES as any)[s] || {})
      setSpecialties(prev => prev.filter(x => !subKeys.includes(x)))
      setExtraMaterials(prev => prev.filter(m => m.sector !== s))
      setSectors(prev => prev.filter(x => x !== s))
    } else setSectors(prev => [...prev, s])
  }
  function toggleSpecialty(k: string) { setSpecialties(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]) }
  function addExtraMaterial(sector: string) {
    const v = extraMaterialInput.trim()
    if (!v || !sector) return
    setExtraMaterials(prev => prev.some(m => m.name === v && m.sector === sector) ? prev : [...prev, { sector, name: v }])
    setExtraMaterialInput('')
  }

  async function save() {
    setErr('')
    if (!region || !city) { setErr(t.needLoc); return }
    if (sectors.length === 0) { setErr(t.needSector); return }
    setSaving(true)
    try {
      const update: any = { region, city, district: district || null, preferred_language: locale }
      if (role === 'supplier') { update.supplier_tier = supplierTier; update.min_order_value = minOrderValue ? parseFloat(minOrderValue) : 0 }
      if (role === 'contractor') update.contractor_grade = contractorGrade || null
      await supabase.from('profiles').update(update).eq('id', uid)
      await supabase.from('profile_sectors').delete().eq('profile_id', uid)
      if (sectors.length) await supabase.from('profile_sectors').insert(sectors.map(s => ({ profile_id: uid, sector: s })))
      if (role === 'supplier') {
        await supabase.from('profile_specialties').delete().eq('profile_id', uid)
        if (specialties.length) await supabase.from('profile_specialties').insert(specialties.map(k => ({ profile_id: uid, specialty: k })))
        for (const m of extraMaterials) {
          try { await supabase.from('material_requests').insert({ supplier_id: uid, name: m.name }) } catch {}
        }
        try { await fetch('/api/classify-supplier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }) } catch {}
      }
      window.location.href = role === 'supplier' ? '/supplier/dashboard' : '/contractor'
    } catch (e: any) {
      setErr(e?.message || 'حدث خطأ أثناء الحفظ'); setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  const roleHome = role === 'supplier' ? '/supplier/dashboard' : '/contractor'

  // ── التقدّم ──
  const steps = role === 'supplier'
    ? [{ label: t.stepLocation, done: !!(region && city) }, { label: t.stepSectors, done: sectors.length > 0 }, { label: t.stepSpecialties, done: specialties.length > 0 }]
    : [{ label: t.stepLocation, done: !!(region && city) }, { label: t.stepSectors, done: sectors.length > 0 }]
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
  const canSave = !!(region && city) && sectors.length > 0
  const ringC = 2 * Math.PI * 24

  const SaveBtn = ({ full }: { full?: boolean }) => (
    <button type="button" onClick={save} disabled={saving || !canSave}
      className={`${full ? 'w-full' : 'w-full'} py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ background: canSave ? '#F5831F' : '#9ca3af' }}>
      {saving ? t.saving : t.save}
    </button>
  )
  const cardCls = 'bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100'

  return (
    <div className="min-h-screen relative isolate" dir={dir}
      style={{
        backgroundColor: '#f5f7fb',
        backgroundImage:
          'radial-gradient(1100px 520px at 100% -8%, rgba(27,45,91,0.07), rgba(27,45,91,0) 60%),' +
          'radial-gradient(900px 480px at -6% 108%, rgba(245,131,31,0.05), rgba(245,131,31,0) 55%),' +
          'linear-gradient(180deg, #eef2f8 0%, #f5f7fb 34%, #f5f7fb 100%)',
        backgroundAttachment: 'fixed',
      }}>
      {/* طبقة زخرفية خفيفة: شبكة + نقاط كحلية باهتة تعطي إحساساً «مرتّباً» — CSS خالص بلا أصول */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(27,45,91,0.035) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(27,45,91,0.035) 1px, transparent 1px),' +
            'radial-gradient(rgba(27,45,91,0.05) 1px, transparent 1.5px)',
          backgroundSize: '38px 38px, 38px 38px, 38px 38px',
          backgroundPosition: '0 0, 0 0, 19px 19px',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 120px, #000 76%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0, #000 120px, #000 76%, transparent 100%)',
        }} />
      <header className="bg-white/90 backdrop-blur border-b border-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={roleHome} className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-white border border-line grid place-items-center"><img src="/logo.png" alt="تسعيرك" className="w-7 h-7 object-contain" /></span>
            <span className="font-extrabold text-navy text-lg">تسعير<span className="text-orange">ك</span></span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href={roleHome} className="text-sm font-medium text-gray-500 hover:text-navy">{t.later}</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-navy">{t.title}</h1>
          <p className="text-ink-2 mt-1.5 text-sm">{role === 'supplier' ? t.subS : t.subC}</p>
        </div>

        <div className="lg:flex lg:gap-6 lg:items-start">
          {/* ═══ العمود الرئيسي ═══ */}
          <div className="flex-1 min-w-0 space-y-4 pb-28 lg:pb-0">
            {/* الموقع (مطلوب) */}
            <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#1B2D5B' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-navy">📍 {t.location}</h2>
                <span className="text-[10px] font-bold text-navy bg-navy/5 rounded-full px-2 py-0.5">{t.required}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.region} *</label>
                  <select value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field">
                    <option value="">{t.selectRegion}</option>
                    {REGIONS.map((r: any) => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.city} *</label>
                  <select value={city} onChange={e => setCity(e.target.value)} className="input-field" disabled={!region}>
                    <option value="">{region ? t.selectRegion : '—'}</option>
                    {(CITIES_BY_REGION[region] || []).map((c: any) => <option key={c.ar} value={c.ar}>{locale === 'en' ? c.en : c.ar}</option>)}
                  </select>
                </div>
              </div>
              {city && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.district}</label>
                  <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} />
                </div>
              )}
            </div>

            {/* القطاعات / التخصصات (مطلوب) */}
            <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#1B2D5B' }}>
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="text-sm font-bold text-navy">🧩 {role === 'supplier' ? t.sectorsTitleS : t.sectorsTitleC}</h2>
                <span className="text-[10px] font-bold text-navy bg-navy/5 rounded-full px-2 py-0.5">{t.required}</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">{role === 'supplier' ? t.sectorsHintS : t.sectorsHintC}</p>

              {role !== 'supplier' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {(Object.keys(SECTOR_LABELS) as string[]).map((sector: any) => {
                    const c = SECTOR_COLORS[sector]; const on = sectors.includes(sector)
                    return (
                      <button key={sector} type="button" onClick={() => toggleSector(sector)}
                        className={`relative p-4 rounded-xl border transition-all bg-white ${on ? 'border-line shadow-md2' : 'border-gray-200 hover:border-[#cfd7e6]'}`}
                        style={{ textAlign: dir === 'rtl' ? 'right' : 'left', ...(on ? { borderInlineStartWidth: 4, borderInlineStartStyle: 'solid', borderInlineStartColor: c, background: c + '0F' } : {}) }}>
                        <div className="font-semibold text-sm text-navy">{sl(sector)}</div>
                        {on && <span className="absolute top-2 w-4 h-4 grid place-items-center rounded-full text-white text-[9px]" style={{ background: c, insetInlineEnd: '0.5rem' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              {role === 'supplier' && (
                <div className="mt-4">
                  <SpecialtyPicker
                    sectors={sectors} specialties={specialties}
                    openSector={openSector} onOpenSector={setOpenSector}
                    onToggleSector={toggleSector} onToggleSpecialty={toggleSpecialty}
                    locale={locale} dir={dir} removeLabel={t.remove}
                    renderSectorExtra={(sector) => {
                      const sectorMats = extraMaterials.filter(m => m.sector === sector)
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-[11px] font-bold text-gray-600 mb-1.5">{t.addMatTitle}</div>
                          <div className="flex gap-2">
                            <input type="text" value={extraMaterialInput} onChange={(e: any) => setExtraMaterialInput(e.target.value)}
                              onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addExtraMaterial(sector) } }}
                              className="input-field flex-1" placeholder={t.addMatPh} />
                            <button type="button" onClick={() => addExtraMaterial(sector)} className="px-4 rounded-xl text-sm font-bold text-white shrink-0" style={{ background: '#1B2D5B' }}>{t.addMatBtn}</button>
                          </div>
                          {sectorMats.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {sectorMats.map((m: any) => (
                                <span key={m.name} className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                  {m.name}
                                  <button type="button" onClick={() => setExtraMaterials(prev => prev.filter(x => !(x.name === m.name && x.sector === sector)))} className="text-amber-500 hover:text-amber-800 font-bold leading-none">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                </div>
              )}
            </div>

            {/* ملف الشركة: التصنيف/الدرجة (اختياري) */}
            {role === 'supplier' && (
              <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#0F6E56' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-navy">🏭 {t.classTitle}</h2>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{t.optional}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{t.classHint}</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[{ key: 'manufacturer', label: t.manufacturer }, { key: 'commercial', label: t.commercial }, { key: 'local', label: t.local }].map((tier: any) => (
                    <button key={tier.key} type="button" onClick={() => setSupplierTier(tier.key)}
                      className={`p-3 rounded-xl border text-center transition-all ${supplierTier === tier.key ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`text-xs font-bold ${supplierTier === tier.key ? 'text-navy' : 'text-gray-700'}`}>{tier.label}</div>
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{t.minOrder}</label>
                <input type="number" value={minOrderValue} onChange={(e: any) => setMinOrderValue(e.target.value)} className="input-field" placeholder={t.minOrderPh} min="0" />
                <p className="text-[10px] text-gray-400 mt-1">{t.minOrderHint}</p>
              </div>
            )}

            {role === 'contractor' && (
              <div className={cardCls} style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#0F6E56' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-navy">🏅 {t.gradeTitle}</h2>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{t.optional}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{t.gradeSub}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[{ grade: 'A', label: locale === 'ar' ? 'أ' : 'A', desc: '> 100M', color: '#F5831F' }, { grade: 'B', label: locale === 'ar' ? 'ب' : 'B', desc: '30–100M', color: '#1B2D5B' }, { grade: 'C', label: locale === 'ar' ? 'ج' : 'C', desc: '5–30M', color: '#0F6E56' }, { grade: 'D', label: locale === 'ar' ? 'د' : 'D', desc: '< 5M', color: '#888780' }].map((g: any) => (
                    <button key={g.grade} type="button" onClick={() => setContractorGrade(contractorGrade === g.grade ? '' : g.grade)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${contractorGrade === g.grade ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                      style={contractorGrade === g.grade ? { borderColor: g.color, background: g.color + '10' } : {}}>
                      <div className="text-xl font-black mb-0.5" style={{ color: g.color }}>{g.label}</div>
                      <div className="text-[10px] text-gray-500">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* التوثيق (للمورّد) — بوابة إيراد، بارزة */}
            {role === 'supplier' && (
              <div className="rounded-2xl p-5 shadow-sm" style={{ borderInlineStartWidth: 4, borderInlineStartColor: '#F5831F', background: '#fff7ed', border: '1px solid #F5831F33' }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">🛡️</span>
                  <div className="flex-1">
                    <div className="font-bold text-navy text-sm">{t.verifyTitle}</div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.verifyBody}</p>
                    <a href="/settings" className="inline-block mt-2 text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ background: '#F5831F' }}>{t.verifyCta}</a>
                  </div>
                </div>
              </div>
            )}

            {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{err}</div>}
          </div>

          {/* ═══ السايدبار: التقدّم + الحفظ (ديسكتوب) ═══ */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 rounded-2xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(160deg,#1B2D5B,#0f1d3d)' }}>
              <div className="flex items-center gap-4 mb-4">
                <svg width="60" height="60" viewBox="0 0 56 56" className="shrink-0">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={pct === 100 ? '#22c55e' : '#F5831F'} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={ringC} strokeDashoffset={ringC * (1 - pct / 100)} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset .4s' }} />
                  <text x="28" y="33" textAnchor="middle" className="fill-white font-extrabold" style={{ fontSize: 15 }}>{pct}%</text>
                </svg>
                <div>
                  <div className="text-sm font-extrabold">{t.progress}</div>
                  <div className="text-[11px] text-blue-100 mt-0.5">{steps.filter(s => s.done).length}/{steps.length}</div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 grid place-items-center rounded-full text-[11px] shrink-0 ${s.done ? 'bg-emerald-500' : 'bg-white/15'}`}>{s.done ? '✓' : ''}</span>
                    <span className={s.done ? 'text-white' : 'text-blue-200'}>{s.label}</span>
                  </div>
                ))}
                {role === 'supplier' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 grid place-items-center rounded-full text-[11px] shrink-0 bg-white/15">🛡</span>
                    <span className="text-blue-200">{t.stepVerify}</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-blue-50 bg-white/10 rounded-lg p-2.5 mb-4 leading-relaxed">⚠️ {t.warn}</div>

              <SaveBtn full />
              <a href={roleHome} className="block text-center text-xs text-blue-200 hover:text-white mt-2.5">{t.later}</a>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ شريط الحفظ الثابت — موبايل/تابلت فقط (الديسكتوب لديه سايدبار لاصق) ═══ */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="bg-white/95 backdrop-blur border-t border-line" style={{ boxShadow: '0 -8px 24px -12px rgba(15,27,52,.18)' }}>
          {/* شريط تقدّم رفيع */}
          <div className="h-1 w-full bg-canvas-2">
            <div className="h-full transition-all duration-300" style={{ width: pct + '%', background: pct === 100 ? '#22c55e' : '#F5831F' }} />
          </div>
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
            {/* النسبة + عدّاد الخطوات */}
            <div className="shrink-0 leading-tight">
              <div className="text-[15px] font-extrabold text-navy">{pct}%</div>
              <div className="text-[10px] text-ink-3">{steps.filter(s => s.done).length}/{steps.length} · {t.progress}</div>
            </div>
            {/* لاحقاً (ثانوي) */}
            <a href={roleHome} className="shrink-0 text-xs font-semibold text-ink-2 px-3 py-2 rounded-xl border border-line hover:border-navy hover:text-navy transition-colors">{t.later}</a>
            {/* حفظ — الزر الأساسي الوحيد ذو البرتقالي القوي على الموبايل */}
            <button type="button" onClick={save} disabled={saving || !canSave}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
              style={{ background: canSave ? '#F5831F' : '#cbd2e0', color: canSave ? '#fff' : '#7c8496', boxShadow: canSave ? '0 12px 30px -8px rgba(245,131,31,.5)' : 'none' }}>
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
