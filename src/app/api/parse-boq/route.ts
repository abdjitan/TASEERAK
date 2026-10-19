import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { aiJson, AI_ENABLED } from '@/lib/ai'
import { SUB_CATEGORIES, detectSubCategory } from '@/types'
import { getTaxonomyRows, detectSubCategoryDb, type TaxRow } from '@/lib/serverTaxonomy'
import { checkParsableUpload } from '@/lib/serverUpload'
import { extractBoqItems } from '@/lib/boqParse'

export const runtime = 'nodejs'
export const maxDuration = 60

// ───────────────────────────────────────────────────────────────────────
// طبقة الذكاء الاصطناعي (Claude) — تحسين البنود المستخرَجة بالقواعد:
// أسماء أنظف، تصنيف قطاع أدق، وحدات ومواصفات. تعمل فقط إذا وُجد المفتاح،
// وأي خطأ يرجّع البنود الأصلية (لا تُعطّل التحليل أبداً).
// ───────────────────────────────────────────────────────────────────────
const AI_SECTORS = ['civil', 'architectural', 'electrical', 'mechanical', 'equipment', 'supply_store']

// مرجع التخصصات المسموح بها لكل قطاع (المفتاح = الاسم) — يُمرَّر للنموذج ليختار منها فقط.
function subCatRef(): string {
  const lines: string[] = []
  for (const sector of AI_SECTORS) {
    const subs = (SUB_CATEGORIES as any)[sector]
    if (!subs) continue
    const list = Object.entries(subs).map(([k, v]: any) => `${k} (${v.ar})`).join('، ')
    lines.push(`• ${sector}: ${list}`)
  }
  return lines.join('\n')
}

// هل المفتاح تخصّص صحيح ضمن القطاع؟
function validSub(sector: string, sub: string | null | undefined): boolean {
  return !!(sub && (SUB_CATEGORIES as any)[sector] && (SUB_CATEGORIES as any)[sector][sub])
}

