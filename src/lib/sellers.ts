// Seller structure (migration 123): two account kinds, three buyer-facing tiers, and the
// quote-level source/availability. One place for the labels so every page says the same thing.

export type Locale = 'ar' | 'en' | 'ur' | string
type T3 = { ar: string; en: string; ur: string }
const pick = (t: T3, locale: Locale) => (locale === 'en' ? t.en : locale === 'ur' ? t.ur : t.ar)

// ── Tiers (derived in the DB, never chosen by the seller) ──────────────────────────────────────
export type SupplierTier = 'company' | 'shop' | 'independent'
export const TIERS: SupplierTier[] = ['company', 'shop', 'independent']

export const TIER_INFO: Record<SupplierTier, T3 & { icon: string; hint: T3 }> = {
  company: {
    icon: 'building', ar: 'شركات ومصانع معتمدة', en: 'Verified companies & factories', ur: 'تصدیق شدہ کمپنیاں اور فیکٹریاں',
    hint: { ar: 'مصانع ووكلاء وموزّعون موثّقون بالسجل التجاري', en: 'Factories, agents and distributors verified by CR', ur: 'سی آر سے تصدیق شدہ فیکٹریاں اور ڈسٹری بیوٹرز' },
  },
  shop: {
    icon: 'store', ar: 'محلات ومؤسسات تجارية', en: 'Shops & trading businesses', ur: 'دکانیں اور کاروبار',
    hint: { ar: 'محلات مواد البناء والمؤسسات التجارية', en: 'Building-material shops and trading businesses', ur: 'تعمیراتی سامان کی دکانیں' },
  },
  independent: {
    icon: 'user', ar: 'بائعون مستقلون ووسطاء', en: 'Independent sellers & brokers', ur: 'آزاد فروخت کنندگان اور بروکرز',
    hint: { ar: 'أفراد يوفّرون المواد أو يجمعون الأسعار من السوق', en: 'Individuals who source materials or collect market prices', ur: 'افراد جو مارکیٹ سے سامان یا قیمتیں لاتے ہیں' },
  },
}

/** Old rows may still say manufacturer/commercial/local. */
export function normTier(t?: string | null): SupplierTier {
  if (t === 'company' || t === 'manufacturer' || t === 'commercial') return 'company'
  if (t === 'independent') return 'independent'
  return 'shop'
}
// Labels are text only; show the matching line icon with <SellerIcon name={tierIcon(t)} />.
// (`withIcon` is kept for old call sites and ignored: the icons are SVG now, not emoji.)
export function tierLabel(t: string | null | undefined, locale: Locale, _withIcon = false): string {
  return pick(TIER_INFO[normTier(t)], locale)
}
export function tierIcon(t: string | null | undefined): string { return TIER_INFO[normTier(t)].icon }
export function tierHint(t: string, locale: Locale): string { return pick(TIER_INFO[normTier(t)].hint, locale) }
/** Does a request's tier filter include this supplier? (empty filter = everyone) */
export function tierAllowed(targets: string[] | null | undefined, mine: string | null | undefined): boolean {
  if (!Array.isArray(targets) || targets.length === 0) return true
  const m = normTier(mine)
  return targets.some(t => normTier(t) === m)
}

// ── Account kind & company activity ────────────────────────────────────────────────────────────
export type SellerKind = 'independent' | 'company'
/** /join/company and /join/seller remember the chosen kind here until signup applies it. */
export const SIGNUP_KIND_KEY = 'taseerak_signup_kind'
/** A company team invitation opened before signing in: resumed right after login. */
export const TEAM_INVITE_KEY = 'taseerak_team_invite'
// Browser storage when it exists (the site); null on the server and in the mobile app, which
// shares this file.
function webStorage(): Storage | null {
  return typeof window !== 'undefined' && typeof (window as any).localStorage !== 'undefined' ? window.localStorage : null
}

