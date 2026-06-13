// ════════════════════════════════════════════════════════════════
// Deadline / pricing-window helpers for RFQs.
// expires_at is the moment the pricing window closes. We surface it as a
// human countdown + urgency level so contractors and suppliers always see
// how long is left, and suppliers get nudged before it lapses.
// All dates render Gregorian + Western digits (no Hijri / Arabic-Indic),
// matching the rest of the app.
// ════════════════════════════════════════════════════════════════

export function msLeft(expiresAt?: string | null): number | null {
  if (!expiresAt) return null
  return new Date(expiresAt).getTime() - Date.now()
}

export function isExpired(expiresAt?: string | null): boolean {
  const m = msLeft(expiresAt)
  return m !== null && m <= 0
}

// 'expired' | 'critical' (<3h) | 'soon' (<12h) | 'normal' | null (no deadline)
export type DeadlineUrgency = 'expired' | 'critical' | 'soon' | 'normal' | null

export function deadlineUrgency(expiresAt?: string | null): DeadlineUrgency {
  const m = msLeft(expiresAt)
  if (m === null) return null
  if (m <= 0) return 'expired'
  const hours = m / 3_600_000
  if (hours < 3) return 'critical'
  if (hours < 12) return 'soon'
  return 'normal'
}

// "2 يوم و3 ساعة" / "5 ساعة" / "40 دقيقة" / "انتهت المهلة"
export function formatTimeLeft(expiresAt?: string | null, locale: string = 'ar'): string {
  const m = msLeft(expiresAt)
  if (m === null) return ''
  const ar = locale !== 'en'
  if (m <= 0) return ar ? 'انتهت المهلة' : 'Expired'
  const totalMins = Math.floor(m / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const minutes = totalMins % 60
  if (days > 0) return ar ? `${days} يوم${hours ? ` و${hours} ساعة` : ''}` : `${days}d ${hours}h`
  if (hours > 0) return ar ? `${hours} ساعة${minutes ? ` و${minutes} د` : ''}` : `${hours}h ${minutes}m`
  return ar ? `${minutes} دقيقة` : `${minutes}m`
}

// Gregorian, Western digits, e.g. "2026/06/13 14:30"
export function formatDateTime(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}/${pad(dt.getMonth() + 1)}/${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

// Date only, e.g. "2026/06/13"
export function formatDate(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}/${pad(dt.getMonth() + 1)}/${pad(dt.getDate())}`
}

// Tailwind-ready colors per urgency for badges/banners.
export function urgencyStyle(u: DeadlineUrgency): { bg: string; fg: string; border: string } {
  switch (u) {
    case 'expired':  return { bg: '#f3f4f6', fg: '#6b7280', border: '#e5e7eb' }
    case 'critical': return { bg: '#fef2f2', fg: '#dc2626', border: '#fecaca' }
    case 'soon':     return { bg: '#fffbeb', fg: '#d97706', border: '#fde68a' }
    default:         return { bg: '#ecfdf5', fg: '#0F6E56', border: '#a7f3d0' }
  }
}
