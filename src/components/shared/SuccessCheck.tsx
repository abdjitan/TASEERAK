'use client'
// «Done» mark (round-8 UX-140): a brand-green #0F6E56 circle whose tick draws in about 400 ms.
// With prefers-reduced-motion the tick is shown at once. Used on «تم إرسال طلبك» and «تمّ تأكيد اختيارك».

export default function SuccessCheck({ size = 72, label }: { size?: number; label?: string }) {
  return (
    <span className="ts-success-check inline-grid place-items-center rounded-full shrink-0" role={label ? 'img' : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, background: '#0F6E56' }}>
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="ts-success-check-path" />
      </svg>
      <style>{`
        .ts-success-check-path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ts-check-draw 400ms ease-out 120ms forwards; }
        @keyframes ts-check-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .ts-success-check-path { animation: none; stroke-dashoffset: 0; } }
      `}</style>
    </span>
  )
}
