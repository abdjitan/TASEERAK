// Small display helpers.

// Notifications written before 161/163 kept emoji in their titles («🧾 …», «⏰ …», «🎉»); the UI
// uses line icons only, so emoji are dropped when a stored text is shown.
export function noEmoji(s: any): string {
  return String(s ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim()
}

// «الآن» / «قبل 5 دقائق» / «قبل ساعتين» / «قبل 3 أيام» (ur: «3 دن پہلے»).
export function timeAgo(d: any, locale: string, now: number = Date.now()): string {
  if (!d) return ''
  const s = Math.max(0, Math.floor((now - new Date(d).getTime()) / 1000))
  const m = Math.floor(s / 60), h = Math.floor(m / 60), dd = Math.floor(h / 24)
  if (locale === 'en') return s < 60 ? 'just now' : m < 60 ? `${m}m ago` : h < 24 ? `${h}h ago` : `${dd}d ago`
  if (locale === 'ur') return s < 60 ? 'ابھی' : m < 60 ? `${m} منٹ پہلے` : h < 24 ? `${h} گھنٹے پہلے` : `${dd} دن پہلے`
  const count = (n: number, one: string, two: string, few: string, many: string) =>
    n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`
  if (s < 60) return 'الآن'
  if (m < 60) return 'قبل ' + count(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')
  if (h < 24) return 'قبل ' + count(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')
  return 'قبل ' + count(dd, 'يوم', 'يومين', 'أيام', 'يوماً')
}

// «يوم واحد / يومان / 3 أيام / 11 يوماً» (en "3 days", ur «3 دن»).
export function daysText(n: any, locale: string): string {
  const d = Number(n) || 0
  if (locale === 'en') return d === 1 ? '1 day' : `${d} days`
  if (locale === 'ur') return `${d} دن`
  return d === 1 ? 'يوم واحد' : d === 2 ? 'يومان' : d <= 10 ? `${d} أيام` : `${d} يوماً`
}

// Arabic counted noun: (1) «بند واحد» (2) «بندان» (3–10) «3 بنود» (11+) «11 بنداً».
export function arCount(n: number, one: string, two: string, few: string, many: string): string {
  return n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`
}
export const arItems = (n: number) => arCount(n, 'بند واحد', 'بندان', 'بنود', 'بنداً')
export const arMaterials = (n: number) => arCount(n, 'مادة واحدة', 'مادتان', 'مواد', 'مادة')
