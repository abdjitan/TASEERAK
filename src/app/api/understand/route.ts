import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser, createAdminSupabaseClient } from '@/lib/supabase/server'
import { aiWebJson } from '@/lib/ai'
import { searchProducts, normQuery } from '@/lib/productSearch'

export const runtime = 'nodejs'
export const maxDuration = 30

// «Understand what the person wants»: a word or phrase the catalog and the dictionary did not
// understand (any dialect, a brand, a misspelling, a thing seen in a shop) is identified by an AI
// that may search the web, then matched to our catalog. Answers are kept in ai_lookups, so each
// new phrase costs one lookup only. Site (cookie) or mobile app (Bearer).
// Limits keep it inside the free tier: 30 lookups an hour per person, 300 a day in total.

const SECTORS = ['civil', 'architectural', 'electrical', 'mechanical', 'equipment', 'supply_store']

const SYSTEM = `أنت خبير في مواد البناء والتشطيبات والأثاث والأدوات المنزلية في السعودية، تفهم كل اللهجات العربية (السعودية والخليجية والشامية والمصرية والعراقية) والكلمات الإنجليزية وأسماء العلامات التجارية.
المستخدم يبحث عن مادة يريد طلب تسعيرها من الموردين. افهم ماذا يقصد بالضبط. إن لم تكن متأكداً فابحث في الإنترنت (Google) قبل الإجابة.
أجب بكائن JSON فقط، بلا أي نص قبله أو بعده، بهذا الشكل:
{"understood": true|false, "name_ar": "الاسم التجاري الصحيح بالعربية الفصحى كما يُباع في محلات السعودية", "name_en": "English name", "what_it_is": "شرح قصير جداً بالفصحى (سطر واحد)", "sector": "civil|architectural|electrical|mechanical|equipment|supply_store", "search_words": ["كلمات عربية مختصرة للبحث في القائمة"], "confidence": "high|medium|low"}
القطاع: civil=مواد بناء وإنشاء وخارجي، architectural=تشطيبات وأبواب ونوافذ وأثاث وستائر وديكور، electrical=كهرباء وإنارة وأنظمة، mechanical=سباكة وتكييف ومضخات وخزانات، equipment=معدات وآليات، supply_store=أدوات ومستلزمات محلات (عدد، براغي، دهانات صغيرة، أدوات صحية صغيرة).
إن لم تكن مادة يمكن شراؤها (كلام عام أو غير مفهوم) فأعد understood=false.`

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const q = String(body?.q || '').trim().slice(0, 120)
  if (q.length < 2) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
  const qn = normQuery(q)
  const admin = createAdminSupabaseClient()

  const matchCatalog = (r: any) => {
    const words = [r?.name_ar, ...(Array.isArray(r?.search_words) ? r.search_words : [])].filter(Boolean).slice(0, 5)
    const seen = new Set<string>()
    const out: { name: string; sector: string }[] = []
    for (const w of words) for (const h of searchProducts(String(w), { limit: 6 })) {
      if (h.score < 9 || seen.has(h.name)) continue
      seen.add(h.name); out.push({ name: h.name, sector: h.sector })
    }
    return out.slice(0, 6)
  }

  // 1) answered before → free
  const { data: cached } = await admin.from('ai_lookups').select('result, sources, hits').eq('query_norm', qn).maybeSingle()
  if (cached) {
    admin.from('ai_lookups').update({ hits: (cached.hits || 1) + 1, updated_at: new Date().toISOString() }).eq('query_norm', qn).then(() => {}, () => {})
    return NextResponse.json({ ok: true, cached: true, result: cached.result, sources: cached.sources || [], matches: matchCatalog(cached.result) })
  }

  // 2) limits (per person, then the daily total)
  const { data: mine } = await supabase.rpc('check_rate_limit', { p_bucket: `understand:${user.id}`, p_max: 30, p_window_seconds: 3600 })
  if (mine === false) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  const { data: all } = await admin.rpc('check_rate_limit', { p_bucket: 'understand:global', p_max: 300, p_window_seconds: 86400 })
  if (all === false) return NextResponse.json({ ok: false, error: 'daily_limit' }, { status: 429 })

  // 3) ask, with a web search when needed
  const res = await aiWebJson<any>({ system: SYSTEM, user: `المستخدم كتب: «${q}»` })
  if (!res) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 })
  const r = res.data || {}
  const result = {
    understood: r.understood !== false && !!r.name_ar,
    name_ar: String(r.name_ar || '').slice(0, 120),
    name_en: String(r.name_en || '').slice(0, 120),
    what_it_is: String(r.what_it_is || '').slice(0, 200),
    sector: SECTORS.includes(r.sector) ? r.sector : 'supply_store',
    search_words: (Array.isArray(r.search_words) ? r.search_words : []).map((w: any) => String(w).slice(0, 40)).slice(0, 6),
    confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'medium',
  }
  await admin.from('ai_lookups').upsert({ query_norm: qn, query: q, result, sources: res.sources }, { onConflict: 'query_norm' })
  return NextResponse.json({ ok: true, cached: false, result, sources: res.sources, matches: result.understood ? matchCatalog(result) : [] })
}
