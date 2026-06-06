// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS, UNIT_OPTIONS, REGIONS, detectSubCategory, getSubCategoryLabel } from '@/types'

const SECTOR_ICONS = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️', equipment: '🚜', supply_store: '🏪' }
const SECTOR_COLORS = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#F5831F', mechanical: '#0F6E56', equipment: '#6b5b4f', supply_store: '#c026d3' }

export default function NewProjectPage() {
  const { locale, dir } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [step, setStep] = useState<'setup' | 'items' | 'review'>('setup')

  // Project info
  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [projectNotes, setProjectNotes] = useState('')
  const [deliveryRequired, setDeliveryRequired] = useState(true)
  const [deliveryLocation, setDeliveryLocation] = useState('')

  // BOQ upload
  const [boqFile, setBoqFile] = useState(null)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef(null)

  // Items
  const [items, setItems] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)

  // استهداف نوع الموردين + الموثّقون فقط (يطبَّق على كل بنود المشروع)
  const [targetTiers, setTargetTiers] = useState<string[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  function toggleTier(tier: string) {
    setTargetTiers(prev => prev.includes(tier) ? prev.filter(x => x !== tier) : [...prev, tier])
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUser(data.session.user)
    })
  }, [])

  // تحليل الـ BOQ
  async function handleBOQUpload(file: File) {
    setBoqFile(file)
    setParsing(true)
    setParseError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-boq', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.items?.length > 0) {
        setItems(data.items.map((item, i) => ({
          ...item,
          id: `item-${i}`,
          selected: true,
          sub_category: detectSubCategory(item.product_name + ' ' + (item.specification || ''), item.sector),
        })))
        setStep('items')
      } else {
        setParseError(locale === 'en' ? 'No items found in the BOQ' : 'لم يتم استخراج بنود من الملف')
      }
    } catch (err) {
      setParseError(err.message || (locale === 'en' ? 'Failed to parse BOQ' : 'فشل تحليل الملف'))
    } finally { setParsing(false) }
  }

  // إضافة بند يدوي
  function addItem() {
    setItems(prev => [...prev, {
      id: `item-${Date.now()}`,
      product_name: '',
      sector: 'civil',
      quantity: '',
      unit: 'عدد',
      specification: '',
      selected: true,
    }])
  }

  function updateItem(id, field, value) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function removeItem(id) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  // إرسال المشروع
  async function handleSubmit() {
    if (!user || !title || !region) return
    if (deliveryRequired && !deliveryLocation) return
    setLoading(true)
    const supabase = createClient()

    const selectedItems = items.filter(i => i.selected && i.product_name)

    try {
      // رفع ملف BOQ إن وجد
      let boqUrl = null
      if (boqFile) {
        const path = `${user.id}/boq-${Date.now()}.${boqFile.name.split('.').pop()}`
        const { data } = await supabase.storage.from('licenses').upload(path, boqFile, { upsert: true })
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(data.path)
          boqUrl = publicUrl
        }
      }

      // إنشاء Project RFQ
      const { data: project, error: projErr } = await supabase.from('project_rfqs').insert({
        contractor_id: user.id, title, region, city: city || null,
        notes: projectNotes || null, boq_url: boqUrl, status: 'sent',
      }).select().single()

      if (projErr) throw new Error(projErr.message)

      // إنشاء RFQ لكل بند وربطه بالمشروع
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      for (const item of selectedItems) {
        // رفع ملف مواصفات البند إن وجد
        let itemSpecUrl = null
        if (item.specFile) {
          const ext = item.specFile.name.split('.').pop()
          const path = `${user.id}/spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
          const { data: up } = await supabase.storage.from('licenses').upload(path, item.specFile, { upsert: true })
          if (up) {
            const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(up.path)
            itemSpecUrl = publicUrl
          }
        }

        const itemNotes = itemSpecUrl
          ? `مشروع: ${title}\n[مواصفات مرفقة: ${itemSpecUrl}]`
          : `مشروع: ${title}`

        const { data: rfq } = await supabase.from('rfqs').insert({
          contractor_id: user.id,
          sector: item.sector,
          sub_category: item.sub_category || detectSubCategory(item.product_name, item.sector),
          product_name: item.product_name,
          specification: item.specification || null,
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || 'عدد',
          region, city: city || null,
          delivery_required: deliveryRequired,
          delivery_location: deliveryRequired ? (deliveryLocation || null) : null,
          vat_invoice_required: true,
          hide_identity: false,
          target_tiers: targetTiers.length > 0 ? targetTiers : null,
          verified_only: verifiedOnly,
          notes: itemNotes,
          expires_at: expiresAt,
        }).select().single()

        if (rfq) {
          await supabase.from('project_rfq_items').insert({
            project_rfq_id: project.id,
            rfq_id: rfq.id,
            product_name: item.product_name,
            sector: item.sector,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit,
            specification: item.specification || null,
            status: 'sent',
          })
        }
      }

      window.location.href = `/contractor/project/${project.id}`
    } catch (err) {
      alert(err.message)
    } finally { setLoading(false) }
  }

  const selectedCount = items.filter(i => i.selected && i.product_name).length
  const bySector = items.reduce((acc, item) => {
    if (!item.selected) return acc
    acc[item.sector] = (acc[item.sector] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%)',
      }} />

      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/contractor" className="text-xs text-gray-400 hover:text-gray-600">
              {locale === 'en' ? '← Dashboard' : '← لوحة التحكم'}
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B2D5B' }}>
            {locale === 'en' ? '📋 New Project RFQ' : locale === 'ur' ? '📋 نیا پراجیکٹ' : '📋 طلب تسعير مشروع'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {locale === 'en' ? 'Upload a BOQ or add materials manually — we send each to the right supplier'
            : locale === 'ur' ? 'BOQ اپلوڈ کریں یا مواد خود شامل کریں'
            : 'ارفع ملف BOQ أو أضف المواد يدوياً — نرسل كل مادة للمورد المتخصص'}
          </p>
        </div>

        {/* Step 1: Setup */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-4" style={{ color: '#1B2D5B' }}>
            {locale === 'en' ? '1. Project Info' : '1. بيانات المشروع'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                {locale === 'en' ? 'Project Name *' : 'اسم المشروع *'}
              </label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="input-field" placeholder={locale === 'en' ? 'e.g. KFSC Energy Centre' : 'مثال: مبنى المركز الطاقوي'} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'Region *' : 'المنطقة *'}</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="input-field" required>
                <option value="">{locale === 'en' ? 'Select region' : 'اختر المنطقة'}</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'City' : 'المدينة'}</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                className="input-field" placeholder={locale === 'en' ? 'City name' : 'اسم المدينة'} />
            </div>
            <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-800">🚚 {locale === 'en' ? 'Delivery required (for the whole project)' : 'التوصيل مطلوب (لكل المشروع)'}</div>
                <div onClick={() => setDeliveryRequired(!deliveryRequired)} className={`w-11 h-6 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${deliveryRequired ? 'justify-end' : 'justify-start'}`}
                  style={{ background: deliveryRequired ? '#0F6E56' : '#e5e7eb' }}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              {deliveryRequired && (
                <div className="mt-2">
                  <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)}
                    className="input-field"
                    placeholder={locale === 'en' ? 'Delivery location: district / site address *' : 'موقع التوصيل: الحي / عنوان الموقع *'} />
                  <p className="text-[11px] text-amber-700 mt-1">
                    {locale === 'en' ? 'Helps suppliers calculate shipping cost.' : 'يساعد الموردين على حساب تكلفة الشحن.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOQ Upload */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5">
          <h2 className="font-bold mb-1" style={{ color: '#1B2D5B' }}>
            {locale === 'en' ? '2. Upload BOQ or Add Manually' : '2. رفع BOQ أو إضافة يدوية'}
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {locale === 'en' ? 'Excel BOQ will be auto-analyzed to extract all materials with quantities'
            : 'ملف Excel سيتم تحليله تلقائياً لاستخراج المواد والكميات'}
          </p>

          {/* BOQ Upload Zone */}
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all mb-4 ${
            boqFile ? 'border-[#1B2D5B] bg-[#1B2D5B]/5' : 'border-gray-200 hover:border-[#F5831F]/50'
          }`} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls"
              onChange={e => { if (e.target.files?.[0]) handleBOQUpload(e.target.files[0]) }} />
            {parsing ? (
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">⏳</div>
                <div className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>
                  {locale === 'en' ? 'Analyzing BOQ...' : 'جارٍ تحليل الـ BOQ...'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {locale === 'en' ? 'Extracting materials and quantities' : 'استخراج المواد والكميات'}
                </div>
              </div>
            ) : boqFile ? (
              <div className="text-center">
                <div className="text-4xl mb-2">✅</div>
                <div className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>{boqFile.name}</div>
                <div className="text-xs text-gray-400 mt-1">{items.length} {locale === 'en' ? 'items extracted' : 'بند تم استخراجه'}</div>
                <button type="button" onClick={e => { e.preventDefault(); setBoqFile(null); setItems([]) }}
                  className="mt-2 text-xs text-red-500 hover:underline">
                  {locale === 'en' ? 'Remove' : 'إزالة الملف'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3">📊</div>
                <div className="font-semibold text-sm text-gray-700">
                  {locale === 'en' ? 'Drop Excel BOQ here or click to upload' : 'اسحب ملف BOQ هنا أو اضغط للرفع'}
                </div>
                <div className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls)</div>
              </div>
            )}
          </label>

          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">⚠️ {parseError}</div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{locale === 'en' ? 'OR add manually' : 'أو أضف يدوياً'}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button type="button" onClick={addItem}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-[#1B2D5B] hover:text-[#1B2D5B] transition-all">
            + {locale === 'en' ? 'Add Material' : 'إضافة مادة'}
          </button>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm" style={{ color: '#1B2D5B' }}>
                {locale === 'en' ? `Materials (${items.length})` : `المواد (${items.length})`}
              </h2>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(bySector).map(([s, count]) => (
                  <span key={s} className="badge text-[10px] text-white" style={{ background: SECTOR_COLORS[s] }}>
                    {SECTOR_ICONS[s]} {SECTOR_LABELS[s]} ({count})
                  </span>
                ))}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: true })))}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                {locale === 'en' ? '✓ Select All' : 'تحديد الكل'}
              </button>
              <button type="button" onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: false })))}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                {locale === 'en' ? '✗ Deselect All' : 'إلغاء الكل'}
              </button>
              <button type="button" onClick={addItem}
                className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: '#1B2D5B' }}>
                + {locale === 'en' ? 'Add' : 'إضافة'}
              </button>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={item.id} className={`bg-white rounded-xl border transition-all ${
                  item.selected ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-50'
                }`}>
                  <div className="flex items-start gap-3 p-4">
                    {/* Checkbox */}
                    <input type="checkbox" checked={item.selected}
                      onChange={e => updateItem(item.id, 'selected', e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#1B2D5B] flex-shrink-0" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingIndex === i ? (
                        // Edit Mode
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <input value={item.product_name}
                              onChange={e => updateItem(item.id, 'product_name', e.target.value)}
                              className="input-field text-sm" placeholder={locale === 'en' ? 'Material name *' : 'اسم المادة *'} />
                          </div>
                          <div>
                            <select value={item.sector}
                              onChange={e => updateItem(item.id, 'sector', e.target.value)}
                              className="input-field text-sm">
                              {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={item.quantity}
                              onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                              className="input-field text-sm" placeholder={locale === 'en' ? 'Qty' : 'الكمية'} />
                            <select value={item.unit}
                              onChange={e => updateItem(item.id, 'unit', e.target.value)}
                              className="input-field text-sm">
                              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <input value={item.specification || ''}
                              onChange={e => updateItem(item.id, 'specification', e.target.value)}
                              className="input-field text-sm" placeholder={locale === 'en' ? 'Specification (optional)' : 'المواصفة (اختياري)'} />
                          </div>
                          {/* رفع ملف مواصفات للبند */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              {locale === 'en' ? 'Spec file (optional)' : 'ملف مواصفات للبند (اختياري)'}
                            </label>
                            {item.specFile ? (
                              <div className="flex items-center gap-2 bg-[#1B2D5B]/5 rounded-lg p-2 border border-[#1B2D5B]/20">
                                <span className="text-base">📎</span>
                                <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#1B2D5B' }}>{item.specFile.name}</span>
                                <button type="button" onClick={() => updateItem(item.id, 'specFile', null)}
                                  className="text-xs text-red-500 hover:underline">
                                  {locale === 'en' ? 'Remove' : 'إزالة'}
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-2 cursor-pointer hover:border-[#F5831F]/50 transition-all">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.dwg,.xlsx,.doc,.docx"
                                  onChange={e => updateItem(item.id, 'specFile', e.target.files?.[0] ?? null)} />
                                <span className="text-base">📄</span>
                                <span className="text-xs text-gray-500">
                                  {locale === 'en' ? 'Upload drawing/spec (PDF, DWG, Image...)' : 'ارفع رسمة أو مواصفة (PDF، DWG، صورة...)'}
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="sm:col-span-2 flex gap-2">
                            <button type="button" onClick={() => setEditingIndex(null)}
                              className="text-xs px-4 py-2 rounded-lg text-white font-semibold" style={{ background: '#0F6E56' }}>
                              ✓ {locale === 'en' ? 'Done' : 'حفظ'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: '#1B2D5B' }}>
                              {item.product_name || <span className="text-gray-400 italic">{locale === 'en' ? 'Unnamed item' : 'بند بدون اسم'}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="badge text-white text-[10px]" style={{ background: SECTOR_COLORS[item.sector] }}>
                                {SECTOR_ICONS[item.sector]} {SECTOR_LABELS[item.sector]}
                              </span>
                              {item.sub_category && (
                                <span className="badge text-[10px] bg-gray-100 text-gray-600">
                                  → {getSubCategoryLabel(item.sector, item.sub_category, locale)}
                                </span>
                              )}
                              {item.quantity && <span className="text-xs text-gray-500">📦 {item.quantity} {item.unit}</span>}
                              {item.specification && <span className="text-xs text-gray-400 truncate max-w-[200px]">⚙️ {item.specification}</span>}
                              {item.specFile && <span className="text-xs text-[#1B2D5B] font-semibold">📎 {locale === 'en' ? 'File attached' : 'مرفق ملف'}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button type="button" onClick={() => setEditingIndex(i)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">✏️</button>
                            <button type="button" onClick={() => removeItem(item.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">🗑</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            {/* Target supplier types + verified-only (applies to all items) */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h4 className="text-sm font-bold mb-1" style={{ color: '#1B2D5B' }}>
                {locale === 'en' ? 'Who should receive this?' : locale === 'ur' ? 'یہ کس کو بھیجیں؟' : 'لمن تريد إرسال الطلب؟'}
              </h4>
              <p className="text-xs text-gray-400 mb-3">
                {locale === 'en' ? 'Pick supplier types — leave empty for all'
                : locale === 'ur' ? 'سپلائر کی قسم منتخب کریں — سب کے لیے خالی چھوڑیں'
                : 'اختر نوع الموردين — اتركه فارغاً للجميع'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {[
                  { key: 'manufacturer', icon: '🏭', label: locale === 'en' ? 'Factory / Major' : locale === 'ur' ? 'فیکٹری / بڑا' : 'مصنع / مورد رئيسي', desc: locale === 'en' ? 'Production or bulk supply' : locale === 'ur' ? 'بڑی سپلائی' : 'إنتاج أو توريد بكميات كبيرة' },
                  { key: 'commercial', icon: '🏪', label: locale === 'en' ? 'Commercial Supplier' : locale === 'ur' ? 'تجارتی سپلائر' : 'مورد تجاري', desc: locale === 'en' ? 'Regular medium-volume supply' : locale === 'ur' ? 'باقاعدہ درمیانی سپلائی' : 'توريد بكميات متوسطة ومنتظمة' },
                  { key: 'local', icon: '🏬', label: locale === 'en' ? 'Local Supplier' : locale === 'ur' ? 'مقامی سپلائر' : 'مورد محلي', desc: locale === 'en' ? 'Small-medium, direct service' : locale === 'ur' ? 'چھوٹی تا درمیانی' : 'بكميات صغيرة إلى متوسطة وخدمة مباشرة' },
                ].map(tier => {
                  const active = targetTiers.includes(tier.key)
                  return (
                    <button key={tier.key} type="button" onClick={() => toggleTier(tier.key)}
                      className={`p-3 rounded-xl border-2 text-start transition-all ${active ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tier.icon}</span>
                        <span className={`text-sm font-bold ${active ? 'text-[#F5831F]' : 'text-gray-700'}`}>{tier.label}</span>
                        {active && <span className="ms-auto text-[#F5831F] font-bold">✓</span>}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">{tier.desc}</div>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{locale === 'en' ? 'Verified only' : locale === 'ur' ? 'صرف تصدیق شدہ' : 'الموثّقون فقط'}</div>
                  <div className="text-xs text-gray-400">{locale === 'en' ? 'Receive offers from verified suppliers only ✓' : locale === 'ur' ? 'صرف تصدیق شدہ سپلائرز سے ✓' : 'استقبل عروضاً من الموثّقين فقط ✓'}</div>
                </div>
                <div onClick={() => setVerifiedOnly(!verifiedOnly)} className={`w-11 h-6 rounded-full cursor-pointer flex items-center px-1 shrink-0 transition-all ${verifiedOnly ? 'justify-end' : 'justify-start'}`}
                  style={{ background: verifiedOnly ? '#0F6E56' : '#e5e7eb' }}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold" style={{ color: '#1B2D5B' }}>
                  {locale === 'en' ? 'Ready to Send?' : 'جاهز للإرسال؟'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedCount} {locale === 'en' ? 'materials will be sent to' : 'مادة ستُرسل لـ'} {Object.keys(bySector).length} {locale === 'en' ? 'supplier groups' : 'مجموعة موردين'}
                </p>
              </div>
              <div className="text-left">
                {Object.entries(bySector).map(([s, count]) => (
                  <div key={s} className="text-xs text-gray-500">
                    {SECTOR_ICONS[s]} {SECTOR_LABELS[s]}: {count} {locale === 'en' ? 'items' : 'بند'}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit}
              disabled={loading || !title || !region || selectedCount === 0 || (deliveryRequired && !deliveryLocation)}
              className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-all hover:shadow-lg"
              style={{ background: '#F5831F' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {locale === 'en' ? 'Sending to suppliers...' : 'جارٍ الإرسال للموردين...'}
                </span>
              ) : locale === 'en' ? `Send ${selectedCount} Materials to Suppliers →` : `إرسال ${selectedCount} مادة للموردين المتخصصين ←`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
