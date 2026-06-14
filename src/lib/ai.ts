// =============================================================
// أساس الذكاء الاصطناعي المشترك (Claude) — يُستخدم في كل ميزات AI.
// يعيد كائناً مُنظّماً (JSON) أو null عند غياب المفتاح/أي خطأ — فالمستدعي
// يرجع دائماً لخطة بديلة (لا تتعطّل أي ميزة بسبب الذكاء الاصطناعي).
// =============================================================

export const AI_ENABLED = !!process.env.ANTHROPIC_API_KEY

// النموذج الافتراضي قابل للتهيئة عبر AI_MODEL (الافتراضي Opus 4.8 — الأذكى).
export const DEFAULT_AI_MODEL = process.env.AI_MODEL || 'claude-opus-4-8'

export interface AiJsonOpts {
  system: string
  user: string
  schema: any            // JSON Schema للمخرجات المُنظّمة
  model?: string
  maxTokens?: number
}

// طلب واحد بمخرجات JSON مُنظّمة. يُرجع الكائن المُحلَّل أو null.
export async function aiJson<T = any>(opts: AiJsonOpts): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await client.messages.create({
      model: opts.model || DEFAULT_AI_MODEL,
      max_tokens: opts.maxTokens || 2000,
      system: opts.system,
      output_config: { format: { type: 'json_schema', schema: opts.schema } },
      messages: [{ role: 'user', content: opts.user }],
    })
    const text = ((resp as any).content || []).find((b: any) => b.type === 'text')?.text
    if (!text) return null
    return JSON.parse(text) as T
  } catch (e: any) {
    console.error('aiJson error:', e?.message || e)
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
