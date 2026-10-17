'use client'

import { useState, useEffect } from 'react'
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

  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data: actRaw } = await supabase.rpc('acting_uid')
    const actId: string = (actRaw as any) || session.user.id
    setReadOnly(actId !== session.user.id)
    const { data } = await supabase.from('branches').select('*').eq('supplier_id', actId).order('created_at', { ascending: false })
    setBranches(data || [])
    setLoading(false)
  }

  function reset() { setName(''); setRegion(''); setCity(''); setDistrict(''); setPhone(''); setAddress(''); setShowForm(false) }

  async function save(e: any) {
    e.preventDefault()
    if (!name || !region) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('branches').insert({
      supplier_id: user.id, name, region, city: city || null, district: district || null,
      phone: phone || null, address: address || null,
    })
    setSaving(false); reset(); load()
  }

  async function remove(id: any) {
    if (!confirm(L('Delete this branch?', 'یہ شاخ حذف کریں؟', 'حذف هذا الفرع؟'))) return
    const supabase = createClient()
    await supabase.from('branches').delete().eq('id', id)
    load()
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title={L('Company branches', 'کمپنی کی شاخیں', 'فروع الشركة')} nav={getNav('supplier', locale, '/supplier/branches')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#0B2438' }}><Glyph e="🏢" /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#0B2438' }}>{L('Company branches', 'کمپنی کی شاخیں', 'فروع الشركة')}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{L('Add your branches in different regions — buyers in every region with a branch will see your company.', 'مختلف علاقوں میں اپنی شاخیں شامل کریں — ہر اس علاقے کے خریدار آپ کی کمپنی دیکھیں گے جہاں شاخ ہے۔', 'أضف فروعك في المناطق المختلفة — تظهر شركتك للمشترين في كل منطقة فيها فرع.')}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700">
          <Glyph e="💡" /> {L('Example: with branches in Riyadh, Jeddah and Dammam, add all three — you will receive price requests from buyers in all of them.', 'مثال: اگر ریاض، جدہ اور دمام میں شاخیں ہیں تو تینوں شامل کریں — ان سب علاقوں کے خریداروں کی درخواستیں آپ کو ملیں گی۔', 'مثال: إذا كانت لديك فروع في الرياض وجدة والدمام، فأضف الثلاثة — وستصلك طلبات التسعير من المشترين في جميع هذه المناطق.')}
        </div>

        {readOnly && (
          <p className="mb-5 text-xs rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-gray-600">{L('These are your company\'s branches. The account owner adds and edits them.', 'یہ آپ کی کمپنی کی شاخیں ہیں۔ اکاؤنٹ کا مالک انہیں شامل اور تبدیل کرتا ہے۔', 'هذه فروع شركتك. يضيفها ويعدّلها مالك الحساب.')}</p>
        )}
        {!showForm && !readOnly && (
          <button onClick={() => setShowForm(true)} className="w-full mb-5 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:shadow-lg" style={{ background: '#0B2438' }}>
            + {L('Add a branch', 'شاخ شامل کریں', 'إضافة فرع')}
          </button>
        )}

        {showForm && (
          <form onSubmit={save} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">{L('Branch name', 'شاخ کا نام', 'اسم الفرع')} *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder={L('Riyadh branch - Olaya', 'ریاض شاخ - العلیا', 'فرع الرياض - العليا')} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{L('Region', 'علاقہ', 'المنطقة')} *</label>
                <select value={region} onChange={e => { setRegion(e.target.value); setCity('') }} className="input-field" required>
                  <option value="">{L('-- Choose --', '-- منتخب کریں --', '-- اختر --')}</option>
                  {REGIONS.map(r => <option key={r} value={r}>{getRegionLabel(r, locale)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{L('City', 'شہر', 'المدينة')}</label>
                <select value={city} onChange={e => setCity(e.target.value)} className="input-field" disabled={!region}>
                  <option value="">{region ? L('-- Choose --', '-- منتخب کریں --', '-- اختر --') : '—'}</option>
                  {(CITIES_BY_REGION[region] || []).map(c => <option key={c.ar} value={c.ar}>{locale === 'ar' ? c.ar : c.en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{L('District', 'محلہ', 'الحي')}</label>
                <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{L('Branch mobile', 'شاخ کا موبائل', 'جوال الفرع')}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="05XXXXXXXX" dir="ltr" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">{L('Address (optional)', 'پتہ (اختیاری)', 'العنوان (اختياري)')}</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="input-field" placeholder={L('Street, building no…', 'گلی، عمارت نمبر…', 'الشارع، رقم المبنى...')} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl font-semibold text-[#071827] text-sm disabled:opacity-50" style={{ background: '#D4A543' }}>
                {saving ? L('Saving…', 'محفوظ ہو رہا ہے…', 'جارٍ الحفظ...') : L('Save branch', 'شاخ محفوظ کریں', 'حفظ الفرع')}
              </button>
              <button type="button" onClick={reset} className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600">✕</button>
            </div>
          </form>
        )}

        {branches.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="text-5xl mb-3 animate-float"><Glyph e="🏢" /></div>
            <h3 className="font-bold mb-1" style={{ color: '#0B2438' }}>{L('No branches yet', 'ابھی کوئی شاخ نہیں', 'لا توجد فروع مضافة')}</h3>
            <p className="text-sm text-gray-500">{L('Add your branches to receive price requests from their regions.', 'اپنی شاخیں شامل کریں تاکہ ان علاقوں کی درخواستیں آپ کو ملیں۔', 'أضف فروعك لتصلك طلبات التسعير من مناطقها.')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>{L('Branches', 'شاخیں', 'الفروع')} ({branches.length})</h2>
            {branches.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold" style={{ color: '#0B2438' }}>{b.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                    <span className="badge badge-blue text-[10px]"><Glyph e="📍" /> {getRegionLabel(b.region, locale)}{b.city ? ' - ' + b.city : ''}</span>
                    {b.district && <span><Glyph e="🏘" /> {b.district}</span>}
                    {b.phone && <span dir="ltr"><Glyph e="📞" /> {b.phone}</span>}
                  </div>
                  {b.address && <div className="text-[11px] text-gray-400 mt-1">{b.address}</div>}
                </div>
                {!readOnly && <button onClick={() => remove(b.id)} className="px-3 py-2 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0"><Glyph e="🗑" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
