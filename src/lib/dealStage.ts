// حالة الصفقة بعد القبول — مرحلة موحّدة تُعرض للمقاول في قائمة العروض وصفحة التفاصيل.
// المراحل الأربع: 1) قبول العرض · 2) تسليم المورد · 3) استلام المقاول · 4) الدفع.
// المصدر: حقول جدول offers (accepted_at, supplier_delivered_at, received_at, payment_status, payment_confirmed_at, dispute_status).

export type DealStage = {
  step: number // 1..4 (0 عند وجود نزاع)
  key: 'accepted' | 'delivered' | 'received' | 'paid' | 'disputed' | 'advance_due' | 'closed'
  label: string // نص "وين صارت الطلبية"
  short: string // a short badge for lists and cards (UX-054): never «تم التسليم» before the buyer confirms
  emoji: string
  done: boolean // الصفقة مكتملة (مدفوعة وموثّقة)
  tone: string // لون المؤشّر (hex)
  payDue?: string | null // «آجل 30/60»: when the payment is due (ISO), after receipt (round-4 UX-034)
}

// «آجل 30/60 يوماً»: the payment falls due that many days after the buyer confirms receipt (round-4 UX-034).
const NET_DAYS: Record<string, number> = { net30: 30, net60: 60 }
export function payDueAt(offer: any): Date | null {
  const d = NET_DAYS[offer?.payment_terms]
  return d && offer?.received_at ? new Date(new Date(offer.received_at).getTime() + d * 86400000) : null
}
/** Credit terms: paying becomes the buyer's step only in the last 3 days before it is due. */
export function payDueSoon(offer: any, now: number = Date.now()): boolean {
  const due = payDueAt(offer)
  return !due || now >= due.getTime() - 3 * 86400000
}

// ── The expected delivery day (round-6 UX-001): ONE rule for the date and for the «late» check, on
// every screen. The offer's delivery_days are WORKING days counted in Riyadh from the day the offer was
// chosen, Fridays skipped. The supplier is late only once that whole Riyadh day has passed.
const riyadhYmd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }) // YYYY-MM-DD
const riyadhIsFriday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Riyadh' }) === 'Fri'
export function expectedDeliveryDate(offer: any): Date | null {
  const n = Math.floor(Number(offer?.delivery_days) || 0)
  if (!(n > 0) || !offer?.accepted_at) return null
  const d = new Date(offer.accepted_at)
  if (isNaN(d.getTime())) return null
  let left = n
  while (left > 0) {
    d.setTime(d.getTime() + 86400000)
    if (!riyadhIsFriday(d)) left--
  }
  return d
}
/** The expected day is still to come or is today (Riyadh calendar). */
export function deliveryDueAhead(offer: any, now: number = Date.now()): boolean {
  const due = expectedDeliveryDate(offer)
  return !!due && riyadhYmd(new Date(now)) <= riyadhYmd(due)
}
/** The supplier is past the expected day and nothing was delivered or received, on a live deal. */
export function deliveryLate(offer: any, now: number = Date.now()): boolean {
  const due = expectedDeliveryDate(offer)
  if (!due || offer?.deal_closed_at || offer?.supplier_delivered_at || offer?.received_at) return false
  return riyadhYmd(new Date(now)) > riyadhYmd(due)
}
/** Whether the expected day is today in Riyadh. */
export function deliveryDueToday(offer: any, now: number = Date.now()): boolean {
  const due = expectedDeliveryDate(offer)
  return !!due && riyadhYmd(new Date(now)) === riyadhYmd(due)
}

export const DEAL_STEPS =['قبول', 'تسليم', 'استلام', 'دفع'] as const

