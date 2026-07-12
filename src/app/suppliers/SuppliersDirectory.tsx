'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { scoreColor, approvalLabel } from '@/lib/supplierScore'
import { SECTOR_LABELS } from '@/types'

// دليل الموردين مع بحث وفلاتر (منطقة/قطاع/نوع/موثّق) — يستقبل القائمة مُرتّبة
// ومحسوبة الدرجة من صفحة الخادم ويُصفّيها في المتصفح (قائمة محدودة).
const TIERS: Record<string, string> = {
  manufacturer: '🏭 مصنع / مورد رئيسي',
  commercial: '🏪 مورد تجاري',
  local: '🏬 مورد محلي',
}

function rankBadge(i: number) {
  if (i === 0) return { e: '🥇', c: '#D4AF37' }
  if (i === 1) return { e: '🥈', c: '#9CA3AF' }
  if (i === 2) return { e: '🥉', c: '#CD7F32' }
  return { e: `${i + 1}`, c: '#1B2D5B' }
}

const selectCls = 'border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none focus:border-[#F5831F] bg-white text-gray-700'

export default function SuppliersDirectory({ suppliers }: { suppliers: any[] }) {
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [sector, setSector] = useState('')
  const [tier, setTier] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const regions = useMemo(() => Array.from(new Set(suppliers.map((s: any) => s.region).filter(Boolean))).sort() as string[], [suppliers])

  const filtered = useMemo(() => {
    const needle = q.trim()
    return suppliers.filter((s: any) =>
      (needle === '' || (s.company_name_ar || '').includes(needle)) &&
      (region === '' || s.region === region) &&
      (sector === '' || (Array.isArray(s.sectors) && s.sectors.includes(sector))) &&
      (tier === '' || s.supplier_tier === tier) &&
      (!verifiedOnly || s.verification_status === 'verified')
    )
  }, [suppliers, q, region, sector, tier, verifiedOnly])

  const anyFilter = !!(q || region || sector || tier || verifiedOnly)
  const clear = () => { setQ(''); setRegion(''); setSector(''); setTier(''); setVerifiedOnly(false) }

  return (
    <>
      {/* الفلاتر */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="🔍 ابحث باسم المورد..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5831F] mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={region} onChange={(e: any) => setRegion(e.target.value)} className={selectCls}>
            <option value="">كل المناطق</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={sector} onChange={(e: any) => setSector(e.target.value)} className={selectCls}>
            <option value="">كل القطاعات</option>
            {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select>
          <select value={tier} onChange={(e: any) => setTier(e.target.value)} className={selectCls}>
            <option value="">كل الأنواع</option>
            <option value="manufacturer">مصنع / رئيسي</option>
            <option value="commercial">تجاري</option>
            <option value="local">محلي</option>
          </select>
          <button type="button" onClick={() => setVerifiedOnly((v) => !v)}
            className={`rounded-xl px-2 py-2 text-sm font-semibold border transition-colors ${verifiedOnly ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F6E56]/40'}`}>
            ✓ موثّق فقط
          </button>
        </div>
        {anyFilter && (
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-gray-500">{filtered.length} نتيجة</span>
            <button onClick={clear} className="text-[#F5831F] font-bold hover:underline">مسح الفلاتر ✕</button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <p className="font-bold text-gray-700 mb-1">لا يوجد مورد مطابق</p>
          <p className="text-sm text-gray-400">جرّب توسيع الفلاتر أو مسحها.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any, i: number) => {
            const rb = rankBadge(i)
            const rating = Number(r.rating_avg) || 0
            return (
              <Link key={r.supplier_id} href={`/suppliers/${r.supplier_id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-[#F5831F]/40 transition-colors">
                <div className="w-10 h-10 shrink-0 grid place-items-center rounded-xl font-extrabold text-lg" style={{ color: rb.c, background: `${rb.c}14` }}>{rb.e}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm truncate" style={{ color: '#1B2D5B' }}>{r.company_name_ar || 'مورد'}</span>
                    {r.verification_status === 'verified' && <span className="badge text-[10px]" style={{ background: '#0F6E5614', color: '#0F6E56' }}>✓ موثّق</span>}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{TIERS[r.supplier_tier] || '🏬 مورد'}</span>
                    {r.region && <span>📍 {r.region}</span>}
                    {rating > 0 && <span>⭐ {rating.toFixed(1)}</span>}
                    <span>📦 {r.total_offers} عرض</span>
                    <span>🤝 {r.won_deals} صفقة</span>
                  </div>
                  {Array.isArray(r.approvals) && r.approvals.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {r.approvals.slice(0, 4).map((a: string) => (
                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#1B2D5B0d', color: '#1B2D5B' }}>🏅 {approvalLabel(a)}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-center">
                  <div className="w-14 h-14 grid place-items-center rounded-full font-extrabold text-lg text-white" style={{ background: scoreColor(r.score) }}>{r.score}</div>
                  <div className="text-[9px] text-gray-400 mt-1">من ١٠٠</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
