// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SECTOR_LABELS,
  SECTOR_PRODUCTS,
  UNIT_OPTIONS,
  REGIONS,
  type Sector,
} from '@/types'

export default function NewRFQPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [sector, setSector] = useState<Sector | ''>('')
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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }
      setUser(data.session.user)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !sector) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('rfqs').insert({
      contractor_id: user.id,
      sector,
      product_name: productName,
      specification: specification || null,
      quantity: parseFloat(quantity),
      unit,
      region,
      city: city || null,
      delivery_required: deliveryRequired,
      vat_invoice_required: vatRequired,
      hide_identity: hideIdentity,
      notes: notes || null,
      expires_at: expiresAt,
    })

    if (insertError) {
      setError(`خطأ: ${insertError.message}`)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">تم إرسال طلب التسعير</h2>
          <p className="text-sm text-gray-500 mb-6">سيتم إخطار الموردين في قطاعك فوراً</p>
          <div className="flex gap-3">
            <a href="/contractor" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-blue-700 transition-colors">
              لوحة التحكم
            </a>
            <button
              onClick={() => { setSuccess(false); setSector(''); setProductName(''); setQuantity(''); setUnit(''); setRegion(''); setCity(''); setNotes(''); setSpecification('') }}
              className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              طلب آخر
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 mt-4">
          <h1 className="text-xl font-bold text-gray-900">طلب تسعير جديد</h1>
          <a href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع</a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Sector */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3">القطاع *</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(SECTOR_LABELS) as Sector[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSector(s); setProductName('') }}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    sector === s
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {SECTOR_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Product */}
          {sector && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-3">المنتج *</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SECTOR_PRODUCTS[sector].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProductName(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      productName === p
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="input-field"
                placeholder="أو اكتب اسم المنتج"
                required
              />
            </div>
          )}

          {/* Quantity & Unit */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3">الكمية والوحدة *</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="input-field"
                placeholder="الكمية"
                required
                min="0"
                step="any"
              />
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="input-field"
                required
              >
                <option value="">الوحدة</option>
                {UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <label className="block text-sm font-semibold text-gray-900 mb-2 mt-4">المواصفات</label>
            <input
              type="text"
              value={specification}
              onChange={e => setSpecification(e.target.value)}
              className="input-field"
              placeholder="مثال: قطر 16mm، جهد 450V"
            />
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3">الموقع *</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="input-field"
                required
              >
                <option value="">المنطقة</option>
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="input-field"
                placeholder="المدينة"
              />
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3">خيارات إضافية</label>
            <div className="space-y-3">
              {[
                { label: 'التوصيل مطلوب', value: deliveryRequired, setter: setDeliveryRequired },
                { label: 'فاتورة ضريبية مطلوبة', value: vatRequired, setter: setVatRequired },
                { label: 'إخفاء هوية الشركة', value: hideIdentity, setter: setHideIdentity },
              ].map(({ label, value, setter }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">{label}</span>
                  <div
                    onClick={() => setter(!value)}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                      value ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </label>
              ))}
            </div>

            <label className="block text-sm font-semibold text-gray-900 mb-2 mt-4">صلاحية الطلب</label>
            <div className="flex gap-2">
              {[
                { label: '24 ساعة', hours: 24 },
                { label: '48 ساعة', hours: 48 },
                { label: '72 ساعة', hours: 72 },
                { label: 'أسبوع', hours: 168 },
              ].map(({ label, hours }) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setValidityHours(hours)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    validityHours === hours
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-sm font-semibold text-gray-900 mb-2 mt-4">ملاحظات</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="أي تفاصيل إضافية..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !sector || !productName || !quantity || !unit || !region}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'جارٍ الإرسال...' : 'إرسال طلب التسعير ←'}
          </button>

        </form>
      </div>
    </div>
  )
}
