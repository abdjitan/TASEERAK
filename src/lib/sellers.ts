// Seller structure (migration 123): two account kinds, three buyer-facing tiers, and the
// quote-level source/availability. One place for the labels so every page says the same thing.

import { SUB_CATEGORIES } from '@/types'
import { BROWSE_SECTIONS, sectionOfSub } from '@/lib/browseCategories'

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
    icon: 'user', ar: 'وسطاء تسعير', en: 'Pricing agents', ur: 'قیمت ایجنٹ',
    hint: { ar: 'أفراد يجلبون أسعار المحلات؛ الفاتورة الضريبية من المحل باسم المشتري', en: 'Individuals who bring shop prices; the tax invoice comes from the shop in the buyer’s name', ur: 'افراد جو دکانوں کی قیمتیں لاتے ہیں؛ ٹیکس انوائس دکان سے خریدار کے نام' },
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
/** The signed-in seller's kind, remembered on this device so menus can adapt on every page. */
export const SELLER_KIND_KEY = 'tsk_seller_kind'
export function rememberSellerKind(k: SellerKind) { try { webStorage()?.setItem(SELLER_KIND_KEY, k) } catch {} }
export function storedSellerKind(): SellerKind | null {
  try { const k = webStorage()?.getItem(SELLER_KIND_KEY); return k === 'company' || k === 'independent' ? k : null } catch { return null }
}
export function sellerKindOf(providerType?: string | null): SellerKind {
  return ['individual', 'broker', 'price_agent'].includes(providerType || '') ? 'independent' : 'company'
}
export const SELLER_KINDS: Record<SellerKind, T3 & { icon: string; sub: T3 }> = {
  independent: {
    icon: 'user', ar: 'وسيط تسعير', en: 'Pricing agent', ur: 'قیمت ایجنٹ',
    sub: { ar: 'ليس لديك محل: تجلب أسعار المواد من المحلات للمشترين، وتتم الصفقة بفاتورة ضريبية من المحل باسم المشتري', en: 'You bring shop prices to buyers; the deal uses a certified tax invoice from the shop in the buyer’s name', ur: 'آپ دکانوں کی قیمتیں خریداروں تک لاتے ہیں؛ سودا دکان کی خریدار کے نام ٹیکس انوائس سے' },
  },
  company: {
    icon: 'building', ar: 'شركة أو محل (بسجل تجاري)', en: 'Company or shop (with a commercial registration)', ur: 'کمپنی یا دکان (تجارتی رجسٹریشن کے ساتھ)',
    sub: { ar: 'لديك سجل تجاري: مصنع، أو وكيل وموزّع، أو شركة تجارية، أو محل مواد بناء', en: 'You have a commercial registration: factory, agent/distributor, trading company or building-materials shop', ur: 'فیکٹری، ڈسٹری بیوٹر، تجارتی کمپنی یا دکان' },
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
  { k: 'intermediary', icon: 'handshake', direct: false, ar: 'عن طريق جهة أخرى', en: 'Through another party', ur: 'کسی اور فریق کے ذریعے' },
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
/** The price sources a seller may choose (UX-014, round 3): a pricing agent («وسيط تسعير») has no stock,
 *  so «من مخزوني» is never offered to an independent seller. */
export function sourceTypesFor(independent: boolean) {
  return independent ? SOURCE_TYPES.filter(o => o.k !== 'own_stock') : SOURCE_TYPES
}
/** A saved / restored source for an independent seller: own_stock becomes «من محل في السوق». */
export function fixSourceFor(independent: boolean, k: string | null | undefined): string {
  if (!k) return ''
  return independent && k === 'own_stock' ? 'shop' : k
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
// Stored as Arabic text on each priced line (item_prices[].warranty); '' = not stated (shows nothing).
// No «بدون ضمان» option: an empty field must never read as waiving the legal warranty (consumer law, 2026-11-21).
export const WARRANTY_OPTIONS: { v: string; ar: string; en: string; ur: string }[] = [
  { v: '', ar: 'غير محدد', en: 'Not specified', ur: 'غیر متعین' },
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

// ── Offer state for the supplier (one rule for the site and the app) ──────────────────────────
/** The buyer is waiting on the supplier: an open discount request, or a question with no answer yet.
 *  (round-2 UX-009: an answered question no longer counts; needs offers.info_response in the query.) */
/** UX-042 (round 3): a cancelled or expired request never waits on the supplier. rfqStatus defaults to o.rfq.status. */
function rfqClosed(o: any, rfqStatus?: string | null): boolean {
  const st = rfqStatus ?? o?.rfq?.status ?? o?.rfqs?.status ?? null
  return st === 'cancelled' || st === 'expired'
}
export function offerNeedsSupplier(o: any, now: number = Date.now(), rfqStatus?: string | null): boolean {
  if (!o || o.status !== 'pending' || rfqClosed(o, rfqStatus)) return false
  const discountOpen = !!o.reduction_deadline && new Date(o.reduction_deadline).getTime() > now
  const openQuestion = !!String(o.info_request || '').trim() && !String(o.info_response || '').trim()
  return discountOpen || openQuestion
}
export function offerHasOpenDiscount(o: any, now: number = Date.now(), rfqStatus?: string | null): boolean {
  return !!o && o.status === 'pending' && !rfqClosed(o, rfqStatus) && !!o.reduction_deadline && new Date(o.reduction_deadline).getTime() > now
}
export function offerHasOpenQuestion(o: any, rfqStatus?: string | null): boolean {
  return !!o && o.status === 'pending' && !rfqClosed(o, rfqStatus) && !!String(o.info_request || '').trim() && !String(o.info_response || '').trim()
}

/** What happened to an offer, from the offer AND its request (round-2 UX-010): a cancelled or expired
 *  request is not a loss, and is left out of the win rate. */
export type OfferOutcome = 'won' | 'lost' | 'cancelled' | 'expired' | 'pending'
export function offerOutcome(offerStatus: string | null | undefined, rfqStatus: string | null | undefined): OfferOutcome {
  if (offerStatus === 'accepted') return 'won'
  if (rfqStatus === 'cancelled') return 'cancelled'
  if (rfqStatus === 'expired') return 'expired'
  if (offerStatus === 'rejected') return 'lost'
  return 'pending'
}
/** Short label for badges and filters. */
export const OUTCOME_LABEL: Record<OfferOutcome, T3> = {
  won: { ar: 'اختيرت', en: 'Chosen', ur: 'منتخب' },
  pending: { ar: 'بانتظار قرار المشتري', en: 'Waiting for the buyer', ur: 'خریدار کے فیصلے کی منتظر' },
  lost: { ar: 'لم تُختر', en: 'Not chosen', ur: 'منتخب نہیں ہوئی' },
  cancelled: { ar: 'ألغى المشتري الطلب', en: 'Request cancelled', ur: 'درخواست منسوخ' },
  expired: { ar: 'انتهت المهلة', en: 'Request expired', ur: 'مہلت ختم' },
}
/** The full sentence on the offer page. */
export const OUTCOME_TITLE: Record<OfferOutcome, T3> = {
  won: { ar: 'تهانينا، اختار المشتري عرضك', en: 'Congratulations, the buyer chose your offer', ur: 'مبارک ہو، خریدار نے آپ کی آفر چن لی' },
  pending: { ar: 'عرضك بانتظار قرار المشتري', en: 'Your offer is waiting for the buyer', ur: 'آپ کی آفر خریدار کے فیصلے کی منتظر ہے' },
  lost: { ar: 'انتهى التسعير، واختار المشتري عرضاً آخر', en: 'Pricing closed: the buyer chose another offer', ur: 'قیمتیں بند: خریدار نے دوسری آفر چن لی' },
  cancelled: { ar: 'ألغى المشتري الطلب، ولم يُختر أي عرض', en: 'The buyer cancelled the request; no offer was chosen', ur: 'خریدار نے درخواست منسوخ کر دی؛ کوئی آفر منتخب نہیں ہوئی' },
  expired: { ar: 'انتهت مهلة الطلب دون اختيار أي عرض', en: 'The request ended without any offer being chosen', ur: 'درخواست کی مہلت کسی آفر کے انتخاب کے بغیر ختم ہو گئی' },
}
export function outcomeLabel(k: OfferOutcome, locale: Locale): string { return pick(OUTCOME_LABEL[k], locale) }
export function outcomeTitle(k: OfferOutcome, locale: Locale): string { return pick(OUTCOME_TITLE[k], locale) }

// ── Sectors & sections (one rule for onboarding, specialties and the pricing page) ──────────────
/** UX-038 (round 3): a sector follows from the specialties chosen in it, so picking materials without
 *  ticking the sector header still saves. */
export function sectorsFor(secs: string[], specs: string[]): string[] {
  const out = new Set<string>(secs)
  for (const sec of Object.keys(SUB_CATEGORIES as any)) if (specs.some(k => k in (((SUB_CATEGORIES as any)[sec]) || {}))) out.add(sec)
  return [...out]
}
/** UX-035 (round 3): the buyer-facing section of a request line («أدوات صحية», not the engineering
 *  sector «ميكانيكا»), from its sub-category. '' when it cannot be told. */
export function sectionLabelOf(sector: string | null | undefined, subKey: string | null | undefined, locale: Locale): string {
  if (!sector || !subKey) return ''
  const group = ((SUB_CATEGORIES as any)[sector] || {})[subKey]?.group || null
  const sec = sectionOfSub(subKey, group)
  const b = sec ? BROWSE_SECTIONS.find(x => x.key === sec) : null
  return b ? pick(b, locale) : ''
}