async function enrichWithAI(items: any[]): Promise<any[] | null> {
  if (!AI_ENABLED || items.length === 0) return null
  try {
    const batch = items.slice(0, 120) // حدّ معقول للتكلفة/السرعة
    const payload = batch.map((it, i) => ({ i, desc: it.product_name, unit: it.unit, qty: it.quantity }))

    const system = `أنت مهندس كميات (Quantity Surveyor) خبير في مشاريع البناء والـ MEP في السعودية.
ستصلك بنود من جدول كميات (BOQ). لكل بند أعِد كائناً يحتوي:
- i: نفس رقم البند المُدخل.
- name: اسم مادة مختصر وواضح بالعربية (مع المقاس/المواصفة المهمة إن وُجدت).
- sector: القطاع الصحيح، واحد فقط من: civil, architectural, electrical, mechanical, equipment, supply_store.
- sub_category: مفتاح التخصص الأنسب من القائمة أدناه، **من نفس القطاع الذي اخترته فقط**. هذا المفتاح هو الذي يُوجّه البند للمورد المتخصص، فاختره بدقّة. إن لم يطابق البندَ أيُّ تخصص بدقّة، أعِدها "" (سلسلة فارغة) — لا تخمّن ولا تخترع مفاتيح جديدة.
- unit: وحدة القياس بالعربية (م³، م²، م.ط، طن، كغ، عدد، مقطوعية، طقم...).
- spec: مواصفة مختصرة (مقاس/درجة/قدرة) أو اتركها فارغة.
- confidence: مدى ثقتك في صحّة التصنيف (sub_category): "high" أو "medium" أو "low". كن صادقاً — لو البند غامض أو الوصف ناقص اجعلها "low".

قوائم التخصصات المسموح بها (المفتاح بالإنجليزية = الاسم بالعربية) لكل قطاع — اختر sub_category من مفاتيح القطاع المختار حصراً:
${subCatRef()}

أعِد عنصراً واحداً لكل بند مُدخل بنفس الرقم i دون تجاهل أي بند.`

    const parsed = await aiJson({
      // التصنيف لا يحتاج أقوى نموذج — نستخدم الأرخص افتراضياً (يُتجاهل مع Groq/Gemini)
      model: process.env.BOQ_AI_MODEL || 'claude-haiku-4-5',
      maxTokens: 8000,
      system,
      user: `بنود الجدول (JSON):\n${JSON.stringify(payload)}`,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                i: { type: 'integer' }, name: { type: 'string' },
                sector: { type: 'string', enum: AI_SECTORS },
                sub_category: { type: 'string' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                unit: { type: 'string' }, spec: { type: 'string' },
              },
              required: ['i', 'sector'], additionalProperties: false,
            },
          },
        },
        required: ['items'], additionalProperties: false,
      },
    })
    if (!parsed) return null
    const byIndex: Record<number, any> = {}
    for (const r of (parsed.items || [])) byIndex[r.i] = r

    const enriched = batch.map((it, i) => {
      const r = byIndex[i]
      if (!r) return it
      const sector = AI_SECTORS.includes(r.sector) ? r.sector : it.sector
      // التخصص لا يُقبل إلا إذا كان مفتاحاً حقيقياً ضمن القطاع المختار (وإلا فارغ → يُصنَّف لاحقاً)
      const sub = validSub(sector, String(r.sub_category || '').trim()) ? String(r.sub_category).trim() : null
      return {
        ...it,
        product_name: String(r.name || it.product_name).slice(0, 120),
        sector,
        sub_category: sub,
        // الثقة المنخفضة تُعرض للمراجعة حتى لو صنّفها الذكاء (الاقتراح يبقى ظاهراً ليؤكّده المقاول)
        low_confidence: String(r.confidence || '').toLowerCase() === 'low',
        unit: r.unit || it.unit,
        specification: String(r.spec || it.specification || '').slice(0, 80),
      }
    })
    return enriched.concat(items.slice(120)) // البنود الزائدة تبقى بتصنيف القواعد
  } catch (e: any) {
    console.error('BOQ AI enrich error:', e?.message || e)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth + rate-limit — this route burns paid AI tokens (H7/SEC-05).
    const { supabase: supabase, user } = await getRouteUser()
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
    const { data: allowed, error: rlErr } = await supabase.rpc('check_rate_limit', { p_bucket: 'parse-boq:' + user.id, p_max: 20, p_window_seconds: 3600 })
    if (rlErr || allowed !== true) return NextResponse.json({ error: 'محاولات كثيرة — حاول بعد قليل.' }, { status: 429 })

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(ext || '')) {
      return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) are supported' }, { status: 400 })
    }

    // قراءة الملف كـ Buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadErr = checkParsableUpload(file, buffer, ext || '')
    if (uploadErr) return NextResponse.json({ error: uploadErr }, { status: 400 })

    const extractedItems: any[] = await extractBoqItems(buffer)

    // طبقة الذكاء الاصطناعي (إن توفّر المفتاح) — تحسين الأسماء والتصنيف والوحدات
    const aiItems = await enrichWithAI(extractedItems)
    const finalItems = aiItems || extractedItems

    // توحيد التصنيف لكل بند: لو ما حدّد الذكاء تخصصاً صحيحاً، نحاول بالكلمات المفتاحية.
    // نستخدم كلمات قاعدة البيانات أولاً (تشمل إضافات الأدمن بلا نشر) ثم نرجع للكلمات المضمّنة.
    const taxRows: TaxRow[] = await getTaxonomyRows()
    for (const it of finalItems) {
      if (!validSub(it.sector, it.sub_category)) {
        const txt = `${it.product_name} ${it.specification || ''}`
        const guess = (taxRows.length ? detectSubCategoryDb(txt, it.sector, taxRows) : null) || detectSubCategory(txt, it.sector)
        it.sub_category = validSub(it.sector, guess) ? guess : null
      }
      // يُعرض للمراجعة لو بلا تخصص، أو لو ثقة الذكاء منخفضة (المقاول يؤكّد الاقتراح)
      it.needs_classification = !it.sub_category || !!it.low_confidence
    }

    // حد أقصى للبنود — يُطبَّق قبل الفرز حتى لا يُقتطع قطاع بعينه (كان يُطبَّق بعد الفرز فيقصّ الميكانيكا/المستودع)
    const CAP = 500
    const truncated = finalItems.length > CAP
    const capped = finalItems.slice(0, CAP)
    capped.sort((a, b) => a.sector.localeCompare(b.sector))

    return NextResponse.json({
      items: capped,
      total: finalItems.length,
      truncated, // تجاوز الحد؟ (لتنبيه الواجهة)
      filename: file.name,
      ai: !!aiItems, // هل استُخدم الذكاء الاصطناعي؟
    })

  } catch (err: any) {
    console.error('BOQ parse error:', err)
    // generic text only: internal error details stay in the server log
    return NextResponse.json({ error: 'تعذّرت قراءة الملف، تأكّد من صيغته وحاول مرة أخرى.' }, { status: 500 })
  }
}
