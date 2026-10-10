// Server-side checks for uploaded files that we parse ourselves (Excel / text).
// The client also validates (lib/fileSafety.ts), but anything reaching an API route is
// attacker-controlled, so size and real content type are re-checked here before parsing.
export const MAX_PARSE_BYTES = 10 * 1024 * 1024 // 10 MB

export function spreadsheetMagicOk(buf: Buffer, ext: string): boolean {
  const h = buf.subarray(0, 8).toString('hex')
  if (ext === 'xlsx') return h.startsWith('504b0304') // zip
  if (ext === 'xls') return h.startsWith('d0cf11e0') // OLE compound file
  return true // csv / txt / md / tsv: plain text, nothing to sniff
}

/** Returns an error message (Arabic) or null when the file may be parsed. */
export function checkParsableUpload(file: File | null, buf: Buffer, ext: string): string | null {
  if (!file) return 'لم يُرفق ملف'
  if (file.size > MAX_PARSE_BYTES || buf.length > MAX_PARSE_BYTES) return 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت).'
  if (!spreadsheetMagicOk(buf, ext)) return 'محتوى الملف لا يطابق نوعه، تم رفضه.'
  return null
}

// Hardened SheetJS read options: no formulas, no HTML, dense mode.
export const SAFE_XLSX_READ = { type: 'buffer' as const, dense: true, cellFormula: false, cellHTML: false }

// Content-Type for stored uploads comes from the (already validated) extension, never from
// the client's file.type: a "%PDF…" file declared as text/html must not be served as HTML.
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword',
}
export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext] || 'application/octet-stream'
}
