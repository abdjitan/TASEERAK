// Notification texts in the reader's language (round-4 UX-021).
//
// The database writes every notification in Arabic (title + body) and, more and more, the
// notice's `kind` and its parameters in `data`. This file rebuilds the title and the body in
// ar / en / ur from `type` + `data.kind` + those parameters, so an Urdu-reading shop worker
// reads his notices in Urdu without the machine translation (AutoTr) and its «(ترجمہ)» tag.
//
// Rules:
// - Every parameter is read defensively. If a template needs a key that is missing, that part
//   (title or body) returns null and the caller shows the stored Arabic text (then AutoTr).
// - A title that needs no parameter is templated for old notices too (only the kind/type).
// - Arabic readers keep the stored text when there is one: it is what the server wrote (and
//   what WhatsApp sent); the Arabic template only fills in when the stored text is empty.
// - Self-contained on purpose (no imports): the mobile app mirrors this file as is.
//
// Parameters the server may put in `data` (all optional):
//   rfq_ref      request number (rfqs.ref_no)               item_name   first material (clean Arabic name)
//   item_count   number of materials in the request          rfq_label   ready label (fallback, Arabic)
//   amount       SAR amount shown to the reader (already VAT-adjusted for him)
//   vat          'incl' | 'excl'  basis of `amount`          until       ISO timestamp (deadline / validity)
//   city         request city (Arabic)                       offer_count offers received (rfq_deadline)
//   min_amount   cheapest full offer (rfq_deadline; key present with null = no full offer)
//   covered      materials an offer covers (also priced_count)  won / priced  materials won of those priced
//   note         the buyer's note (reduction request)        by          'buyer' | 'supplier' (dispute)
//   sender_name  who sent a message / question               source_invoice  true = agent's source-shop invoice
//   only_new     true = materials added to a request the supplier already had (new_rfq)

export type NotifLocale = 'ar' | 'en' | 'ur'
export type NotifLike = { type?: string | null; title?: string | null; body?: string | null; data?: any }
type Tri = { ar: string; en: string; ur: string }

const loc = (l: string): NotifLocale => (l === 'en' || l === 'ur' ? l : 'ar')

// ── small formatters (copies of the app helpers, kept here so the file has no imports) ──
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one
  if (n === 2) return two
  const r = n >= 100 ? n % 100 : n
  return r >= 3 && r <= 10 ? `${n} ${few}` : `${n} ${many}`
}
const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const str = (v: any): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s : null
}

