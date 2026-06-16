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
export const DEFAULT_AI_MODEL = process.env.AI_MODEL || 'claude-opus-4-8'
// نماذج Gemini المجانية للمحاولة بالترتيب (قابلة للتهيئة عبر GEMINI_MODEL كقائمة مفصولة بفواصل)
const GEMINI_MODEL_FALLBACKS = 'gemini-2.0-flash,gemini-2.5-flash,gemini-1.5-flash'

export interface AiJsonOpts { system: string; user: string; schema: any; model?: string; maxTokens?: number }

// قائمة نماذج Gemini للمحاولة بالترتيب (إن لم يتوفّر الأول 404 نجرّب التالي)
const GEMINI_MODELS = (process.env.GEMINI_MODEL || GEMINI_MODEL_FALLBACKS).split(',').map(s => s.trim()).filter(Boolean)

// ── Gemini عبر REST (بدون مكتبة) ──
async function geminiGenerate(system: string, contents: any[], maxTokens: number, jsonMode: boolean): Promise<string | null> {
  let lastErr = ''
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey()}`
    const body: any = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    }
    if (jsonMode) body.generationConfig.responseMimeType = 'application/json'
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
async function groqGenerate(system: string, messages: any[], maxTokens: number, jsonMode: boolean): Promise<string | null> {
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
  })
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Groq ' + r.status + ' (' + model + '): ' + t.slice(0, 250)) }
  const j = await r.json()
  const text = (j?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('Groq empty')
  return text
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
    const schemaHint = `\n\nأعد الإجابة بصيغة JSON صالحة فقط (respond in valid JSON) تطابق هذا المخطط:\n${JSON.stringify(opts.schema)}`
    if (prov === 'gemini') {
      text = await geminiGenerate(opts.system + schemaHint, [{ role: 'user', parts: [{ text: opts.user }] }], opts.maxTokens || 2000, true)
    } else if (prov === 'groq') {
      text = await groqGenerate(opts.system + schemaHint, [{ role: 'user', content: opts.user }], opts.maxTokens || 2000, true)
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
    if (prov === 'groq') return await groqGenerate(system, messages, maxTokens, false)
    return await anthropicMessages(system, messages, maxTokens, DEFAULT_AI_MODEL)
  } catch (e: any) {
    console.error('aiText error:', e?.message || e)
    // للتشخيص عند الحاجة: AI_DEBUG=1 يُظهر الخطأ الحقيقي. وإلا رسالة نظيفة.
    if (process.env.AI_DEBUG === '1') return '⚠️ تشخيص: ' + (e?.message || 'AI error')
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
