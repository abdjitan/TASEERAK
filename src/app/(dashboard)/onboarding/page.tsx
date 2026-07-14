'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PageLoader from '@/components/shared/PageLoader'
import DistrictField from '@/components/shared/DistrictField'
import CatIcon from '@/components/shared/CatIcon'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { REGIONS, SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS, getRegionLabel, CITIES_BY_REGION, sortGroupKeys, type Sector } from '@/types'

// ── أكمل ملفك (Progressive profiling) ─────────────────────────────────────
// تُعبّأ هنا البيانات التي نُقلت خارج التسجيل: الموقع + القطاعات + (للمقاول: الدرجة)
// + (للمورّد: التخصصات + التصنيف + الحد الأدنى). التوثيق (السجل/المستندات) في الإعدادات.
// كل الجداول يديرها المستخدم لنفسه عبر RLS (profile_id = auth.uid()).
const SECTOR_COLORS: Record<string, string> = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#D97706', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }
const SECTOR_TR: Record<string, any> = {
  civil: { en: 'Civil', ur: 'سول' }, architectural: { en: 'Architectural', ur: 'تعمیراتی' },
  electrical: { en: 'Electrical', ur: 'برقی' }, mechanical: { en: 'Mechanical', ur: 'مکینیکل' },
  equipment: { en: 'Machinery', ur: 'مشینری' }, supply_store: { en: 'Supply Store', ur: 'سپلائی اسٹور' },
}

