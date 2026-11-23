// حالة الصفقة بعد القبول — مرحلة موحّدة تُعرض للمقاول في قائمة العروض وصفحة التفاصيل.
// المراحل الأربع: 1) قبول العرض · 2) تسليم المورد · 3) استلام المقاول · 4) الدفع.
// المصدر: حقول جدول offers (accepted_at, supplier_delivered_at, received_at, payment_status, payment_confirmed_at, dispute_status).

export type DealStage = {
  step: number // 1..4 (0 عند وجود نزاع)
  key: 'accepted' | 'delivered' | 'received' | 'paid' | 'disputed'
  label: string // نص "وين صارت الطلبية"
  short: string // a short badge for lists and cards (UX-054): never «تم التسليم» before the buyer confirms
  emoji: string
  done: boolean // الصفقة مكتملة (مدفوعة وموثّقة)
  tone: string // لون المؤشّر (hex)
}

export const DEAL_STEPS = ['قبول', 'تسليم', 'استلام', 'دفع'] as const

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
}
function sh(k: string, who: Who, locale: string) { const t = SHORT[k][who]; return locale === 'en' ? t[1] : locale === 'ur' ? t[2] : t[0] }
const pick = (t: [string, string, string], locale: string) => (locale === 'en' ? t[1] : locale === 'ur' ? t[2] : t[0])

export function dealStage(offer: any, who: Who = 'buyer', locale: string = 'ar'): DealStage {
  if (offer?.dispute_status === 'open')
    return { step: 0, key: 'disputed', label: lbl('disputed', who, locale), short: sh('disputed', who, locale), emoji: '⚠', done: false, tone: '#DC2626' }

  const paid = offer?.payment_status === 'paid'

  if (paid && offer?.payment_confirmed_at && offer?.supplier_delivered_at && offer?.received_at)
    return { step: 4, key: 'paid', label: lbl('done', who, locale), short: sh('done', who, locale), emoji: '✅', done: true, tone: '#0F6E56' }

  if (offer?.received_at) {
    if (paid)
      return { step: 4, key: 'paid', label: lbl('paid_pending', who, locale), short: sh('paid_pending', who, locale), emoji: '💵', done: false, tone: '#0F6E56' }
    return { step: 3, key: 'received', label: lbl('received', who, locale), short: sh('received', who, locale), emoji: '📥', done: false, tone: '#0B2438' }
  }

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
  if (key === 'received') return L('Your turn: pay the supplier and record it', 'آپ کی باری: سپلائر کو ادائیگی کریں اور درج کریں', 'مطلوب منك: الدفع للمورد وتسجيله')
  return null
}

/** The button text for the buyer's next action on a deal (UX-055): «أكّد الاستلام», «سجّل الدفع» or «تابع الصفقة». */
export function buyerActionLabel(st: DealStage | string, locale: string = 'ar'): string {
  const key = typeof st === 'string' ? st : st.key
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  if (key === 'delivered') return L('Confirm receipt', 'وصولی کی تصدیق کریں', 'أكّد الاستلام')
  if (key === 'received') return L('Record the payment', 'ادائیگی درج کریں', 'سجّل الدفع')
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
