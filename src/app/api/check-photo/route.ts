// POST /api/check-photo { product, image: { base64, mime } } → { ok, match: true|false|null, seen }
// Tester feedback (owner 2026-11-21): a photo attached to a material line (e.g. a laptop on a
// «سبوت سقف» line) should be flagged. The AI only WARNS; the buyer can keep the photo. Free tier
// only (Gemini, freeOnly): no paid provider is ever called; past the caps the check is skipped.
// Site (cookie) or mobile app (Bearer).
import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { aiVisionJson, AI_DOC_ENABLED } from '@/lib/ai'
import { overHourlyLimit, overGlobalDailyLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 20

const SYSTEM = `أنت تتحقق من صورة أرفقها مشترٍ مع مادة يطلب تسعيرها (مواد بناء وتشطيبات وكهرباء وسباكة وأدوات).
قرّر فقط: هل تُظهر الصورة هذه المادة أو شيئاً قريباً منها جداً (نفس نوع المنتج، أو مكان تركيبه، أو مخطط أو ورقة مواصفات له)؟
أجب بكائن JSON فقط: {"match": true|false, "seen": "ما تراه في الصورة بكلمتين أو ثلاث بالعربية الفصحى"}.
إن لم تكن متأكداً فأعد match=true (لا نزعج المشتري بلا سبب).`

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!AI_DOC_ENABLED) return NextResponse.json({ ok: true, match: null, skipped: 'no_free_ai' })
  const body = await req.json().catch(() => ({}))
  const product = String(body?.product || '').trim().slice(0, 120)
  const b64 = String(body?.image?.base64 || '')
  const mime = String(body?.image?.mime || '')
  if (!product || !b64 || !/^image\/(jpeg|png|webp)$/.test(mime) || b64.length > 2_000_000) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
  // caps keep it inside the free tier: 30 checks an hour per person, 400 a day in total
  if (await overHourlyLimit(supabase, 'check-photo', user.id, 30)) return NextResponse.json({ ok: true, match: null, skipped: 'rate' })
  if (await overGlobalDailyLimit('check-photo', 400)) return NextResponse.json({ ok: true, match: null, skipped: 'daily' })
  const out = await aiVisionJson<{ match: boolean; seen?: string }>({
    system: SYSTEM,
    user: `المادة المطلوبة: «${product}». هل تطابقها الصورة؟`,
    image: { base64: b64, mime },
    schema: { type: 'object', properties: { match: { type: 'boolean' }, seen: { type: 'string' } }, required: ['match'] },
    maxTokens: 120,
    preferFree: true,
    freeOnly: true,
    timeoutMs: 12000,
    validate: (o: any) => typeof o?.match === 'boolean',
  } as any)
  if (!out) return NextResponse.json({ ok: true, match: null, skipped: 'ai_unavailable' })
  return NextResponse.json({ ok: true, match: out.match, seen: String(out.seen || '').slice(0, 60) })
}
