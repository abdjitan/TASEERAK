// Browser side of the tender PDFs: loads pdfjs-dist only when a tender page needs it (dynamic
// import, its own web worker), extracts the text page by page and renders a small webp thumbnail
// of each drawing page (≤ 200 KB). The original file never leaves the browser unless it is small
// enough to keep (see MAX_ORIGINAL_BYTES); the extracted JSON is what the workspace stores.
'use client'
import { extractPdf } from './pdfExtract'
import type { ExtractedPdf } from './types'

export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024
export const MAX_THUMB_BYTES = 200 * 1024
export const MAX_BOQ_BYTES = 15 * 1024 * 1024

let loading: Promise<any> | null = null
export function loadPdfjs(): Promise<any> {
  if (!loading) {
    loading = import('pdfjs-dist').then((pdfjs: any) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      return pdfjs
    }).catch(e => { loading = null; throw e })
  }
  return loading
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(res => canvas.toBlob(b => res(b), 'image/webp', quality))
}

/** A webp thumbnail of a pdfjs page, longest side ≈ maxSide px, shrunk until ≤ 200 KB. */
export async function renderThumb(page: any, maxSide = 1100): Promise<Blob | null> {
  const vp1 = page.getViewport({ scale: 1 })
  let side = maxSide
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = side / Math.max(vp1.width, vp1.height)
    const vp = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise
    for (const q of [0.6, 0.45, 0.3]) {
      const b = await canvasToBlob(canvas, q)
      if (b && b.size <= MAX_THUMB_BYTES) return b
    }
    side = Math.round(side * 0.7)
  }
  return null
}

export type PdfProgress = { done: number; total: number }

/** Extract a PDF in the browser. Drawings also get a thumbnail per page (returned by page number). */
export async function extractPdfInBrowser(file: File, kind: 'drawing' | 'spec' | 'other', onProgress: (p: PdfProgress) => void, shouldStop?: () => boolean): Promise<{ data: ExtractedPdf; thumbs: Map<number, Blob> }> {
  const pdfjs = await loadPdfjs()
  const thumbs = new Map<number, Blob>()
  // pdfjs takes ownership of the buffer (sent to its worker): give it its own copy
  const bytes = new Uint8Array(await file.arrayBuffer())
  const data = await extractPdf(pdfjs, bytes, {
    name: file.name, kind,
    onPage: (done, total) => onProgress({ done, total }),
    onDrawingPage: kind === 'drawing' ? async (page, n) => { if (n <= 60) { const b = await renderThumb(page); if (b) thumbs.set(n, b) } } : undefined,
    shouldStop,
  })
  return { data, thumbs }
}
