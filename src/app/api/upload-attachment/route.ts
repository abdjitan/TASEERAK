// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// SECURITY FIX #6: validate uploads on the SERVER (the client-side magic-byte
// check is bypassable). We re-check extension + size + file signature here and
// only then store the file. The bucket also enforces MIME + size.
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xlsx', 'xls', 'doc', 'docx']
const MAX_SIZE = 15 * 1024 * 1024

function magicOk(ext: string, bytes: Uint8Array): boolean {
  const h = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (ext === 'pdf') return h.startsWith('25504446')                 // %PDF
  if (ext === 'jpg' || ext === 'jpeg') return h.startsWith('ffd8ff')
  if (ext === 'png') return h.startsWith('89504e47')
  if (ext === 'webp') return h.startsWith('52494646')                // RIFF
  if (ext === 'xlsx' || ext === 'docx') return h.startsWith('504b03') || h.startsWith('504b05') || h.startsWith('504b07') // ZIP
  if (ext === 'xls' || ext === 'doc') return h.startsWith('d0cf11e0') // OLE2
  return false
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ ok: false, error: 'no_file', message: 'لم يصل أي ملف' }, { status: 400 })

  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) return NextResponse.json({ ok: false, error: 'bad_type', message: 'نوع الملف غير مسموح به' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ ok: false, error: 'too_large', message: 'الملف أكبر من 15 ميجابايت' }, { status: 400 })

  const buf = new Uint8Array(await file.arrayBuffer())
  if (!magicOk(ext, buf)) return NextResponse.json({ ok: false, error: 'content_mismatch', message: 'محتوى الملف لا يطابق امتداده — قد يكون ملفاً ضاراً' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const path = `${user.id}/offer-${Date.now()}.${ext}`
  const { data: up, error: upErr } = await admin.storage.from('licenses')
    .upload(path, buf, { upsert: true, contentType: file.type || 'application/octet-stream' })
  if (upErr || !up) return NextResponse.json({ ok: false, error: 'upload_failed', message: 'تعذّر رفع الملف' }, { status: 502 })
  const { data: { publicUrl } } = admin.storage.from('licenses').getPublicUrl(up.path)
  return NextResponse.json({ ok: true, url: publicUrl, name: file.name })
}
