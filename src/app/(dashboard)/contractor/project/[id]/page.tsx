// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS } from '@/types'

const SECTOR_ICONS = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️' }
const SECTOR_COLORS = { civil: '#1B2D5B', architectural: '#7c3aed', electrical: '#F5831F', mechanical: '#0F6E56' }

export default function ProjectResultsPage() {
  const { id } = useParams()
  const { locale, dir } = useTranslation()
  const [project, setProject] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllOffers, setShowAllOffers] = useState({})
  const [selectedOffers, setSelectedOffers] = useState({}) // item_id → offer_id

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: proj } = await supabase.from('project_rfqs').select('*').eq('id', id).single()
      setProject(proj)

      const { data: projItems } = await supabase
        .from('project_rfq_items').select('*, rfq:rfqs(*, offers(*, supplier:profiles(company_name_ar, phone, rating_avg, supplier_tier)))')
        .eq('project_rfq_id', id)
        .order('sector')

      setItems(projItems || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function acceptOffer(offerId, rfqId, itemId) {
    const supabase = createClient()
    await supabase.from('offers').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', offerId)
    await supabase.from('rfqs').update({ status: 'closed' }).eq('id', rfqId)
    setSelectedOffers(prev => ({ ...prev, [itemId]: offerId }))
    // Reload
    window.location.reload()
  }

  const totalItems = items.length
  const totalOffers = items.reduce((s, i) => s + (i.rfq?.offers?.length || 0), 0)
  const acceptedItems = items.filter(i => i.rfq?.offers?.some(o => o.status === 'accepted')).length
  const totalAcceptedCost = items.reduce((s, i) => {
    const accepted = i.rfq?.offers?.find(o => o.status === 'accepted')
    return s + (accepted?.total_price || 0)
  }, 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>جارٍ التحميل...</div>
      </div>
    </div>
  )

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
            <a href="/contractor" className="text-xs text-gray-400 hover:text-gray-600">← {locale === 'en' ? 'Dashboard' : 'لوحة التحكم'}</a>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        {/* Project Header */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm mb-5 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📋</span>
                <h1 className="text-xl font-bold" style={{ color: '#1B2D5B' }}>{project?.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>📍 {project?.region}{project?.city ? ` - ${project.city}` : ''}</span>
                <span>📅 {new Date(project?.created_at).toLocaleDateString('ar-SA')}</span>
              </div>
              {project?.boq_url && (
                <a href={project.boq_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                  📊 {locale === 'en' ? 'View Original BOQ' : 'عرض BOQ الأصلي'}
                </a>
              )}
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold" style={{ color: '#F5831F' }}>
                {totalAcceptedCost > 0 ? totalAcceptedCost.toLocaleString() + ' ر.س' : '—'}
              </div>
              <div className="text-xs text-gray-400">{locale === 'en' ? 'Total Accepted' : 'إجمالي المقبول'}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 stagger">
          {[
            { label: locale === 'en' ? 'Total Items' : 'إجمالي البنود', value: totalItems, icon: '📦', bg: '#1B2D5B' },
            { label: locale === 'en' ? 'Total Offers' : 'إجمالي العروض', value: totalOffers, icon: '💬', bg: '#F5831F' },
            { label: locale === 'en' ? 'Accepted' : 'مقبولة', value: acceptedItems, icon: '✅', bg: '#0F6E56' },
            { label: locale === 'en' ? 'Pending' : 'قيد المراجعة', value: totalItems - acceptedItems, icon: '⏳', bg: '#7c3aed' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base text-white mx-auto mb-2" style={{ background: bg }}>{icon}</div>
              <div className="text-xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Items with Offers */}
        <div className="space-y-4 stagger">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500">{locale === 'en' ? 'No items found' : 'لا توجد بنود'}</p>
            </div>
          ) : items.map(item => {
            const offers = item.rfq?.offers || []
            const sortedOffers = [...offers].sort((a, b) => a.total_price - b.total_price)
            const top3 = sortedOffers.slice(0, 3)
            const showAll = showAllOffers[item.id]
            const displayOffers = showAll ? sortedOffers : top3
            const acceptedOffer = offers.find(o => o.status === 'accepted')
            const hasOffers = offers.length > 0

            return (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                acceptedOffer ? 'border-emerald-200' : 'border-gray-100'
              }`}>
                {/* Item Header */}
                <div className="p-4 sm:p-5" style={{ background: acceptedOffer ? '#ecfdf5' : SECTOR_COLORS[item.sector] + '08' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white flex-shrink-0"
                        style={{ background: SECTOR_COLORS[item.sector] }}>
                        {SECTOR_ICONS[item.sector]}
                      </div>
                      <div>
                        <div className="font-bold" style={{ color: '#1B2D5B' }}>{item.product_name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="badge text-[10px] text-white" style={{ background: SECTOR_COLORS[item.sector] }}>
                            {SECTOR_LABELS[item.sector]}
                          </span>
                          {item.quantity && <span className="text-xs text-gray-500">📦 {item.quantity} {item.unit}</span>}
                          {item.specification && <span className="text-xs text-gray-400">⚙️ {item.specification}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      {acceptedOffer ? (
                        <div>
                          <div className="text-base font-bold text-emerald-600">{acceptedOffer.total_price?.toLocaleString()} ر.س</div>
                          <div className="badge badge-green text-[10px]">✓ {locale === 'en' ? 'Accepted' : 'مقبول'}</div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-xl font-bold" style={{ color: '#F5831F' }}>{offers.length}</div>
                          <div className="text-[10px] text-gray-400">{locale === 'en' ? 'offers' : 'عرض'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Offers */}
                {hasOffers ? (
                  <div className="p-4 sm:p-5">
                    {!acceptedOffer && (
                      <div className="text-xs font-bold text-gray-500 mb-3">
                        🏆 {locale === 'en' ? 'Top 3 Cheapest Offers' : 'أفضل 3 عروض سعراً'}
                      </div>
                    )}

                    <div className="space-y-2">
                      {displayOffers.map((offer, rank) => (
                        <div key={offer.id} className={`rounded-xl p-3 border transition-all ${
                          offer.status === 'accepted' ? 'border-emerald-300 bg-emerald-50' :
                          rank === 0 && !acceptedOffer ? 'border-[#F5831F]/40 bg-[#F5831F]/5' : 'border-gray-100'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {rank === 0 && !acceptedOffer && <span className="text-sm">🥇</span>}
                              {rank === 1 && !acceptedOffer && <span className="text-sm">🥈</span>}
                              {rank === 2 && !acceptedOffer && <span className="text-sm">🥉</span>}
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate" style={{ color: '#1B2D5B' }}>
                                  {offer.supplier?.company_name_ar}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                                  {offer.supplier?.supplier_tier && (
                                    <span>{offer.supplier.supplier_tier === 'manufacturer' ? '🏭' : offer.supplier.supplier_tier === 'commercial' ? '🏪' : '🏬'}</span>
                                  )}
                                  {offer.supplier?.rating_avg > 0 && <span>⭐ {offer.supplier.rating_avg}</span>}
                                  {offer.delivery_days && <span>📦 {offer.delivery_days} {locale === 'en' ? 'days' : 'يوم'}</span>}
                                  {offer.supplier?.phone && <span>📞 {offer.supplier.phone}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="font-bold text-sm" style={{ color: rank === 0 && !acceptedOffer ? '#F5831F' : '#1B2D5B' }}>
                                  {offer.total_price?.toLocaleString()} ر.س
                                </div>
                                {offer.unit_price && (
                                  <div className="text-[10px] text-gray-400">{offer.unit_price?.toLocaleString()} / {item.unit}</div>
                                )}
                              </div>
                              {offer.status === 'accepted' ? (
                                <span className="badge badge-green text-[10px]">✓</span>
                              ) : !acceptedOffer && (
                                <button onClick={() => acceptOffer(offer.id, item.rfq_id, item.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:shadow"
                                  style={{ background: '#0F6E56' }}>
                                  {locale === 'en' ? 'Accept' : 'قبول'}
                                </button>
                              )}
                            </div>
                          </div>
                          {offer.notes && <p className="text-[10px] text-gray-400 mt-1 pr-6">{offer.notes}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Show more/less */}
                    {offers.length > 3 && !acceptedOffer && (
                      <button onClick={() => setShowAllOffers(prev => ({ ...prev, [item.id]: !showAll }))}
                        className="mt-2 text-xs font-semibold w-full text-center py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                        {showAll
                          ? (locale === 'en' ? `▲ Show top 3 only` : '▲ عرض أفضل 3 فقط')
                          : (locale === 'en' ? `▼ Show all ${offers.length} offers` : `▼ عرض كل ${offers.length} عرض`)}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-400">
                    ⏳ {locale === 'en' ? 'Waiting for offers...' : 'في انتظار العروض...'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary if all accepted */}
        {acceptedItems > 0 && (
          <div className="mt-5 bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
            <h3 className="font-bold text-emerald-800 mb-3">
              📊 {locale === 'en' ? 'Project Cost Summary' : 'ملخص تكلفة المشروع'}
            </h3>
            <div className="space-y-2">
              {items.filter(i => i.rfq?.offers?.some(o => o.status === 'accepted')).map(item => {
                const acc = item.rfq.offers.find(o => o.status === 'accepted')
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate ml-4">{item.product_name}</span>
                    <span className="font-semibold text-emerald-700 flex-shrink-0">{acc.total_price?.toLocaleString()} ر.س</span>
                  </div>
                )
              })}
              <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold">
                <span style={{ color: '#1B2D5B' }}>{locale === 'en' ? 'Total' : 'الإجمالي'}</span>
                <span style={{ color: '#F5831F' }}>{totalAcceptedCost.toLocaleString()} ر.س</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
