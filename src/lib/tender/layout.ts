// Text layout helpers on extracted PDF text runs: drop exact duplicates (CAD prints many labels
// twice at the same spot), group runs into lines, and split lines into phrases at wide gaps
// (a drawing has many unrelated texts on the same height across the sheet).
import type { PdfTextItem } from './types'

/** Same text at (almost) the same position = one label. */
export function dedupeItems(items: PdfTextItem[], tol = 1): PdfTextItem[] {
  const out: PdfTextItem[] = []
  const seen = new Map<string, PdfTextItem[]>()
  for (const it of items) {
    const s = it.s.trim()
    if (!s) continue
    const list = seen.get(s) || []
    if (list.some(o => Math.abs(o.x - it.x) <= tol && Math.abs(o.y - it.y) <= tol)) continue
    list.push(it); seen.set(s, list)
    out.push({ ...it, s })
  }
  return out
}

export type Phrase = { text: string; x: number; y: number; x2: number; h: number; items: PdfTextItem[] }

/** Horizontal runs grouped into lines (same baseline ± 0.4 h), then split where the gap > gapH × h. */
export function phrasesOf(items: PdfTextItem[], gapH = 1.5): Phrase[] {
  const hz = items.filter(i => !i.r).sort((a, b) => a.y - b.y || a.x - b.x)
  const lines: PdfTextItem[][] = []
  for (const it of hz) {
    const line = lines.length ? lines[lines.length - 1] : null
    if (line && Math.abs(line[0].y - it.y) <= Math.max(1, 0.4 * Math.min(line[0].h, it.h))) line.push(it)
    else lines.push([it])
  }
  const out: Phrase[] = []
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x)
    let cur: PdfTextItem[] = []
    const flush = () => {
      if (!cur.length) return
      const x = cur[0].x, last = cur[cur.length - 1]
      out.push({ text: cur.map(c => c.s).join(' ').replace(/\s+/g, ' ').trim(), x, y: cur[0].y, x2: last.x + last.w, h: Math.max(...cur.map(c => c.h)), items: cur })
      cur = []
    }
    for (const it of line) {
      const prev = cur[cur.length - 1]
      if (prev && (it.x - (prev.x + prev.w) > gapH * Math.max(prev.h, it.h) || Math.abs(prev.h - it.h) > 0.35 * Math.max(prev.h, it.h))) flush()
      cur.push(it)
    }
    flush()
  }
  return out
}

/** Reading-order lines of a page (for specifications): one string per baseline. */
export function linesOf(items: PdfTextItem[]): string[] {
  return phrasesOf(items, 6).sort((a, b) => a.y - b.y || a.x - b.x).reduce((acc: { y: number; h: number; parts: string[] }[], p) => {
    const last = acc[acc.length - 1]
    if (last && Math.abs(last.y - p.y) <= 0.4 * Math.max(last.h, p.h)) last.parts.push(p.text)
    else acc.push({ y: p.y, h: p.h, parts: [p.text] })
    return acc
  }, []).map(l => l.parts.join('  ').trim()).filter(Boolean)
}
