// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS, SECTOR_PRODUCTS, UNIT_OPTIONS, REGIONS } from '@/types'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

export default function NewRFQPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sector, setSector] = useState('')
  const [productName, setProductName] = useState('')
  const [specification, setSpecification] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [deliveryRequired, setDeliveryRequired] = useState(true)
  const [vatRequired, setVatRequired] = useState(true)
  const [hideIdentity, setHideIdentity] = useState(false)
  const [notes, setNotes] = useState('')
  const [validityHours, setValidityHours] = useState(48)
  const [specFile, setSpecFile] = useState(null)
  const [specFileUrl, setSpecFileUrl] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user || !sector) return
    setLoading(true); setError('')
    const supabase = createClient()
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString()

    // Upload spec file if exists
    let uploadedSpecUrl = null
    if (specFile) {
      const ext = specFile.name.split('.').pop()
      const path = `${user.id}/spec-${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('licenses').upload(path, specFile, { upsert: true })
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(uploadData.path)
        uploadedSpecUrl = publicUrl
      }
    }

    const { error: insertError } = await supabase.from('rfqs').insert({
      contractor_id: user.id, sector, product_name: productName,
      specification: specification || null, quantity: parseFloat(quantity), unit, region,
      city: city || null, delivery_required: deliveryRequired, vat_invoice_required: vatRequired,
      hide_identity: hideIdentity,
      notes: uploadedSpecUrl ? `${notes || ''}\n[مواصفات مرفقة: ${uploadedSpecUrl}]` : notes || null,
      expires_at: expiresAt,
    })
    if (insertError) { setError(`خطأ: ${insertError.message}`); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f6f9' }} dir="rtl">
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6" style={{ background: '#1B2D5B' }}>✅</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#1B2D5B' }}>تم إرسال طلب التسعير</h2>
          <p className="text-gray-500 mb-8">سيتم إخطار الموردين في قطاعك فوراً</p>
          <div className="flex gap-3">
            <a href="/contractor" className="flex-1 py-3 rounded-xl font-semibold text-white text-center" style={{ background: '#1B2D5B' }}>لوحة التحكم</a>
            <button onClick={() => { setSuccess(false); setSector(''); setProductName(''); setQuantity(''); setUnit(''); setRegion(''); setCity(''); setNotes(''); setSpecification('') }}
              className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
              طلب آخر
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sectorIcons = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️' }

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#f4f6f9' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />

      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/contractor" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">← رجوع للوحة التحكم</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>طلب تسعير جديد</h1>
          <p className="text-gray-500 mt-1 text-sm">سيُرسل تلقائياً لجميع الموردين المعتمدين في المنطقة</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-5">

              {/* Sector */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>القطاع *</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(SECTOR_LABELS).map(s => (
                    <button key={s} type="button" onClick={() => { setSector(s); setProductName('') }}
                      className={`p-4 rounded-xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5 ${
                        sector === s ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="text-2xl mb-1">{sectorIcons[s]}</div>
                      <div className={`text-sm font-semibold ${sector === s ? 'text-[#F5831F]' : 'text-gray-700'}`}>{SECTOR_LABELS[s]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product */}
              {sector && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in">
                  <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>المادة / المنتج *</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {SECTOR_PRODUCTS[sector]?.map(p => (
                      <button key={p} type="button" onClick={() => setProductName(p)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                          productName === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`} style={productName === p ? { background: '#1B2D5B' } : {}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                    className="input-field" placeholder="أو اكتب اسم المادة" required />
                </div>
              )}

              {/* Quantity, Unit, Spec */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>الكمية والمواصفات *</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">الكمية</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                      className="input-field" placeholder="مثال: 50" required min="0" step="any" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">وحدة القياس</label>
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field" required>
                      <option value="">اختر الوحدة</option>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">المواصفة / القياس</label>
                  <input type="text" value={specification} onChange={e => setSpecification(e.target.value)}
                    className="input-field" placeholder="مثال: قطر 16mm، جهد 450V، درجة B500" />
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>موقع التسليم *</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">المنطقة</label>
                    <select value={region} onChange={e => setRegion(e.target.value)} className="input-field" required>
                      <option value="">اختر المنطقة</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">المدينة (اختياري)</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      className="input-field" placeholder="اسم المدينة" />
                  </div>
                </div>
              </div>

              {/* Spec File Upload */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>رفع ملف المواصفات</h3>
                <p className="text-xs text-gray-400 mb-4">ارفع جدول الكميات أو المواصفات التقنية — سيصل للموردين مع الطلب</p>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                  specFile ? 'border-[#1B2D5B] bg-[#1B2D5B]/5' : 'border-gray-200 hover:border-[#F5831F]/50'
                }`}>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                    onChange={e => setSpecFile(e.target.files?.[0] ?? null)} />
                  {specFile ? (
                    <div className="text-center">
                      <div className="text-3xl mb-2">📎</div>
                      <div className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>{specFile.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{(specFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      <button type="button" onClick={e => { e.preventDefault(); setSpecFile(null) }}
                        className="mt-2 text-xs text-red-500 hover:underline">إزالة الملف</button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl mb-2">📄</div>
                      <div className="font-semibold text-sm text-gray-700">اضغط لرفع ملف المواصفات</div>
                      <div className="text-xs text-gray-400 mt-1">PDF، Excel، Word، صورة — حجم أقصى 10MB</div>
                    </div>
                  )}
                </label>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>ملاحظات إضافية</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={4}
                  placeholder="مثال: التسليم داخل الموقع، فاتورة ضريبية مطلوبة، جدول زمني محدد..." />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">

              {/* Options */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>خيارات الطلب</h3>
                <div className="space-y-4">
                  {[
                    { label: 'التوصيل مطلوب', sub: 'التوصيل لموقع المشروع', value: deliveryRequired, setter: setDeliveryRequired },
                    { label: 'فاتورة ضريبية', sub: 'فاتورة ضريبية رسمية مطلوبة', value: vatRequired, setter: setVatRequired },
                    { label: 'إخفاء هوية شركتي', sub: 'لن يعرف الموردون اسمك', value: hideIdentity, setter: setHideIdentity },
                  ].map(({ label, sub, value, setter }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                      </div>
                      <div onClick={() => setter(!value)} className={`w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 ${value ? 'justify-end' : 'justify-start'}`}
                        style={{ background: value ? '#1B2D5B' : '#e5e7eb' }}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validity */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>صلاحية الطلب</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '24 ساعة', hours: 24 },
                    { label: '48 ساعة', hours: 48 },
                    { label: '72 ساعة', hours: 72 },
                    { label: 'أسبوع', hours: 168 },
                  ].map(({ label, hours }) => (
                    <button key={hours} type="button" onClick={() => setValidityHours(hours)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        validityHours === hours ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`} style={validityHours === hours ? { background: '#F5831F' } : {}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl p-6 border" style={{ background: '#1B2D5B', borderColor: '#1B2D5B' }}>
                <h3 className="font-bold mb-4 text-white">ملخص الطلب</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'القطاع', value: sector ? SECTOR_LABELS[sector] : '—' },
                    { label: 'المنتج', value: productName || '—' },
                    { label: 'الكمية', value: quantity && unit ? `${quantity} ${unit}` : '—' },
                    { label: 'المنطقة', value: region || '—' },
                    { label: 'الصلاحية', value: validityHours === 168 ? 'أسبوع' : `${validityHours} ساعة` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-blue-200">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">⚠️ {error}</div>}
              <button type="submit" disabled={loading || !sector || !productName || !quantity || !unit || !region}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: '#F5831F' }}>
                {loading ? 'جارٍ الإرسال...' : 'إرسال طلب التسعير ←'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