// Labels per viewer and language. The supplier reads its own next step (persona review 2026-10-17:
// «بانتظار تأكيد استلامك» is the buyer's sentence and confused the seller).
type Who = 'buyer' | 'supplier'
const LABELS: Record<string, { buyer: [string, string, string]; supplier: [string, string, string] }> = {
  disputed: { buyer: ['بلاغ عن مشكلة — قيد المعالجة', 'Problem reported — being handled', 'مسئلہ رپورٹ ہوا — زیرِ کارروائی'], supplier: ['بلاغ عن مشكلة — قيد المعالجة', 'Problem reported — being handled', 'مسئلہ رپورٹ ہوا — زیرِ کارروائی'] },
  done: { buyer: ['تمّت الصفقة — مدفوعة وموثّقة', 'Deal complete — paid and confirmed', 'ڈیل مکمل — ادائیگی ہو گئی'], supplier: ['تمّت الصفقة — مدفوعة وموثّقة', 'Deal complete — paid and confirmed', 'ڈیل مکمل — ادائیگی ہو گئی'] },
  paid_pending: { buyer: ['دُفعت — بانتظار تأكيد المورد لاستلام الدفعة', 'Paid — waiting for the supplier to confirm', 'ادائیگی ہو گئی — سپلائر کی تصدیق کا انتظار'], supplier: ['دفع المشتري — أكّد استلامك للمبلغ', 'The buyer paid — confirm you received it', 'خریدار نے ادائیگی کر دی — رقم ملنے کی تصدیق کریں'] },
  received: { buyer: ['تمّ الاستلام — بانتظار الدفع', 'Received — waiting for payment', 'وصول ہو گیا — ادائیگی کا انتظار'], supplier: ['استلم المشتري البضاعة — بانتظار الدفع', 'The buyer received the goods — waiting for payment', 'خریدار کو سامان مل گیا — ادائیگی کا انتظار'] },
  delivered: { buyer: ['أكّد المورد التسليم — بانتظار تأكيد استلامك', 'The supplier delivered — confirm you received it', 'سپلائر نے ڈیلیور کر دیا — وصولی کی تصدیق کریں'], supplier: ['سلّمتَ البضاعة — بانتظار تأكيد المشتري', 'You delivered — waiting for the buyer to confirm', 'آپ نے ڈیلیور کر دیا — خریدار کی تصدیق کا انتظار'] },
  accepted: { buyer: ['تمّ اختيار العرض — بانتظار تسليم المورد', 'Offer chosen — waiting for delivery', 'آفر منتخب ہو گئی — ڈیلیوری کا انتظار'], supplier: ['اختارك المشتري: ارفع الفاتورة، ثم سلّم البضاعة', 'The buyer chose you: upload the invoice, then deliver the goods', 'خریدار نے آپ کو منتخب کیا: انوائس اپ لوڈ کریں، پھر سامان دیں'] },
  advance_due: { buyer: ['بانتظار دفعتك المقدّمة، ثم يسلّم المورد', 'Waiting for your advance payment, then the supplier delivers', 'آپ کی پیشگی ادائیگی کا انتظار، پھر سپلائر سامان دے گا'], supplier: ['بانتظار دفعة المشتري المقدّمة، ثم تسلّم البضاعة', 'Waiting for the buyer’s advance payment, then you deliver', 'خریدار کی پیشگی ادائیگی کا انتظار، پھر آپ سامان دیں'] },
  closed: { buyer: ['أُلغيت الصفقة', 'Deal cancelled', 'ڈیل منسوخ'], supplier: ['أُلغيت الصفقة', 'Deal cancelled', 'ڈیل منسوخ'] },
}
function lbl(k: string, who: Who, locale: string) { const t = LABELS[k][who]; return locale === 'en' ? t[1] : locale === 'ur' ? t[2] : t[0] }

// The supplier already uploaded its invoice and has not delivered yet (UX-033): the next step is delivery.
const SUPPLIER_INVOICED: [string, string, string] = ['رفعتَ الفاتورة — أكّد التسليم عند إيصال البضاعة', 'You uploaded the invoice — confirm delivery when the goods arrive', 'آپ نے انوائس اپ لوڈ کر دی — سامان پہنچانے پر ڈیلیوری کی تصدیق کریں']

// Short badges per stage (UX-054), the same words on the web and in the app.
const SHORT: Record<string, { buyer: [string, string, string]; supplier: [string, string, string] }> = {
  disputed: { buyer: ['بلاغ قيد المعالجة', 'Problem being handled', 'مسئلہ زیرِ کارروائی'], supplier: ['بلاغ قيد المعالجة', 'Problem being handled', 'مسئلہ زیرِ کارروائی'] },
  done: { buyer: ['اكتملت الصفقة', 'Deal complete', 'ڈیل مکمل'], supplier: ['اكتملت الصفقة', 'Deal complete', 'ڈیل مکمل'] },
  paid_pending: { buyer: ['دُفع، بانتظار تأكيد المورد', 'Paid, waiting for the supplier', 'ادائیگی ہو گئی، سپلائر کا انتظار'], supplier: ['أكّد استلام المبلغ', 'Confirm the payment', 'رقم ملنے کی تصدیق کریں'] },
  received: { buyer: ['ادفع للمورد', 'Pay the supplier', 'سپلائر کو ادائیگی کریں'], supplier: ['بانتظار الدفع', 'Waiting for payment', 'ادائیگی کا انتظار'] },
  delivered: { buyer: ['أكّد الاستلام', 'Confirm receipt', 'وصولی کی تصدیق کریں'], supplier: ['بانتظار تأكيد المشتري', 'Waiting for the buyer', 'خریدار کی تصدیق کا انتظار'] },
  accepted: { buyer: ['بانتظار تسليم المورد', 'Waiting for delivery', 'ڈیلیوری کا انتظار'], supplier: ['سلّم البضاعة', 'Deliver the goods', 'سامان پہنچائیں'] },
  advance_due: { buyer: ['ادفع الدفعة المقدّمة', 'Pay the advance', 'پیشگی ادائیگی کریں'], supplier: ['بانتظار الدفعة المقدّمة', 'Waiting for the advance', 'پیشگی ادائیگی کا انتظار'] },
  closed: { buyer: ['أُلغيت الصفقة', 'Deal cancelled', 'ڈیل منسوخ'], supplier: ['أُلغيت الصفقة', 'Deal cancelled', 'ڈیل منسوخ'] },
}
function sh(k: string, who: Who, locale: string) { const t = SHORT[k][who]; return locale === 'en' ? t[1] : locale === 'ur' ? t[2] : t[0] }
const pick = (t: [string, string, string], locale: string) => (locale === 'en' ? t[1] : locale === 'ur' ? t[2] : t[0])

