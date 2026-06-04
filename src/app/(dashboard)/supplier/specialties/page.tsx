// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS, SUB_CATEGORIES, GROUP_LABELS } from '@/types'

const SECTOR_ICONS = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️', equipment: '🔧' }
const SECTOR_COLORS = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#F5831F', mechanical: '#0F6E56', equipment: '#6b5b4f' }

const txt = {
  ar: {
    title: 'تخصصاتي الدقيقة', sub: 'اختر المواد التي تتعامل بها بالضبط — ستصلك الطلبات المطابقة فقط',
    back: '← رجوع', save: 'حفظ التخصصات', saving: 'جارٍ الحفظ...', saved: '✓ تم الحفظ بنجاح',
    selectSectors: 'أولاً، اختر القطاعات الرئيسية', thenSpecialties: 'ثم اختر تخصصاتك الدقيقة',
    selected: 'تخصص محدد', noSectors: 'اختر قطاعاً واحداً على الأقل من الأعلى لعرض التخصصات',
    hint: '💡 كلما حددت تخصصك بدقة، وصلتك طلبات أكثر صلة بعملك',
    loading: 'جارٍ التحميل...',
  },
  en: {
    title: 'My Specialties', sub: 'Select exactly what you supply — you only get matching requests',
    back: '← Back', save: 'Save Specialties', saving: 'Saving...', saved: '✓ Saved successfully',
    selectSectors: 'First, select main sectors', thenSpecialties: 'Then pick your exact specialties',
    selected: 'selected', noSectors: 'Select at least one sector above to show specialties',
    hint: '💡 The more precise your specialties, the more relevant requests you receive',
    loading: 'Loading...',
  },
  ur: {
    title: 'میری مہارتیں', sub: 'بالکل وہی منتخب کریں جو آپ فراہم کرتے ہیں',
    back: '← واپس', save: 'محفوظ کریں', saving: 'محفوظ ہو رہا ہے...', saved: '✓ محفوظ ہو گیا',
    selectSectors: 'پہلے، اہم شعبے منتخب کریں', thenSpecialties: 'پھر اپنی مہارتیں منتخب کریں',
    selected: 'منتخب', noSectors: 'مہارتیں دکھانے کے لیے کم از کم ایک شعبہ منتخب کریں',
    hint: '💡 جتنی درست مہارت، اتنی متعلقہ درخواستیں',
    loading: 'لوڈ ہو رہا ہے...',
  },
}

export default function SpecialtiesPage() {
  const { locale, dir } = useTranslation()
  const T = txt[locale] || txt.ar

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [mySectors, setMySectors] = useState([])
  const [mySpecialties, setMySpecialties] = useState([])

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

      setLoading(false)
    }
    load()
  }, [])

  function toggleSector(sector) {
    setMySectors(prev => {
      if (prev.includes(sector)) {
        // إزالة القطاع + تخصصاته الفرعية
        const subKeys = Object.keys(SUB_CATEGORIES[sector] || {})
        setMySpecialties(s => s.filter(sp => !subKeys.includes(sp)))
        return prev.filter(x => x !== sector)
      }
      return [...prev, sector]
    })
  }

  function toggleSpecialty(key) {
    setMySpecialties(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const supabase = createClient()

    // حفظ القطاعات
    await supabase.from('profile_sectors').delete().eq('profile_id', user.id)
    if (mySectors.length > 0) {
      await supabase.from('profile_sectors').insert(mySectors.map(s => ({ profile_id: user.id, sector: s })))
    }

    // حفظ التخصصات الفرعية
    await supabase.from('profile_specialties').delete().eq('profile_id', user.id)
    if (mySpecialties.length > 0) {
      await supabase.from('profile_specialties').insert(mySpecialties.map(s => ({ profile_id: user.id, specialty: s })))
    }

    setSaving(false)
    setMsg(T.saved)
    setTimeout(() => { window.location.href = '/supplier/dashboard' }, 1200)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>{T.loading}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/supplier/dashboard" className="text-xs text-gray-400 hover:text-gray-600">{T.back}</a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>{T.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{T.sub}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700">{T.hint}</div>

        {/* Step 1: Sectors */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-4 text-sm" style={{ color: '#1B2D5B' }}>{T.selectSectors}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.keys(SECTOR_LABELS).map(s => (
              <button key={s} onClick={() => toggleSector(s)}
                className={`p-4 rounded-xl border-2 text-center transition-all hover:-translate-y-0.5 ${
                  mySectors.includes(s) ? 'border-current' : 'border-gray-200'
                }`}
                style={mySectors.includes(s) ? { borderColor: SECTOR_COLORS[s], background: SECTOR_COLORS[s] + '0d' } : {}}>
                <div className="text-2xl mb-1">{SECTOR_ICONS[s]}</div>
                <div className="text-sm font-semibold" style={{ color: mySectors.includes(s) ? SECTOR_COLORS[s] : '#374151' }}>
                  {SECTOR_LABELS[s]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Sub-categories per selected sector */}
        {mySectors.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-400 text-sm">
            {T.noSectors}
          </div>
        ) : (
          <div className="space-y-4">
            {mySectors.map(sector => {
              const subs = SUB_CATEGORIES[sector] || {}
              const selectedInSector = Object.keys(subs).filter(k => mySpecialties.includes(k)).length
              // تجميع التخصصات تحت مجموعاتها
              const groups: Record<string, string[]> = {}
              Object.entries(subs).forEach(([key, sub]) => {
                if (!groups[sub.group]) groups[sub.group] = []
                groups[sub.group].push(key)
              })
              return (
                <div key={sector} className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2" style={{ color: SECTOR_COLORS[sector] }}>
                      <span className="text-xl">{SECTOR_ICONS[sector]}</span>
                      {SECTOR_LABELS[sector]}
                    </h3>
                    <span className="text-xs text-gray-400">{selectedInSector} {T.selected}</span>
                  </div>

                  {/* المجموعات (المستوى الثاني) */}
                  <div className="space-y-4">
                    {Object.entries(groups).map(([groupKey, keys]) => {
                      const grp = GROUP_LABELS[groupKey]
                      const selectedInGroup = keys.filter(k => mySpecialties.includes(k)).length
                      return (
                        <div key={groupKey} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                          {/* عنوان المجموعة */}
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-base">{grp?.icon}</span>
                            <span className="text-sm font-bold text-gray-700">
                              {grp ? (locale === 'en' ? grp.en : locale === 'ur' ? grp.ur : grp.ar) : groupKey}
                            </span>
                            {selectedInGroup > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: SECTOR_COLORS[sector] }}>
                                {selectedInGroup}
                              </span>
                            )}
                          </div>
                          {/* التخصصات الدقيقة (المستوى الثالث) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {keys.map(key => {
                              const sub = subs[key]
                              return (
                                <button key={key} onClick={() => toggleSpecialty(key)}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-right transition-all bg-white ${
                                    mySpecialties.includes(key) ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                  style={mySpecialties.includes(key) ? { borderColor: SECTOR_COLORS[sector], background: SECTOR_COLORS[sector] + '0d' } : {}}>
                                  <span className="text-lg">{sub.icon}</span>
                                  <span className={`text-xs font-semibold flex-1 leading-tight ${mySpecialties.includes(key) ? '' : 'text-gray-700'}`}
                                    style={mySpecialties.includes(key) ? { color: SECTOR_COLORS[sector] } : {}}>
                                    {locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar}
                                  </span>
                                  {mySpecialties.includes(key) && <span style={{ color: SECTOR_COLORS[sector] }}>✓</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
    </div>
  )
}
