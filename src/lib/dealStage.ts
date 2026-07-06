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

export function dealStage(offer: any): DealStage {
  if (offer?.dispute_status === 'open')
    return { step: 0, key: 'disputed', label: 'نزاع مفتوح — قيد المعالجة', emoji: '⚠', done: false, tone: '#DC2626' }

  const paid = offer?.payment_status === 'paid'

  if (paid && offer?.payment_confirmed_at && offer?.supplier_delivered_at && offer?.received_at)
    return { step: 4, key: 'paid', label: 'تمّت الصفقة — مدفوعة وموثّقة', emoji: '✅', done: true, tone: '#0F6E56' }

  if (offer?.received_at) {
    if (paid)
      return { step: 4, key: 'paid', label: 'دُفعت — بانتظار تأكيد المورد لاستلام الدفعة', emoji: '💵', done: false, tone: '#0F6E56' }
    return { step: 3, key: 'received', label: 'تمّ الاستلام — بانتظار الدفع', emoji: '📥', done: false, tone: '#1B2D5B' }
  }

  if (offer?.supplier_delivered_at)
    return { step: 2, key: 'delivered', label: 'أكّد المورد التسليم — بانتظار تأكيد استلامك', emoji: '📦', done: false, tone: '#F5831F' }

  return { step: 1, key: 'accepted', label: 'تمّ القبول — بانتظار تسليم المورد', emoji: '🚚', done: false, tone: '#F5831F' }
}