export function dealStage(offer: any, who: Who = 'buyer', locale: string = 'ar'): DealStage {
  // closed by an admin decision (round-4 UX-088; needs offers.deal_closed_at from the server)
  if (offer?.deal_closed_at)
    return { step: 0, key: 'closed', label: lbl('closed', who, locale), short: sh('closed', who, locale), emoji: 'ℹ', done: false, tone: '#6B7280' }
  if (offer?.dispute_status === 'open')
    return { step: 0, key: 'disputed', label: lbl('disputed', who, locale), short: sh('disputed', who, locale), emoji: '⚠', done: false, tone: '#B42318' }

  const paid = offer?.payment_status === 'paid'

  if (paid && offer?.payment_confirmed_at && offer?.supplier_delivered_at && offer?.received_at)
    return { step: 4, key: 'paid', label: lbl('done', who, locale), short: sh('done', who, locale), emoji: '✅', done: true, tone: '#0F6E56' }

  if (offer?.received_at) {
    if (paid)
      return { step: 4, key: 'paid', label: lbl('paid_pending', who, locale), short: sh('paid_pending', who, locale), emoji: '💵', done: false, tone: '#0F6E56' }
    const due = payDueAt(offer)
    if (due) {
      // «آجل»: the label names the due date instead of asking for payment at once (round-4 UX-034)
      const dt = due.toLocaleDateString(locale === 'en' ? 'en-GB' : locale === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })
      // past the agreed date (round-5 UX-180): «تأخّر الدفع», for both sides
      if (Date.now() > due.getTime()) {
        const late = who === 'supplier'
          ? pick([`تأخّر الدفع — كان مستحقاً في ${dt}`, `Payment late — it was due on ${dt}`, `ادائیگی میں تاخیر — آخری تاریخ ${dt} تھی`], locale)
          : pick([`تأخّر الدفع — كان مستحقاً في ${dt}`, `Payment late — it was due on ${dt}`, `ادائیگی میں تاخیر — آخری تاریخ ${dt} تھی`], locale)
        return { step: 3, key: 'received', label: late, short: pick(['تأخّر الدفع', 'Payment late', 'ادائیگی میں تاخیر'], locale), emoji: '⏰', done: false, tone: '#9D7425', payDue: due.toISOString() }
      }
      const label = pick([`تمّ الاستلام — الدفع مستحق في ${dt}`, `Received — payment due on ${dt}`, `وصول ہو گیا — ادائیگی کی تاریخ ${dt}`], locale)
      const short = payDueSoon(offer) ? sh('received', who, locale) : pick([`الدفع مستحق في ${dt}`, `Payment due ${dt}`, `ادائیگی ${dt}`], locale)
      return { step: 3, key: 'received', label, short, emoji: '📥', done: false, tone: '#0B2438', payDue: due.toISOString() }
    }
    return { step: 3, key: 'received', label: lbl('received', who, locale), short: sh('received', who, locale), emoji: '📥', done: false, tone: '#0B2438' }
  }

  // «دفع مقدّم»: the buyer pays before the supplier delivers (round-4 UX-034)
  if (offer?.payment_terms === 'advance' && !paid && !offer?.supplier_delivered_at)
    return { step: 1, key: 'advance_due', label: lbl('advance_due', who, locale), short: sh('advance_due', who, locale), emoji: '💵', done: false, tone: '#D4A543' }

  if (offer?.supplier_delivered_at)
    return { step: 2, key: 'delivered', label: lbl('delivered', who, locale), short: sh('delivered', who, locale), emoji: '📦', done: false, tone: '#D4A543' }

  // the supplier uploaded its invoice already: its next step is delivery (UX-033; same key and step)
  const label = who === 'supplier' && (offer?.supplier_invoice_url || offer?.invoice_url) ? pick(SUPPLIER_INVOICED, locale) : lbl('accepted', who, locale)
  return { step: 1, key: 'accepted', label, short: sh('accepted', who, locale), emoji: '🚚', done: false, tone: '#D4A543' }
}

