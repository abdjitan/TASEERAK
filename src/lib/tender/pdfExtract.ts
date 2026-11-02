// Text extraction from a PDF with pdfjs-dist, page by page. The pdfjs module is passed in, so the
// same code runs in the browser (worker build, loaded only on the tender pages) and in Node tests
// (legacy build). Nothing is sent anywhere: the caller keeps only the returned JSON.
import type { ExtractedPdf, PdfPageText, PdfTextItem } from './types'
import { linesOf } from './layout'

const r1 = (n: number) => Math.round(n * 10) / 10

export type ExtractOptions = {
  name: string
  kind: 'drawing' | 'spec' | 'other'
  /** progress after each page */
  onPage?: (done: number, total: number) => void
  /** called with each pdfjs page of a drawing (the browser renders a thumbnail here) */
  onDrawingPage?: (page: any, n: number) => Promise<void>
  shouldStop?: () => boolean
  maxPages?: number
}

/** Text runs of one pdfjs page in the rendered orientation (handles /Rotate 90 sheets). */
export async function pageItems(pdfjs: any, page: any): Promise<{ w: number; h: number; items: PdfTextItem[] }> {
  const vp = page.getViewport({ scale: 1 })
  const tc = await page.getTextContent()
  const items: PdfTextItem[] = []
  for (const it of tc.items as any[]) {
    const s = typeof it.str === 'string' ? it.str.normalize('NFKC').replace(/\s+/g, ' ').trim() : ''
    if (!s) continue
    const t = pdfjs.Util.transform(vp.transform, it.transform)
    const h = Math.hypot(t[2], t[3])
    const ang = Math.round((Math.atan2(t[1], t[0]) * 180) / Math.PI)
    const r = ((Math.round(ang / 90) * 90) % 360 + 360) % 360
    const item: PdfTextItem = { s, x: r1(t[4]), y: r1(t[5]), w: r1(Math.abs(it.width || 0)), h: r1(h) }
    if (r) item.r = r
    items.push(item)
  }
  return { w: r1(vp.width), h: r1(vp.height), items }
}

export async function extractPdf(pdfjs: any, data: ArrayBuffer | Uint8Array, opts: ExtractOptions): Promise<ExtractedPdf> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise
  const numPages: number = doc.numPages
  const total = Math.min(numPages, opts.maxPages || numPages)
  const pages: PdfPageText[] = []
  const emptyPages: number[] = []
  try {
    for (let n = 1; n <= total; n++) {
      if (opts.shouldStop?.()) break
      const page = await doc.getPage(n)
      const { w, h, items } = await pageItems(pdfjs, page)
      if (items.length < 3) emptyPages.push(n)
      if (opts.kind === 'drawing') {
        pages.push({ n, w, h, items })
        if (opts.onDrawingPage) { try { await opts.onDrawingPage(page, n) } catch { /* a thumbnail is optional */ } }
      } else {
        pages.push({ n, w, h, lines: linesOf(items) })
      }
      page.cleanup?.()
      opts.onPage?.(n, total)
      // let the page breathe between pages (progress bar, clicks)
      await new Promise(res => setTimeout(res, 0))
    }
  } finally {
    await doc.destroy?.()
  }
  return { v: 1, name: opts.name, kind: opts.kind, pages, numPages, emptyPages }
}
