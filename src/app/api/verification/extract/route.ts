import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'
import { overHourlyLimit, RATE_LIMITED_AR } from '@/lib/rateLimit'
import { normalizeText } from '@/lib/normalize'
import { normalizeCrInput } from '@/lib/cr'

export const runtime = 'nodejs'
export const maxDuration = 60

// =============================================================
// AI read of an uploaded commercial-registration certificate (owner OK 2026-10-19, migration 172).
// Reads the file from the private 'verification' bucket server-side and returns the CR number,
// entity name, expiry, activity and city + mismatch flags for the admin (and an auto-fill
// suggestion for the supplier). It is a helper for the manual review, never a verification.
//
// • Model claude-haiku-5-5 (≈ $0.001 per document). Every call is logged in cr_document_checks
//   with its tokens and cost.
// • Cap: AI_CAP_USD_VERIFY (default $2) per Riyadh calendar month. If the month's spend can't be
//   read → fail closed (manual). At the cap → manual, and the admins get one notice that month.
// • No ANTHROPIC_API_KEY → manual. PDPL: the prompt and the schema never ask for a national ID,
//   iqama or any person's data; only the entity's fields.
// =============================================================

const MODEL = 'claude-haiku-5-5'
const PRICE_IN = 0.10 / 1e6, PRICE_OUT = 0.50 / 1e6 // $ per token
const CAP = Number(process.env.AI_CAP_USD_VERIFY || '2')
const MAX_BYTES = 10 * 1024 * 1024

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    document_type: { type: 'string', enum: ['commercial_registration', 'other', 'unreadable'] },
    cr_number: { type: 'string', description: 'Unified national number (10 digits, usually starts with 7) or the CR number, digits only; empty string if not shown' },
    entity_name: { type: 'string', description: 'Trade name of the establishment exactly as written; empty string if not shown' },
    expiry_date: { type: 'string', description: 'Gregorian YYYY-MM-DD if shown (convert Hijri if only Hijri is shown), else empty string' },
    activity: { type: 'string', description: 'Main commercial activity, short; empty string if not shown' },
    city: { type: 'string', description: 'empty string if not shown' },
    has_qr: { type: 'boolean', description: 'A QR code is visible on the document' },
  },
  required: ['document_type', 'cr_number', 'entity_name', 'expiry_date', 'activity', 'city', 'has_qr'],
}

const SYSTEM = `You read Saudi commercial registration (السجل التجاري) certificates for a marketplace admin.
Return only the establishment's fields in the JSON schema. Never return any person's name, national ID,
iqama number, date of birth or nationality, even if they appear on the document. If the file is not a
commercial registration certificate, set document_type to "other"; if you cannot read it, "unreadable".
Digits: return ASCII digits only.`

const MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

