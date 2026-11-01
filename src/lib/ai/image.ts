// Images sent to a vision model: real type sniffed from the bytes, and large photos shrunk to
// ~1024 px on the long side before sending (a phone photo of 4000×3000 is billed as ~1,600 tokens
// by Claude after its own resize and as several 768-px tiles by older Gemini models; 1024 px keeps
// label text readable). Uses sharp when the server has it; without it the photo goes as is.

export function imageMime(buf: Buffer): string | null {
  const h = buf.subarray(0, 12).toString('hex')
  if (h.startsWith('ffd8ff')) return 'image/jpeg'
  if (h.startsWith('89504e47')) return 'image/png'
  if (h.startsWith('52494646') && h.slice(16, 24) === '57454250') return 'image/webp'
  return null
}

const MAX_SIDE = 1024

export async function shrinkForVision(buf: Buffer, mime: string): Promise<{ buf: Buffer; mime: string; resized: boolean }> {
  if (buf.length < 350 * 1024) return { buf, mime, resized: false } // small enough already
  try {
    const mod: any = await import('sharp')
    const sharp = mod.default || mod
    const img = sharp(buf, { failOn: 'none' }).rotate() // honour EXIF orientation
    const meta = await img.metadata()
    if (!meta.width || !meta.height || Math.max(meta.width, meta.height) <= MAX_SIDE) return { buf, mime, resized: false }
    const out: Buffer = await img.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    return out.length < buf.length ? { buf: out, mime: 'image/jpeg', resized: true } : { buf, mime, resized: false }
  } catch {
    return { buf, mime, resized: false }
  }
}