export function pendingTeamInvite(): string | null {
  try { const t = webStorage()?.getItem(TEAM_INVITE_KEY); return t && /^[0-9a-f]{36}$/.test(t) ? t : null } catch { return null }
}
export function rememberedSignupKind(): SellerKind | null {
  try { const k = webStorage()?.getItem(SIGNUP_KIND_KEY); return k === 'company' || k === 'independent' ? k : null } catch { return null }
}
export function sellerKindOf(providerType?: string | null): SellerKind {
  return ['individual', 'broker', 'price_agent'].includes(providerType || '') ? 'independent' : 'company'
}
export const SELLER_KINDS: Record<SellerKind, T3 & { icon: string; sub: T3 }> = {
  independent: {
    icon: 'user', ar: 'أعمل بشكل مستقل', en: 'I work independently', ur: 'میں آزادانہ کام کرتا ہوں',
    sub: { ar: 'بائع أو وسيط أو وكيل أسعار: توفّر المواد أو تجمع أسعارها من السوق', en: 'Seller, broker or price agent: you source materials or collect market prices', ur: 'فروخت کنندہ، بروکر یا پرائس ایجنٹ' },
  },
  company: {
    icon: 'building', ar: 'أمثّل شركة أو محلاً', en: 'I represent a company or shop', ur: 'میں کمپنی یا دکان کی نمائندگی کرتا ہوں',
    sub: { ar: 'مصنع، أو وكيل وموزّع، أو شركة تجارية، أو محل مواد بناء', en: 'Factory, agent/distributor, trading company or building-materials shop', ur: 'فیکٹری، ڈسٹری بیوٹر، تجارتی کمپنی یا دکان' },
  },
}
export const COMPANY_ACTIVITIES: { k: string; icon: string; ar: string; en: string; ur: string }[] = [
  { k: 'retail_shop', icon: 'store', ar: 'محل مواد بناء', en: 'Building-materials shop', ur: 'تعمیراتی سامان کی دکان' },
  { k: 'distributor', icon: 'truck', ar: 'وكيل أو موزّع', en: 'Agent / distributor', ur: 'ایجنٹ / ڈسٹری بیوٹر' },
  { k: 'trading_company', icon: 'building', ar: 'شركة تجارية', en: 'Trading company', ur: 'تجارتی کمپنی' },
  { k: 'manufacturer', icon: 'factory', ar: 'مصنع', en: 'Factory / manufacturer', ur: 'فیکٹری' },
]
export function sellerKindLabel(k: SellerKind, locale: Locale) { return pick(SELLER_KINDS[k], locale) }
export function activityLabel(providerType: string | null | undefined, locale: Locale): string {
  const a = COMPANY_ACTIVITIES.find(x => x.k === providerType) || (providerType === 'dealer' ? COMPANY_ACTIVITIES[0] : null)
  return a ? pick(a, locale) : ''
}

// ── Quote source & availability ────────────────────────────────────────────────────────────────
export const SOURCE_TYPES: { k: string; icon: string; direct: boolean; ar: string; en: string; ur: string }[] = [
  { k: 'own_stock', icon: 'box', direct: true, ar: 'من مخزوني', en: 'From my stock', ur: 'میرے اسٹاک سے' },
  { k: 'direct_supplier', icon: 'factory', direct: false, ar: 'من مصنع أو مورد', en: 'From a factory or supplier', ur: 'فیکٹری یا سپلائر سے' },
  { k: 'shop', icon: 'store', direct: false, ar: 'من محل في السوق', en: 'From a shop in the market', ur: 'مارکیٹ کی دکان سے' },
  { k: 'intermediary', icon: 'handshake', direct: false, ar: 'عن طريق وسيط', en: 'Through an intermediary', ur: 'ایک بروکر کے ذریعے' },
]
// Older values that may exist on offers.
const LEGACY_SOURCE: Record<string, T3> = {
  multiple_shops: { ar: 'من عدة محلات', en: 'From several shops', ur: 'کئی دکانوں سے' },
  market_estimate: { ar: 'تقدير من السوق', en: 'Market estimate', ur: 'مارکیٹ کا اندازہ' },
}
export function sourceLabel(k: string | null | undefined, locale: Locale): string {
  if (!k) return ''
  const s = SOURCE_TYPES.find(x => x.k === k)
  if (s) return pick(s, locale)
  return LEGACY_SOURCE[k] ? pick(LEGACY_SOURCE[k], locale) : ''
}
/** A quote straight from the seller's own stock (not sourced through someone else). */
export function isDirectSource(k: string | null | undefined): boolean { return !k || k === 'own_stock' }