function nameMatches(a: string | null | undefined, b: string | null | undefined): boolean | null {
  const x = normalizeText(a || '').replace(/\s+/g, ' ').trim(), y = normalizeText(b || '').replace(/\s+/g, ' ').trim()
  if (!x || !y) return null
  if (x.includes(y) || y.includes(x)) return true
  const wx = new Set(x.split(' ').filter(w => w.length > 2)), wy = y.split(' ').filter(w => w.length > 2)
  const shared = wy.filter(w => wx.has(w)).length
  return shared >= Math.max(1, Math.ceil(Math.min(wx.size, wy.length) / 2))
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (await overHourlyLimit(supabase, 'cr-read', user.id, 6)) return NextResponse.json({ ok: false, error: 'rate_limited', message: RATE_LIMITED_AR }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const target = body?.target === 'claim' ? 'claim' : 'cr'
  const svc = createAdminSupabaseClient()
  const { data: me } = await svc.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = me?.role === 'admin'

  // Resolve the file and what it is compared with. Non-admins only read their own file.
  let profileId: string = user.id, claimId: string | null = null, filePath = '', expectCr = '', expectName = ''
  if (target === 'claim') {
    const { data: c } = await svc.from('cr_claims').select('id, claimant_id, file_path, commercial_registration, claimant_name').eq('id', String(body?.claimId || '')).maybeSingle()
    if (!c || (!isAdmin && c.claimant_id !== user.id)) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    profileId = c.claimant_id; claimId = c.id; filePath = c.file_path; expectCr = c.commercial_registration; expectName = c.claimant_name
  } else {
    if (isAdmin && body?.profileId) profileId = String(body.profileId)
    const { data: p } = await svc.from('profiles').select('cr_url, commercial_registration, company_name_ar').eq('id', profileId).maybeSingle()
    if (!p) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    filePath = p.cr_url || ''; expectCr = p.commercial_registration || ''; expectName = p.company_name_ar || ''
  }
  if (!filePath || filePath.startsWith('http') || filePath.includes('..') || !filePath.startsWith(profileId + '/')) {
    return NextResponse.json({ ok: false, error: 'no_file', message: 'ارفع شهادة السجل التجاري أولاً.' }, { status: 400 })
  }

  const manual = (reason: string) => NextResponse.json({ ok: true, mode: 'manual', reason })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return manual('no_key')

  // Monthly cap, fail closed.
  const { data: spent, error: spendErr } = await svc.rpc('cr_ai_spend_month')
  if (spendErr || spent == null || !Number.isFinite(Number(spent))) return manual('spend_unknown')
  if (Number(spent) >= CAP) {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const { count } = await svc.from('notifications').select('id', { count: 'exact', head: true })
      .eq('type', 'cr_claim').eq('data->>kind', 'cr_ai_cap').gte('created_at', monthStart.toISOString())
    if (!count) {
      const { data: admins } = await svc.from('profiles').select('id').eq('role', 'admin')
      if (admins?.length) await svc.from('notifications').insert(admins.map((a: any) => ({
        user_id: a.id, type: 'cr_claim', title: 'بلغت قراءة السجلات حدّها الشهري',
        body: `بلغت تكلفة القراءة الآلية للسجلات هذا الشهر ${Number(spent).toFixed(2)} دولار من ${CAP}. تستمر المراجعة يدوياً حتى بداية الشهر القادم.`,
        data: { kind: 'cr_ai_cap', url: '/admin' },
      })))
    }
    return manual('cap_reached')
  }

  // Read the file server-side.
  const { data: blob, error: dlErr } = await svc.storage.from('verification').download(filePath)
  if (dlErr || !blob) return manual('file_unavailable')
  const ext = (filePath.split('.').pop() || '').toLowerCase()
  const mime = MIME[ext]
  if (!mime || blob.size > MAX_BYTES) return manual('file_type')
  const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
  const fileBlock = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mime, data: b64 } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }

  let extracted: any = null, inTok = 0, outTok = 0, errText: string | null = null
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })
    const resp: any = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Read this document and fill the schema.' }] }],
    } as any)
    inTok = Number(resp?.usage?.input_tokens || 0); outTok = Number(resp?.usage?.output_tokens || 0)
    if (resp?.stop_reason === 'refusal') errText = 'refusal'
    else {
      const text = (resp?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim()
      extracted = text ? JSON.parse(text) : null
      if (extracted) for (const k of ['cr_number', 'entity_name', 'expiry_date', 'activity', 'city']) extracted[k] = String(extracted[k] || '').trim() || null
      if (!extracted) errText = 'empty'
    }
  } catch (e: any) {
    errText = String(e?.message || e).slice(0, 300)
  }
  const cost = inTok * PRICE_IN + outTok * PRICE_OUT

  let flags: any = null
  if (extracted) {
    const readCr = normalizeCrInput(extracted.cr_number)
    extracted.cr_number = readCr || null
    const today = new Date().toISOString().slice(0, 10)
    flags = {
      not_cr_document: extracted.document_type !== 'commercial_registration',
      cr_mismatch: !!(readCr && expectCr && readCr !== normalizeCrInput(expectCr)),
      name_mismatch: nameMatches(extracted.entity_name, expectName) === false,
      expired: !!(extracted.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.expiry_date) && extracted.expiry_date < today),
    }
  }

  await svc.from('cr_document_checks').insert({
    profile_id: profileId, claim_id: claimId, file_path: filePath, extracted, flags, model: MODEL,
    input_tokens: inTok, output_tokens: outTok, cost_usd: Number(cost.toFixed(6)), error: errText,
  })

  if (!extracted) return manual('read_failed')
  return NextResponse.json({ ok: true, mode: 'ai', extracted, flags })
}
