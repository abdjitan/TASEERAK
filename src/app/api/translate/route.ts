import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'
import { aiJson } from '@/lib/ai'
import { overHourlyLimit, overGlobalDailyLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 30

// Translate user-written text (request notes, material names and specs, offer notes) into the
// reader's language (owner 2026-10-31). Each (text, language) is translated once and kept in
// text_translations (180), so a repeat costs nothing. Free AI first (Gemini); limits: 60 calls an
// hour per person, 1,500 a day in total. Site (cookie) or mobile app (Bearer).

const LANG_NAME: Record<string, string> = { ar: 'Modern Standard Arabic (فصحى)', en: 'English', ur: 'Urdu (اردو)' }
const hashOf = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 40)

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const to = String(body?.to || '')
  if (!LANG_NAME[to]) return NextResponse.json({ ok: false, error: 'bad_lang' }, { status: 400 })
  const texts: string[] = (Array.isArray(body?.texts) ? body.texts : []).map((t: any) => String(t || '').trim().slice(0, 600)).filter(Boolean).slice(0, 30)
  if (!texts.length) return NextResponse.json({ ok: true, translations: {} })

  const admin = createAdminSupabaseClient()
  const out: Record<string, string> = {}
  const hashes = texts.map(hashOf)
  const { data: cached } = await admin.from('text_translations').select('hash, out').eq('lang', to).in('hash', hashes)
  const byHash = new Map((cached || []).map((r: any) => [r.hash, r.out]))
  const todo: string[] = []
  texts.forEach((t, i) => { const c = byHash.get(hashes[i]); if (c != null) out[t] = c; else if (!todo.includes(t)) todo.push(t) })
  if (!todo.length) return NextResponse.json({ ok: true, translations: out })

  if (await overHourlyLimit(supabase, 'translate', user.id, 60) || await overGlobalDailyLimit('translate', 1500)) {
    return NextResponse.json({ ok: true, translations: out, limited: true })
  }
  const res = await aiJson<{ translations: string[] }>({
    system: `You translate short texts from a construction-materials marketplace in Saudi Arabia (buyer notes, material names, specifications, supplier notes) into ${LANG_NAME[to]}. Keep numbers, sizes, units, model codes and brand names exactly as they are. Translate meaning naturally and briefly; do not add anything. If a text is already in the target language, return it unchanged. Return the same number of items, in the same order.`,
    user: JSON.stringify(todo),
    schema: { type: 'object', properties: { translations: { type: 'array', items: { type: 'string' } } }, required: ['translations'] },
    maxTokens: 2000,
    preferFree: true,
  }).catch(() => null)
  const tr = Array.isArray(res?.translations) && res!.translations.length === todo.length ? res!.translations : null
  if (tr) {
    const rows = todo.map((t, i) => ({ hash: hashOf(t), lang: to, src: t, out: String(tr[i] || t).slice(0, 1200) }))
    rows.forEach(r => { out[r.src] = r.out })
    await admin.from('text_translations').upsert(rows, { onConflict: 'hash,lang' })
  }
  return NextResponse.json({ ok: true, translations: out })
}
