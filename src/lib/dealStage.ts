// حالة الصفقة بعد القبول — مرحلة موحّدة تُعرض للمقاول في قائمة العروض وصفحة التفاصيل.
// المراحل الأربع: 1) قبول العرض · 2) تسليم المورد · 3) استلام المقاول · 4) الدفع.
// المصدر: حقول جدول offers (accepted_at, supplier_delivered_at, received_at, payment_status, payment_confirmed_at, dispute_status).

export type DealStage = {
  step: number // 1..4 (0 عند وجود نزاع)
  key: 'accepted' | 'delivered' | 'received' | 'paid' | 'disputed'
  label: string // نص "وين صارت الطلبية"
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
  accepted: { buyer: ['تمّ اختيار العرض — بانتظار تسليم المورد', 'Offer chosen — waiting for delivery', 'آفر منتخب ہو گئی — ڈیلیوری کا انتظار'], supplier: ['اختارك المشتري — عليك تسليم البضاعة', 'The buyer chose you — deliver the goods', 'خریدار نے آپ کو منتخب کیا — سامان ڈیلیور کریں'] },
}
function lbl(k: string, who: Who, locale: string) { const t = LABELS[k][who]; return locale === 'en' ? t[1] : locale === 'ur' ? t[2] : t[0] }

export function dealStage(offer: any, who: Who = 'buyer', locale: string = 'ar'): DealStage {
  if (offer?.dispute_status === 'open')
    return { step: 0, key: 'disputed', label: lbl('disputed', who, locale), emoji: '⚠', done: false, tone: '#DC2626' }

  const paid = offer?.payment_status === 'paid'

  if (paid && offer?.payment_confirmed_at && offer?.supplier_delivered_at && offer?.received_at)
    return { step: 4, key: 'paid', label: lbl('done', who, locale), emoji: '✅', done: true, tone: '#0F6E56' }

  if (offer?.received_at) {
    if (paid)
      return { step: 4, key: 'paid', label: lbl('paid_pending', who, locale), emoji: '💵', done: false, tone: '#0F6E56' }
    return { step: 3, key: 'received', label: lbl('received', who, locale), emoji: '📥', done: false, tone: '#0B2438' }
  }

  if (offer?.supplier_delivered_at)
    return { step: 2, key: 'delivered', label: lbl('delivered', who, locale), emoji: '📦', done: false, tone: '#D4A543' }

  return { step: 1, key: 'accepted', label: lbl('accepted', who, locale), emoji: '🚚', done: false, tone: '#D4A543' }
}
