// BOQ workbook → candidate items (rules only; the route adds the AI layer and specialties).
// Split out of /api/parse-boq so it can be tested on sample files (catalog-audit/boq_test.ts).
import { normalizeText } from '@/lib/normalize'
import { SAFE_XLSX_READ } from '@/lib/serverUpload'

// قواميس تصنيف المواد تلقائياً
const SECTOR_KEYWORDS: Record<string, string[]> = {
  equipment: ['crane','excavator','loader','truck','hire','رافعة','حفار','شاحنة','تأجير'],
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
  { pattern: /م\s*3|م³|متر\s*مكعب|مكعب/, unit: 'م³' },
  { pattern: /م\s*2|م²|متر\s*مربع|مربع/, unit: 'م²' },
  { pattern: /م\.?\s*ط|متر\s*طولي|طولي/, unit: 'م.ط' },
  { pattern: /\b(bag|bags)\b|كيس|شكارة|شيكارة/i, unit: 'كيس' },
  { pattern: /\b(day|days)\b|يوم/i, unit: 'يوم' },
  { pattern: /\b(month|months)\b|شهر/i, unit: 'شهر' },
  { pattern: /\b(trip|trips|load)\b|نقلة|رد/i, unit: 'نقلة' },
  { pattern: /طن/, unit: 'طن' },
  { pattern: /كغ|كجم|كيلو/, unit: 'كغ' },
  { pattern: /عدد|حبة|قطعة/, unit: 'عدد' },
  { pattern: /مقطوعية|إجمالي/, unit: 'مقطوعية' },
  { pattern: /طقم/, unit: 'طقم' },
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
  equipment: ['crane','excavator','loader','bulldozer','grader','backhoe','forklift','hire','rental','mobile crane','concrete pump hire','رافعة','حفار','شيول','بلدوزر','قلاب','تأجير','ونش'],
  mechanical: ['ppr','cpvc','pex','sprinkler','ahu','fcu','chiller','duct','hvac','water pump','booster pump','submersible','split ac','ac unit','btu','package unit','valve','pipe.*water','chilled water','fire pump','sanitary','damper','exhaust fan','smoke fan','fire hose','hose cabinet','siamese','os&y','storm','roof drain','silent drain','jockey','cladding','duct insulation','مضخة','صمام','مكيف','مجرى هواء','صرف صحي','خانق','مروحة شفط','صندوق حريق','صرف أمطار','عزل دكت','مياه مثلجة'],
  architectural: ['tile','ceramic','porcelain','gypsum','paint','door','window','glass','ceiling','cladding','carpet','vinyl','curtain wall','rainscreen','louver','joinery','millwork','acoustic','wardrobe','banquette','بلاط','سيراميك','دهان','باب','نافذة','جبس','سجاد','أسقف مستعارة','سقف مستعار','لياسة','واجهة ستائرية','نجارة','صوتي'],
  civil: ['concrete','ready mix','readymix','precast','kerb','reinforc','rebar','bar reinforcement','cement','opc','block','sealant','chemical anchor','grout','خرسانة جاهزة','أسمنت','اسمنت','بلوك','انكر','جراوت','formwork','excavat','pile','blinding','masonry','blockwork','kerb','turf','irrigation','rain bird','interlock','fountain','landscape','planter','خرسانة','حديد تسليح','حفر','أوتاد','بلوك','ردم','عشب','ري','إنترلوك','نافورة'],
}

function detectSector(text: string): string {
  // تطبيع النص ليتسامح مع الأخطاء الإملائية (همزة ناقصة، تاء/هاء، تشكيل، تطويل، أوردو)
  const norm = normalizeText(text)

  // 1. تحقق من الإشارات القوية أولاً (أولوية)
  const strongScores: Record<string, number> = { equipment: 0, electrical: 0, mechanical: 0, architectural: 0, civil: 0 }
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


// Robust numeric parsing for a BOQ quantity cell: native numbers, comma/space thousands,
// European decimals (1.234,56), a trailing unit, or a range (takes the first number).
// Returns null when the cell has no number (blank / lump-sum / "provisional").
function parseQty(raw: any): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return isFinite(raw) ? raw : null
  let s = String(raw).replace(/ /g, ' ').trim()
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.') // European
  else s = s.replace(/,/g, '')
  s = s.replace(/\s+/g, '')
  const m = s.match(/-?\d+(\.\d+)?/)
  const n = m ? parseFloat(m[0]) : NaN
  return isNaN(n) ? null : n
}


