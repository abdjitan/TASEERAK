// Buyer rating chips, shared by web and app (round-5 UX-035). A comment is stored in one form (Arabic)
// whatever the reader's language: «نقاط القوة: الالتزام بالموعد، جودة المواد» then the free text.
export const REVIEW_TAGS: { key: string; ar: string; en: string; ur: string }[] = [
  { key: 'on_time', ar: 'الالتزام بالموعد', en: 'On time', ur: 'وقت کی پابندی' },
  { key: 'quality', ar: 'جودة المواد', en: 'Material quality', ur: 'سامان کا معیار' },
  { key: 'dealing', ar: 'حسن التعامل', en: 'Good dealing', ur: 'اچھا برتاؤ' },
]

/** Split a saved comment into chip keys and the free text (only the free text goes to translation). */
export function splitReview(comment: any): { tags: string[]; text: string } {
  const s = String(comment || '')
  const m = s.match(/^نقاط القوة:\s*([^\n]*)\n?/)
  if (!m) return { tags: [], text: s }
  const tags = m[1].split('،').map(x => x.trim()).map(ar => REVIEW_TAGS.find(t => t.ar === ar)?.key).filter(Boolean) as string[]
  return { tags, text: s.slice(m[0].length).trim() }
}
