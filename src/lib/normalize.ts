/**
 * تطبيع النصوص للمطابقة الذكية — يدعم العربية والإنجليزية والأوردو.
 * Text normalization for fuzzy keyword matching (Arabic / English / Urdu).
 *
 * لماذا؟ جداول الكميات (BOQ) مليئة باختلافات الكتابة:
 *   - همزة ناقصة      "اضاءة"   <-> "إضاءة"
 *   - تاء مربوطة/هاء   "خرسانة"  <-> "خرسانه"
 *   - تشكيل / حركات    مع <-> بدون
 *   - تطويل (كشيدة)    "حــديد"  <-> "حديد"
 *   - ألف لين / ياء    "مبنى"    <-> "مبني"
 *   - حروف أوردو       اوردو     <-> عربي
 *
 * نُطبّع *النص المُدخل والكلمة المفتاحية معاً* قبل المقارنة، فتتوحّد كل
 * الصيغ لشكل واحد.  Used by detectSector() and detectSubCategory().
 *
 * Implemented as a single code-point pass (numeric, not regex character
 * ranges) on purpose: an Arabic literal range like U+061A..U+0670 silently
 * eats every Arabic letter (U+0621..U+064A). Using numeric code points makes
 * that class of bug impossible.
 */

export function normalizeText(input: unknown): string {
  if (input === null || input === undefined) return ''
  const s = String(input).toLowerCase() // case-fold Latin (English)
  let out = ''

  for (const ch of s) {
    const cp = ch.codePointAt(0) as number

    // ── إسقاط علامات التشكيل والتطويل — drop combining marks + tatweel ──
    if (
      (cp >= 0x0610 && cp <= 0x061a) || // honorific / quranic signs
      (cp >= 0x064b && cp <= 0x065f) || // harakat + combining marks (yaa=064A excluded)
      cp === 0x0670 ||                  // superscript alef
      cp === 0x0640                     // tatweel / kashida
    ) {
      continue
    }

    // ── إسقاط الهمزة المفردة — drop standalone hamza (forgot-hamza case) ──
    if (cp === 0x0621) continue

    // ── توحيد الحروف — fold letter variants to a canonical form ──
    switch (cp) {
      // عائلة الألف: آ أ إ ٱ → ا
      case 0x0622: case 0x0623: case 0x0625: case 0x0671:
        out += 'ا'; break
      case 0x0649: out += 'ي'; break // ى (ألف مقصورة) → ي
      case 0x0624: out += 'و'; break // ؤ → و
      case 0x0626: out += 'ي'; break // ئ → ي
      case 0x0629: out += 'ه'; break // ة (تاء مربوطة) → ه
      // أوردو/فارسي:
      case 0x06cc: out += 'ي'; break // ی (ياء فارسية) → ي
      case 0x06a9: out += 'ك'; break // ک (كاف) → ك
      case 0x06af: out += 'ك'; break // گ (گاف) → ك
      case 0x06c0: case 0x06c1: case 0x06c2: case 0x06c3:
      case 0x06be: case 0x06d5:
        out += 'ه'; break            // صيغ الهاء الأوردية → ه
      case 0x06d2: out += 'ي'; break // ے → ي
      default: out += ch
    }
  }

  // توحيد المسافات — collapse whitespace
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * هل يحتوي النص (بعد التطبيع) على الكلمة المفتاحية (بعد التطبيع)؟
 * Does the normalized haystack contain the normalized needle?
 */
export function normalizedIncludes(haystack: string, needle: string): boolean {
  const n = normalizeText(needle)
  if (!n) return false
  return normalizeText(haystack).includes(n)
}
