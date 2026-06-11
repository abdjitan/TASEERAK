// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SECTOR_LABELS } from '@/types'
import { waLink } from '@/lib/wa'
import Logo from '@/components/shared/Logo'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'

export default function OfferDetailPage() {
  const { id, offerId } = useParams()
  const [rfq, setRfq] = useState(null)
  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)
  const [reqHours, setReqHours] = useState(24)
  const [reqNote, setReqNote] = useState('')
  const [reqBusy, setReqBusy] = useState(false)
  const [reqDone, setReqDone] = useState(false)

  async function submitReductionRequest() {
    setReqBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('request_price_reduction', { p_offer_id: offerId, p_hours: Number(reqHours), p_note: reqNote.trim() || null })
    setReqBusy(false)
    if (error) { alert('تعذّر إرسال الطلب — حاول مرة ثانية.'); return }
    setReqOpen(false); setReqDone(true)
  }

  async function cancelReduction() {
    if (!confirm('إلغاء طلب التخفيض والعودة للسعر الأصلي؟')) return
    setActing(true)
    const supabase = createClient()
    await supabase.from('offers').update({ reduction_deadline: null, reduction_note: null }).eq('id', offerId)
    window.location.reload()
  }

  const [infoOpen, setInfoOpen] = useState(false)
  const [infoText, setInfoText] = useState('')
  const [infoBusy, setInfoBusy] = useState(false)
  async function submitInfoRequest() {
    if (!infoText.trim()) return
    setInfoBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('request_offer_info', { p_offer_id: offerId, p_question: infoText.trim() })
    setInfoBusy(false)
    if (error) { alert('تعذّر إرسال الطلب — حاول مرة ثانية.'); return }
    setInfoOpen(false); window.location.reload()
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: rfqData } = await supabase.from('rfqs').select('*').eq('id', id).single()
      setRfq(rfqData)
      const { data: offerData } = await supabase
        .from('offers')
        .select('*, supplier:profiles(company_name_ar, company_name_en, phone, rating_avg, city, region, district, supplier_tier, national_short_address, latitude, longitude, verification_status, cr_verification_source)')
        .eq('id', offerId).single()
      setOffer(offerData)
      setLoading(false)
    }
    load()
  }, [id, offerId])

  async function acceptOffer() {
    if (!confirm('تأكيد قبول هذا العرض؟ سيتم رفض باقي العروض وإغلاق الطلب.')) return
    setActing(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    if (error) { setActing(false); alert('تعذّر قبول العرض — قد يكون تم قبوله مسبقاً. حدّث الصفحة.'); return }
    window.location.href = `/contractor/orders/${offerId}`
  }

  async function rejectOffer() {
    if (!confirm('رفض هذا العرض؟')) return
    setActing(true)
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
    window.location.href = `/contractor/rfq/${id}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse"><img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" /><div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>جارٍ التحميل...</div></div>
    </div>
  )
  if (!offer || !rfq) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] text-center">
      <div><div className="text-5xl mb-3">🔍</div><p className="font-bold" style={{ color: '#1B2D5B' }}>العرض غير موجود</p>
        <a href={`/contractor/rfq/${id}`} className="text-sm text-[#d96f15] underline mt-2 inline-block">← رجوع للطلب</a></div>
    </div>
  )

  const s = offer.supplier || {}
  const exList = Array.isArray(offer.extra_charges) ? offer.extra_charges : []
  const exSum = exList.reduce((a, e) => a + (Number(e.amount) || 0), 0)
  const goods = (Number(offer.total_price) || 0) - exSum
  const tierLabel = s.supplier_tier === 'manufacturer' ? '🏭 مصنع / مورد رئيسي' : s.supplier_tier === 'commercial' ? '🏪 مورد تجاري' : '🏬 مورد محلي'
  const mapsUrl = (s.latitude && s.longitude) ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}` : null
  const wa = s.phone ? waLink(s.phone, `السلام عليكم، بخصوص عرضكم على «${rfq.product_name}» في منصة تسعيرك`) : ''
  const waReduce = s.phone ? waLink(s.phone, `السلام عليكم، بخصوص عرضكم على «${rfq.product_name}» بسعر ${offer.total_price?.toLocaleString('en-US')} ر.س في منصة تسعيرك — هل بالإمكان تخفيض السعر؟ نقدّر تعاونكم 🌟`) : ''
  const statusBadge = offer.status === 'accepted' ? { t: '✓ مقبول', c: 'bg-emerald-100 text-emerald-700' }
    : offer.status === 'rejected' ? { t: '✕ مرفوض', c: 'bg-gray-100 text-gray-500' }
    : { t: '⏳ قيد المراجعة', c: 'bg-amber-100 text-amber-700' }

  const Row = ({ label, value }: any) => value ? (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-50 text-sm">
      <span className="text-gray-500">{label}</span><span className="font-semibold text-gray-800 text-left">{value}</span>
    </div>
  ) : null

  return (
    <AppShell title="تفاصيل العرض" nav={getNav('contractor', 'ar', '/contractor')} dir="rtl">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: '#1B2D5B' }}>📋</div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1B2D5B' }}>تفاصيل العرض</h1>
            <p className="text-gray-500 text-sm">{rfq.product_name}</p>
          </div>
          <span className={`badge text-[11px] mr-auto ${statusBadge.c}`}>{statusBadge.t}</span>
        </div>

        {/* الطلب */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-sm mb-2" style={{ color: '#1B2D5B' }}>📦 تفاصيل الطلب</h2>
          <Row label="المنتج" value={rfq.product_name} />
          <Row label="القطاع" value={SECTOR_LABELS[rfq.sector] || rfq.sector} />
          <Row label="الكمية" value={`${rfq.quantity} ${rfq.unit || ''}`} />
          <Row label="المنطقة" value={rfq.region} />
          <Row label="المواصفات" value={rfq.specification} />
          <Row label="ملاحظات الطلب" value={rfq.notes} />
        </div>

        {/* المورد */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-sm mb-3" style={{ color: '#1B2D5B' }}>🏪 المورد</h2>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-bold text-gray-900">{s.company_name_ar || 'مورد'}</span>
            {s.supplier_tier && <span className="badge text-[10px] bg-[#F5831F]/5 text-[#d96f15]">{tierLabel}</span>}
            {s.verification_status === 'verified' && (
              <span className="badge text-[10px]" style={s.cr_verification_source === 'wathq' ? { background: '#0F6E56', color: '#fff' } : { background: '#E1F5EE', color: '#0F6E56' }}>
                {s.cr_verification_source === 'wathq' ? '🛡 موثّق عبر واثق' : '✓ موثّق'}
              </span>
            )}
          </div>
          <Row label="التقييم" value={s.rating_avg > 0 ? `⭐ ${s.rating_avg}` : null} />
          <Row label="الموقع" value={[s.district, s.city, s.region].filter(Boolean).join('، ')} />
          <Row label="العنوان الوطني" value={s.national_short_address} />
          <Row label="الجوال" value={s.phone} />
          <div className="flex gap-2 mt-3 flex-wrap">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-xl font-semibold text-white" style={{ background: '#25D366' }}>💬 تواصل واتساب</a>}
            {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600">🗺 موقع المورد</a>}
          </div>
        </div>

        {/* العرض */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-sm mb-3" style={{ color: '#1B2D5B' }}>💰 تفاصيل العرض</h2>
          <Row label="سعر الوحدة" value={offer.unit_price ? `${offer.unit_price.toLocaleString('en-US')} ر.س` : null} />
          <Row label="مدة التوصيل" value={offer.delivery_days ? `${offer.delivery_days} يوم` : null} />

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 my-3 text-sm">
            <div className="flex justify-between text-gray-600"><span>البضاعة</span><span>{goods.toLocaleString('en-US')} ر.س</span></div>
            {exList.map((e, i) => (
              <div key={i} className="flex justify-between text-amber-700"><span>+ {e.label}</span><span>{Number(e.amount).toLocaleString('en-US')} ر.س</span></div>
            ))}
            <div className="flex justify-between font-bold text-gray-900 border-t border-amber-200 mt-1.5 pt-1.5"><span>الإجمالي</span><span>{Number(offer.total_price).toLocaleString('en-US')} ر.س</span></div>
          </div>

          {offer.attributes && Object.keys(offer.attributes).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(offer.attributes).map(([k, v]) => (
                <span key={k} className="text-[11px] bg-[#F5831F]/5 text-[#d96f15] px-2 py-1 rounded-lg"><strong>{k}:</strong> {String(v)}</span>
              ))}
            </div>
          )}
          {offer.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-2">📝 {offer.notes}</p>}
          {offer.attachment_url && (
            <a href={offer.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[#d96f15] underline mt-1">
              📎 {offer.attachment_name || 'مرفق العرض'}
            </a>
          )}
        </div>

        {/* معلومات إضافية عن المنتج */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm" style={{ color: '#1B2D5B' }}>❓ معلومات إضافية عن المنتج</h2>
            {offer.status === 'pending' && !offer.info_request && (
              <button type="button" onClick={() => setInfoOpen(true)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-semibold">اطلب معلومات</button>
            )}
          </div>
          {offer.info_request ? (
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-lg p-2.5 text-sm"><span className="text-gray-400 text-[11px]">سؤالك:</span><div>{offer.info_request}</div></div>
              {offer.info_response
                ? <div className="bg-emerald-50 rounded-lg p-2.5 text-sm"><span className="text-emerald-600 text-[11px]">رد المورد:</span><div>{offer.info_response}</div></div>
                : <div className="text-xs text-amber-600">⏳ بانتظار رد المورد...</div>}
            </div>
          ) : (
            <p className="text-xs text-gray-400">اطلب من المورد تفاصيل إضافية عن المنتج (النوع، المواصفات، المنشأ، الضمان...).</p>
          )}
        </div>

        {/* الإجراءات */}
        {offer.status === 'pending' && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm sticky bottom-3">
            {(reqDone || offer.reduction_deadline) ? (
              <>
                <div className="text-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-2">
                  ✓ تم إرسال طلب التخفيض — بانتظار رد المورد{offer.reduction_deadline ? ` (المهلة: ${new Date(offer.reduction_deadline).toLocaleString('ar-SA')})` : ''}
                </div>
                <button type="button" onClick={cancelReduction} disabled={acting} className="block w-full text-center text-xs mb-3 px-4 py-2 rounded-xl font-semibold border border-gray-300 text-gray-600 disabled:opacity-50">
                  ✕ إلغاء طلب التخفيض
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setReqOpen(true)} className="block w-full text-center text-sm mb-2 px-4 py-2.5 rounded-xl font-semibold border" style={{ borderColor: '#F5831F', color: '#F5831F' }}>
                  📉 اطلب تخفيض إضافي (بمهلة محددة)
                </button>
                {waReduce && <a href={waReduce} target="_blank" rel="noreferrer" className="block text-center text-[11px] text-gray-400 underline mb-3">أو راسله عبر واتساب</a>}
              </>
            )}
            <div className="flex gap-2">
              <button onClick={acceptOffer} disabled={acting} className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: '#0F6E56' }}>✓ {(reqDone || offer.reduction_deadline) ? 'قبول السعر الأصلي' : 'قبول العرض'}</button>
              <button onClick={rejectOffer} disabled={acting} className="px-6 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600">✕ رفض</button>
            </div>
          </div>
        )}

        {/* نموذج طلب تخفيض السعر بمهلة */}
        {reqOpen && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => !reqBusy && setReqOpen(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" dir="rtl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>📉 طلب تخفيض إضافي</h3>
              <p className="text-xs text-gray-500 mb-4">نرسل طلباً للمورد لتخفيض سعره، ويرد خلال المهلة اللي تحددها أنت.</p>
              <label className="block text-xs font-bold text-gray-500 mb-1">مهلة الرد</label>
              <select value={reqHours} onChange={e => setReqHours(Number(e.target.value))} className="input-field mb-3">
                <option value={6}>٦ ساعات</option>
                <option value={12}>١٢ ساعة</option>
                <option value={24}>٢٤ ساعة (يوم)</option>
                <option value={48}>٤٨ ساعة (يومين)</option>
                <option value={72}>٣ أيام</option>
              </select>
              <label className="block text-xs font-bold text-gray-500 mb-1">ملاحظة للمورد (اختياري)</label>
              <textarea value={reqNote} onChange={e => setReqNote(e.target.value)} rows={2} className="input-field mb-3" placeholder="مثال: السعر أعلى من السوق، نطلب تخفيض ٥٪" />
              <div className="flex gap-2">
                <button type="button" disabled={reqBusy} onClick={submitReductionRequest} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#F5831F' }}>{reqBusy ? 'جارٍ الإرسال...' : 'إرسال الطلب'}</button>
                <button type="button" onClick={() => setReqOpen(false)} className="px-5 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* نموذج طلب معلومات إضافية */}
        {infoOpen && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => !infoBusy && setInfoOpen(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" dir="rtl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>❓ طلب معلومات إضافية</h3>
              <p className="text-xs text-gray-500 mb-3">وش المعلومات اللي تبيها عن المنتج؟ (النوع، المواصفات، المنشأ، الضمان…)</p>
              <textarea value={infoText} onChange={e => setInfoText(e.target.value)} rows={3} className="input-field mb-3" placeholder="مثال: ما منشأ الحديد؟ هل يطابق مواصفة ASTM؟ هل يوجد شهادة جودة؟" />
              <div className="flex gap-2">
                <button type="button" disabled={infoBusy} onClick={submitInfoRequest} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#1B2D5B' }}>{infoBusy ? 'جارٍ الإرسال...' : 'إرسال للمورد'}</button>
                <button type="button" onClick={() => setInfoOpen(false)} className="px-5 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
