// =============================================================
// أساس الذكاء الاصطناعي المشترك — يدعم مزوّدين: Anthropic (Claude) و Google (Gemini).
// يختار المزوّد عبر AI_PROVIDER، أو تلقائياً حسب المفتاح المتوفّر.
// يعيد كائناً مُنظّماً (JSON) أو null عند الفشل — فالمستدعي يرجع دائماً لخطة بديلة.
// =============================================================

function geminiKey() { return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '' }
function anthropicKey() { return process.env.ANTHROPIC_API_KEY || '' }
function groqKey() { return process.env.GROQ_API_KEY || '' }

// المزوّد الفعّال: AI_PROVIDER صريح، وإلا أول مفتاح متوفّر.
export function aiProvider(): 'anthropic' | 'gemini' | 'groq' | null {
  const p = (process.env.AI_PROVIDER || '').toLowerCase()
  if (p === 'gemini' || p === 'google') return geminiKey() ? 'gemini' : null
  if (p === 'anthropic' || p === 'claude') return anthropicKey() ? 'anthropic' : null
  if (p === 'groq') return groqKey() ? 'groq' : null
  if (anthropicKey()) return 'anthropic'
  if (geminiKey()) return 'gemini'
  if (groqKey()) return 'groq'
  return null
}

export const AI_ENABLED = !!(anthropicKey() || geminiKey() || groqKey())
export const DEFAULT_AI_MODEL = process.env.AI_MODEL || 'claude-haiku-5-5' // cheapest by default (review 2026-10-28); set AI_MODEL to override
// نماذج Gemini المجانية للمحاولة بالترتيب (قابلة للتهيئة عبر GEMINI_MODEL كقائمة مفصولة بفواصل)
const GEMINI_MODEL_FALLBACKS = 'gemini-3.8-flash,gemini-flash-latest,gemini-2.5-flash'
// Per-call cap for every provider request: routes stop at 30-60 s, so a hung provider must give
// up early enough for the next one in the chain to answer. A timeout throws and falls through.
const AI_CALL_TIMEOUT_MS = 12_000

/** Optional per-request log of the AI calls made (shown in the admin AI lab: count, provider, time). */
export interface AiTrace { calls: { kind: string; provider: string; ms: number; ok: boolean; note?: string }[] }
export function newTrace(): AiTrace { return { calls: [] } }
function traceCall(trace: AiTrace | undefined, kind: string, provider: string, t0: number, ok: boolean, note?: string) {
  if (trace) trace.calls.push({ kind, provider, ms: Date.now() - t0, ok, ...(note ? { note: note.slice(0, 160) } : {}) })
}

export interface AiJsonOpts {
  system: string; user: string; schema: any; model?: string; maxTokens?: number; preferFree?: boolean
  /** Per-call cap (ms); defaults to AI_CALL_TIMEOUT_MS. Long batch / document calls raise it. */
  timeoutMs?: number
  /** Shape check on the parsed JSON: an answer that fails it counts as a failed call (next provider). */
  validate?: (out: any) => boolean
  trace?: AiTrace
}

// قائمة نماذج Gemini للمحاولة بالترتيب (إن لم يتوفّر الأول 404 نجرّب التالي)
const GEMINI_MODELS = (process.env.GEMINI_MODEL || GEMINI_MODEL_FALLBACKS).split(',').map(s => s.trim()).filter(Boolean)

// ── Gemini عبر REST (بدون مكتبة) ──
async function geminiGenerate(system: string, contents: any[], maxTokens: number, jsonMode: boolean, timeoutMs = AI_CALL_TIMEOUT_MS): Promise<string | null> {
  let lastErr = ''
  for (const model of GEMINI_MODELS) {
    // Key goes in a header, not the query string (URLs end up in proxy / error logs).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const body: any = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    }
    if (jsonMode) body.generationConfig.responseMimeType = 'application/json'
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey() }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      lastErr = 'Gemini ' + r.status + ' (' + model + '): ' + t.slice(0, 250)
      // النموذج غير متاح/محدود الحصّة — جرّب النموذج التالي (الحصّة المجانية تختلف بين النماذج)
      if (r.status === 404 || r.status === 400 || r.status === 429) continue
      throw new Error(lastErr)
    }
    const j = await r.json()
    const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim()
    if (text) return text
    lastErr = 'Gemini empty (' + model + '): ' + (j?.candidates?.[0]?.finishReason || j?.promptFeedback?.blockReason || 'no text')
  }
  throw new Error(lastErr || 'Gemini: all models failed')
}

// ── Groq عبر REST (متوافق OpenAI) — مجاني وسريع ──
async function groqGenerate(system: string, messages: any[], maxTokens: number, jsonMode: boolean, timeoutMs = AI_CALL_TIMEOUT_MS): Promise<string | null> {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const body: any = {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: maxTokens, temperature: 0.3,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + groqKey() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Groq ' + r.status + ' (' + model + '): ' + t.slice(0, 250)) }
  const j = await r.json()
  const text = (j?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('Groq empty')
  return text
}

// ── Anthropic عبر SDK ──
async function anthropicMessages(system: string, messages: any[], maxTokens: number, model: string, schema?: any, timeoutMs = AI_CALL_TIMEOUT_MS): Promise<string | null> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: anthropicKey(), timeout: timeoutMs, maxRetries: 0 })
  const req: any = { model, max_tokens: maxTokens, system, messages }
  if (schema) req.output_config = { format: { type: 'json_schema', schema } }
  const resp = await client.messages.create(req)
  return (resp.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim() || null
}