const TR = {
  ar: {
    title: 'أكمل ملفك', subC: 'أضف موقعك ومجالات عملك لتصلك أفضل العروض', subS: 'أضف موقعك وتخصصاتك لتظهر للمقاولين وتصلك الطلبات المطابقة',
    location: 'الموقع', region: 'المنطقة', selectRegion: '-- اختر --', city: 'المدينة', district: 'الحي',
    sectorsC: 'القطاعات التي تعمل فيها', sectorsS: 'اختر قطاعاتك ثم حدّد المواد التي توردها بالضبط',
    classTitle: 'تصنيف شركتك', classHint: 'يساعد المقاولين على إيجادك حسب حجم طلباتهم',
    manufacturer: 'مصنع / مورد رئيسي', commercial: 'مورد تجاري', local: 'مورد محلي',
    minOrder: 'الحد الأدنى لقيمة الطلب (ر.س) — اختياري', minOrderPh: 'مثال: 50000 — اتركه فارغاً لاستقبال كل الطلبات',
    gradeTitle: 'درجة تصنيف شركتك', gradeSub: 'وزارة الشؤون البلدية — اختياري',
    verifyTitle: 'وثّق نشاطك التجاري', verifyBody: 'التوثيق (السجل التجاري + المستندات) يفتح لك استقبال الطلبات وتقديم العروض المسعّرة.', verifyCta: 'انتقل للتوثيق ←',
    addMatTitle: 'تبيع مادة غير موجودة بالقائمة؟', addMatPh: 'اسم المادة...', addMatBtn: 'إضافة', remove: 'إزالة',
    save: 'حفظ ومتابعة ←', saving: 'جارٍ الحفظ...', later: 'لاحقاً', selected: 'محدد',
    needLoc: 'اختر المنطقة والمدينة', needSector: 'اختر قطاعاً واحداً على الأقل', saved: 'تم حفظ ملفك ✓',
  },
  en: {
    title: 'Complete your profile', subC: 'Add your location and work areas to get the best offers', subS: 'Add your location and specialties to appear to contractors and receive matching requests',
    location: 'Location', region: 'Region', selectRegion: '-- Select --', city: 'City', district: 'District',
    sectorsC: 'Sectors you work in', sectorsS: 'Select your sectors then pick exactly what you supply',
    classTitle: 'Company classification', classHint: 'Helps contractors find you by order size',
    manufacturer: 'Factory / Major Supplier', commercial: 'Commercial Supplier', local: 'Local Supplier',
    minOrder: 'Min order value (SAR) — optional', minOrderPh: 'e.g. 50000 — leave empty for all requests',
    gradeTitle: 'Company grade', gradeSub: 'Ministry of Municipal Affairs — optional',
    verifyTitle: 'Verify your business', verifyBody: 'Verification (CR + documents) unlocks receiving requests and submitting priced offers.', verifyCta: 'Go to verification →',
    addMatTitle: 'Selling a material not in the list?', addMatPh: 'Material name...', addMatBtn: 'Add', remove: 'Remove',
    save: 'Save & continue →', saving: 'Saving...', later: 'Later', selected: 'selected',
    needLoc: 'Select region and city', needSector: 'Select at least one sector', saved: 'Profile saved ✓',
  },
  ur: {
    title: 'اپنی پروفائل مکمل کریں', subC: 'بہترین آفرز کے لیے اپنا مقام اور کام کے شعبے شامل کریں', subS: 'ٹھیکیداروں کو نظر آنے کے لیے اپنا مقام اور مہارتیں شامل کریں',
    location: 'مقام', region: 'علاقہ', selectRegion: '-- منتخب کریں --', city: 'شہر', district: 'علاقہ',
    sectorsC: 'وہ شعبے جہاں آپ کام کرتے ہیں', sectorsS: 'اپنے شعبے منتخب کریں پھر بالکل وہی چنیں جو فراہم کرتے ہیں',
    classTitle: 'کمپنی کی درجہ بندی', classHint: 'ٹھیکیداروں کو آرڈر سائز کے مطابق تلاش میں مدد',
    manufacturer: 'فیکٹری / بڑا سپلائر', commercial: 'تجارتی سپلائر', local: 'مقامی سپلائر',
    minOrder: 'کم از کم آرڈر قیمت (ریال) — اختیاری', minOrderPh: 'مثال: 50000',
    gradeTitle: 'کمپنی کا درجہ', gradeSub: 'وزارت بلدیات — اختیاری',
    verifyTitle: 'اپنے کاروبار کی تصدیق کریں', verifyBody: 'تصدیق (CR + دستاویزات) درخواستیں وصول کرنے اور قیمت والی آفرز دینے کو کھولتی ہے۔', verifyCta: 'تصدیق پر جائیں →',
    addMatTitle: 'فہرست میں کوئی مواد نہیں؟', addMatPh: 'مواد کا نام...', addMatBtn: 'شامل کریں', remove: 'ہٹائیں',
    save: 'محفوظ کریں اور جاری رکھیں →', saving: 'محفوظ ہو رہا ہے...', later: 'بعد میں', selected: 'منتخب',
    needLoc: 'علاقہ اور شہر منتخب کریں', needSector: 'کم از کم ایک شعبہ منتخب کریں', saved: 'پروفائل محفوظ ✓',
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
      // الدور المرجعي من JWT (user_metadata) — دائم الوجود ولا يعتمد على قراءة قد تتأخّر
      // بعد التسجيل مباشرة. نستخدم قراءة الملف للتفاصيل فقط، والميتاداتا احتياطياً للدور.
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

  function toggleSector(s: string) { setSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]) }
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

      // مزامنة القطاعات: احذف الحالي ثم أدرِج المختار (RLS: profile_id = auth.uid())
      await supabase.from('profile_sectors').delete().eq('profile_id', uid)
      if (sectors.length) await supabase.from('profile_sectors').insert(sectors.map(s => ({ profile_id: uid, sector: s })))

      if (role === 'supplier') {
        await supabase.from('profile_specialties').delete().eq('profile_id', uid)
        if (specialties.length) await supabase.from('profile_specialties').insert(specialties.map(k => ({ profile_id: uid, specialty: k })))
        // مواد غير مدرجة → للمراجعة الإدارية
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

  return (
    <div className="min-h-screen bg-canvas" dir={dir}>
      <header className="bg-white/90 backdrop-blur border-b border-line sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-navy">{t.title}</h1>
          <p className="text-ink-2 mt-2 text-sm">{role === 'supplier' ? t.subS : t.subC}</p>
        </div>

        {/* ── الموقع ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-bold text-navy mb-3">📍 {t.location}</h2>
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

        {/* ── القطاعات / التخصصات ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-bold text-navy mb-1">🧩 {role === 'supplier' ? t.sectorsS : t.sectorsC}</h2>

          {/* المقاول: بطاقات قطاعات بسيطة */}
          {role !== 'supplier' && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {(Object.keys(SECTOR_LABELS) as string[]).map((sector: any) => (
                <button key={sector} type="button" onClick={() => toggleSector(sector)}
                  className={`p-4 rounded-xl border-2 transition-all ${sectors.includes(sector) ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-[#F5831F]/40'}`}
                  style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                  <div className="font-semibold text-sm text-navy">{sl(sector)}</div>
                </button>
              ))}
            </div>
          )}

          {/* المورّد: أكورديون قطاع → تخصصاته + مواد إضافية */}
          {role === 'supplier' && (
            <div className="space-y-2 mt-4">
              {(Object.keys(SECTOR_LABELS) as string[]).map((sector: any) => {
                const selected = sectors.includes(sector)
                const isOpen = openSector === sector
                const subs = (SUB_CATEGORIES as any)[sector] || {}
                const subKeys = Object.keys(subs)
                const selCount = specialties.filter(s => subKeys.includes(s)).length
                const color = SECTOR_COLORS[sector]
                const sectorMats = extraMaterials.filter(m => m.sector === sector)
                const groups: Record<string, string[]> = {}
                Object.entries(subs).forEach(([key, sub]: any) => { (groups[sub.group] = groups[sub.group] || []).push(key) })
                return (
                  <div key={sector} className={`rounded-xl border-2 overflow-hidden transition-all ${selected ? 'border-[#F5831F]' : 'border-gray-200'}`}>
                    <div onClick={() => { if (!selected) toggleSector(sector); setOpenSector(isOpen ? null : sector) }}
                      className={`w-full flex items-center justify-between p-3.5 cursor-pointer ${selected ? 'bg-[#F5831F]/5' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: selected ? color : '#374151' }}>{sl(sector)}</span>
                        {selCount > 0 && <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: color }}>{selCount}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {selected && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setSpecialties(prev => prev.filter(s => !subKeys.includes(s))); setExtraMaterials(prev => prev.filter(m => m.sector !== sector)); toggleSector(sector); if (isOpen) setOpenSector(null) }}
                            className="text-[11px] text-red-400 hover:text-red-600">{t.remove}</button>
                        )}
                        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="p-3 border-t border-gray-100 bg-white">
                        {sortGroupKeys(Object.keys(groups)).map((groupKey: any) => {
                          const keys = groups[groupKey]
                          const grp = (GROUP_LABELS as any)[groupKey]
                          const grpLabel = grp ? (locale === 'en' ? grp.en : locale === 'ur' ? grp.ur : grp.ar) : groupKey
                          const selInGroup = keys.filter((k: any) => specialties.includes(k)).length
                          return (
                            <div key={groupKey} className="mb-3 bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                              <div className="flex items-center gap-2 mb-2.5">
                                <span className="w-[18px] h-[18px] grid place-items-center shrink-0" style={{ color }}><CatIcon k={groupKey} className="w-[18px] h-[18px]" /></span>
                                <span className="text-sm font-bold text-gray-700">{grpLabel}</span>
                                {selInGroup > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{selInGroup}</span>}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {keys.map((key: any) => {
                                  const sub = subs[key]
                                  const active = specialties.includes(key)
                                  const subLabel = locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
                                  return (
                                    <button key={key} type="button" onClick={() => toggleSpecialty(key)}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all bg-white ${active ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                                      style={{ textAlign: dir === 'rtl' ? 'right' : 'left', ...(active ? { borderColor: color, background: color + '0d' } : {}) }}>
                                      <span className="text-lg">{sub.icon}</span>
                                      <span className="text-xs font-semibold flex-1 leading-tight" style={active ? { color } : { color: '#374151' }}>{subLabel}</span>
                                      {active && <span style={{ color }}>✓</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
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
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── تصنيف المورّد ── */}
        {role === 'supplier' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-navy mb-1">🏭 {t.classTitle}</h2>
            <p className="text-xs text-gray-500 mb-3">{t.classHint}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[{ key: 'manufacturer', label: t.manufacturer }, { key: 'commercial', label: t.commercial }, { key: 'local', label: t.local }].map((tier: any) => (
                <button key={tier.key} type="button" onClick={() => setSupplierTier(tier.key)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${supplierTier === tier.key ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`text-xs font-bold ${supplierTier === tier.key ? 'text-[#F5831F]' : 'text-gray-700'}`}>{tier.label}</div>
                </button>
              ))}
            </div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t.minOrder}</label>
            <input type="number" value={minOrderValue} onChange={(e: any) => setMinOrderValue(e.target.value)} className="input-field" placeholder={t.minOrderPh} min="0" />
          </div>
        )}

        {/* ── درجة المقاول ── */}
        {role === 'contractor' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-navy mb-1">🏅 {t.gradeTitle}</h2>
            <p className="text-xs text-gray-500 mb-3">{t.gradeSub}</p>
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

        {/* ── التوثيق (للمورّد) — الرابط للإعدادات ── */}
        {role === 'supplier' && (
          <div className="rounded-2xl p-5 mb-4 border-2 border-dashed" style={{ borderColor: '#F5831F55', background: '#F5831F08' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div className="flex-1">
                <div className="font-bold text-navy text-sm">{t.verifyTitle}</div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.verifyBody}</p>
                <a href="/settings" className="inline-block mt-2 text-xs font-bold text-orange-dark hover:underline">{t.verifyCta}</a>
              </div>
            </div>
          </div>
        )}

        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{err}</div>}

        <div className="flex gap-3">
          <a href={roleHome} className="btn-ghost flex-1 text-center">{t.later}</a>
          <button type="button" onClick={save} disabled={saving} className="btn-orange flex-1 disabled:opacity-50">{saving ? t.saving : t.save}</button>
        </div>
      </div>
    </div>
  )
}
