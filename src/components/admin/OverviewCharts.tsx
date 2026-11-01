'use client'
// Hand-drawn SVG charts for the owner dashboard (/admin/overview) — no chart library.
// Brand palette: navy #0B2438, gold #D4A543, dark gold #8F6820, green #0F6E56.
import { useState, type PointerEvent } from 'react'

export const NAVY = '#0B2438'
export const GOLD = '#D4A543'
export const DARK_GOLD = '#8F6820'
export const GREEN = '#0F6E56'

/** A count/number with en-US grouping, or «—» when there is no data. */
export const fmt = (n: any, digits = 0) =>
  n === null || n === undefined || n === '' || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits })
export const sar = (n: any) => (fmt(n) === '—' ? '—' : `${fmt(n)} ر.س`)
export const isNum = (n: any) => n !== null && n !== undefined && n !== '' && !Number.isNaN(Number(n))

/** Short Arabic relative time («منذ 3 د»), Latin digits. */
export function ago(d: any) {
  if (!d) return '—'
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'الآن'
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`
  return `منذ ${Math.floor(s / 86400)} يوم`
}

const dayLabel = (d: string) => {
  const dt = new Date(d + 'T00:00:00')
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' })
}

function niceStep(raw: number) {
  if (raw <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

// ===== Donut =====
export function Donut({ parts, center, centerLabel }: { parts: { label: string; value: number; color: string }[]; center: string; centerLabel: string }) {
  const total = parts.reduce((s, p) => s + (p.value || 0), 0)
  const r = 54
  const C = 2 * Math.PI * r
  let off = 0
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0" role="img" aria-label={centerLabel}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF1F5" strokeWidth="18" />
        {total > 0 && parts.map((p) => {
          const len = (p.value / total) * C
          const el = (
            <circle key={p.label} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="18"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)">
              <title>{`${p.label}: ${fmt(p.value)}`}</title>
            </circle>
          )
          off += len
          return el
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill={NAVY} style={{ fontVariantNumeric: 'tabular-nums' }}>{center}</text>
        <text x="70" y="88" textAnchor="middle" fontSize="11" fill="#6B7A8C">{centerLabel}</text>
      </svg>
      <ul className="space-y-1.5 text-sm min-w-[150px] flex-1">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
            <span className="text-gray-600 flex-1">{p.label}</span>
            <span className="font-bold tabular-nums" style={{ color: NAVY }}>{fmt(p.value)}</span>
            <span className="text-[11px] text-gray-400 tabular-nums w-10 text-left">{total ? Math.round((p.value / total) * 100) + '%' : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ===== Line / area chart over a daily series =====
export function LineChart({ points, money = false }: { points: { day: string; v: number }[]; money?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 230, padL = 52, padR = 14, padT = 14, padB = 30
  const pw = W - padL - padR, ph = H - padT - padB
  const n = points.length
  const max = Math.max(0, ...points.map((p) => p.v || 0))
  const allZero = max === 0
  const step = niceStep(allZero ? 1 : max / 3)
  const top = allZero ? 3 : Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let t = 0; t <= top + 1e-9; t += allZero ? 1 : step) ticks.push(t)
  const x = (i: number) => padL + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw)
  const y = (v: number) => padT + ph - (v / top) * ph
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v || 0).toFixed(1)}`).join(' ')
  const area = n ? `${line} L${x(n - 1).toFixed(1)},${padT + ph} L${x(0).toFixed(1)},${padT + ph} Z` : ''
  const labelEvery = Math.max(1, Math.ceil(n / 6))
  const tickFmt = (t: number) => (t >= 1_000_000 ? fmt(t / 1_000_000, 1) + 'M' : t >= 10_000 ? fmt(t / 1000, 0) + 'K' : fmt(t))

  function pick(e: PointerEvent<SVGSVGElement>) {
    if (!n) return
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = ((e.clientX - rect.left) / rect.width) * W
    const i = n <= 1 ? 0 : Math.round(((sx - padL) / pw) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  const h = hover !== null ? points[hover] : null
  const tipW = 132
  const tipX = h ? Math.min(W - padR - tipW, Math.max(padL, x(hover!) - tipW / 2)) : 0

  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block touch-none select-none" role="img"
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="ovArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#E8ECF1" strokeDasharray={t ? '3 4' : undefined} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7A8C" style={{ fontVariantNumeric: 'tabular-nums' }}>{tickFmt(t)}</text>
          </g>
        ))}
        {points.map((p, i) => (i % labelEvery === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= labelEvery / 2) ? (
          <text key={p.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7A8C">{dayLabel(p.day)}</text>
        ) : null)}
        {!allZero && <path d={area} fill="url(#ovArea)" />}
        <path d={line} fill="none" stroke={allZero ? '#B8C2CE' : NAVY} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {allZero && (
          <text x={padL + pw / 2} y={padT + ph / 2} textAnchor="middle" fontSize="13" fill="#6B7A8C" direction="rtl">لا توجد بيانات خلال الفترة</text>
        )}
        {h && (
          <g pointerEvents="none">
            <line x1={x(hover!)} x2={x(hover!)} y1={padT} y2={padT + ph} stroke={DARK_GOLD} strokeDasharray="3 3" />
            <circle cx={x(hover!)} cy={y(h.v || 0)} r="4.5" fill={GOLD} stroke={NAVY} strokeWidth="2" />
            <rect x={tipX} y={padT} width={tipW} height="40" rx="8" fill={NAVY} />
            <text x={tipX + tipW / 2} y={padT + 16} textAnchor="middle" fontSize="11" fill="#C7CED6">{dayLabel(h.day)}</text>
            <text x={tipX + tipW / 2} y={padT + 32} textAnchor="middle" fontSize="13" fontWeight="700" fill="#F5C55B" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {money ? sar(h.v) : fmt(h.v)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

// ===== Funnel (horizontal bars, % of the previous step) =====
export function Funnel({ steps, color }: { steps: { label: string; value: any }[]; color: string }) {
  const first = Number(steps[0]?.value) || 0
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => {
        const v = Number(s.value) || 0
        const prev = i ? Number(steps[i - 1].value) || 0 : null
        const w = first ? Math.max(2, (v / first) * 100) : 2
        return (
          <li key={s.label}>
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="text-gray-600 font-semibold">{s.label}</span>
              <span className="tabular-nums">
                <b style={{ color: NAVY }}>{fmt(s.value)}</b>
                {prev !== null && <span className="text-gray-400 mr-1.5">({prev ? Math.round((v / prev) * 100) : 0}% من السابق)</span>}
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: color, opacity: 1 - i * 0.12 }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ===== Region bars (buyers vs suppliers) =====
export function RegionBars({ rows }: { rows: { region: string; buyers: number; suppliers: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.buyers || 0, r.suppliers || 0)))
  if (!rows.length) return <p className="text-xs text-gray-400">لا توجد بيانات.</p>
  return (
    <div>
      <div className="flex gap-4 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: NAVY }} />مشترون</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: GOLD }} />موردون</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.region || '—'} className="grid grid-cols-[96px_1fr] gap-2 items-center">
            <span className="text-xs text-gray-600 truncate" title={r.region}>{r.region || 'غير محددة'}</span>
            <div className="space-y-1">
              {([['buyers', NAVY], ['suppliers', GOLD]] as const).map(([k, c]) => (
                <div key={k} className="flex items-center gap-2">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.max(1, ((r as any)[k] || 0) / max * 85)}%`, background: c }} />
                  <span className="text-[11px] tabular-nums text-gray-500">{fmt((r as any)[k])}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