/** What the buyer has to do at this stage, as a chip (null = waiting on the supplier) (UX-055). */
export function buyerTodo(st: DealStage | string, locale: string = 'ar'): string | null {
  const key = typeof st === 'string' ? st : st.key
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  if (key === 'delivered') return L('Your turn: confirm receipt', 'آپ کی باری: وصولی کی تصدیق کریں', 'مطلوب منك: تأكيد الاستلام')
  if (key === 'advance_due') return L('Your turn: the advance payment', 'آپ کی باری: پیشگی ادائیگی', 'مطلوب منك: الدفعة المقدّمة')
  // credit terms: the payment is the buyer's step only in the last 3 days before it is due (round-4 UX-034)
  if (key === 'received' && typeof st !== 'string' && st.payDue && Date.now() < new Date(st.payDue).getTime() - 3 * 86400000) return null
  if (key === 'received') return L('Your turn: pay the supplier and record it', 'آپ کی باری: سپلائر کو ادائیگی کریں اور درج کریں', 'مطلوب منك: الدفع للمورد وتسجيله')
  return null
}

/** The button text for the buyer's next action on a deal (UX-055): «أكّد الاستلام», «سجّل الدفع» or «تابع الصفقة». */
export function buyerActionLabel(st: DealStage | string, locale: string = 'ar'): string {
  const key = typeof st === 'string' ? st : st.key
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  if (key === 'delivered') return L('Confirm receipt', 'وصولی کی تصدیق کریں', 'أكّد الاستلام')
  if (key === 'received' && typeof st !== 'string' && st.payDue && Date.now() < new Date(st.payDue).getTime() - 3 * 86400000) return L('Follow the deal', 'ڈیل دیکھیں', 'تابع الصفقة')
  if (key === 'received' || key === 'advance_due') return L('Record the payment', 'ادائیگی درج کریں', 'سجّل الدفع')
  return L('Follow the deal', 'ڈیل دیکھیں', 'تابع الصفقة')
}

// One name per request status for the buyer, on every list and page (UX-048).
//   open        → «يستقبل العروض»
//   open, past the deadline → «انتهت المهلة — اختر عرضاً» (or «… — مدّد المهلة» with no offers yet)
//   chosen      → «الصفقة جارية» until every deal is paid and confirmed → «اكتملت الصفقة»
//   cancelled   → «ملغى»; ended with nothing chosen → «انتهى دون اختيار»
export type RfqStatusKey = 'open' | 'expired_choose' | 'expired_empty' | 'deal_ongoing' | 'deal_done' | 'cancelled' | 'ended'
export function rfqStatusLabel(
  rfq: any,
  opts: { dealStarted?: boolean; dealComplete?: boolean; hasOffers?: boolean; expired?: boolean },
  locale: string = 'ar',
): { key: RfqStatusKey; label: string } {
  const T = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  if (opts.dealComplete) return { key: 'deal_done', label: T('Deal complete', 'ڈیل مکمل', 'اكتملت الصفقة') }
  if (opts.dealStarted) return { key: 'deal_ongoing', label: T('Deal in progress', 'ڈیل جاری ہے', 'الصفقة جارية') }
  if (rfq?.status === 'cancelled') return { key: 'cancelled', label: T('Cancelled', 'منسوخ', 'ملغى') }
  if (rfq?.status === 'open') {
    if (!opts.expired) return { key: 'open', label: T('Receiving offers', 'آفرز آ رہی ہیں', 'يستقبل العروض') }
    return opts.hasOffers
      ? { key: 'expired_choose', label: T('Offer window ended — choose an offer', 'آفرز کی مہلت ختم — آفر منتخب کریں', 'انتهت مهلة العروض — اختر عرضاً') }
      : { key: 'expired_empty', label: T('Offer window ended — extend it', 'آفرز کی مہلت ختم — مہلت بڑھائیں', 'انتهت مهلة العروض — مدّدها') }
  }
  return { key: 'ended', label: T('Ended without a choice', 'انتخاب کے بغیر ختم', 'انتهى دون اختيار') }
}
