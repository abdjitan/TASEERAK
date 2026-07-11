// باقات اشتراك المورّد (المقاول مجاني دائماً). التعريف مركزي هنا لاستخدامه في صفحة الباقات،
// وشارة الحالة، وأي تحصين مستقبلي. الأسعار تقديرية للسوق السعودي (المورّد يدفع).
export type PlanKey = 'free' | 'professional' | 'premium'

export type Plan = {
  key: PlanKey
  name: string
  name_en: string
  price: string        // نص العرض (بالريال/شهر)
  tagline: string
  featured?: boolean
  benefits: string[]
  // حدود ناعمة (تُفرَض لاحقاً عند تفعيل الاشتراك — حالياً للعرض فقط)
  monthlyOffers: number | null // null = غير محدود
}

export const PLANS: Plan[] = [
  {
    key: 'free', name: 'مبتدئ', name_en: 'Starter', price: 'مجاني', tagline: 'ابدأ بلا تكلفة',
    monthlyOffers: 10,
    benefits: ['ظهور في دليل الموردين', 'حتى ١٠ عروض شهرياً', 'نشر أسعار محدود', 'تنبيهات طلبات أساسية'],
  },
  {
    key: 'professional', name: 'احترافي', name_en: 'Professional', price: '٢٩٩–٤٩٩ ر.س/شهر', tagline: 'الأنسب لأغلب الموردين', featured: true,
    monthlyOffers: null,
    benefits: ['عروض غير محدودة', 'أولوية ظهور + شارة مميّزة', 'وصول كامل لمؤشّر الأسعار', 'تنبيه فوري للطلبات الجديدة', 'تعبئة أسعار مجمّعة'],
  },
  {
    key: 'premium', name: 'مصنّع / متعدّد الفروع', name_en: 'Premium', price: '٩٩٩+ ر.س/شهر', tagline: 'للمصانع والشركات الكبيرة',
    monthlyOffers: null,
    benefits: ['ظهور مُميَّز (Featured)', 'لوحة تحليلات وأداء', 'فروع ومستخدمون متعدّدون', 'رفع أسعار عبر API/Excel', 'دعم أولوية'],
  },
]

export const PLAN_BY_KEY: Record<string, Plan> = Object.fromEntries(PLANS.map(p => [p.key, p]))

// هل الاشتراك مدفوع وفعّال (غير منتهٍ)؟
export function isSubscribed(profile: any): boolean {
  const plan = profile?.subscription_plan
  if (!plan || plan === 'free') return false
  const exp = profile?.subscription_expires_at
  return !exp || new Date(exp) > new Date()
}

export function planLabel(key: string): string {
  return PLAN_BY_KEY[key]?.name || 'مبتدئ'
}