// Providers to try, in order: the configured AI_PROVIDER first, then every other provider that
// has a key. One dead provider (e.g. a retired Groq model) must not take every AI feature down.
function providerChain(opts: { vision?: boolean; preferFree?: boolean } = {}): ('anthropic' | 'gemini' | 'groq')[] {
  const all: ('anthropic' | 'gemini' | 'groq')[] = []
  // preferFree: free-tier providers first (Gemini, Groq), the paid one only as a last resort.
  if (opts.preferFree) { if (geminiKey()) all.push('gemini'); if (groqKey()) all.push('groq') }
  const first = aiProvider()
  if (first && !all.includes(first)) all.push(first)
  for (const p of ['anthropic', 'gemini', 'groq'] as const) {
    const has = p === 'anthropic' ? !!anthropicKey() : p === 'gemini' ? !!geminiKey() : !!groqKey()
    if (has && !all.includes(p)) all.push(p)
  }
  return opts.vision ? all.filter(p => p !== 'groq') : all // Groq has no vision here
}

// Models sometimes wrap the JSON in a fence or a sentence: read the outermost object.
export function parseJsonText<T>(text: string | null): T | null {
  if (!text) return null
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(clean) as T } catch { /* fall through */ }
  const a = clean.indexOf('{'), b = clean.lastIndexOf('}')
  if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1)) as T
  throw new Error('invalid JSON')
}

const schemaHintOf = (schema: any) => `\n\nأعد الإجابة بصيغة JSON صالحة فقط (respond in valid JSON) تطابق هذا المخطط:\n${JSON.stringify(schema)}`

// طلب واحد بمخرجات JSON مُنظّمة. يُرجع الكائن المُحلَّل أو null.
export async function aiJson<T = any>(opts: AiJsonOpts): Promise<T | null> {
  const schemaHint = schemaHintOf(opts.schema)
  const timeout = opts.timeoutMs || AI_CALL_TIMEOUT_MS
  for (const prov of providerChain({ preferFree: opts.preferFree })) {
    const t0 = Date.now()
    try {
      let text: string | null
      if (prov === 'gemini') {
        text = await geminiGenerate(opts.system + schemaHint, [{ role: 'user', parts: [{ text: opts.user }] }], opts.maxTokens || 2000, true, timeout)
      } else if (prov === 'groq') {
        text = await groqGenerate(opts.system + schemaHint, [{ role: 'user', content: opts.user }], opts.maxTokens || 2000, true, timeout)
      } else {
        text = await anthropicMessages(opts.system, [{ role: 'user', content: opts.user }], opts.maxTokens || 2000, opts.model || DEFAULT_AI_MODEL, opts.schema, timeout)
      }
      const out = parseJsonText<T>(text)
      if (out && (!opts.validate || opts.validate(out))) { traceCall(opts.trace, 'json', prov, t0, true); return out }
      traceCall(opts.trace, 'json', prov, t0, false, 'invalid shape')
    } catch (e: any) {
      traceCall(opts.trace, 'json', prov, t0, false, e?.message)
      console.error(`aiJson error (${prov}):`, e?.message || e)
    }
  }
  return null
}

export type AiImage = { base64: string; mime: string }

// قراءة صورة (أو عدّة صور لنفس المادة) + طلب JSON مُنظّم. Anthropic أو Gemini.
// المخرج اقتراح فقط: المستدعي يعرضه للمستخدم ليؤكّده، ولا يُعامَل كحقيقة.
export async function aiVisionJson<T = any>(opts: AiJsonOpts & { image?: AiImage; images?: AiImage[] }): Promise<T | null> {
  const images = (opts.images?.length ? opts.images : opts.image ? [opts.image] : []).slice(0, 4)
  if (!images.length) return null
  const timeout = opts.timeoutMs || AI_CALL_TIMEOUT_MS
  for (const prov of providerChain({ vision: true, preferFree: opts.preferFree })) {
    const t0 = Date.now()
    try {
      let text: string | null
      if (prov === 'gemini') {
        text = await geminiGenerate(opts.system + schemaHintOf(opts.schema), [{
          role: 'user',
          parts: [...images.map(im => ({ inline_data: { mime_type: im.mime, data: im.base64 } })), { text: opts.user }],
        }], opts.maxTokens || 1500, true, timeout)
      } else {
        text = await anthropicMessages(opts.system, [{
          role: 'user',
          content: [
            ...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.base64 } })),
            { type: 'text', text: opts.user },
          ],
        }], opts.maxTokens || 1500, opts.model || DEFAULT_AI_MODEL, opts.schema, timeout)
      }
      const out = parseJsonText<T>(text)
      if (out && (!opts.validate || opts.validate(out))) { traceCall(opts.trace, 'vision', prov, t0, true); return out }
      traceCall(opts.trace, 'vision', prov, t0, false, 'invalid shape')
    } catch (e: any) {
      traceCall(opts.trace, 'vision', prov, t0, false, e?.message)
      console.error(`aiVisionJson error (${prov}):`, e?.message || e)
    }
  }
  return null
}

