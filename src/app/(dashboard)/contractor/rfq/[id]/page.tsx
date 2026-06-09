// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import { waLink } from '@/lib/wa'

export default function RFQDetailPage() {
  const { id } = useParams()
  const [rfq, setRfq] = useState(null)
  const [offers, setOffers] = useState([])
  const [sortBy, setSortBy] = useState('price_asc') // price_asc | price_desc | delivery | rating
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [tierFilter, setTierFilter] = useState('') // '' | manufacturer | commercial | local
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [marketAvg, setMarketAvg] = useState(null) // متوسط السوق
  const [supplierStats, setSupplierStats] = useState({}) // سجل أداء كل مورد

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: rfqData } = await supabase.from('rfqs').select('*').eq('id', id).single()
      setRfq(rfqData)
      setEditNotes(rfqData?.notes || '')
      setEditSpec(rfqData?.specification || '')

      const { data: offersData } = await supabase
        .from('offers').select('*, supplier:profiles(company_name_ar, phone, rating_avg, city, region, supplier_tier, latitude, longitude, national_short_address, district, verification_status, cr_verification_source)')
        .eq('rfq_id', id).order('total_price', { ascending: true })
      setOffers(offersData || [])

      // سجل أداء الموردين (سرعة الرد، نسبة الترسية، عدد العروض السابقة)
      const supplierIds = [...new Set((offersData || []).map(o => o.supplier_id).filter(Boolean))]
      if (supplierIds.length) {
        const { data: stats } = await supabase.rpc('get_supplier_stats', { ids: supplierIds })
        const m: any = {}; (stats || []).forEach((s: any) => { m[s.supplier_id] = s })
        setSupplierStats(m)
      }

      // متوسط السوق من عروض مشابهة
      if (rfqData) {
        const { data: similarOffers } = await supabase
          .from('offers')
          .select('unit_price, rfq:rfqs(product_name, sector)')
          .not('unit_price', 'is', null)
          .not('status', 'eq', 'rejected')
        const similar = (similarOffers || []).filter(o =>
          o.rfq?.product_name === rfqData.product_name
        )
        if (similar.length >= 2) {
          const avg = similar.reduce((s, o) => s + o.unit_price, 0) / similar.length
          setMarketAvg(Math.round(avg))
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function acceptOffer(offerId) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', offerId)
    // Reject all other pending offers
    await supabase.from('offers').update({ status: 'rejected' }).eq('rfq_id', id).neq('id', offerId).eq('status', 'pending')
    await supabase.from('rfqs').update({ status: 'closed' }).eq('id', id)
    window.location.href = `/contractor/orders/${offerId}`
  }

  async function rejectOffer(offerId) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    window.location.reload()
  }

  const [showEditWarning, setShowEditWarning] = useState(false)

  function handleEditSave() {
    if (offers.length > 0) {
      setShowEditWarning(true)
    } else {
      doSaveEdit()
    }
  }

  async function doSaveEdit() {
    const supabase = createClient()
    // 1. Update RFQ
    await supabase.from('rfqs').update({
      notes: editNotes,
      specification: editSpec,
      offer_count: 0,
    }).eq('id', id)

    // 2. Delete all existing offers for this RFQ
    if (offers.length > 0) {
      await supabase.from('offers').delete().eq('rfq_id', id)
    }

    setRfq({ ...rfq, notes: editNotes, specification: editSpec, offer_count: 0 })
    setOffers([])
    setEditing(false)
    setShowEditWarning(false)
  }

  async function cancelRfq() {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
    const supabase = createClient()
    await supabase.from('rfqs').update({ status: 'cancelled' }).eq('id', id)
    window.location.href = '/contractor'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-blue-600 font-semibold animate-pulse">جارٍ التحميل...</div></div>
  if (!rfq) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-500">الطلب غير موجود</div></div>

  const acceptedOffer = offers.find(o => o.status === 'accepted')

  // Filtered + sorted offers for display (contractor may receive many).
  const displayedOffers = [...offers]
    .filter(o => !onlyVerified || o.supplier?.verification_status === 'verified')
    .filter(o => !tierFilter || o.supplier?.supplier_tier === tierFilter)
    .sort((a: any, b: any) => {
      if (sortBy === 'price_desc') return (b.total_price || 0) - (a.total_price || 0)
      if (sortBy === 'delivery') return (a.delivery_days || 99999) - (b.delivery_days || 99999)
      if (sortBy === 'rating') return (b.supplier?.rating_avg || 0) - (a.supplier?.rating_avg || 0)
      return (a.total_price || 0) - (b.total_price || 0) // price_asc (default)
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-4">
          <h1 className="text-xl font-bold text-gray-900">تفاصيل طلب التسعير</h1>
          <a href="/contractor" className="text-sm text-gray-500 hover:text-gray-700">← رجوع</a>
        </div>

        {/* RFQ Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{rfq.product_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {SECTOR_LABELS[rfq.sector] || rfq.sector}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  rfq.status === 'open' ? 'bg-green-100 text-green-700' :
                  rfq.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  rfq.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {rfq.status === 'open' ? '● مفتوح' : rfq.status === 'closed' ? '● مغلق' : rfq.status === 'cancelled' ? '● ملغي' : '● منتهي'}
                </span>
              </div>
            </div>
            {rfq.status === 'open' && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(!editing)}
                  className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  ✏️ تعديل
                </button>
                <button onClick={cancelRfq}
                  className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 bg-blue-50 rounded-xl p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">المواصفات</label>
                <input value={editSpec} onChange={e => setEditSpec(e.target.value)} className="input-field" placeholder="المواصفات" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ملاحظات</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="input-field" rows={3} placeholder="ملاحظات" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleEditSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">حفظ التعديل</button>
                <button onClick={() => { setEditing(false); setShowEditWarning(false) }} className="text-sm text-gray-500">إلغاء</button>
              </div>

              {showEditWarning && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm">تنبيه: سيتم إلغاء جميع العروض الحالية</h4>
                      <p className="text-xs text-amber-700 mt-1">عند تعديل المواصفات أو الملاحظات، سيتم إلغاء العروض القديمة ({offers.length} عرض) وإرسال الطلب مرة أخرى للموردين بالمتطلبات الجديدة لتقديم عروض جديدة.</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={doSaveEdit}
                          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors">
                          نعم، عدّل وأعد الإرسال
                        </button>
                        <button onClick={() => setShowEditWarning(false)}
                          className="text-xs text-gray-500 px-3 py-2">
                          تراجع
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📦 الكمية</span><br/><strong>{rfq.quantity} {rfq.unit}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">📍 الموقع</span><br/><strong>{rfq.region}{rfq.city ? ` - ${rfq.city}` : ''}</strong></div>
              {rfq.specification && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">⚙️ المواصفات</span><br/><strong>{rfq.specification}</strong></div>}
              {rfq.notes && <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-gray-400">📝 ملاحظات</span><br/>{rfq.notes}</div>}
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🚚 التوصيل</span><br/><strong>{rfq.delivery_required ? 'مطلوب' : 'غير مطلوب'}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">🧾 فاتورة ضريبية</span><br/><strong>{rfq.vat_invoice_required ? 'مطلوبة' : 'غير مطلوبة'}</strong></div>
            </div>
          )}
        </div>

        {/* Accepted Offer → PO Link */}
        {acceptedOffer && (
          <a href={`/contractor/orders/${acceptedOffer.id}`}
            className="block bg-green-50 rounded-2xl p-6 border border-green-200 mb-6 hover:shadow transition-shadow text-center">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-bold text-green-800 mb-1">تم قبول عرض من {acceptedOffer.supplier?.company_name_ar}</h3>
            <p className="text-sm text-green-600">السعر: {acceptedOffer.total_price?.toLocaleString()} ر.س — اضغط لعرض أمر الشراء</p>
          </a>
        )}

        {/* Offers List */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">العروض ({offers.length})</h3>
          {marketAvg && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-600">📊 متوسط السوق:</span>
              <span className="text-sm font-bold text-amber-700">{marketAvg?.toLocaleString()} ر.س/وحدة</span>
            </div>
          )}
        </div>
        {offers.length > 1 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white font-semibold text-gray-700">
              <option value="price_asc">💰 السعر: الأقل أولاً</option>
              <option value="price_desc">💰 السعر: الأعلى أولاً</option>
              <option value="delivery">📦 التوصيل: الأسرع</option>
              <option value="rating">⭐ التقييم: الأعلى</option>
            </select>
            <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="">كل الموردين</option>
              <option value="manufacturer">🏭 مصنع</option>
              <option value="commercial">🏪 تجاري</option>
              <option value="local">🏬 محلي</option>
            </select>
            <button type="button" onClick={() => setOnlyVerified(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${onlyVerified ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
              style={onlyVerified ? { background: '#0F6E56' } : {}}>✓ موثّق فقط</button>
            {(onlyVerified || tierFilter) && <span className="text-[11px] text-gray-400">({displayedOffers.length} من {offers.length})</span>}
          </div>
        )}
        {offers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h4 className="font-bold text-gray-900 mb-1">لم تصل عروض بعد</h4>
            <p className="text-sm text-gray-500">سيتم إخطارك فور وصول أي عرض</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedOffers.map((offer, i) => (
              <div key={offer.id} className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${
                offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                offer.status === 'rejected' ? 'border-gray-200 opacity-50' : 'border-gray-100 hover:border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{offer.supplier?.company_name_ar || 'مورد'}</span>
                        {offer.supplier?.supplier_tier && (
                          <span className={`badge text-[10px] ${
                            offer.supplier.supplier_tier === 'manufacturer' ? 'bg-purple-100 text-purple-700' :
                            offer.supplier.supplier_tier === 'commercial' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {offer.supplier.supplier_tier === 'manufacturer' ? '🏭 مصنع' :
                             offer.supplier.supplier_tier === 'commercial' ? '🏪 تجاري' : '🏬 محلي'}
                          </span>
                        )}
                        {offer.supplier?.verification_status === 'verified' && (
                          <span className="badge text-[10px] inline-flex items-center gap-0.5"
                            style={offer.supplier?.cr_verification_source === 'wathq'
                              ? { background: '#0F6E56', color: '#fff' }
                              : { background: '#E1F5EE', color: '#0F6E56' }}>
                            {offer.supplier?.cr_verification_source === 'wathq' ? '🛡 موثّق عبر واثق' : '✓ موثّق'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {offer.supplier?.rating_avg > 0 && <span>⭐ {offer.supplier.rating_avg}</span>}
                        {offer.supplier?.region && <span>📍 {offer.supplier.region}</span>}
                        {offer.supplier?.phone && <span>📞 {offer.supplier.phone}</span>}
                      </div>
                      {/* بطاقة أداء المورد — سرعة الرد، نسبة الترسية، الخبرة */}
                      {(() => {
                        const st = supplierStats[offer.supplier_id]
                        if (!st) return null
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {st.avg_response_hours != null && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">⚡ يردّ خلال ~{st.avg_response_hours} س</span>
                            )}
                            {st.won_rate != null && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🤝 نسبة الترسية {st.won_rate}%</span>
                            )}
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📨 {st.total_offers} عرض سابق</span>
                          </div>
                        )
                      })()}
                      {offer.supplier?.phone && (() => {
                        const w = waLink(offer.supplier.phone, `السلام عليكم، بخصوص عرضكم في منصة تسعيرك على «${rfq.product_name}»`)
                        return w ? (
                          <a href={w} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] mt-1.5 px-2.5 py-1 rounded-full font-semibold text-white" style={{ background: '#25D366' }}>
                            💬 تواصل واتساب
                          </a>
                        ) : null
                      })()}
                      {offer.supplier?.phone && offer.status === 'pending' && (() => {
                        const w = waLink(offer.supplier.phone, `السلام عليكم، بخصوص عرضكم على «${rfq.product_name}» بسعر ${offer.total_price?.toLocaleString()} ر.س في منصة تسعيرك — هل بالإمكان تخفيض السعر؟ نقدّر تعاونكم 🌟`)
                        return w ? (
                          <a href={w} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] mt-1.5 mr-1.5 px-2.5 py-1 rounded-full font-semibold border" style={{ borderColor: '#F5831F', color: '#F5831F' }}>
                            📉 اطلب تخفيض السعر
                          </a>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold" style={{ color: '#1B2D5B' }}>{offer.total_price?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">ر.س</div>
                    {marketAvg && offer.unit_price && (() => {
                      const diff = Math.abs(((offer.unit_price - marketAvg) / marketAvg * 100)).toFixed(0)
                      const isLow = offer.unit_price < marketAvg
                      return (
                        <div className={`text-[10px] font-bold mt-0.5 ${isLow ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isLow ? `📉 ${diff}% دون السوق` : `📈 ${diff}% فوق السوق`}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {offer.unit_price && <span>سعر الوحدة: {offer.unit_price} ر.س</span>}
                  {offer.delivery_days && <span>📦 التوصيل: {offer.delivery_days} يوم</span>}
                </div>

                {/* تفصيل الفاتورة: البضاعة + الإضافات */}
                {offer.extra_charges && offer.extra_charges.length > 0 && (() => {
                  const exSum = offer.extra_charges.reduce((s, e) => s + (Number(e.amount) || 0), 0)
                  const goods = (Number(offer.total_price) || 0) - exSum
                  return (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-2 text-xs">
                      <div className="flex justify-between text-gray-600"><span>البضاعة</span><span>{goods.toLocaleString()} ر.س</span></div>
                      {offer.extra_charges.map((e, idx) => (
                        <div key={idx} className="flex justify-between text-amber-700"><span>+ {e.label}</span><span>{Number(e.amount).toLocaleString()} ر.س</span></div>
                      ))}
                      <div className="flex justify-between font-bold text-gray-900 border-t border-amber-200 mt-1 pt-1"><span>الإجمالي</span><span>{Number(offer.total_price).toLocaleString()} ر.س</span></div>
                    </div>
                  )
                })()}

                {offer.notes && <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg mb-2">{offer.notes}</p>}

                {/* خصائص المنتج */}
                {offer.attributes && Object.keys(offer.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.entries(offer.attributes).map(([k, v]) => (
                      <span key={k} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        <strong>{k}:</strong> {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* الملف المرفق + الموقع */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {offer.attachment_url && (
                    <a href={offer.attachment_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-[#1B2D5B]/10 text-[#1B2D5B] px-2 py-1 rounded-lg font-semibold hover:bg-[#1B2D5B]/20 transition-all">
                      📎 {offer.attachment_name || 'كتالوج'}
                    </a>
                  )}
                  {offer.supplier?.latitude && offer.supplier?.longitude && (
                    <a href={`https://www.google.com/maps?q=${offer.supplier.latitude},${offer.supplier.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold hover:bg-emerald-100 transition-all">
                      🗺 موقع المورد
                    </a>
                  )}
                  {offer.supplier?.national_short_address && (
                    <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-lg font-mono" dir="ltr">
                      🏛 {offer.supplier.national_short_address}
                    </span>
                  )}
                </div>

                {offer.status === 'pending' && rfq.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => acceptOffer(offer.id)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      ✓ قبول العرض
                    </button>
                    <button onClick={() => rejectOffer(offer.id)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                      ✕ رفض
                    </button>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <a href={`/contractor/orders/${offer.id}`}
                    className="block text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    📄 عرض أمر الشراء
                  </a>
                )}

                {offer.status !== 'pending' && (
                  <div className={`text-center text-xs font-semibold py-1 ${
                    offer.status === 'accepted' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {offer.status === 'accepted' ? '✓ تم القبول' : '✕ مرفوض'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
