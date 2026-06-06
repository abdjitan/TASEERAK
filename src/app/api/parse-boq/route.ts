// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { normalizeText } from '@/lib/normalize'

export const runtime = 'nodejs'
export const maxDuration = 60

// قواميس تصنيف المواد تلقائياً
const SECTOR_KEYWORDS = {
  civil: [
    'concrete','reinforc','rebar','cement','sand','gravel','aggregate','steel bar','block','brick','excavat',
    'pile','formwork','masonry','blinding','hardcore','subbase','asphalt','kerb','paving','waterproof',
    'خرسانة','حديد','أسمنت','رمل','حصى','بلوك','طوب','حفر','أوتاد','صلب','ركام','مدني',
  ],
  architectural: [
    'tile','ceramic','porcelain','marble','granite','paint','gypsum','plaster','door','window','glass',
    'carpet','vinyl','ceiling','partition','cladding','insulation','render','screed','flooring','finish',
    'بلاط','سيراميك','دهان','جبس','باب','نافذة','زجاج','سجاد','أسقف','عازل','تشطيب','معماري',
  ],
  electrical: [
    'cable','wire','panel','breaker','luminaire','lighting','switch','socket','conduit','earthing',
    'transformer','generator','ups','ats','busbar','tray','ladder','led','lamp','kv','lv','mv',
    'كابل','سلك','لوحة','قاطع','إضاءة','مفتاح','أنبوب كهرب','تأريض','محول','مولد','كهرباء',
  ],
  mechanical: [
    'pipe','pump','valve','duct','fan','ahu','fcu','chiller','hvac','sprinkler','fire','sanitary',
    'toilet','basin','tank','insulation.*pipe','ppr','cpvc','hdpe.*water','plumbing','drain.*internal',
    'أنبوب','مضخة','صمام','مجرى هواء','مكيف','مياه','صرف صحي','صحي','ميكانيك','حريق',
  ],
}

// وحدات القياس الشائعة
const UNIT_PATTERNS = [
  { pattern: /\b(m3|m³|cum|cub\.?\s*m)/i, unit: 'م³' },
  { pattern: /\b(m2|m²|sqm|sq\.?\s*m)/i, unit: 'م²' },
  { pattern: /\b(lm|lin\.?\s*m|r\.?m|rm)\b/i, unit: 'م.ط' },
  { pattern: /\b(kg|kgs|kilogram)/i, unit: 'كغ' },
  { pattern: /\b(ton|tonne|mt)\b/i, unit: 'طن' },
  { pattern: /\b(nr|no|each|each|pcs|item|items|no\.)\b/i, unit: 'عدد' },
  { pattern: /\b(ls|lump|sum)\b/i, unit: 'مقطوعية' },
  { pattern: /\b(set|sets)\b/i, unit: 'طقم' },
  { pattern: /\b(m|metre|meter)\b/i, unit: 'متر' },
]

// كلمات مميزة جداً — لو ظهرت تحدد القطاع فوراً بوزن عالي
const STRONG_SIGNALS = {
  electrical: ['cable','xlpe','swa','lszh','nyy','nycy','cu/','busbar','luminaire','mcb','mccb','rccb','kv','distribution board','conduit','earthing','cct','cabling','led screen','scoreboard','turnstile','access control','كابل','تأريض','لوحة توزيع','قاطع','شاشة','بوابة'],
  mechanical: ['ppr','cpvc','pex','sprinkler','ahu','fcu','chiller','duct','hvac','pump','valve','pipe.*water','chilled water','fire pump','sanitary','مضخة','صمام','مكيف','مجرى هواء','صرف صحي'],
  architectural: ['tile','ceramic','porcelain','gypsum','paint','door','window','glass','ceiling','cladding','carpet','vinyl','curtain wall','rainscreen','louver','joinery','millwork','acoustic','wardrobe','banquette','بلاط','سيراميك','دهان','باب','نافذة','جبس','سجاد','أسقف','واجهة ستائرية','نجارة','صوتي'],
  civil: ['concrete','reinforc','rebar','bar reinforcement','formwork','excavat','pile','blinding','masonry','blockwork','kerb','turf','irrigation','rain bird','interlock','fountain','landscape','planter','خرسانة','حديد تسليح','حفر','أوتاد','بلوك','ردم','عشب','ري','إنترلوك','نافورة'],
}

