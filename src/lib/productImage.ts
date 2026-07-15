// روابط صور المنتجات/التخصصات/المجموعات (Supabase Storage/product-images).
// الصور الأصلية 1024px (~1.2MB)، لكن نطلبها مصغّرة عبر خدمة تحويل الصور في Supabase
// (render/image) بعرض مناسب لحجم العرض — تحميل أسرع بكثير، والمتصفح يستلم WebP تلقائياً.
// الـslug = تجزئة djb2 على اسم المنتج — يطابق سكربت التوليد، فلا نحتاج جدول ربط.

export function productSlug(name: string): string {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0
  return h.toString(16)
}

// نسخة مصغّرة (size ≈ ضعف حجم العرض لدقة الشاشات العالية) + جودة 70.
// مهم: خدمة التحويل في Supabase لا تحافظ على النسبة إذا مرّرنا width فقط — ترجّع
// width×1024 (شريحة مشوّهة). صورنا كلها مربّعة (1024×1024)، فنطلب مربّعاً
// (width=height) مع resize=contain لإبقاء الصورة كاملة بلا قصّ ولا تشويه.
function thumb(path: string, size: number): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!base || !path) return ''
  return `${base}/storage/v1/render/image/public/product-images/${path}?width=${size}&height=${size}&resize=contain&quality=70`
}

export function productImageUrl(name: string): string {
  if (!name) return ''
  return thumb(`catalog/${productSlug(name)}.png`, 200)
}

// صورة مخصّصة لتخصص المورّد (بمفتاح التخصص) — على product-images/specialty/.
export function specialtyImageUrl(subKey: string): string {
  if (!subKey) return ''
  return thumb(`specialty/${subKey}.png`, 200)
}

// أيقونة مميّزة لمجموعة تصنيفية — على product-images/group/.
export function groupImageUrl(groupKey: string): string {
  if (!groupKey) return ''
  return thumb(`group/${groupKey}.png`, 110)
}
