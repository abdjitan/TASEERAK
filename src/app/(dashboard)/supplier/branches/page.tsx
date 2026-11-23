'use client'

import { useState, useEffect } from 'react'
import { toLocalSa, toLatinDigits } from '@/lib/phone'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { REGIONS, CITIES_BY_REGION, getRegionLabel } from '@/types'
import DistrictField from '@/components/shared/DistrictField'
import Glyph from '@/components/shared/Glyph'
import { askConfirm } from '@/lib/askConfirm'
import LocationPicker from '@/components/shared/LocationPicker'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import LoadError from '@/components/shared/LoadError'
import { nearestSaCity } from '@/lib/saCityCoords'

export default function SupplierBranchesPage() {
  const { dir, locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [user, setUser] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  // a company team member sees the company's branches; only the owner can change them (RLS)
  const [readOnly, setReadOnly] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [loadFailed, setLoadFailed] = useState(false) // UX-137: a failed load is said, never «no branches»
  // UX-137: city names in the reader's language
  // round-5 UX-166: Urdu reads the Urdu name when there is one
  const cityName = (x: any): string => (locale === 'ar' ? x.ar : locale === 'ur' ? (x.ur || x.en) : x.en)
  const cityLabel = (reg: string, c: string) => { if (!c || locale === 'ar') return c; const hit = (CITIES_BY_REGION[reg] || []).find((x: any) => x.ar === c); return hit ? cityName(hit) : c }

  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  // UX-122: the branch pin (routing counts a branch as «near» only with coordinates), editing, and the main location
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [mainLoc, setMainLoc] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data: actRaw } = await supabase.rpc('acting_uid')
    const actId: string = (actRaw as any) || session.user.id
    setReadOnly(actId !== session.user.id)
    const [{ data, error: bErr }, { data: me }] = await Promise.all([
      supabase.from('branches').select('*').eq('supplier_id', actId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('region, city, district, latitude, longitude').eq('id', actId).maybeSingle(),
    ])
    setLoadFailed(!!bErr)
    if (!bErr) setBranches(data || [])
    setMainLoc(me || null)
    setLoading(false)
  }

  function reset() { setName(''); setRegion(''); setCity(''); setDistrict(''); setPhone(''); setAddress(''); setLat(null); setLng(null); setEditId(null); setShowForm(false) }
  function startEdit(b: any) {
    setEditId(b.id); setName(b.name || ''); setRegion(b.region || ''); setCity(b.city || ''); setDistrict(b.district || '')
    setPhone(b.phone || ''); setAddress(b.address || ''); setLat(b.latitude ?? null); setLng(b.longitude ?? null); setShowForm(true); setErr('')
    setTimeout(() => document.getElementById('branch-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function save(e: any) {
    e.preventDefault()
    if (!name.trim()) { setErr(L('Write the branch name.', 'شاخ کا نام لکھیں۔', 'اكتب اسم الفرع.')); return }
    if (!region) { setErr(L('Choose the branch region.', 'شاخ کا علاقہ منتخب کریں۔', 'اختر منطقة الفرع.')); return }
    if (lat == null || lng == null) { setErr(L('Set the branch location on the map, so requests near it reach you.', 'شاخ کا مقام نقشے پر مقرر کریں تاکہ اس کے قریب کی درخواستیں آپ تک پہنچیں۔', 'حدّد موقع الفرع على الخريطة لتصلك الطلبات القريبة منه.')); return }
    // round-4 UX-141: the branch mobile is normalised and checked (05XXXXXXXX)
    const ph = phone.trim() ? toLocalSa(phone) : null
    if (phone.trim() && !ph) { setErr(L('Mobile number: 10 digits starting with 05.', 'موبائل نمبر: 05 سے شروع ہونے والے 10 ہندسے۔', 'رقم الجوال: 10 أرقام يبدأ بـ05.')); document.getElementById('br-phone')?.focus(); return }
    setSaving(true); setErr('')
    const supabase = createClient()
    const row = { name, region, city: city || null, district: district || null, phone: ph, address: address || null, latitude: lat, longitude: lng }
    const { error } = editId
      ? await supabase.from('branches').update(row).eq('id', editId)
      : await supabase.from('branches').insert({ supplier_id: user.id, ...row })
    setSaving(false)
    // keep what was typed when the save fails
    if (error) { setErr(L('Could not save the branch — please try again.', 'شاخ محفوظ نہیں ہو سکی — دوبارہ کوشش کریں۔', 'تعذّر حفظ الفرع. تحقّق من اتصالك وحاول مرة أخرى.')); return }
    toast.success(L('Branch saved', 'شاخ محفوظ ہو گئی', 'حُفظ الفرع'))
    reset(); load()
  }

  async function remove(id: any) {
    if (!(await askConfirm(L('Delete this branch? Requests from its region will no longer reach you through it.', 'یہ شاخ حذف کریں؟ اس کے علاقے کی درخواستیں اس کے ذریعے نہیں آئیں گی۔', 'حذف هذا الفرع؟ لن تصلك طلبات منطقته عن طريقه.'), { danger: true, okLabel: L('Yes, delete', 'ہاں، حذف کریں', 'نعم، احذف'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) { setErr(L('Could not delete the branch — please try again.', 'شاخ حذف نہیں ہو سکی — دوبارہ کوشش کریں۔', 'تعذّر حذف الفرع. تحقّق من اتصالك وحاول مرة أخرى.')); return }
    toast.success(L('Branch deleted', 'شاخ حذف ہو گئی', 'حُذف الفرع')) // round-5 UX-166
    load()
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title={L('Company branches', 'کمپنی کی شاخیں', 'فروع الشركة')} nav={getNav('supplier', locale, '/supplier/branches')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-[#F5C55B]" style={{ background: '#0B2438' }}><Glyph e="🏢" /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{L('Company branches', 'کمپنی کی شاخیں', 'فروع الشركة')}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{readOnly ? L('Your company appears to buyers in every region where it has a branch.', 'آپ کی کمپنی ہر اس علاقے کے خریداروں کو نظر آتی ہے جہاں اس کی شاخ ہے۔', 'تظهر شركتك للمشترين في كل منطقة لها فيها فرع.') : L('Add your branches in different regions — buyers in every region with a branch will see your company.', 'مختلف علاقوں میں اپنی شاخیں شامل کریں — ہر اس علاقے کے خریدار آپ کی کمپنی دیکھیں گے جہاں شاخ ہے۔', 'أضف فروعك في المناطق المختلفة — تظهر شركتك للمشترين في كل منطقة فيها فرع.')}</p>
            </div>
          </div>
        </div>

        {/* round-5 UX-105: the example is advice for the owner, not for a team member */}
        {!readOnly && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-[#6C531F]">
          <Glyph e="💡" /> {L('Example: with branches in Riyadh, Jeddah and Dammam, add all three — you will receive price requests from buyers in all of them.', 'مثال: اگر ریاض، جدہ اور دمام میں شاخیں ہیں تو تینوں شامل کریں — ان سب علاقوں کے خریداروں کی درخواستیں آپ کو ملیں گی۔', 'مثال: إذا كانت لديك فروع في الرياض وجدة والدمام، فأضف الثلاثة — وستصلك طلبات التسعير من المشترين في جميع هذه المناطق.')}
        </div>}

        {/* UX-122: the main location (from the profile) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-gray-600">{L('Main location', 'مرکزی مقام', 'الموقع الرئيسي')}</div>
            <div className="font-bold text-[#0B2438] mt-0.5">{mainLoc?.region ? <><Glyph e="📍" /> {getRegionLabel(mainLoc.region, locale)}{mainLoc.city ? ' - ' + cityLabel(mainLoc.region, mainLoc.city) : ''}{mainLoc.district ? ' - ' + mainLoc.district : ''}</> : L('Not set yet', 'ابھی مقرر نہیں', 'لم يُحدَّد بعد')}</div>
            {mainLoc && !mainLoc.latitude && <div className="text-[13px] text-amber-800 mt-0.5">{L('No map pin yet.', 'ابھی نقشے پر نشان نہیں۔', 'لم تحدّد موقعك على الخريطة بعد.')}</div>}
          </div>
          {!readOnly && <a href="/location" className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-[#0B2438] border border-[#0B2438]/30 shrink-0">{L('Edit', 'ترمیم', 'تعديل')}</a>}
        </div>

        {err && <div role="alert" className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">{err}</div>}
        {readOnly && (
          <p className="mb-5 text-xs rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-gray-600">{L('These are your company\'s branches. The account owner adds and edits them.', 'یہ آپ کی کمپنی کی شاخیں ہیں۔ اکاؤنٹ کا مالک انہیں شامل اور تبدیل کرتا ہے۔', 'هذه فروع شركتك. يضيفها ويعدّلها صاحب الحساب.')}</p>
        )}
        {!showForm && !readOnly && (
          <button onClick={() => { reset(); setShowForm(true) }} className="w-full mb-5 min-h-[44px] py-3 rounded-xl font-extrabold text-[#071827] text-sm transition-all hover:shadow-lg" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            + {L('Add a branch', 'شاخ شامل کریں', 'إضافة فرع')}
          </button>
        )}

        {showForm && (
          <form id="branch-form" onSubmit={save} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 animate-fade-in scroll-mt-24">
            <h2 className="font-bold text-[#0B2438] mb-3">{editId ? L('Edit branch', 'شاخ میں ترمیم', 'تعديل الفرع') : L('New branch', 'نئی شاخ', 'فرع جديد')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label htmlFor="br-name" className="block text-xs font-bold text-gray-600 mb-1">{L('Branch name', 'شاخ کا نام', 'اسم الفرع')} *</label>
                <input id="br-name" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder={L('Riyadh branch - Olaya', 'ریاض شاخ - العلیا', 'فرع الرياض - العليا')} required />
              </div>
              <div>
                <label htmlFor="br-region" className="block text-xs font-bold text-gray-600 mb-1">{L('Region', 'علاقہ', 'المنطقة')} *</label>
                <select id="br-region" value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field" required>
                  <option value="">{L('-- Choose --', '-- منتخب کریں --', '-- اختر --')}</option>
                  {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="br-city" className="block text-xs font-bold text-gray-600 mb-1">{L('City', 'شہر', 'المدينة')}</label>
                <select id="br-city" value={city} onChange={e => setCity(e.target.value)} className="input-field" disabled={!region}>
                  <option value="">{region ? L('-- Choose --', '-- منتخب کریں --', '-- اختر --') : '—'}</option>
                  {(CITIES_BY_REGION[region] || []).map(c => <option key={c.ar} value={c.ar}>{cityName(c)}</option>)}
                </select>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 mb-1">{L('District', 'محلہ', 'الحي')}</span>
                <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} />
              </div>
              <div>
                <label htmlFor="br-phone" className="block text-xs font-bold text-gray-600 mb-1">{L('Branch mobile (optional)', 'شاخ کا موبائل (اختیاری)', 'جوال الفرع (اختياري)')}</label>
                <input id="br-phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(toLatinDigits(e.target.value).replace(/[^0-9+ ]/g, '').slice(0, 16))} className="input-field" placeholder="05XXXXXXXX" dir="ltr" maxLength={16} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="br-address" className="block text-xs font-bold text-gray-600 mb-1">{L('Address (optional)', 'پتہ (اختیاری)', 'العنوان (اختياري)')}</label>
                <input id="br-address" value={address} onChange={e => setAddress(e.target.value)} className="input-field" placeholder={L('Street, building no…', 'گلی، عمارت نمبر…', 'الشارع، رقم المبنى...')} />
              </div>
              <div className="sm:col-span-2">
                <div className="block text-xs font-bold text-gray-600 mb-1">{L('Branch location on the map', 'نقشے پر شاخ کا مقام', 'موقع الفرع على الخريطة')} *</div>
                <LocationPicker lat={lat} lng={lng} onChange={(a: number, b: number) => { setLat(a); setLng(b); setErr(''); const near = nearestSaCity(a, b); if (near) { if (near.city !== city) { const shown = cityLabel(near.region, near.city); toast(L(`We updated the city to ${shown} from the pin`, `پن کے مقام کے مطابق شہر ${shown} کر دیا گیا`, `حدّثنا المدينة إلى ${shown} حسب موقع الدبوس`)) } setRegion(near.region); setCity(near.city) } }} locale={locale} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 min-h-[44px] py-2.5 rounded-xl font-extrabold text-[#071827] text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {saving ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ...') : L('Save branch', 'شاخ محفوظ کریں', 'حفظ الفرع')}
              </button>
              <button type="button" onClick={reset} aria-label={L('Close without saving', 'محفوظ کیے بغیر بند کریں', 'إغلاق دون حفظ')} className="min-h-[44px] px-5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600"><X className="w-4 h-4" aria-hidden /></button>
            </div>
          </form>
        )}

        {loadFailed && <LoadError onRetry={() => { setLoading(true); load() }} className="mb-5" />}
        {loadFailed && branches.length === 0 ? null : branches.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-100 text-center">
            <div className="text-5xl mb-3 animate-float"><Glyph e="🏢" /></div>
            {readOnly ? (
              <h3 className="font-bold mb-1" style={{ color: '#0B2438' }}>{L('Your company has not added branches yet.', 'آپ کی کمپنی نے ابھی شاخیں شامل نہیں کیں۔', 'لم تُضف شركتك فروعاً بعد.')}</h3>
            ) : (<>
              <h3 className="font-bold mb-1" style={{ color: '#0B2438' }}>{L('You have not added other branches yet', 'آپ نے ابھی دوسری شاخیں شامل نہیں کیں', 'لم تُضف فروعاً أخرى بعد')}</h3>
              <p className="text-sm text-gray-500">{L('Add your branches to receive price requests from their regions.', 'اپنی شاخیں شامل کریں تاکہ ان علاقوں کی درخواستیں آپ کو ملیں۔', 'أضف فروعك لتصلك طلبات التسعير من مناطقها.')}</p>
            </>)}
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>{L('Branches', 'شاخیں', 'الفروع')} <span className="ms-1 inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-[#0B2438]/10 text-[12px]">{branches.length}</span></h2>
            {branches.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold" style={{ color: '#0B2438' }}>{b.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                    <span className="badge text-[12px] bg-[#0B2438]/5 text-[#0B2438]"><Glyph e="📍" /> {getRegionLabel(b.region, locale)}{b.city ? ' - ' + cityLabel(b.region, b.city) : ''}</span>
                    {b.latitude == null && <span className="text-amber-800 font-semibold">{L('No map pin', 'نقشے پر نشان نہیں', 'بلا موقع على الخريطة')}</span>}
                    {b.district && <span><Glyph e="🏘" /> {b.district}</span>}
                    {b.phone && <span dir="ltr"><Glyph e="📞" /> {b.phone}</span>}
                  </div>
                  {b.address && <div className="text-[12px] text-gray-500 mt-1">{b.address}</div>}
                </div>
                {!readOnly && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(b)} className="min-h-[44px] px-3 rounded-lg text-sm font-semibold border border-[#0B2438]/30 text-[#0B2438]">{L('Edit', 'ترمیم', 'تعديل')}</button>
                    <button onClick={() => remove(b.id)} aria-label={L(`Delete branch ${b.name}`, `شاخ ${b.name} حذف کریں`, `حذف الفرع ${b.name}`)} className="min-h-[44px] w-11 grid place-items-center rounded-lg text-sm border border-red-200 text-red-500 hover:bg-red-50"><Glyph e="🗑" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