function money(v: number, l: NotifLocale): string {
  const n = Math.round(v).toLocaleString('en-US')
  return l === 'en' ? `${n} SAR` : l === 'ur' ? `${n} ریال` : `${n} ر.س`
}
// Owner 2026-11-23: a buyer never sees an amount before VAT. An older notice that carried a before-VAT
// amount (vat = 'excl', a VAT-registered seller) is shown with the 15% added, as «شامل الضريبة».
function vatTag(d: any, l: NotifLocale): string {
  const v = str(d?.vat)
  if (v === 'incl' || v === 'excl') return l === 'en' ? ' (incl. VAT)' : l === 'ur' ? ' (VAT سمیت)' : ' (شامل الضريبة)'
  return ''
}
const buyerAmount = (v: number | null, d: any): number | null => (v !== null && str(d?.vat) === 'excl' ? v * 1.15 : v)
function when(v: any, l: NotifLocale): string | null {
  const s = str(v)
  if (!s) return null
  const t = new Date(s)
  if (isNaN(t.getTime())) return null
  const intl = l === 'en' ? 'en-GB' : l === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn'
  try {
    return t.toLocaleString(intl, { timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
  } catch {
    return null
  }
}
function materials(n: number, l: NotifLocale): string {
  if (l === 'en') return `${n} material${n === 1 ? '' : 's'}`
  if (l === 'ur') return `${n} اشیاء`
  return arCount(n, 'مادة واحدة', 'مادتان', 'مواد', 'مادة')
}
function offersCount(n: number, l: NotifLocale): string {
  if (l === 'en') return n === 1 ? 'one offer' : `${n} offers`
  if (l === 'ur') return n === 1 ? 'ایک آفر' : `${n} آفرز`
  return arCount(n, 'عرض واحد', 'عرضان', 'عروض', 'عرضاً')
}

/**
 * The request's name in the reader's language: «طلب رقم 123 · بلاط ومادتان أخريان» /
 * "Request #123 · بلاط + 2 more". Falls back to a ready Arabic `rfq_label`, else null.
 */
export function notifRfqLabel(d: any, locale: string): string | null {
  const l = loc(locale)
  const ref = str(d?.rfq_ref ?? d?.ref_no)
  const name = str(d?.item_name ?? d?.product_name)
  const count = num(d?.item_count)
  if (ref) {
    const more = count !== null && count > 1 ? count - 1 : 0
    let tail = ''
    if (name) {
      if (l === 'en') tail = ` · ${name}${more ? ` + ${more} more` : ''}`
      else if (l === 'ur') tail = ` · ${name}${more ? ` اور ${more} مزید` : ''}`
      else tail = ` · ${name}${more ? ' ' + arCount(more, 'ومادة أخرى', 'ومادتان أخريان', 'مواد أخرى', 'مادة أخرى').replace(/^(\d+)/, 'و$1') : ''}`
    }
    return (l === 'en' ? `Request #${ref}` : l === 'ur' ? `درخواست نمبر ${ref}` : `طلب رقم ${ref}`) + tail
  }
  return str(d?.rfq_label)
}

const q = (s: string, l: NotifLocale) => (l === 'en' ? `“${s}”` : `«${s}»`)

// ── titles that need no parameter (also used for old notices) ──
const TITLES: Record<string, Tri> = {
  new_rfq: { ar: 'طلب تسعير جديد يناسب تخصصك', en: 'New price request in your specialty', ur: 'آپ کے شعبے کی نئی قیمت کی درخواست' },
  rfq_offer: { ar: 'عرض سعر جديد', en: 'New price offer', ur: 'نئی قیمت کی آفر' },
  reduction_request: { ar: 'طلب تخفيض سعر', en: 'Price reduction requested', ur: 'قیمت کم کرنے کی درخواست' },
  reduction_response: { ar: 'تم تخفيض السعر', en: 'Price reduced', ur: 'قیمت کم کر دی گئی' },
  reduction_declined: { ar: 'ردّ المورد على طلب التخفيض', en: 'The supplier answered your reduction request', ur: 'سپلائر نے قیمت کم کرنے کی درخواست کا جواب دیا' },
  price_renewed: { ar: 'جدّد المورد سعره', en: 'The supplier renewed the price', ur: 'سپلائر نے قیمت کی تجدید کر دی' },
  info_request: { ar: 'طلب معلومات إضافية', en: 'More information requested', ur: 'مزید معلومات کی درخواست' },
  info_response: { ar: 'ردّ على طلب المعلومات', en: 'Reply to your information request', ur: 'معلومات کی درخواست کا جواب' },
  award: { ar: 'اختار المشتري عرضك', en: 'The buyer chose your offer', ur: 'خریدار نے آپ کی آفر منتخب کی' },
  not_selected: { ar: 'لم يُقبل عرضك', en: 'Your offer was not chosen', ur: 'آپ کی آفر منتخب نہیں ہوئی' },
  rfq_cancelled: { ar: 'أُلغي طلب التسعير', en: 'The price request was cancelled', ur: 'قیمت کی درخواست منسوخ ہو گئی' },
  extras_confirm: { ar: 'أكّد رسوم التوصيل للمواد التي فزت بها', en: 'Confirm delivery fees for the materials you won', ur: 'جیتی ہوئی اشیاء کی ڈیلیوری فیس کی تصدیق کریں' },
  extras_confirmed: { ar: 'أكّد المورد رسوم التوصيل', en: 'The supplier confirmed the delivery fees', ur: 'سپلائر نے ڈیلیوری فیس کی تصدیق کر دی' },
  invoice_attached: { ar: 'أرفق المورد فاتورته', en: 'The supplier attached the invoice', ur: 'سپلائر نے انوائس منسلک کر دی' },
  delivered: { ar: 'أكّد المورد التوصيل', en: 'The supplier confirmed delivery', ur: 'سپلائر نے ڈیلیوری کی تصدیق کر دی' },
  receipt_confirmed: { ar: 'أكّد المشتري الاستلام', en: 'The buyer confirmed receipt', ur: 'خریدار نے وصولی کی تصدیق کر دی' },
  paid: { ar: 'أكّد المشتري الدفع', en: 'The buyer confirmed payment', ur: 'خریدار نے ادائیگی کی تصدیق کر دی' },
  payment_confirmed: { ar: 'أكّد المورد استلام الدفعة', en: 'The supplier confirmed receiving the payment', ur: 'سپلائر نے ادائیگی وصول ہونے کی تصدیق کر دی' },
  rfq_deadline: { ar: 'انتهت مهلة التسعير', en: 'The pricing window has closed', ur: 'قیمت دینے کی مدت ختم ہو گئی' },
  price_expiring: { ar: 'سعر أحد العروض ينتهي قريباً', en: 'An offer’s price expires soon', ur: 'ایک آفر کی قیمت جلد ختم ہو رہی ہے' },
  price_expiring_supplier: { ar: 'ينتهي ضمان سعرك قريباً', en: 'Your price guarantee ends soon', ur: 'آپ کی قیمت کی ضمانت جلد ختم ہو رہی ہے' },
  rfq_changed: { ar: 'عدّل المشتري طلبه', en: 'The buyer changed the request', ur: 'خریدار نے درخواست میں تبدیلی کی' },
  deadline_extended: { ar: 'مُدّدت مهلة التسعير', en: 'The pricing deadline was extended', ur: 'قیمت دینے کی مدت بڑھا دی گئی' },
  rfq_expired: { ar: 'انتهى الطلب دون اختيار', en: 'The request ended without a choice', ur: 'درخواست کسی انتخاب کے بغیر ختم ہو گئی' },
  dispute_opened: { ar: 'بلاغ عن مشكلة في صفقة', en: 'A problem was reported in a deal', ur: 'ڈیل میں مسئلے کی اطلاع' },
}

/** Which template a notice uses: its kind first, then its type (a few types carry no kind). */
export function notifKey(n: NotifLike): string {
  const d = n?.data || {}
  const kind = str(d.kind)
  const type = str(n?.type) || ''
  if (kind) return kind
  // types whose meaning is the same whatever the content
  if (['new_rfq', 'rfq_deadline', 'price_expiring', 'rfq_changed', 'dispute_opened', 'new_message'].includes(type)) return type
  // a plain rfq_offer is a new offer; old reduction notices had no kind, so the stored title decides
  if (type === 'rfq_offer' && (!str(n?.title) || String(n?.title).trim() === 'عرض سعر جديد')) return 'rfq_offer'
  // older notices written before their kind was stored: the exact stored title identifies them
  const byTitle = OLD_TITLES[String(n?.title || '').trim()]
  return byTitle || ''
}
const OLD_TITLES: Record<string, string> = {
  'اختار المشتري عرضك': 'award',
  'لم يُقبل عرضك': 'not_selected',
  'أُلغي طلب التسعير': 'rfq_cancelled',
  'أكّد المورد رسوم التوصيل': 'extras_confirmed',
  'أرفق المورد فاتورته': 'invoice_attached',
  'أكّد المورد التوصيل': 'delivered',
  'أكّد المشتري الاستلام': 'receipt_confirmed',
  'طلب تخفيض سعر': 'reduction_request',
  'تم تخفيض السعر': 'reduction_response',
  'طلب معلومات إضافية': 'info_request',
  'رد على طلب المعلومات': 'info_response',
  'مُدّدت مهلة التسعير': 'deadline_extended',
  'انتهى الطلب دون اختيار': 'rfq_expired',
}

/** Body template; null when a key it needs is missing. */
function body(key: string, d: any, l: NotifLocale): string | null {
  const label = notifRfqLabel(d, l)
  const L = label ? q(label, l) : null
  const amount = buyerAmount(num(d?.amount), d)
  const amt = amount !== null ? money(amount, l) + vatTag(d, l) : null
  const until = when(d?.until, l)
  const pick = (t: Tri) => t[l]

  switch (key) {
    case 'new_rfq': {
      if (!label) return null
      const city = str(d?.city)
      const parts = [label]
      if (city) parts.push(city)
      if (until) parts.push(l === 'en' ? `Pricing deadline ${until}` : l === 'ur' ? `قیمت دینے کی آخری تاریخ ${until}` : `آخر موعد للتسعير ${until}`)
      return parts.join(' · ')
    }
    case 'rfq_offer': {
      if (!L) return null
      const covered = num(d?.covered ?? d?.priced_count), count = num(d?.item_count)
      const partial = covered !== null && count !== null && covered < count
      const total = amt ? pick({ ar: ` بإجمالي ${amt}`, en: ` totalling ${amt}`, ur: `، کل ${amt}` }) : ''
      if (partial) return pick({
        ar: `وصلك عرض جديد على ${L} يغطي ${covered} من ${materials(count!, 'ar')}${total}.`,
        en: `You received a new offer on ${L} covering ${covered} of ${materials(count!, 'en')}${total}.`,
        ur: `${L} پر نئی آفر آئی ہے جو ${materials(count!, 'ur')} میں سے ${covered} کا احاطہ کرتی ہے${total}۔`,
      })
      return pick({ ar: `وصلك عرض جديد على ${L}${total}.`, en: `You received a new offer on ${L}${total}.`, ur: `${L} پر نئی آفر آئی ہے${total}۔` })
    }
    case 'reduction_request': {
      if (!L) return null
      const note = str(d?.note)
      const by = until ? pick({ ar: ` يمكنك الرد حتى ${until}.`, en: ` You can reply until ${until}.`, ur: ` آپ ${until} تک جواب دے سکتے ہیں۔` }) : ''
      const nt = note ? pick({ ar: ` ملاحظته: «${note}».`, en: ` Their note: “${note}”.`, ur: ` ان کا نوٹ: «${note}»۔` }) : ''
      return pick({
        ar: `يطلب المشتري تخفيض سعر عرضك على ${L}.`,
        en: `The buyer asks you to lower your offer on ${L}.`,
        ur: `خریدار ${L} پر آپ کی آفر کی قیمت کم کرنے کی درخواست کر رہا ہے۔`,
      }) + by + nt
    }
    case 'reduction_response':
      if (!L || !amt) return null
      return pick({ ar: `خفّض المورد سعر عرضه على ${L} إلى ${amt}.`, en: `The supplier lowered the offer on ${L} to ${amt}.`, ur: `سپلائر نے ${L} پر اپنی آفر کی قیمت کم کر کے ${amt} کر دی۔` })
    case 'reduction_declined':
      if (!L) return null
      return pick({
        ar: `اعتذر المورد عن تخفيض السعر في ${L}، ويبقى سعره الحالي أفضل ما يقدّمه.`,
        en: `The supplier could not lower the price on ${L}; the current price is their best.`,
        ur: `سپلائر ${L} پر قیمت کم نہیں کر سکا؛ موجودہ قیمت ہی اس کی بہترین پیشکش ہے۔`,
      })
    case 'price_renewed':
      if (!L || !until) return null
      return pick({ ar: `جدّد المورد التزامه بسعر عرضه على ${L} حتى ${until}.`, en: `The supplier renewed the price of the offer on ${L} until ${until}.`, ur: `سپلائر نے ${L} پر اپنی آفر کی قیمت ${until} تک برقرار رکھی ہے۔` })
    case 'info_request':
      if (!L) return null
      return pick({ ar: `يطلب المشتري معلومات إضافية عن عرضك على ${L}.`, en: `The buyer asks for more information about your offer on ${L}.`, ur: `خریدار ${L} پر آپ کی آفر کے بارے میں مزید معلومات چاہتا ہے۔` })
    case 'info_response':
      if (!L) return null
      return pick({ ar: `ردّ المورد على طلب المعلومات الإضافية في ${L}.`, en: `The supplier replied to your information request on ${L}.`, ur: `سپلائر نے ${L} پر آپ کی معلومات کی درخواست کا جواب دیا۔` })
    case 'award':
      if (!L) return null
      return pick({ ar: `اختار المشتري مواد من عرضك على ${L}. راجع الصفقة ونسّق التسليم معه.`, en: `The buyer chose materials from your offer on ${L}. Review the deal and arrange delivery.`, ur: `خریدار نے ${L} پر آپ کی آفر سے اشیاء منتخب کیں۔ ڈیل دیکھیں اور ڈیلیوری طے کریں۔` })
    case 'not_selected':
      if (!L) return null
      return pick({ ar: `اختار المشتري مورداً آخر في ${L}.`, en: `The buyer chose another supplier for ${L}.`, ur: `خریدار نے ${L} کے لیے دوسرا سپلائر منتخب کیا۔` })
    case 'rfq_cancelled':
      if (!L) return null
      return pick({ ar: `ألغى المشتري ${L}، فأُغلق عرضك عليه.`, en: `The buyer cancelled ${L}, so your offer on it was closed.`, ur: `خریدار نے ${L} منسوخ کر دی، اس لیے آپ کی آفر بند ہو گئی۔` })
    case 'extras_confirm': {
      const won = num(d?.won), priced = num(d?.priced)
      if (!L || won === null || priced === null) return null
      return pick({
        ar: `اختارك المشتري لبعض المواد التي سعّرتها في ${L} (${won} من ${priced}). أكّد رسوم التوصيل والرسوم الإضافية لهذه المواد أو خفّضها.`,
        en: `The buyer chose you for some of the materials you priced in ${L} (${won} of ${priced}). Confirm or lower the delivery and extra fees for them.`,
        ur: `خریدار نے ${L} میں آپ کی قیمت والی کچھ اشیاء کے لیے آپ کو منتخب کیا (${priced} میں سے ${won})۔ ان کی ڈیلیوری اور اضافی فیس کی تصدیق کریں یا کم کریں۔`,
      })
    }
    case 'extras_confirmed':
      if (amount === null) return null
      if (amount === 0) return pick({ ar: 'أكّد المورد أن التوصيل بلا رسوم إضافية للمواد التي اخترتها منه.', en: 'The supplier confirmed delivery with no extra fees for the materials you chose.', ur: 'سپلائر نے تصدیق کی کہ آپ کی منتخب اشیاء کی ڈیلیوری پر کوئی اضافی فیس نہیں۔' })
      return pick({ ar: `أكّد المورد رسوماً إضافية بقيمة ${amt} للمواد التي اخترتها منه.`, en: `The supplier confirmed extra fees of ${amt} for the materials you chose.`, ur: `سپلائر نے آپ کی منتخب اشیاء کے لیے ${amt} اضافی فیس کی تصدیق کی۔` })
    case 'invoice_attached':
      if (!L) return null
      if (d?.source_invoice === true || d?.source_invoice === 'true') return pick({
        ar: `أرفق المورد فاتورة المحل الذي اشترى منه لصفقة ${L}، صادرةً باسمك. يمكنك تنزيلها من صفحة الصفقة.`,
        en: `The supplier attached the invoice of the shop they bought from for ${L}, issued in your name. Download it from the deal page.`,
        ur: `سپلائر نے ${L} کے لیے اس دکان کی انوائس منسلک کی جس سے خریداری کی، جو آپ کے نام پر ہے۔ اسے ڈیل کے صفحے سے ڈاؤن لوڈ کریں۔`,
      })
      return pick({ ar: `أرفق المورد الفاتورة الرسمية لصفقة ${L}. يمكنك تنزيلها من صفحة الصفقة.`, en: `The supplier attached the official invoice for ${L}. Download it from the deal page.`, ur: `سپلائر نے ${L} کی سرکاری انوائس منسلک کر دی۔ اسے ڈیل کے صفحے سے ڈاؤن لوڈ کریں۔` })
    case 'delivered':
      if (!L) return null
      return pick({ ar: `أكّد المورد توصيل ${L}. يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.`, en: `The supplier confirmed delivering ${L}. Please confirm receipt or report a problem.`, ur: `سپلائر نے ${L} کی ڈیلیوری کی تصدیق کی۔ براہ کرم وصولی کی تصدیق کریں یا مسئلہ رپورٹ کریں۔` })
    case 'receipt_confirmed':
      if (!L) return null
      return pick({ ar: `أكّد المشتري استلام ${L}. شكراً لإتمام الصفقة عبر تسعيرك.`, en: `The buyer confirmed receiving ${L}. Thank you for completing the deal on Taseerak.`, ur: `خریدار نے ${L} کی وصولی کی تصدیق کی۔ تسعیرک پر ڈیل مکمل کرنے کا شکریہ۔` })
    case 'paid':
      if (!L) return null
      return pick({ ar: `أكّد المشتري دفع مبلغ صفقة ${L}. أكّد استلام الدفعة من صفحة الصفقة.`, en: `The buyer confirmed paying for ${L}. Confirm you received the payment on the deal page.`, ur: `خریدار نے ${L} کی ادائیگی کی تصدیق کی۔ ڈیل کے صفحے پر ادائیگی وصول ہونے کی تصدیق کریں۔` })
    case 'payment_confirmed':
      if (!L) return null
      return pick({ ar: `اكتملت صفقة ${L}. شكراً لاستخدامك تسعيرك.`, en: `The deal ${L} is complete. Thank you for using Taseerak.`, ur: `ڈیل ${L} مکمل ہو گئی۔ تسعیرک استعمال کرنے کا شکریہ۔` })
    case 'rfq_deadline': {
      const n = num(d?.offer_count)
      if (!L || n === null) return null
      if (n === 0) return pick({
        ar: `لم يصل أي عرض على ${L}. يمكنك تمديد المهلة أو البحث عن موردين آخرين من صفحة الطلب.`,
        en: `No offer arrived on ${L}. You can extend the deadline or look for other suppliers from the request page.`,
        ur: `${L} پر کوئی آفر نہیں آئی۔ آپ درخواست کے صفحے سے مدت بڑھا سکتے ہیں یا دوسرے سپلائر تلاش کر سکتے ہیں۔`,
      })
      const minN = buyerAmount(num(d?.min_amount), d)
      if (minN !== null) {
        const m = money(minN, l) + vatTag(d, l)
        return pick({
          ar: `وصلك ${offersCount(n, 'ar')} على ${L}، أقل عرض يغطي كل المواد ${m}. قارن العروض واختر الأنسب الآن.`,
          en: `You received ${offersCount(n, 'en')} on ${L}; the lowest offer covering all materials is ${m}. Compare and choose now.`,
          ur: `${L} پر ${offersCount(n, 'ur')} آئی ہیں؛ تمام اشیاء والی سب سے کم آفر ${m} ہے۔ ابھی موازنہ کر کے منتخب کریں۔`,
        })
      }
      // key present with null: no offer covers every material; key absent: unknown, keep the stored text
      if (d && Object.prototype.hasOwnProperty.call(d, 'min_amount')) return pick({
        ar: `وصلك ${offersCount(n, 'ar')} على ${L}، ولم يغطِّ أي عرض كل المواد؛ يمكنك اختيار الأفضل لكل مادة.`,
        en: `You received ${offersCount(n, 'en')} on ${L}; none covers every material, so you can choose the best for each one.`,
        ur: `${L} پر ${offersCount(n, 'ur')} آئی ہیں؛ کوئی آفر تمام اشیاء کا احاطہ نہیں کرتی، آپ ہر چیز کے لیے بہترین منتخب کر سکتے ہیں۔`,
      })
      return null
    }
    case 'price_expiring':
      if (!L) return null
      return until
        ? pick({ ar: `ينتهي التزام المورد بسعر عرضه على ${L} في ${until}. اختر قبل أن يتغيّر السعر.`, en: `The supplier’s price on ${L} is valid until ${until}. Choose before it changes.`, ur: `${L} پر سپلائر کی قیمت ${until} تک ہے۔ قیمت بدلنے سے پہلے منتخب کریں۔` })
        : pick({ ar: `ينتهي التزام المورد بسعر عرضه على ${L} خلال ساعات. اختر قبل أن يتغيّر السعر.`, en: `The supplier’s price on ${L} expires within hours. Choose before it changes.`, ur: `${L} پر سپلائر کی قیمت چند گھنٹوں میں ختم ہو رہی ہے۔ قیمت بدلنے سے پہلے منتخب کریں۔` })
    case 'price_expiring_supplier':
      if (!L || !until) return null
      return pick({ ar: `ينتهي ضمان سعرك على ${L} في ${until}. جدّد السعر ليبقى عرضك قابلاً للاختيار.`, en: `Your price guarantee on ${L} ends ${until}. Renew it so your offer can still be chosen.`, ur: `${L} پر آپ کی قیمت کی ضمانت ${until} کو ختم ہو رہی ہے۔ قیمت کی تجدید کریں تاکہ آپ کی آفر منتخب ہو سکے۔` })
    case 'rfq_changed':
      if (!L) return null
      return pick({ ar: `عدّل المشتري طلبه، فسعّره من جديد: ${L}. تغيّرت المواد أو الكميات فأُلغي عرضك السابق.`, en: `The buyer changed the request, so price it again: ${L}. The materials or quantities changed, so your previous offer was cancelled.`, ur: `خریدار نے درخواست بدل دی، دوبارہ قیمت دیں: ${L}۔ اشیاء یا مقدار بدلنے سے آپ کی پچھلی آفر منسوخ ہو گئی۔` })
    case 'deadline_extended':
      if (!L || !until) return null
      return pick({ ar: `مدّد المشتري مهلة التسعير على ${L} حتى ${until}. يمكنك تقديم عرضك أو مراجعته حتى ذلك الموعد.`, en: `The buyer extended the pricing deadline on ${L} to ${until}. You can send or review your offer until then.`, ur: `خریدار نے ${L} کی قیمت دینے کی مدت ${until} تک بڑھا دی۔ آپ تب تک اپنی آفر بھیج یا دیکھ سکتے ہیں۔` })
    case 'rfq_expired':
      if (!L) return null
      return pick({ ar: `انتهى ${L} دون أن يختار المشتري عرضاً.`, en: `${L} ended without the buyer choosing an offer.`, ur: `${L} خریدار کے کسی آفر کو منتخب کیے بغیر ختم ہو گئی۔` })
    case 'dispute_opened': {
      const by = str(d?.by)
      if (!L || (by !== 'buyer' && by !== 'supplier')) return null
      return by === 'buyer'
        ? pick({ ar: `أبلغ المشتري عن مشكلة في صفقة ${L}. سيتواصل فريق تسعيرك مع الطرفين.`, en: `The buyer reported a problem in the deal ${L}. The Taseerak team will contact both sides.`, ur: `خریدار نے ڈیل ${L} میں مسئلے کی اطلاع دی۔ تسعیرک ٹیم دونوں فریقوں سے رابطہ کرے گی۔` })
        : pick({ ar: `أبلغ المورد عن مشكلة في صفقة ${L}. سيتواصل فريق تسعيرك مع الطرفين.`, en: `The supplier reported a problem in the deal ${L}. The Taseerak team will contact both sides.`, ur: `سپلائر نے ڈیل ${L} میں مسئلے کی اطلاع دی۔ تسعیرک ٹیم دونوں فریقوں سے رابطہ کرے گی۔` })
    }
  }
  return null
}

/** Title template; null when there is none (or a key it needs is missing). */
function title(key: string, d: any, l: NotifLocale): string | null {
  if (key === 'new_rfq' && (d?.only_new === true || d?.only_new === 'true'))
    return { ar: 'أُضيفت مواد تناسبك إلى طلب تسعير', en: 'Materials in your specialty were added to a request', ur: 'درخواست میں آپ کے شعبے کی اشیاء شامل کی گئیں' }[l]
  if (key === 'team_question' || key === 'new_message') {
    const who = str(d?.sender_name)
    if (!who) return null
    return key === 'new_message'
      ? { ar: `رسالة جديدة من ${who}`, en: `New message from ${who}`, ur: `${who} کا نیا پیغام` }[l]
      : { ar: `سؤال من ${who}`, en: `Question from ${who}`, ur: `${who} کا سوال` }[l]
  }
  const t = TITLES[key]
  return t ? t[l] : null
}

/**
 * The texts of one notice for a reader. Each field is the templated text, or null when the
 * caller should show the stored Arabic text (through AutoTr for en/ur readers).
 */
export function notifText(n: NotifLike, locale: string): { title: string | null; body: string | null } {
  const l = loc(locale)
  const key = notifKey(n)
  if (!key) return { title: null, body: null }
  const d = n?.data || {}
  let t: string | null = null, b: string | null = null
  try { t = title(key, d, l) } catch { t = null }
  try { b = body(key, d, l) } catch { b = null }
  // an Arabic reader keeps the server's own wording when there is one
  if (l === 'ar') {
    if (str(n?.title)) t = null
    if (str(n?.body)) b = null
  }
  return { title: t, body: b }
}
