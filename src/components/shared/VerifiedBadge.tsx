'use client'

// Reusable verification badge — shows a supplier/contractor's
// verification state. When verified via Wathq it shows the official-source label.
//
// Usage:
//   <VerifiedBadge status={profile.verification_status} source={profile.cr_verification_source} locale={locale} />

type Props = {
  status?: 'pending' | 'verified' | 'rejected' | string | null
  source?: 'manual' | 'wathq' | string | null
  locale?: 'ar' | 'en' | 'ur' | string
  size?: 'xs' | 'sm'
}

const L: Record<string, any> = {
  ar: { verified: 'موثّق', wathq: 'موثّق عبر واثق', pending: 'قيد المراجعة', rejected: 'مرفوض' },
  en: { verified: 'Verified', wathq: 'Verified via Wathq', pending: 'Under review', rejected: 'Rejected' },
  ur: { verified: 'تصدیق شدہ', wathq: 'واثق سے تصدیق شدہ', pending: 'زیر جائزہ', rejected: 'مسترد' },
}

export default function VerifiedBadge({ status, source, locale = 'ar', size = 'sm' }: Props) {
  const t = L[locale as string] || L.ar
  const pad = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'

  if (status === 'verified') {
    const viaWathq = source === 'wathq'
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold ${pad}`}
        style={{ background: viaWathq ? '#0F6E56' : '#E1F5EE', color: viaWathq ? '#fff' : '#0F6E56' }}
        title={viaWathq ? t.wathq : t.verified}
      >
        <span>{viaWathq ? '🛡' : '✓'}</span>
        {viaWathq ? t.wathq : t.verified}
      </span>
    )
  }

  if (status === 'rejected') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold ${pad}`}
        style={{ background: '#FEE2E2', color: '#DC2626' }}>
        ✕ {t.rejected}
      </span>
    )
  }

  // pending / default
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${pad}`}
      style={{ background: '#FEF3C7', color: '#D97706' }}>
      ⏳ {t.pending}
    </span>
  )
}