function detectSector(text: string): string {
  // تطبيع النص ليتسامح مع الأخطاء الإملائية (همزة ناقصة، تاء/هاء، تشكيل، تطويل، أوردو)
  const norm = normalizeText(text)

  // 1. تحقق من الإشارات القوية أولاً (أولوية)
  const strongScores: Record<string, number> = { electrical: 0, mechanical: 0, architectural: 0, civil: 0 }
  for (const [sector, signals] of Object.entries(STRONG_SIGNALS)) {
    for (const sig of signals) {
      const nsig = normalizeText(sig)
      if (!nsig) continue
      if (new RegExp(nsig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\.\\*', '.*'), 'i').test(norm)) {
        strongScores[sector] += 3
      }
    }
  }

  // 2. أضف نقاط من الكلمات العادية
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const kw of keywords) {
      const nkw = normalizeText(kw)
      if (nkw && norm.includes(nkw)) strongScores[sector] = (strongScores[sector] || 0) + 1
    }
  }

  // 3. اختر الأعلى
  let maxScore = 0
  let bestSector = 'civil'
  for (const [sector, score] of Object.entries(strongScores)) {
    if (score > maxScore) { maxScore = score; bestSector = sector }
  }
  return bestSector
}

function extractUnit(text: string): string {
  for (const { pattern, unit } of UNIT_PATTERNS) {
    if (pattern.test(text)) return unit
  }
  return 'عدد'
}

function cleanDescription(text: string): string {
  return text
    .replace(/ref\s+\S+/gi, '')
    .replace(/section\s+\d+/gi, '')
    .replace(/division\s+\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function isValidItem(text: string): boolean {
  if (text.length < 10 || text.length > 300) return false
  const skip = ['to summary','collection','cont','preamble','specification','description only',
    'local procurement','etimad','section ','division ','allow for','provisional','note:',
    'prepared','printed','page ','total','subtotal']
  const lower = text.toLowerCase()
  return !skip.some(s => lower.startsWith(s))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(ext || '')) {
      return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) are supported' }, { status: 400 })
    }

    // قراءة الملف كـ Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // استخدام xlsx library
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })

    const extractedItems: any[] = []
    const seen = new Set<string>()

    // قراءة كل الشيتات
    for (const sheetName of wb.SheetNames) {
      // تخطي شيتات الـ collection والـ summary
      if (/collection|summary|index|tender|_xlnm/i.test(sheetName)) continue

      const ws = wb.Sheets[sheetName]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      // البحث عن أعمدة الكمية والوحدة والوصف
      let descCol = -1, qtyCol = -1, unitCol = -1

      // محاولة تحديد الأعمدة من أول 10 صفوف
      for (let r = 0; r < Math.min(10, rows.length); r++) {
        const row = rows[r].map(c => String(c).toLowerCase().trim())
        for (let c = 0; c < row.length; c++) {
          if (/^(description|item|desc|detail|work|item description)$/i.test(row[c])) descCol = c
          if (/^(qty|quantity|quant|amount|no\.)$/i.test(row[c])) qtyCol = c
          if (/^(unit|uom|u\.?o\.?m)$/i.test(row[c])) unitCol = c
        }
        if (descCol >= 0) break
      }

      // إذا ما لقينا الأعمدة، نحاول نحدس
      if (descCol < 0) descCol = 1 // عادةً الوصف في العمود الثاني
      if (qtyCol < 0) qtyCol = descCol + 2
      if (unitCol < 0) unitCol = descCol + 1

      for (let r = 5; r < rows.length; r++) {
        const row = rows[r]
        if (!row || row.length === 0) continue

        const desc = String(row[descCol] || '').trim()
        const qtyRaw = row[qtyCol]
        const unitRaw = String(row[unitCol] || '').trim()

        if (!desc || !isValidItem(desc)) continue

        const qty = parseFloat(String(qtyRaw).replace(/,/g, ''))
        if (isNaN(qty) || qty <= 0) continue // لازم يكون في كمية

        const key = `${desc.slice(0, 50)}`
        if (seen.has(key)) continue
        seen.add(key)

        const unit = UNIT_PATTERNS.some(u => u.pattern.test(unitRaw))
          ? extractUnit(unitRaw)
          : unitRaw || extractUnit(desc)

        // استخراج المواصفات من الوصف
        const specMatch = desc.match(/;\s*([^;]+mm[^;]*)/i) ||
                          desc.match(/;\s*(\d+[\s\w]+(?:mm|dia|kv|kw|amp)[\w\s]*)/i)
        const specification = specMatch ? specMatch[1].trim().slice(0, 80) : ''

        extractedItems.push({
          product_name: cleanDescription(desc),
          quantity: qty,
          unit,
          sector: detectSector(desc),
          specification,
          source_sheet: sheetName,
        })
      }
    }

    // ترتيب حسب القطاع
    extractedItems.sort((a, b) => a.sector.localeCompare(b.sector))

    return NextResponse.json({
      items: extractedItems.slice(0, 200), // حد أقصى 200 بند
      total: extractedItems.length,
      filename: file.name
    })

  } catch (err: any) {
    console.error('BOQ parse error:', err)
    return NextResponse.json({ error: err.message || 'Failed to parse file' }, { status: 500 })
  }
}
