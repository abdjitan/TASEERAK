// رابط صورة المنتج المولّدة (مخزّنة على Supabase Storage/product-images/catalog).
// الـslug = تجزئة djb2 على اسم المنتج — يطابق تماماً سكربت التوليد، فلا نحتاج جدول ربط.

export function productSlug(name: string): string {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0
  return h.toString(16)
}

export function productImageUrl(name: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!base || !name) return ''
  return `${base}/storage/v1/object/public/product-images/catalog/${productSlug(name)}.png`
}

// صورة مخصّصة لتخصص المورّد (بمفتاح التخصص) — مولّدة ومرفوعة على product-images/specialty/.
export function specialtyImageUrl(subKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!base || !subKey) return ''
  return `${base}/storage/v1/object/public/product-images/specialty/${subKey}.png`
}