/** True when a provider that reads PDF documents is configured (Gemini; free tier). */
export const AI_DOC_ENABLED = !!geminiKey()

// قراءة مستند (PDF أو صورة ممسوحة) + JSON مُنظّم — Gemini فقط (قراءة المستندات ضمن الطبقة المجانية).
// Long documents take longer than a chat answer, so the per-call cap is higher (default 45 s).
export async function aiDocJson<T = any>(opts: AiJsonOpts & { doc: AiImage }): Promise<T | null> {
  if (!geminiKey()) return null
  const t0 = Date.now()
  try {
    const text = await geminiGenerate(opts.system + schemaHintOf(opts.schema), [{
      role: 'user',
      parts: [{ inline_data: { mime_type: opts.doc.mime, data: opts.doc.base64 } }, { text: opts.user }],
    }], opts.maxTokens || 8000, true, opts.timeoutMs || 45_000)
    const out = parseJsonText<T>(text)
    if (out && (!opts.validate || opts.validate(out))) { traceCall(opts.trace, 'document', 'gemini', t0, true); return out }
    traceCall(opts.trace, 'document', 'gemini', t0, false, 'invalid shape')
  } catch (e: any) {
    traceCall(opts.trace, 'document', 'gemini', t0, false, e?.message)
    console.error('aiDocJson error:', e?.message || e)
  }
  return null
}

/** True when at least one provider that can read images is configured. */
export const AI_VISION_ENABLED = !!(anthropicKey() || geminiKey())

// محادثة نصّية (للمساعد الذكي). messages: [{role:'user'|'assistant', content}]
export async function aiText(system: string, messages: { role: string; content: string }[], maxTokens = 1024): Promise<string | null> {
  let lastErr = ''
  for (const prov of providerChain()) {
    try {
      let out: string | null
      if (prov === 'gemini') {
        const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
        out = await geminiGenerate(system, contents, maxTokens, false)
      } else if (prov === 'groq') out = await groqGenerate(system, messages, maxTokens, false)
      else out = await anthropicMessages(system, messages, maxTokens, DEFAULT_AI_MODEL)
      if (out) return out
    } catch (e: any) {
      lastErr = e?.message || 'AI error'
      console.error(`aiText error (${prov}):`, lastErr)
    }
  }
  // للتشخيص عند الحاجة: AI_DEBUG=1 يُظهر الخطأ الحقيقي. وإلا رسالة نظيفة.
  if (process.env.AI_DEBUG === '1' && lastErr) return '⚠️ تشخيص: ' + lastErr
  return null
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

// ── Understand with a web search (Gemini + Google Search grounding) ──────────────────────────
// For words or photos the catalog and the dictionary do not understand: the model may search the
// web before answering. Gemini only (its free tier includes search grounding); returns null when
// no Gemini key or every model fails, so callers fall back quietly. Grounding cannot be combined
// with JSON mode, so the JSON is read out of the text.
export async function aiWebJson<T = any>(opts: { system: string; user: string; image?: { base64: string; mime: string }; maxTokens?: number; trace?: AiTrace }): Promise<{ data: T; sources: { title: string; uri: string }[] } | null> {
  if (!geminiKey()) return null
  const models = (process.env.GEMINI_WEB_MODEL || 'gemini-3.8-flash,gemini-flash-latest').split(',').map(s => s.trim()).filter(Boolean)
  const parts: any[] = [{ text: opts.user }]
  if (opts.image) parts.push({ inline_data: { mime_type: opts.image.mime, data: opts.image.base64 } })
  for (const model of models) {
    const t0 = Date.now()
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: 'user', parts }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2, maxOutputTokens: opts.maxTokens || 900 },
        }),
        signal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS),
      })
      if (!r.ok) { traceCall(opts.trace, 'web', 'gemini', t0, false, 'HTTP ' + r.status); console.error('aiWebJson', model, r.status, (await r.text().catch(() => '')).slice(0, 200)); continue }
      const j = await r.json()
      const cand = j?.candidates?.[0]
      const text = (cand?.content?.parts || []).map((p: any) => p.text || '').join('').trim()
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) continue
      const data = JSON.parse(m[0]) as T
      const sources = ((cand?.groundingMetadata?.groundingChunks || []) as any[])
        .map((c: any) => ({ title: String(c?.web?.title || '').slice(0, 120), uri: String(c?.web?.uri || '') }))
        .filter(s => s.uri).slice(0, 4)
      traceCall(opts.trace, 'web', 'gemini', t0, true)
      return { data, sources }
    } catch (e: any) {
      console.error('aiWebJson', model, e?.message || e)
    }
  }
  return null
}