export async function extractBoqItems(buffer: Buffer): Promise<any[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, SAFE_XLSX_READ)

  const extractedItems: any[] = []
    const seen = new Set<string>()

    // قراءة كل الشيتات
    for (const sheetName of wb.SheetNames) {
      // نتخطّى أوراق الملخّص/الفهرس فقط — لا نتخطّى «tender» (كثيراً ما تكون ورقة البنود «Tender BOQ»)
      if (/collection|summary|^\s*index\s*$|_xlnm/i.test(sheetName)) continue

      const ws = wb.Sheets[sheetName]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })

      // ── كشف صف العناوين + الأعمدة (مطابقة تحتوائية عربي/إنجليزي، حتى ٢٠ صفاً) ──
      let descCol = -1, qtyCol = -1, unitCol = -1, headerRow = -1
      const norm = (c: any) => String(c ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
      for (let r = 0; r < Math.min(20, rows.length); r++) {
        const row = (rows[r] || []).map(norm)
        let d = -1, q = -1, u = -1
        for (let c = 0; c < row.length; c++) {
          const cell = row[c]
          if (d < 0 && /descriptio|particular|item.*desc|desc.*item|\bdetail|\bwork\b|بيان|الوصف|وصف/.test(cell)) d = c
          if (q < 0 && /^q'?ty\b|quantit|\bqnty\b|^qty\b|الكمية|كمية/.test(cell)) q = c
          if (u < 0 && /^unit\b|^uom$|u\.?o\.?m|u\/m|الوحدة|وحدة/.test(cell)) u = c
        }
        if (d >= 0) { descCol = d; qtyCol = q; unitCol = u; headerRow = r; break }
      }

      // بدء مسح البنود بعد صف العناوين المكتشف (لا رقم ثابت)
      const dataStart = headerRow >= 0 ? headerRow + 1 : 1
      if (descCol < 0) descCol = 1 // آخر ملاذ: الوصف عادةً بالعمود الثاني

      // ── استنتاج عمود الكمية/الوحدة من البيانات لو لم يُكتَشف عنوانهما (لا إزاحات جامدة) ──
      if (qtyCol < 0 || unitCol < 0) {
        const win = rows.slice(dataStart, dataStart + 40)
        const width = win.reduce((m, r) => Math.max(m, (r || []).length), 0)
        let bestNum = -1, bestNumScore = 0, bestUnit = -1, bestUnitScore = 0
        for (let c = 0; c < width; c++) {
          if (c === descCol) continue
          let numScore = 0, unitScore = 0
          for (const r of win) {
            const v = r?.[c]; if (v === '' || v == null) continue
            const q = parseQty(v); if (q != null && q > 0) numScore++
            if (UNIT_PATTERNS.some(p => p.pattern.test(String(v)))) unitScore++
          }
          if (numScore > bestNumScore) { bestNumScore = numScore; bestNum = c }
          if (unitScore > bestUnitScore) { bestUnitScore = unitScore; bestUnit = c }
        }
        if (qtyCol < 0 && bestNum >= 0) qtyCol = bestNum
        if (unitCol < 0 && bestUnit >= 0) unitCol = bestUnit
      }
      if (qtyCol < 0) qtyCol = descCol + 2
      if (unitCol < 0) unitCol = descCol + 1

      for (let r = dataStart; r < rows.length; r++) {
        const row = rows[r]
        if (!row || row.length === 0) continue

        const desc = String(row[descCol] ?? '').trim()
        if (!desc || !isValidItem(desc)) continue
        const unitCell = String(row[unitCol] ?? '').trim(), qtyCell = row[qtyCol]
        if (!unitCell && (qtyCell === '' || qtyCell == null) && desc.split(/\s+/).length <= 5) continue // a section heading

        const qty = parseQty(row[qtyCol]) // قد تكون null (فارغة/مقطوعية) — نُبقيها بدل حذفها
        const unitRaw = String(row[unitCol] ?? '').trim()
        const unit = UNIT_PATTERNS.some(u => u.pattern.test(unitRaw)) ? extractUnit(unitRaw) : (unitRaw || extractUnit(desc))

        const key = `${normalizeText(desc)}|${unit}|${qty ?? ''}` // مفتاح كامل — لا يبتلع المقاسات المختلفة
        if (seen.has(key)) continue
        seen.add(key)

        // مواصفة من الوصف — inline بلا اشتراط فاصلة منقوطة
        const SPEC_RE = /(\d+(?:[.,]\d+)?\s?[x×*]\s?\d+(?:[.,]\d+)?(?:\s?[x×*]\s?\d+)?\s?(?:mm|cm|m|مم|سم|م)?|\b[CK]\d+(?:[./]\d+)?\b|\bgrade\s?\d+|\bPN\s?\d+|\d+(?:[.,]\d+)?\s?(?:mm2|mm²|mm|cm|kva|kv|kw|w\b|kg|amp|a\b|bar|btu|ton|hp|v\b)|\bM\d{1,2}\b|(?:قطر|سماكة|سمك|قوة|مقاس)\s*\d+(?:[.,]\d+)?\s*(?:مم|سم|م|نيوتن)?|\d+(?:[.,]\d+)?\s?(?:مم|سم|كجم|كغ|حصان|واط|أمبير|بار|نيوتن|ميجا\s?باسكال|طن))/gi
        const specification = Array.from(new Set((desc.match(SPEC_RE) || []).map(x => x.trim()))).join('، ').slice(0, 80)

        extractedItems.push({
          product_name: cleanDescription(desc),
          quantity: qty,
          needs_quantity: qty == null || qty <= 0,
          unit,
          sector: detectSector(desc),
          specification,
          source_sheet: sheetName,
        })
      }
    }

  return extractedItems
}