export const AVAILABILITY: { k: string; icon: string; ar: string; en: string; ur: string }[] = [
  { k: 'now', icon: 'checkCircle', ar: 'متوفر الآن', en: 'Available now', ur: 'ابھی دستیاب' },
  { k: 'confirm', icon: 'hourglass', ar: 'يحتاج تأكيد التوفّر', en: 'Needs confirmation', ur: 'تصدیق درکار' },
  { k: 'made_to_order', icon: 'hammer', ar: 'حسب الطلب', en: 'Made to order', ur: 'آرڈر پر' },
]
export function availabilityLabel(k: string | null | undefined, locale: Locale): string {
  const a = AVAILABILITY.find(x => x.k === k)
  return a ? pick(a, locale) : ''
}
export function sourceIcon(k: string | null | undefined): string { return SOURCE_TYPES.find(x => x.k === k)?.icon || '' }
export function availabilityIcon(k: string | null | undefined): string { return AVAILABILITY.find(x => x.k === k)?.icon || '' }

// ── Warranty (optional, per material) ─────────────────────────────────────────────────────────
// Stored as Arabic text on each priced line (item_prices[].warranty); '' = not stated.
export const WARRANTY_OPTIONS: { v: string; ar: string; en: string; ur: string }[] = [
  { v: '', ar: 'غير محدد', en: 'Not specified', ur: 'غیر متعین' },
  { v: 'بدون ضمان', ar: 'بدون ضمان', en: 'No warranty', ur: 'کوئی وارنٹی نہیں' },
  { v: 'ضمان الوكيل', ar: 'ضمان الوكيل', en: "Manufacturer's warranty", ur: 'مینوفیکچرر وارنٹی' },
  { v: '3 أشهر', ar: '3 أشهر', en: '3 months', ur: '3 ماہ' },
  { v: '6 أشهر', ar: '6 أشهر', en: '6 months', ur: '6 ماہ' },
  { v: 'سنة', ar: 'سنة', en: '1 year', ur: '1 سال' },
  { v: 'سنتان', ar: 'سنتان', en: '2 years', ur: '2 سال' },
  { v: '5 سنوات', ar: '5 سنوات', en: '5 years', ur: '5 سال' },
  { v: '10 سنوات', ar: '10 سنوات', en: '10 years', ur: '10 سال' },
]

// ── Verification state (only what was actually checked) ────────────────────────────────────────
export type VerifyLevel = 'business_verified' | 'business_submitted' | 'phone_verified' | 'none'
export function verifyLevel(p: any): VerifyLevel {
  if (!p) return 'none'
  if (p.verification_status === 'verified' || p.cr_verification_source === 'wathq') return 'business_verified'
  if (p.commercial_registration || p.verification_status === 'pending') return 'business_submitted'
  if (p.phone_verified || p.phone_confirmed_at) return 'phone_verified'
  return 'none'
}
export const VERIFY_INFO: Record<VerifyLevel, T3 & { icon: string; tone: 'green' | 'amber' | 'blue' | 'gray' }> = {
  business_verified: { icon: 'badge', tone: 'green', ar: 'منشأة موثّقة', en: 'Verified business', ur: 'تصدیق شدہ کاروبار' },
  business_submitted: { icon: 'file', tone: 'amber', ar: 'بيانات المنشأة قيد المراجعة', en: 'Business details under review', ur: 'کاروباری تفصیلات زیر جائزہ' },
  phone_verified: { icon: 'phone', tone: 'blue', ar: 'رقم الجوال موثّق', en: 'Phone verified', ur: 'فون کی تصدیق' },
  none: { icon: 'dot', tone: 'gray', ar: 'غير موثّق بعد', en: 'Not verified yet', ur: 'ابھی تصدیق نہیں' },
}
export function verifyLabel(p: any, locale: Locale): string {
  return pick(VERIFY_INFO[verifyLevel(p)], locale)
}
