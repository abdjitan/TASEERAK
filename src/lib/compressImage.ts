// Shrinks user photos before upload (phone photos are 3–8 MB; a 1600px WebP is ~150–400 KB).
// Only raster photos are touched: PDFs, Office files, CSV, SVG and small images pass through
// unchanged, and any failure returns the original file, so an upload never breaks because of it.

const RASTER = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MIN_BYTES = 300 * 1024

/** Longest side for documents (CR, licences, invoices) so the text stays legible. */
export const DOC_MAX_SIDE = 2000

async function decode(blob: Blob): Promise<{ src: CanvasImageSource; w: number; h: number; close: () => void } | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() }
    } catch { /* fall back to <img> */ }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('decode')); img.src = url })
    if (!img.naturalWidth || !img.naturalHeight) return null
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => {
    try { canvas.toBlob(b => resolve(b), type, quality) } catch { resolve(null) }
  })
}

function asFile(blob: Blob, name?: string): File {
  if (typeof File !== 'undefined' && blob instanceof File) return blob
  return new File([blob], name || 'file', { type: blob.type })
}

export async function compressImage(file: File | Blob, opts?: { maxSide?: number; quality?: number }): Promise<File> {
  const original = asFile(file)
  try {
    if (typeof document === 'undefined') return original
    const type = (file.type || '').toLowerCase()
    if (!RASTER.includes(type) || file.size < MIN_BYTES) return original

    const maxSide = opts?.maxSide ?? 1600
    const dec = await decode(file)
    if (!dec) return original
    const scale = Math.min(1, maxSide / Math.max(dec.w, dec.h))
    const w = Math.max(1, Math.round(dec.w * scale))
    const h = Math.max(1, Math.round(dec.h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) { dec.close(); return original }
    // PNG with transparency → white background (JPEG has no alpha; WebP keeps it but white is safer for scans)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(dec.src, 0, 0, w, h)
    dec.close()

    let out = await encode(canvas, 'image/webp', opts?.quality ?? 0.8)
    let ext = 'webp'
    if (!out || out.type !== 'image/webp') {
      out = await encode(canvas, 'image/jpeg', opts?.quality ?? 0.82)
      ext = 'jpg'
    }
    if (!out || out.size >= file.size) return original

    const base = ((file as File).name || 'image').replace(/\.[^./\\]+$/, '') || 'image'
    return new File([out], `${base}.${ext}`, { type: ext === 'webp' ? 'image/webp' : 'image/jpeg', lastModified: Date.now() })
  } catch {
    return original
  }
}
