'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRFQs } from '@/hooks/useRFQ'
import { useNotifications } from '@/hooks/useNotifications'
import { SECTOR_LABELS, type Sector } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function ContractorDashboard() {
  const { profile } = useAuth()
  const { rfqs, loading, createRFQ } = useRFQs(profile?.id)
  const { unreadCount } = useNotifications(profile?.id)

  const activeRFQs = rfqs.filter(r => r.status === 'open')
  const totalOffers = rfqs.reduce((sum, r) => sum + (r.offer_count || 0), 0)
  const completedDeals = rfqs.filter(r => r.status === 'closed').length

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-sm text-gray-500">أهلاً، {profile?.company_name_ar}</p>
        </div>
        <a href="/contractor/rfq/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700">
          + طلب تسعير جديد
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'طلب نشط', value: activeRFQs.length },
          { label: 'عرض وصل', value: totalOffers },
          { label: 'صفقة مكتملة', value: completedDeals },
          { label: 'إشعارات', value: unreadCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent RFQs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">آخر الطلبات</h2>
          <a href="/contractor/rfqs" className="text-xs text-blue-600">عرض الكل</a>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">جارٍ التحميل...</div>
        ) : rfqs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">لا يوجد طلبات بعد</p>
            <a href="/contractor/rfq/new" className="text-blue-600 text-sm font-medium mt-2 block">
              أرسل أول طلب تسعير ←
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {rfqs.slice(0, 5).map(rfq => (
              <a key={rfq.id} href={`/contractor/rfqs/${rfq.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">
                      {rfq.product_name} — {rfq.quantity} {rfq.unit}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3">
                      <span>{SECTOR_LABELS[rfq.sector as Sector]}</span>
                      <span>{rfq.region}</span>
                      <span>{formatDistanceToNow(new Date(rfq.created_at), { locale: ar, addSuffix: true })}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    rfq.status === 'open' ? 'bg-amber-100 text-amber-800' :
                    rfq.status === 'closed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {rfq.offer_count} عرض
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
