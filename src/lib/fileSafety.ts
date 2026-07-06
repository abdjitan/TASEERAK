// Client-side upload safety. Defense-in-depth on top of the server bucket
// allowed_mime_types + size limit. Validates the extension, the size, and the
// real file content (magic bytes) so a renamed executable / script is rejected.
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xlsx', 'xls', 'doc', 'docx']
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

function magicOk(bytes: Uint8Array, ext: string): boolean {
  const h = Array.from(bytes.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join('')
  switch (ext) {
    case 'pdf': return h.startsWith('25504446')                 // %PDF
    case 'jpg':
    case 'jpeg': return h.startsWith('ffd8ff')
    case 'png': return h.startsWith('89504e47')
    case 'webp': return h.startsWith('52494646') && h.slice(16, 24) === '57454250'  // RIFF….WEBP (not AVI/WAV) (BUG-15)
    case 'xlsx':
    case 'docx': return h.startsWith('504b03') || h.startsWith('504b05') || h.startsWith('504b07') // PK (zip)
    case 'xls':
    case 'doc': return h.startsWith('d0cf11e0')                 // OLE compound
    default: return false
  }
}

export async function validateUploadFile(file: any): Promise<{ ok: boolean; error?: string }> {
  if (!file) return { ok: true }
  const ext = (file.name?.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, error: 'نوع الملف غير مسموح — يُقبل فقط PDF أو صورة أو Excel أو Word. / File type not allowed.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت). / File too large (max 15 MB).' }
  }
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (!magicOk(buf, ext)) {
      return { ok: false, error: 'محتوى الملف لا يطابق نوعه — قد يكون ملفاً ضاراً، تم رفضه. / File content does not match its type — rejected.' }
    }
  } catch {
    // fail-closed: if we can't read the header to verify it, reject rather than trust it (BUG-15)
    return { ok: false, error: 'تعذّر قراءة الملف للتحقّق منه — جرّب ملفاً آخر. / Could not read the file to verify it.' }
  }
  return { ok: true }
}
