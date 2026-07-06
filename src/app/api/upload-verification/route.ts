import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// رفع مستندات التحقّق (الرخصة / السجل التجاري) مع فحص أمني على الخادم:
// المحتوى يطابق الامتداد (magic-byte) — لا يكفي فحص المتصفح. تذهب للحاوية الخاصّة
// "verification" (لا public URL)، والمسار يُبنى من معرّف المستخدم (لا يكتب لمجلّد غيره).
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
const MAX_SIZE = 15 * 1024 * 1024

function magicOk(ext: string, bytes: Uint8Array): boolean {
  const h = Array.from(bytes.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (ext === 'pdf') return h.startsWith('25504446')
  if (ext === 'jpg' || ext === 'jpeg') return h.startsWith('ffd8ff')
  if (ext === 'png') return h.startsWith('89504e47')
  if (ext === 'webp') return h.startsWith('52494646') && h.slice(16, 24) === '57454250'
  return false
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { data: allowed } = await supabase.rpc('check_rate_limit', { p_bucket: 'verifupload:' + user.id, p_max: 20, p_window_seconds: 3600 })
  if (allowed === false) return NextResponse.json({ ok: false, error: 'rate_limited', message: 'محاولات رفع كثيرة — حاول بعد قليل.' }, { status: 429 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  const kind = String(form?.get('kind') || 'doc').replace(/[^a-z]/gi, '').slice(0, 20) || 'doc'
  if (!file) return NextResponse.json({ ok: false, error: 'no_file', message: 'لم يصل أي ملف' }, { status: 400 })

  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) return NextResponse.json({ ok: false, error: 'bad_type', message: 'النوع المسموح: PDF أو صورة فقط' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ ok: false, error: 'too_large', message: 'الملف أكبر من 15 ميجابايت' }, { status: 400 })

  const buf = new Uint8Array(await file.arrayBuffer())
  if (!magicOk(ext, buf)) return NextResponse.json({ ok: false, error: 'content_mismatch', message: 'محتوى الملف لا يطابق امتداده — قد يكون ملفاً ضاراً' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const path = `${user.id}/${kind}.${ext}`
  const { data: up, error: upErr } = await admin.storage.from('verification')
    .upload(path, buf, { upsert: true, contentType: file.type || 'application/octet-stream' })
  if (upErr || !up) return NextResponse.json({ ok: false, error: 'upload_failed', message: 'تعذّر رفع الملف' }, { status: 502 })
  return NextResponse.json({ ok: true, path: up.path })
}
