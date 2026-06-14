// @ts-nocheck
// =============================================================
// أساس الذكاء الاصطناعي المشترك — يدعم مزوّدين: Anthropic (Claude) و Google (Gemini).
// يختار المزوّد عبر AI_PROVIDER، أو تلقائياً حسب المفتاح المتوفّر.
// يعيد كائناً مُنظّماً (JSON) أو null عند الفشل — فالمستدعي يرجع دائماً لخطة بديلة.
// =============================================================

function geminiKey() { return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '' }
function anthropicKey() { return process.env.ANTHROPIC_API_KEY || '' }

// المزوّد الفعّال: AI_PROVIDER صريح، وإلا أول مفتاح متوفّر (Claude أولاً).
export function aiProvider(): 'anthropic' | 'gemini' | null {
  const p = (process.env.AI_PROVIDER || '').toLowerCase()
  if (p === 'gemini' || p === 'google') return geminiKey() ? 'gemini' : null
  if (p === 'anthropic' || p === 'claude') return anthropicKey() ? 'anthropic' : null
  if (anthropicKey()) return 'anthropic'
  if (geminiKey()) return 'gemini'
  return null
}

export const AI_ENABLED = !!(anthropicKey() || geminiKey())
export const DEFAULT_AI_MODEL = process.env.AI_MODEL || 'claude-opus-4-8'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

export interface AiJsonOpts { system: string; user: string; schema: any; model?: string; maxTokens?: number }

// ── Gemini عبر REST (بدون مكتبة) ──
async function geminiGenerate(system: string, contents: any[], maxTokens: number, jsonMode: boolean): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey()}`
  const body: any = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
  }
  if (jsonMode) body.generationConfig.responseMimeType = 'application/json'
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error('gemini http ' + r.status)
  const j = await r.json()
  return (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim() || null
}

// ── Anthropic عبر SDK ──
async function anthropicMessages(system: string, messages: any[], maxTokens: number, model: string, schema?: any): Promise<string | null> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: anthropicKey() })
  const req: any = { model, max_tokens: maxTokens, system, messages }
  if (schema) req.output_config = { format: { type: 'json_schema', schema } }
  const resp = await client.messages.create(req)
  return (resp.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim() || null
}

// طلب واحد بمخرجات JSON مُنظّمة. يُرجع الكائن المُحلَّل أو null.
export async function aiJson<T = any>(opts: AiJsonOpts): Promise<T | null> {
  const prov = aiProvider()
  if (!prov) return null
  try {
    let text: string | null
    if (prov === 'gemini') {
      const schemaHint = `\n\nأعد الإجابة بصيغة JSON صالحة فقط تطابق هذا المخطط:\n${JSON.stringify(opts.schema)}`
      text = await geminiGenerate(opts.system + schemaHint, [{ role: 'user', parts: [{ text: opts.user }] }], opts.maxTokens || 2000, true)
    } else {
      text = await anthropicMessages(opts.system, [{ role: 'user', content: opts.user }], opts.maxTokens || 2000, opts.model || DEFAULT_AI_MODEL, opts.schema)
    }
    if (!text) return null
    // نظّف أي أسوار ```json``` إن وُجدت
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(clean) as T
  } catch (e: any) {
    console.error('aiJson error:', e?.message || e)
    return null
  }
}

// محادثة نصّية (للمساعد الذكي). messages: [{role:'user'|'assistant', content}]
export async function aiText(system: string, messages: { role: string; content: string }[], maxTokens = 1024): Promise<string | null> {
  const prov = aiProvider()
  if (!prov) return null
  try {
    if (prov === 'gemini') {
      const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      return await geminiGenerate(system, contents, maxTokens, false)
    }
    return await anthropicMessages(system, messages, maxTokens, DEFAULT_AI_MODEL)
  } catch (e: any) {
    console.error('aiText error:', e?.message || e)
    return null
  }
}

// مرجع مُدمج لشجرة المواد (قطاع → مفاتيح التخصصات + الأسماء) لإرشاد النموذج.
export function buildTaxonomyRef(SUB_CATEGORIES: any, SECTOR_LABELS: any): string {
  const lines: string[] = []
  for (const [sector, subs] of Object.entries(SUB_CATEGORIES)) {
    const items = Object.entries(subs as any).map(([key, s]: any) => `${key} (${s.ar})`).join('، ')
    lines.push(`# ${sector} — ${SECTOR_LABELS[sector] || sector}:\n${items}`)
  }
  return lines.join('\n')
}
