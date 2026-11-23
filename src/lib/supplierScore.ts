// تقييم أداء المورد (0-100) — يُحسب من إشارات حقيقية ليثق المقاول بالمورد دون معرفة اسمه.
// المكوّنات: التحقق (واثق) + التقييم + سرعة الرد + نسبة الفوز + الخبرة (عدد العروض).

export function supplierScore(profile: any, stats: any): number {
  let s = 0
  // التحقق عبر واثق
  if (profile?.verification_status === 'verified') s += 25
  // التقييم (من 5)
  const rating = Number(profile?.rating_avg) || 0
  s += Math.round((Math.min(rating, 5) / 5) * 25)
  // سرعة الرد (ساعات) — أسرع = أفضل
  const resp = stats?.avg_response_hours
  if (resp == null) s += 6
  else if (resp < 2) s += 15
  else if (resp < 6) s += 12
  else if (resp < 24) s += 8
  else s += 4
  // نسبة الفوز بالعروض (%)
  const won = Number(stats?.won_rate) || 0
  s += Math.round((Math.min(won, 100) / 100) * 20)
  // الخبرة: عدد العروض المقدّمة (نشاط)
  const offers = Number(stats?.total_offers) || 0
  s += Math.round((Math.min(offers, 30) / 30) * 15)
  return Math.max(0, Math.min(100, s))
}

export function scoreColor(s: number): string {
  return s >= 75 ? '#0F6E56' : s >= 50 ? '#D4A543' : '#9aa3b2'
}

// أسماء الاعتمادات المعروفة (يضبطها الأدمن) — social proof قوي في السوق السعودي
export const APPROVAL_LABELS: Record<string, string> = {
  aramco: 'أرامكو',
  sabic: 'سابك',
  sec: 'السعودية للكهرباء',
  neom: 'نيوم',
  roshn: 'روشن',
  redsea: 'البحر الأحمر',
  diriyah: 'الدرعية',
  momra: 'الشؤون البلدية',
}
// English / Urdu names of the approval bodies (round-4 UX-147); Arabic stays the default
const APPROVAL_LABELS_EN: Record<string, string> = {
  aramco: 'Aramco', sabic: 'SABIC', sec: 'Saudi Electricity', neom: 'NEOM', roshn: 'ROSHN',
  redsea: 'Red Sea Global', diriyah: 'Diriyah', momra: 'Ministry of Municipalities',
}
const APPROVAL_LABELS_UR: Record<string, string> = {
  aramco: 'آرامکو', sabic: 'سابک', sec: 'سعودی الیکٹرسٹی', neom: 'نیوم', roshn: 'روشن',
  redsea: 'ریڈ سی', diriyah: 'درعیہ', momra: 'بلدیاتی امور',
}
export function approvalLabel(key: string, locale: string = 'ar'): string {
  if (locale === 'en') return APPROVAL_LABELS_EN[key] || APPROVAL_LABELS[key] || key
  if (locale === 'ur') return APPROVAL_LABELS_UR[key] || APPROVAL_LABELS[key] || key
  return APPROVAL_LABELS[key] || key
}

// A supplier with almost no history (fewer than 3 offers and no rating) is shown as «جديد على المنصة»
// instead of a low grey score: a new verified company is not an unreliable one (UX-104).
export function isNewSupplier(row: any): boolean {
  return (Number(row?.total_offers) || 0) < 3 && !((Number(row?.rating_count) || 0) > 0)
}
