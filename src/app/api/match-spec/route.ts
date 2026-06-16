// ============================================================================
// مطابقة المواصفات: يقرأ مستند مواصفات المشروع + بنود الـBOQ، ويربط رموز البنود
// (مثل DRS-701) بأقسامها في المواصفات ليستخرج التفاصيل الفنية الكاملة لكل بند.
//   • Excel/CSV/نص → نستخرج النص ونمرّره للنموذج (يعمل مع أي مزوّد).
//   • PDF/Word → نرسل المستند مباشرةً إلى Gemini (يدعم قراءة المستندات مجاناً)،
//     فإن لم يتوفّر مفتاح Gemini نطلب رفعه أو تحويل الملف إلى Excel/نص.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { aiJson } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 60

function geminiKey() { return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '' }
const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-2.0-flash,gemini-2.5-flash,gemini-1.5-flash')
  .split(',').map(s => s.trim()).filter(Boolean)

const SYSTEM = `أنت مهندس مواصفات (Specifications Engineer) خبير في مشاريع البناء في السعودية.
معك: (أ) مستند/نص مواصفات المشروع، و(ب) قائمة بنود من جدول الكميات (BOQ).
كل بند قد يحمل رمزاً (مثل DRS-701، W-12، PT-3، DR-05) أو وصفاً عاماً.
مهم — طابِق الرموز بتجاهل الفواصل وحالة الأحرف: اعتبر DRS-701 = DRS701 = D.R.S-701 = drs 701 متطابقة (وحّدها بإزالة المسافات والشُرَط والنقاط والشرطة السفلية ورفع الأحرف). المواصفات قد تكون ممسوحة ضوئياً (OCR) بأخطاء بسيطة أو بلغتين، فاسمح بتطابق تقريبي معقول.
لكل بند:
- ابحث في المواصفات عن الرمز أو القسم المطابق للبند (بعد توحيد الرمز كما سبق).
- استخرج المواصفة الفنية الكاملة بالعربية: الأبعاد، المادة، التشطيب، التصنيف الناري، نوع الزجاج، الإكسسوارات/الأكسسوار، اللون، الطبقات... حسب نوع البند.
- اجعلها مختصرة ومفيدة للمورد (سطرين إلى أربعة أسطر).
- إن لم تجد ما يطابق البند في المواصفات، أعِد spec = "" (فارغة) ولا تخترع.
أعِد لكل بند كائناً {ref, spec} بنفس قيمة ref المُدخلة دون تجاهل أي بند.`

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { ref: { type: 'string' }, spec: { type: 'string' } },
        required: ['ref'], additionalProperties: false,
      },
    },
  },
  required: ['items'], additionalProperties: false,
}

// ── استخراج نص من Excel/CSV/نص عادي ──
async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const parts: string[] = []
    for (const name of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
      if (csv.trim()) parts.push(`# ${name}\n${csv}`)
    }
    return parts.join('\n\n')
  }
  // csv / txt / md وأي نص آخر
  return buffer.toString('utf8')
}

// ── Gemini: قراءة مستند (PDF/صورة) مباشرةً عبر inline_data ──
async function geminiMatchDoc(base64: string, mime: string, itemsJson: string): Promise<any | null> {
  const userText = `${SYSTEM}\n\nبنود الجدول (JSON):\n${itemsJson}\n\nأعد JSON صالحاً فقط مطابقاً: ${JSON.stringify(SCHEMA)}`
  let lastErr = ''
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey()}`
    const body = {
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: userText }] }],
      generationConfig: { maxOutputTokens: 8000, temperature: 0.2, responseMimeType: 'application/json' },
    }
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) {
      lastErr = `Gemini ${r.status} (${model})`
      if (r.status === 404 || r.status === 400 || r.status === 429) continue
      throw new Error(lastErr)
    }
    const j = await r.json()
    const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim()
    if (!text) { lastErr = `Gemini empty (${model})`; continue }
    try { return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')) } catch { lastErr = 'Gemini JSON parse'; continue }
  }
  throw new Error(lastErr || 'Gemini: all models failed')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const itemsRaw = String(formData.get('items') || '[]')
    if (!file) return NextResponse.json({ ok: false, message: 'لم يُرفق ملف المواصفات' }, { status: 400 })

    let items: any[] = []
    try { items = JSON.parse(itemsRaw) } catch { items = [] }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, message: 'لا توجد بنود لمطابقتها' }, { status: 400 })
    }
    const batch = items.slice(0, 120).map((it: any) => ({
      ref: String(it.ref || it.id || ''),
      name: String(it.product_name || it.name || '').slice(0, 140),
      sector: it.sector || '',
    }))
    const itemsJson = JSON.stringify(batch)

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    const isText = ['xlsx', 'xls', 'csv', 'txt', 'md', 'tsv'].includes(ext)

    let result: any = null

    if (isText) {
      // مسار النص — يعمل مع أي مزوّد (Groq/Gemini/Claude)
      const docText = (await extractText(buffer, ext)).slice(0, 60000)
      if (!docText.trim()) return NextResponse.json({ ok: false, message: 'تعذّر استخراج نص من ملف المواصفات' }, { status: 422 })
      result = await aiJson({
        system: SYSTEM,
        user: `نص مواصفات المشروع:\n"""\n${docText}\n"""\n\nبنود الجدول (JSON):\n${itemsJson}`,
        schema: SCHEMA,
        maxTokens: 8000,
      })
      if (!result) return NextResponse.json({ ok: false, message: 'تعذّر تحليل المواصفات — تأكد أن مزوّد الذكاء مفعّل (AI_PROVIDER) وحاول ثانية.' }, { status: 502 })
    } else if (ext === 'pdf' || ext === 'doc' || ext === 'docx' || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      // مسار المستند — يحتاج مزوّداً يقرأ المستندات. Gemini مجاني ويدعم PDF/الصور.
      if (!geminiKey()) {
        return NextResponse.json({
          ok: false, needsGemini: true,
          message: 'صيغة PDF/Word تحتاج مفتاح Gemini (مجاني) لقراءة المستند. أضِف GEMINI_API_KEY في الإعدادات، أو ارفع المواصفات بصيغة Excel أو نص.',
        }, { status: 422 })
      }
      const mime = ext === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp'
        : ['jpg', 'jpeg'].includes(ext) ? 'image/jpeg'
        : 'application/octet-stream'
      if (mime === 'application/octet-stream') {
        return NextResponse.json({ ok: false, message: 'صيغة Word غير مدعومة مباشرةً — حوّلها إلى PDF أو Excel.' }, { status: 422 })
      }
      result = await geminiMatchDoc(buffer.toString('base64'), mime, itemsJson)
      if (!result) return NextResponse.json({ ok: false, message: 'تعذّر قراءة المستند عبر Gemini — حاول مجدداً.' }, { status: 502 })
    } else {
      return NextResponse.json({ ok: false, message: 'صيغة غير مدعومة. المدعوم: PDF, صورة, Excel, CSV, نص.' }, { status: 415 })
    }

    // ترتيب النتائج حسب ref
    const byRef: Record<string, string> = {}
    let matched = 0
    for (const r of (result.items || [])) {
      const spec = String(r.spec || '').trim().slice(0, 400)
      if (r.ref) { byRef[r.ref] = spec; if (spec) matched++ }
    }
    return NextResponse.json({ ok: true, specs: byRef, matched, total: batch.length })
  } catch (err: any) {
    console.error('match-spec error:', err?.message || err)
    return NextResponse.json({ ok: false, message: err?.message || 'فشل مطابقة المواصفات' }, { status: 500 })
  }
}
