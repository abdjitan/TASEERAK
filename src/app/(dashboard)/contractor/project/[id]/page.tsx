'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageLoader from '@/components/shared/PageLoader'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { offerComparable, lineComparable, vatTag } from '@/lib/vat'
import { askConfirm, notify } from '@/lib/askConfirm'
import { arCount, daysText, dateLocale } from '@/lib/text'
import { fileHref } from '@/lib/fileHref'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import { SECTOR_LABELS, getProductLabel, getUnitLabel, getRegionLabel, getProductSpecs } from '@/types'
import { fmtNum } from '@/components/tender/labels'
import { tierLabel, tierIcon, sourceLabel, isDirectSource } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import Glyph from '@/components/shared/Glyph'
import { useEnsureVerified } from '@/components/shared/VerifyGate'

const SECTOR_ICONS = { civil: <Glyph e="🏗" />, architectural: <Glyph e="🏛" />, electrical: <Glyph e="⚡" />, mechanical: <Glyph e="⚙" />, equipment: <Glyph e="🚜" />, supply_store: <Glyph e="🏪" /> }
// one dark, on-brand tone per sector (no purple, no green: green means success)
const SECTOR_COLORS = { civil: '#0B2438', architectural: '#435A70', electrical: '#9D7425', mechanical: '#102E45', equipment: '#48596E', supply_store: '#8F6820' }
const SECTOR_L: Record<string, [string, string]> = {
  civil: ['Civil', 'سول'], architectural: ['Architectural', 'آرکیٹیکچرل'], electrical: ['Electrical', 'الیکٹریکل'],
  mechanical: ['Mechanical', 'مکینیکل'], equipment: ['Machinery and equipment', 'مشینری اور آلات'], supply_store: ['Supply store', 'سپلائی اسٹور'],
}
const sectorName = (s: string, locale: string) => (locale === 'ar' ? (SECTOR_LABELS as any)[s] || s : (SECTOR_L[s]?.[locale === 'ur' ? 1 : 0] || s))
const arOffers = (n: number) => arCount(n, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً')

export default function ProjectResultsPage() {
  const { id } = useParams()
  const { locale, dir } = useTranslation()
  const ensureVerified = useEnsureVerified()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const SAR = L('SAR', 'ریال', 'ر.س')
  const FWD = locale === 'en' ? '→' : '←' // «forward» points left in Arabic and Urdu
  const [notFound, setNotFound] = useState(false)
  const [project, setProject] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllOffers, setShowAllOffers] = useState<any>({})
  const [selectedOffers, setSelectedOffers] = useState<any>({}) // item_id → offer_id
  const [filter, setFilter] = useState('all') // all | has_offers | pending | accepted
  const [sectorFilter, setSectorFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [contactsById, setContactsById] = useState<any>({}) // أرقام الموردين المقبولين فقط
  const [tenderRfq, setTenderRfq] = useState<string | null>(null) // the request of the tender behind this project (UX-158)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: proj } = await supabase.from('project_rfqs').select('*').eq('id', id).maybeSingle()
      if (!proj) { setNotFound(true); setLoading(false); return }
      setProject(proj)

      const { data: projItems } = await supabase
        .from('project_rfq_items').select('*, rfq:rfqs(*, offers(*, supplier:profiles_public(company_name_ar, rating_avg, supplier_tier, latitude, longitude, verification_status, cr_verification_source)))')
        .eq('project_rfq_id', id)
        .order('sector')

      // a project sent as ONE request (since 2026-10-27) is followed on that request's page
      const rfqIds = [...new Set((projItems || []).map((it: any) => it.rfq_id).filter(Boolean))]
      // every project sent as one request (also a one-material project) is followed on the request page
      if (rfqIds.length === 1) { window.location.replace(`/contractor/rfq/${rfqIds[0]}`); return }
      setItems(projItems || [])
      // no saved items: the tender that made this project may know its request (tenders.rfq_id, round-5 UX-158)
      if (!(projItems || []).length) {
        try { const { data: tt } = await supabase.from('tenders').select('*').eq('project_rfq_id', id).limit(1); const r = (tt as any)?.[0]?.rfq_id; if (r) setTenderRfq(String(r)) } catch {}
      }

      // أرقام تواصل الموردين المقبولين فقط (RLS يسمح بعد القبول) — لا أرقام قبل الترسية
      const acceptedIds = [...new Set((projItems || []).flatMap((it: any) =>
        (it.rfq?.offers || []).filter((o: any) => o.status === 'accepted').map((o: any) => o.supplier_id)).filter(Boolean))]
      if (acceptedIds.length) {
        const { data: contacts } = await supabase.from('profiles').select('id, phone, contact_phone').in('id', acceptedIds)
        const cm: any = {}; (contacts || []).forEach((c: any) => { cm[c.id] = c.contact_phone || c.phone }); setContactsById(cm)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function acceptOffer(offerId: any, rfqId: any, itemId: any) {
    // same wording as the request page: accepting rejects the other offers and closes the request
    if (!(await askConfirm(L('Choose this offer? The other offers will be declined and the request will close.', 'یہ آفر منتخب کریں؟ باقی آفرز رد ہو جائیں گی اور درخواست بند ہو جائے گی۔', 'اختيار هذا العرض؟ ستُرفض العروض الأخرى ويُغلق الطلب.'), { okLabel: L('Choose this offer', 'یہ آفر منتخب کریں', 'اختر هذا العرض') }))) return
    if (!(await ensureVerified())) return
    const supabase = createClient()
    // Atomic: accept + reject the competing offers + close the RFQ in one
    // transaction (same as the single-RFQ flow) — prevents double-accept and
    // leaving rival offers "pending".
    const { error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    if (error) { await notify(L('Could not choose the offer: another one may already be chosen. Refresh the page and try again.', 'پیشکش منتخب نہیں ہو سکی: شاید پہلے ہی کوئی منتخب ہو چکی ہے۔ صفحہ تازہ کر کے دوبارہ کوشش کریں۔', 'تعذّر اختيار العرض، فقد يكون اختير عرض مسبقاً. حدّث الصفحة وحاول مرة أخرى.'), { tone: 'error' }); return }
    setSelectedOffers((prev: any) => ({ ...prev, [itemId]: offerId }))
    // the page is updated in place (no full reload) and says what happened (UX-104): the chosen offer is accepted,
    // the others on the same request are declined and the request closes, as accept_offer did on the server
    const supplierId: string | null = items.flatMap((it: any) => it.rfq?.offers || []).find((o: any) => o.id === offerId)?.supplier_id || null
    setItems(prev => prev.map((it: any) => {
      if (it.rfq_id !== rfqId || !it.rfq) return it
      const offers = (it.rfq.offers || []).map((o: any) => (o.id === offerId ? { ...o, status: 'accepted' } : o.status === 'pending' ? { ...o, status: 'rejected' } : o))
      return { ...it, rfq: { ...it.rfq, status: 'closed', offers } }
    }))
    // the chosen supplier's phone is readable now (RLS opens it after the award)
    if (supplierId) {
      try {
        const { data: c } = await supabase.from('profiles').select('id, phone, contact_phone').eq('id', supplierId).maybeSingle()
        if (c) setContactsById((m: any) => ({ ...m, [(c as any).id]: (c as any).contact_phone || (c as any).phone }))
      } catch { /* the phone then shows on the purchase order */ }
    }
    await notify(L('Offer chosen and the supplier was notified. The purchase order is ready.', 'آفر منتخب ہو گئی اور سپلائر کو اطلاع دے دی گئی۔ پرچیز آرڈر تیار ہے۔', 'اختير العرض وأُبلغ المورد، وأمر الشراء جاهز.'), { tone: 'success' })
  }

  // a spec key («dia») shown by its label in the page's language (round-5 UX-158)
  const attrLabel = (name: string, k: string) => { const f = getProductSpecs(name || '').find(x => x.key === k); return f ? (locale === 'en' ? f.en : f.ar) : k }
  const totalItems = items.length
  const totalOffers = items.reduce((s: any, i: any) => s + (i.rfq?.offers?.length || 0), 0)
  const acceptedItems = items.filter((i: any) => i.rfq?.offers?.some((o: any) => o.status === 'accepted')).length
  const totalAcceptedCost = items.reduce((s: any, i: any) => {
    const accepted = i.rfq?.offers?.find((o: any) => o.status === 'accepted')
    return s + (accepted ? offerComparable(accepted) : 0)
  }, 0)

  if (loading) return <PageLoader />
  if (notFound) return (
    <AppShell title={L('Project', 'پراجیکٹ', 'المشروع')} nav={getNav('contractor', locale, '/contractor/project/new')} dir={dir}>
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="text-4xl text-[#8F6820] mb-3"><Glyph e="🔍" /></div>
        <h1 className="text-lg font-bold text-[#0B2438] mb-2">{L('Project not found', 'پراجیکٹ نہیں ملا', 'لم يُعثر على المشروع')}</h1>
        <p className="text-sm text-gray-600 mb-5">{L('It may have been deleted, or it belongs to another account.', 'شاید حذف ہو گیا ہے یا کسی اور اکاؤنٹ کا ہے۔', 'ربما حُذف، أو يخص حساباً آخر.')}</p>
        <Link href="/contractor/rfqs" className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm text-white bg-[#0B2438]">{L('My requests', 'میری درخواستیں', 'طلباتي')}</Link>
      </div>
    </AppShell>
  )

  return (
    <AppShell title={locale === 'en' ? 'Project Results' : locale === 'ur' ? 'پراجیکٹ نتائج' : 'نتائج المشروع'} nav={getNav('contractor', locale, '/contractor/project/new')} dir={dir}>
      <div className="max-w-5xl mx-auto">
        {/* Project Header */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl"><Glyph e="📋" /></span>
                <h1 className="text-xl font-bold" style={{ color: '#0B2438' }}>{project?.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span><Glyph e="📍" /> {project?.city || (project?.region ? getRegionLabel(project.region, locale) : '')}</span>
                {project?.created_at && <span><Glyph e="📅" /> {new Date(project.created_at).toLocaleDateString(dateLocale(locale))}</span>}
              </div>
              {project?.boq_url && (
                <a href={fileHref(project.boq_url)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-[#8F6820] hover:underline">
                  <Glyph e="📊" /> {L('View the original bill of quantities', 'مقداروں کا اصل جدول دیکھیں', 'عرض جدول الكميات الأصلي')}
                </a>
              )}
            </div>
            <div className="text-end">
              <div className="text-2xl font-bold" style={{ color: '#8F6820' }}>
                {totalAcceptedCost > 0 ? totalAcceptedCost.toLocaleString('en-US') + ' ' + SAR : '—'}
              </div>
              <div className="text-xs text-gray-500">{L('Total of the chosen offers (final price incl. VAT)', 'منتخب پیشکشوں کا کل (حتمی قیمت، VAT سمیت)', 'إجمالي العروض المختارة (السعر النهائي شامل الضريبة)')}</div>
            </div>
          </div>
        </div>

        {/* an old project with no saved items is not a dead end: its request is followed from «طلباتي» (UX-136) */}
        {items.length === 0 && (
          <div className="bg-white rounded-2xl p-6 border border-[#D4A543]/40 shadow-sm mb-5 text-center">
            <p className="text-sm text-[#0B2438] font-semibold mb-3">{tenderRfq ? L('This project has no saved items here. Follow it on its request page.', 'اس پراجیکٹ کے آئٹمز یہاں محفوظ نہیں۔ اسے اس کی درخواست کے صفحے پر دیکھیں۔', 'لا توجد بنود محفوظة لهذا المشروع هنا، فتابعه من صفحة طلبه.') : L('This project has no saved items here. Follow it from your requests.', 'اس پراجیکٹ کے آئٹمز یہاں محفوظ نہیں۔ اسے اپنی درخواستوں سے دیکھیں۔', 'لا توجد بنود محفوظة لهذا المشروع هنا، فتابعه من طلباتك.')}</p>
            <Link href={tenderRfq ? `/contractor/rfq/${tenderRfq}` : '/contractor/rfqs'} className="inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>{tenderRfq ? L('Open the request', 'درخواست کھولیں', 'فتح الطلب') : L('Follow it from your requests', 'اپنی درخواستوں سے دیکھیں', 'تابعه من طلباتك')}</Link>
          </div>
        )}

        {/* a project with no items shows only the card above: no zero stats, no «no items match the filter» (UX-137) */}
        {items.length > 0 && (<>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 stagger">
          {[
            { label: L('Total Items', 'کل آئٹمز', 'إجمالي البنود'), value: totalItems, icon: <Glyph e="📦" />, bg: '#0B2438', f: 'all' },
            { label: L('Total Offers', 'کل پیشکشیں', 'إجمالي العروض'), value: totalOffers, icon: <Glyph e="💬" />, bg: '#D4A543', f: 'has_offers' },
            { label: L('Chosen', 'منتخب', 'مختارة'), value: acceptedItems, icon: <Glyph e="✅" />, bg: '#0F6E56', f: 'accepted' },
            // not the same count as the «بانتظار العروض» filter (items with no offer): this one counts every item not accepted yet
            { label: L('Not chosen yet', 'ابھی منتخب نہیں', 'لم يُختر بعد'), value: totalItems - acceptedItems, icon: <Glyph e="⏳" />, bg: '#435A70', f: '' },
          ].map(({ label, value, icon, bg, f }) => (
            // a card with a matching filter is a button: a tap shows those items (UX-136)
            <div key={label} role={f ? 'button' : undefined} tabIndex={f ? 0 : undefined} aria-pressed={f ? filter === f : undefined}
              onClick={f ? () => setFilter(f) : undefined} onKeyDown={f ? (e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(f) } } : undefined}
              className={`bg-white rounded-xl p-4 border shadow-sm text-center ${f ? 'cursor-pointer hover:border-[#D4A543]' : ''} ${f && filter === f && f !== 'all' ? 'border-[#D4A543]' : 'border-gray-100'}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mx-auto mb-2" style={{ background: bg, color: bg === '#D4A543' ? '#071827' : '#fff' }}>{icon}</div>
              <div className="text-xl font-bold" style={{ color: '#0B2438' }}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        {/* sticky only from a medium screen up: on a phone it would cover half the screen (UX-104) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 md:sticky md:top-[60px] md:z-20">
          <div className="flex flex-col gap-3">
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: 'all', label: L('All', 'سب', 'الكل'), icon: <Glyph e="📋" /> },
                { key: 'has_offers', label: L('Has Offers', 'قیمت موصول', 'وصل تسعير'), icon: <Glyph e="💬" /> },
                { key: 'pending', label: L('Awaiting', 'پیشکشوں کا انتظار', 'بانتظار العروض'), icon: <Glyph e="⏳" /> },
                { key: 'accepted', label: L('Chosen', 'منتخب', 'مختارة'), icon: <Glyph e="✅" /> },
              ].map((f: any) => {
                const count = f.key === 'all' ? items.length
                  : f.key === 'has_offers' ? items.filter((i: any) => (i.rfq?.offers?.length || 0) > 0 && !i.rfq?.offers?.some((o: any) => o.status === 'accepted')).length
                  : f.key === 'pending' ? items.filter((i: any) => (i.rfq?.offers?.length || 0) === 0).length
                  : items.filter((i: any) => i.rfq?.offers?.some((o: any) => o.status === 'accepted')).length
                return (
                  <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
                    className={`min-h-11 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      filter === f.key ? 'text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`} style={filter === f.key ? { background: '#0B2438' } : {}}>
                    {f.icon} {f.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === f.key ? 'bg-white/20' : 'bg-gray-200'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
            {/* Sector + Search */}
            <div className="flex gap-2">
              <select value={sectorFilter} onChange={(e: any) => setSectorFilter(e.target.value)}
                className="input-field text-sm flex-shrink-0 w-auto min-h-11" aria-label={L('Sector', 'سیکٹر', 'القطاع')}>
                <option value="all">{L('All Sectors', 'تمام سیکٹرز', 'كل القطاعات')}</option>
                {/* only the sectors this project has (UX-104) */}
                {Object.keys(SECTOR_LABELS).filter((s: string) => items.some((it: any) => it.sector === s)).map((s: any) => <option key={s} value={s}>{sectorName(s, locale)}</option>)}
              </select>
              <input value={search} onChange={(e: any) => setSearch(e.target.value)}
                className="input-field text-sm flex-1 min-h-11" aria-label={L('Search material', 'مواد تلاش کریں', 'ابحث عن مادة')} placeholder={`${L('Search material...', 'مواد تلاش کریں...', 'ابحث عن مادة...')}`} />
            </div>
          </div>
        </div>

        {/* Items with Offers */}
        <div className="space-y-4 stagger">
          {(() => {
            const filtered = items.filter((item: any) => {
              const offers = item.rfq?.offers || []
              const hasAccepted = offers.some((o: any) => o.status === 'accepted')
              // status filter
              if (filter === 'has_offers' && (offers.length === 0 || hasAccepted)) return false
              if (filter === 'pending' && offers.length > 0) return false
              if (filter === 'accepted' && !hasAccepted) return false
              // sector filter
              if (sectorFilter !== 'all' && item.sector !== sectorFilter) return false
              // search
              // the stored (Arabic) name and the name shown in the page's language (UX-137)
              const q = search.trim().toLowerCase()
              if (q && !`${item.product_name || ''} ${getProductLabel(item.product_name || '', locale)}`.toLowerCase().includes(q)) return false
              return true
            })
            if (filtered.length === 0) return (
              <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                <div className="text-5xl mb-4"><Glyph e="🔍" /></div>
                <p className="text-gray-500">{L('No items match the filter', 'فلٹر سے کوئی آئٹم میل نہیں کھاتا', 'لا توجد بنود تطابق التصفية')}</p>
              </div>
            )
            return filtered.map((item: any) => {
            const offers = item.rfq?.offers || []
            // ranked AND shown by the comparable total (VAT added where the seller charges it)
            const sortedOffers = [...offers].sort((a: any, b: any) => offerComparable(a) - offerComparable(b))
            const top3 = sortedOffers.slice(0, 3)
            const showAll = showAllOffers[item.id]
            const displayOffers = showAll ? sortedOffers : top3
            const acceptedOffer = offers.find((o: any) => o.status === 'accepted')
            const hasOffers = offers.length > 0

            return (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                acceptedOffer ? 'border-[#0F6E56]/30' : 'border-gray-100'
              }`}>
                {/* Item Header */}
                <div className="p-4 sm:p-5" style={{ background: acceptedOffer ? 'rgba(15,110,86,.06)' : (SECTOR_COLORS as any)[item.sector] + '08' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white flex-shrink-0"
                        style={{ background: (SECTOR_COLORS as any)[item.sector] }}>
                        {(SECTOR_ICONS as any)[item.sector]}
                      </div>
                      <div>
                        <div className="font-bold" style={{ color: '#0B2438' }}>{getProductLabel(item.product_name, locale)}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="badge text-xs text-white" style={{ background: (SECTOR_COLORS as any)[item.sector] }}>
                            {sectorName(item.sector, locale)}
                          </span>
                          {item.quantity && <span className="text-xs text-gray-500"><Glyph e="📦" /> {fmtNum(Number(item.quantity))} {getUnitLabel(item.unit, locale)}</span>}
                          {item.specification && <span className="text-xs text-gray-500"><Glyph e="⚙" /> {item.specification}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      {acceptedOffer ? (
                        <div>
                          <div className="text-base font-bold text-[#0F6E56]">{offerComparable(acceptedOffer).toLocaleString('en-US')} {SAR}</div>
                          <div className="badge badge-green text-xs"><Glyph e="✓" /> {L('Chosen', 'منتخب', 'مختار')}</div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-sm font-bold" style={{ color: '#8F6820' }}>{offers.length ? L(offers.length === 1 ? '1 offer' : `${offers.length} offers`, `${offers.length} پیشکشیں`, arOffers(offers.length)) : L('No offers yet', 'ابھی کوئی پیشکش نہیں', 'لا عروض بعد')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accepted offer details + PO link */}
                {acceptedOffer && (
                  <div className="px-4 sm:px-5 pt-3 pb-1">
                    <div className="bg-[#0F6E56]/[.06] rounded-xl p-3 border border-[#0F6E56]/25">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm">
                          <span className="text-gray-500">{L('Supplier: ', 'سپلائر: ', 'المورد: ')}</span>
                          <strong style={{ color: '#0B2438' }}>{acceptedOffer.supplier?.company_name_ar}</strong>
                          {contactsById[acceptedOffer.supplier_id] && <span className="text-xs text-gray-500 ms-2" dir="ltr"><Glyph e="📞" /> {contactsById[acceptedOffer.supplier_id]}</span>}
                        </div>
                        <Link href={`/contractor/orders/${acceptedOffer.id}`}
                          className="inline-flex items-center min-h-11 text-xs font-bold text-white px-4 py-2 rounded-lg transition-all hover:shadow"
                          style={{ background: '#0B2438' }}>
                          <Glyph e="📄" /> {L('View the purchase order', 'پرچیز آرڈر دیکھیں', 'عرض أمر الشراء')} {FWD}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {acceptedOffer.attachment_url && (
                          <a href={fileHref(acceptedOffer.attachment_url)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 min-h-11 text-xs bg-white text-[#0B2438] px-3 rounded-lg font-semibold border border-gray-200">
                            <Glyph e="📎" /> {acceptedOffer.attachment_name || L('Catalog', 'کیٹلاگ', 'كتالوج')}
                          </a>
                        )}
                        {acceptedOffer.supplier?.latitude && acceptedOffer.supplier?.longitude && (
                          <a href={`https://www.google.com/maps?q=${acceptedOffer.supplier.latitude},${acceptedOffer.supplier.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 min-h-11 text-xs bg-white text-[#0B2438] px-3 rounded-lg font-semibold border border-gray-200">
                            <Glyph e="🗺" /> {L('Supplier location', 'سپلائر کا مقام', 'موقع المورد')}
                          </a>
                        )}
                        {acceptedOffer.attributes && Object.entries(acceptedOffer.attributes).map(([k, v]: any) => (
                          <span key={k} className="text-xs bg-white text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                            {attrLabel(item.product_name, k)}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Offers */}
                {hasOffers ? (
                  <div className="p-4 sm:p-5">
                    {!acceptedOffer && (
                      <div className="text-xs font-bold text-gray-500 mb-3">
                        <Glyph e="🏆" /> {L('Top 3 Cheapest Offers', 'سب سے سستی 3 پیشکشیں', 'أفضل 3 عروض سعراً')}
                      </div>
                    )}

                    <div className="space-y-2">
                      {displayOffers.map((offer: any, rank: any) => (
                        <div key={offer.id} className={`rounded-xl p-3 border transition-all ${
                          offer.status === 'accepted' ? 'border-[#0F6E56]/40 bg-[#0F6E56]/[.06]' :
                          rank === 0 && !acceptedOffer ? 'border-[#D4A543]/40 bg-[#D4A543]/5' : 'border-gray-100'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {rank === 0 && !acceptedOffer && <span className="text-sm"><Glyph e="🥇" /></span>}
                              {rank === 1 && !acceptedOffer && <span className="text-sm"><Glyph e="🥈" /></span>}
                              {rank === 2 && !acceptedOffer && <span className="text-sm"><Glyph e="🥉" /></span>}
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate" style={{ color: '#0B2438' }}>
                                  {offer.supplier?.company_name_ar}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                  {offer.supplier?.supplier_tier && (
                                    <span><SellerIcon name={tierIcon(offer.supplier.supplier_tier)} /> {tierLabel(offer.supplier.supplier_tier, locale)}</span>
                                  )}
                                  {offer.supplier?.verification_status === 'verified' && (
                                    <span title={offer.supplier?.cr_verification_source === 'wathq' ? L('Verified through Wathq', 'واثق کے ذریعے تصدیق شدہ', 'موثّق عبر واثق') : L('Verified', 'تصدیق شدہ', 'موثّق')} style={{ color: '#0F6E56', fontWeight: 700 }}>
                                      {offer.supplier?.cr_verification_source === 'wathq' ? <Glyph e="🛡" /> : <Glyph e="✓" />}
                                    </span>
                                  )}
                                  {offer.supplier?.rating_avg > 0 && <span><Glyph e="⭐" /> {offer.supplier.rating_avg}</span>}
                                  {offer.delivery_days && <span><Glyph e="📦" /> {daysText(offer.delivery_days, locale)}</span>}
                                  {!isDirectSource(offer.source_type) && (
                                    <span className="font-bold text-[#8F6820]">{L('Sourced price', 'منقول قیمت', 'سعر منقول')}{sourceLabel(offer.source_type, locale as any) ? ` · ${sourceLabel(offer.source_type, locale as any)}` : ''}</span>
                                  )}
                                  {/* 🔒 الرقم لا يظهر قبل القبول */}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-end">
                                <div className="font-bold text-sm" style={{ color: rank === 0 && !acceptedOffer ? '#8F6820' : '#0B2438' }}>
                                  {offerComparable(offer).toLocaleString('en-US')} {SAR}
                                </div>
                                <div className="text-xs text-gray-500 max-w-[180px]">{vatTag(offer, locale)}</div>
                                {offer.unit_price && (
                                  <div className="text-xs text-gray-500">{lineComparable(offer.unit_price, offer).toLocaleString('en-US', { maximumFractionDigits: 2 })} / {getUnitLabel(item.unit, locale)}</div>
                                )}
                                {offer.extra_charges && offer.extra_charges.length > 0 && (
                                  <div className="text-xs text-[#8F6820]"
                                    title={offer.extra_charges.map((e: any) => `${e.label}: ${lineComparable(e.amount, offer).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${SAR}`).join('  •  ')}>
                                    {(() => { const x = lineComparable(offer.extra_charges.reduce((s: any, e: any) => s + (Number(e.amount) || 0), 0), offer).toLocaleString('en-US', { maximumFractionDigits: 2 }); return L(`Includes extras worth ${x} ${SAR}`, `${x} ${SAR} کے اضافی اخراجات شامل ہیں`, `يشمل إضافات بقيمة ${x} ${SAR}`) })()} <Glyph e="ℹ" />
                                  </div>
                                )}
                              </div>
                              {offer.status === 'accepted' ? (
                                <span className="badge badge-green text-xs" aria-label={L('Chosen', 'منتخب', 'مختار')}><Glyph e="✓" /></span>
                              ) : !acceptedOffer && (
                                <button type="button" onClick={() => acceptOffer(offer.id, item.rfq_id, item.id)}
                                  className="min-h-11 text-sm px-4 rounded-xl font-bold text-[#071827] transition-all hover:shadow"
                                  style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                                  {L('Choose this offer', 'یہ آفر منتخب کریں', 'اختر هذا العرض')}
                                </button>
                              )}
                            </div>
                          </div>
                          {offer.notes && <p className="text-xs text-gray-500 mt-1 pe-6">{offer.notes}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Show more/less */}
                    {offers.length > 3 && !acceptedOffer && (
                      <button type="button" onClick={() => setShowAllOffers((prev: any) => ({ ...prev, [item.id]: !showAll }))}
                        className="mt-2 min-h-11 text-xs font-semibold w-full text-center py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                        {showAll
                          ? <><Glyph e="▴" /> {L('Show the top 3 only', 'صرف بہترین 3 دکھائیں', 'عرض أفضل 3 فقط')}</>
                          : <><Glyph e="▾" /> {L(`Show all ${offers.length} offers`, `تمام ${offers.length} پیشکشیں دکھائیں`, `عرض كل العروض (${arOffers(offers.length)})`)}</>}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-400">
                    <Glyph e="⏳" /> {L('Waiting for offers...', 'پیشکشوں کا انتظار ہے...', 'في انتظار العروض...')}
                  </div>
                )}
              </div>
            )
            })
          })()}
        </div>
        </>)}

        {/* Summary if all accepted */}
        {acceptedItems > 0 && (
          <div className="mt-5 bg-[#0F6E56]/[.06] rounded-2xl p-5 border border-[#0F6E56]/25">
            <h3 className="font-bold text-[#0B2438] mb-3">
              <Glyph e="📊" /> {L('Project Cost Summary', 'پراجیکٹ کی لاگت کا خلاصہ', 'ملخص تكلفة المشروع')}
            </h3>
            <div className="space-y-2">
              {items.filter((i: any) => i.rfq?.offers?.some((o: any) => o.status === 'accepted')).map((item: any) => {
                const acc = item.rfq.offers.find((o: any) => o.status === 'accepted')
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate me-4">{getProductLabel(item.product_name, locale)}</span>
                    <span className="font-semibold text-[#0F6E56] flex-shrink-0">{offerComparable(acc).toLocaleString('en-US')} {SAR}</span>
                  </div>
                )
              })}
              <div className="border-t border-[#0F6E56]/25 pt-2 flex justify-between font-bold">
                <span style={{ color: '#0B2438' }}>{L('Total', 'کل', 'الإجمالي')}</span>
                <span style={{ color: '#8F6820' }}>{totalAcceptedCost.toLocaleString('en-US')} {SAR}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
