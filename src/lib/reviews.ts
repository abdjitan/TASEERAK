// Buyer rating chips, shared by web and app (round-5 UX-035). A comment is stored in one form (Arabic)
// whatever the reader's language: «نقاط القوة: الالتزام بالموعد، جودة المواد» then the free text.
export const REVIEW_TAGS: { key: string; ar: string; en: string; ur: string }[] = [
  { key: 'on_time', ar: 'الالتزام بالموعد', en: 'On time', ur: 'وقت کی پابندی' },
  { key: 'quality', ar: 'جودة المواد', en: 'Material quality', ur: 'سامان کا معیار' },
  { key: 'dealing', ar: 'حسن التعامل', en: 'Good dealing', ur: 'اچھا برتاؤ' },
]

// round-7 UX-133 / round-8 UX-005: chips for a low rating (2 stars or fewer), stored in Arabic with the
// comment as «ملاحظات: تأخّر التسليم، …» then the free text. Shown neutral (grey, no check mark), never red.
export const NEG_TAGS: { key: string; ar: string; en: string; ur: string }[] = [
  { key: 'late', ar: 'تأخّر التسليم', en: 'Late delivery', ur: 'ڈیلیوری میں تاخیر' },
  { key: 'low_quality', ar: 'جودة أقل من المتوقع', en: 'Lower quality than expected', ur: 'توقع سے کم معیار' },
  { key: 'bad_dealing', ar: 'سوء التعامل', en: 'Poor dealing', ur: 'برا برتاؤ' },
]

/** The chip list for a rating: NEG_TAGS at 2 stars or fewer, REVIEW_TAGS above, none before a star is chosen. */
export const reviewTagsFor = (rating: number) => (rating > 0 && rating <= 2 ? NEG_TAGS : rating > 2 ? REVIEW_TAGS : [])

/** Split a saved comment into chip keys and the free text (only the free text goes to translation).
 *  round-8 UX-005: reads both prefixes; negative = the chips came from «ملاحظات:» (NEG_TAGS). */
export function splitReview(comment: any): { tags: string[]; negative: boolean; text: string } {
  const s = String(comment || '')
  const m = s.match(/^(نقاط القوة|ملاحظات):\s*([^\n]*)\n?/)
  if (!m) return { tags: [], negative: false, text: s }
  const negative = m[1] === 'ملاحظات'
  const list = negative ? NEG_TAGS : REVIEW_TAGS
  const tags = m[2].split('،').map(x => x.trim()).map(ar => list.find(t => t.ar === ar)?.key).filter(Boolean) as string[]
  return { tags, negative, text: s.slice(m[0].length).trim() }
}

/** The stored comment: the chip prefix (by the rating) then the free text. */
export function joinReview(rating: number, tags: string[], text: string): string {
  const neg = rating > 0 && rating <= 2
  const list = neg ? NEG_TAGS : REVIEW_TAGS
  const chosen = list.filter(t => tags.includes(t.key)).map(t => t.ar)
  const head = chosen.length ? `${neg ? 'ملاحظات' : 'نقاط القوة'}: ${chosen.join('، ')}` : ''
  return [head, (text || '').trim()].filter(Boolean).join('\n')
}

/** A chip's label in the reader's language (either list). */
export function reviewTagLabel(key: string, locale: string): string {
  const t = REVIEW_TAGS.find(x => x.key === key) || NEG_TAGS.find(x => x.key === key)
  if (!t) return key
  return locale === 'en' ? t.en : locale === 'ur' ? t.ur : t.ar
}
