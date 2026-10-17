'use client'

import RequestsTabs from '@/components/buyer/RequestsTabs'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { getProductLabel, getUnitLabel } from '@/types'
import { productImageUrl, imgFallback } from '@/lib/productImage'
import { rfqRef, rfqDate } from '@/lib/rfqName'
import { isExpired, formatTimeLeft, deadlineUrgency, urgencyStyle } from '@/lib/deadline'
import Glyph from '@/components/shared/Glyph'

// «طلباتي»: every request of the buyer with its details — reference, date, materials (with
// pictures), offers received, deadline and status — filterable and searchable; a card opens the
// request page with its offers.

type Filter = 'all' | 'open' | 'closed' | 'ended'

export default function MyRequestsPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(true)
  const [rfqs, setRfqs] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { window.location.href = '/login?next=/contractor/rfqs'; return }
      const { data } = await sb.from('rfqs').select('*').eq('contractor_id', session.user.id).order('created_at', { ascending: false }).limit(300)
      setRfqs(data || [])
      setLoading(false)
    })()
  }, [])

  const stateOf = (r: any): Exclude<Filter, 'all'> =>
    r.status === 'closed' ? 'closed' : (r.status === 'open' && !isExpired(r.expires_at)) ? 'open' : 'ended'

  const counts = useMemo(() => ({
    all: rfqs.length,
    open: rfqs.filter(r => stateOf(r) === 'open').length,
    closed: rfqs.filter(r => stateOf(r) === 'closed').length,
    ended: rfqs.filter(r => stateOf(r) === 'ended').length,
  }), [rfqs]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = rfqs.filter(r => {
    if (filter !== 'all' && stateOf(r) !== filter) return false
    const t = q.trim()
    if (!t) return true
    const items = Array.isArray(r.items) ? r.items : []
    return rfqRef(r).includes(t) || String(r.title || '').includes(t) || String(r.product_name || '').includes(t)
      || items.some((it: any) => String(it.product_name || '').includes(t))
  })

  // Delete every ended request at once. A request with an accepted offer or an awarded item is a
  // deal and is kept.
  async function deleteEnded() {
    const ended = rfqs.filter(r => stateOf(r) === 'ended')
    if (!ended.length) return
    if (!confirm(L(`Delete all ${ended.length} ended requests? This cannot be undone.`, `تمام ${ended.length} ختم شدہ درخواستیں حذف کریں؟`,
      `حذف جميع الطلبات المنتهية (${ended.length})؟ لا يمكن التراجع عن ذلك.`))) return
    setDeleting(true)
    const sb = createClient()
    const ids = ended.map(r => r.id)
    const [{ data: acc }, { data: aw }] = await Promise.all([
      sb.from('offers').select('rfq_id').in('rfq_id', ids).eq('status', 'accepted'),
      sb.from('rfq_item_awards').select('rfq_id').in('rfq_id', ids),
    ])
    const keep = new Set([...(acc || []), ...(aw || [])].map((x: any) => x.rfq_id))
    const gone: string[] = []
    for (const id of ids) {
      if (keep.has(id)) continue
      const { error } = await sb.rpc('delete_rfq', { p_rfq_id: id })
      if (!error) gone.push(id)
    }
    setRfqs(prev => prev.filter(r => !gone.includes(r.id)))
    setDeleting(false)
    const left = ids.length - gone.length
    if (left) alert(L(`${left} request(s) were kept because they have a deal.`, `${left} درخواستیں رکھی گئیں۔`, `أُبقي ${left} من الطلبات لأنها تتضمّن صفقة.`))
  }

  const badge = (r: any) => {
    const s = stateOf(r)
    if (s === 'closed') return { t: L('Deal done', 'سودا مکمل', 'تمّ اختيار العرض'), c: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (s === 'open') return { t: L('Receiving offers', 'آفرز آ رہی ہیں', 'يستقبل العروض'), c: 'bg-blue-50 text-blue-700 border-blue-200' }
    return { t: r.status === 'cancelled' ? L('Cancelled', 'منسوخ', 'ملغى') : L('Ended', 'ختم', 'انتهت المهلة'), c: 'bg-gray-100 text-gray-500 border-gray-200' }
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title={L('My requests', 'میری درخواستیں', 'طلباتي')} nav={getNav('contractor', locale, '/contractor/rfqs')} dir={dir}>
      <div className="max-w-5xl mx-auto space-y-4">
        <RequestsTabs active="requests" locale={locale} />
        <div className="flex flex-wrap items-center gap-2">
          {([['all', L('All', 'سب', 'الكل')], ['open', L('Open', 'کھلی', 'مفتوحة')], ['closed', L('Deal done', 'مکمل', 'تمّ اختيار العرض')], ['ended', L('Ended', 'ختم', 'منتهية')]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-all ${filter === k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
              style={filter === k ? { background: '#0B2438' } : undefined}>
              {label} <span className="opacity-70">({counts[k]})</span>
            </button>
          ))}
          {filter === 'ended' && counts.ended > 0 && (
            <button type="button" onClick={deleteEnded} disabled={deleting}
              className="px-3.5 py-2 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50">
              <Glyph e="🗑" /> {deleting ? L('Deleting…', 'حذف ہو رہا ہے…', 'جارٍ الحذف…') : L(`Delete all (${counts.ended})`, `سب حذف کریں (${counts.ended})`, `حذف الكل (${counts.ended})`)}
            </button>
          )}
          <input value={q} onChange={e => setQ(e.target.value)} className="input-field max-w-xs ms-auto"
            placeholder={L('Search by number or material…', 'نمبر یا سامان سے تلاش…', 'ابحث برقم الطلب أو المادة…')} />
          <Link href="/contractor/rfq/quick" className="btn-orange px-4 py-2.5 rounded-xl font-bold text-sm">+ {L('New request', 'نئی درخواست', 'طلب جديد')}</Link>
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
            <div className="text-4xl mb-2"><Glyph e="🧾" /></div>
            {rfqs.length === 0 ? L('No requests yet.', 'ابھی کوئی درخواست نہیں۔', 'لا توجد طلبات بعد.') : L('Nothing matches.', 'کچھ نہیں ملا۔', 'لا توجد طلبات مطابقة.')}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(r => {
              const items: any[] = Array.isArray(r.items) && r.items.length ? r.items : [{ product_name: r.product_name, quantity: r.quantity, unit: r.unit, sector: r.sector }]
              const b = badge(r)
              const open = stateOf(r) === 'open'
              const u = open && r.expires_at ? urgencyStyle(deadlineUrgency(r.expires_at)) : null
              const offers = Number(r.offer_count || 0)
              return (
                <Link key={r.id} href={`/contractor/rfq/${r.id}`}
                  className="block bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:border-[#D4A543]/50 hover:shadow transition-all">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#9D7425] font-mono" dir="ltr">{rfqRef(r)}</div>
                      <div className="font-extrabold text-navy" dir="auto">{r.title || L(`${items.length} material(s)`, `${items.length} اشیاء`, items.length === 1 ? 'مادة واحدة' : `${items.length} مواد`)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{rfqDate(r, locale)}{r.city || r.region ? ` · ${r.city || r.region}` : ''}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${b.c}`}>{b.t}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${offers ? 'bg-[#D4A543]/10 text-[#9D7425] border-[#D4A543]/30' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        {offers ? L(`${offers} offer(s)`, `${offers} آفرز`, offers === 1 ? 'عرض واحد' : `${offers} عروض`) : L('No offers yet', 'ابھی کوئی آفر نہیں', 'لا عروض بعد')}
                      </span>
                      {u && <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: u.bg, color: u.fg, border: `1px solid ${u.border}` }}><Glyph e="⏰" /> {formatTimeLeft(r.expires_at, locale)}</span>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.slice(0, 6).map((it: any, k: number) => (
                      <div key={k} className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 pe-3 ps-1.5 py-1.5 max-w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.photo_url ? undefined : productImageUrl(it.product_name)} alt="" loading="lazy" onError={(e: any) => imgFallback(e, it.sub_category)}
                          className={`w-9 h-9 rounded-lg object-contain bg-white shrink-0 ${it.photo_url ? 'hidden' : ''}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-800 truncate max-w-[12rem]" dir="auto">{getProductLabel(it.product_name, locale)}</div>
                          <div className="text-[11px] text-gray-500">{Number(it.quantity || 0).toLocaleString('en-US')} {getUnitLabel(it.unit, locale)}</div>
                        </div>
                      </div>
                    ))}
                    {items.length > 6 && <span className="self-center text-xs text-gray-400">+{items.length - 6}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
