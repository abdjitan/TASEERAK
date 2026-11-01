// Golden cases for the rule-based readers (no AI, no cost). The admin AI lab runs them in the
// browser after every change: each case checks quantity, unit and size separately (a model can
// read the number right and still get the unit wrong). Add a case whenever a real order is misread.
import { preParseOrder } from '@/lib/ai/orderText'
import { compareTexts } from '@/lib/ai/specCompare'
import { normalizeUnit } from '@/lib/ai/units'

type OrderCase = { text: string; lines: { name?: string; quantity: number | null; unit: string | null; details?: string }[] }

export const ORDER_CASES: OrderCase[] = [
  { text: 'كيس اسمنت ٥٠ عدد', lines: [{ name: 'اسمنت', quantity: 50, unit: 'كيس' }] },
  { text: 'طن حديد ١٢ ملم', lines: [{ name: 'حديد', quantity: 1, unit: 'طن', details: '12' }] },
  { text: 'بلك ٢٠', lines: [{ name: 'بلك', quantity: null, unit: null, details: '20' }] },
  { text: 'بلك 20 500 حبة', lines: [{ name: 'بلك', quantity: 500, unit: 'حبة', details: '20' }] },
  { text: '10 اكياس اسمنت و 2 طن حديد 16', lines: [{ name: 'اسمنت', quantity: 10, unit: 'كيس' }, { name: 'حديد', quantity: 2, unit: 'طن', details: '16' }] },
  { text: 'كيسين جبس', lines: [{ name: 'جبس', quantity: 2, unit: 'كيس' }] },
  { text: 'طن ونص حديد 16', lines: [{ name: 'حديد', quantity: 1.5, unit: 'طن' }] },
  { text: '5 الاف بلك 15', lines: [{ name: 'بلك', quantity: 5000, unit: null, details: '15' }] },
  { text: 'بدي ١٢٫٥ متر مكعب خرسانة C35', lines: [{ name: 'خرسانة', quantity: 12.5, unit: 'م³', details: 'C35' }] },
  { text: '20 m3 readymix C30', lines: [{ quantity: 20, unit: 'م³', details: 'C30' }] },
  { text: 'ماسورة 4 انش 20 حبة', lines: [{ name: 'ماسورة', quantity: 20, unit: 'حبة', details: '4 انش' }] },
  { text: 'سلك 2.5 ملم 10 لفات', lines: [{ name: 'سلك', quantity: 10, unit: 'لفة', details: '2.5' }] },
  { text: '1- اسمنت 20 كيس\n2- رمل 3 نقلات', lines: [{ name: 'اسمنت', quantity: 20, unit: 'كيس' }, { name: 'رمل', quantity: 3, unit: 'نقلة' }] },
  { text: 'عشرين كيس اسمنت مقاوم', lines: [{ quantity: 20, unit: 'كيس' }] },
  { text: 'مكيف سبليت 2 طن 3 حبات', lines: [{ name: 'مكيف سبليت', quantity: 3, unit: 'حبة', details: '2 طن' }] },
  { text: 'cement 50 bags', lines: [{ name: 'cement', quantity: 50, unit: 'كيس' }] },
  { text: 'بلاط 60x60 200 م2', lines: [{ name: 'بلاط', quantity: 200, unit: 'م²', details: '60x60' }] },
  { text: 'حديد 10-12 طن', lines: [{ name: 'حديد', quantity: 12, unit: 'طن' }] },
  { text: '۲۰ بوری سیمنٹ', lines: [{ quantity: 20, unit: 'كيس' }] },
  { text: 'شوال رمل', lines: [{ name: 'رمل', quantity: 1, unit: 'كيس' }] },
]

const UNIT_CASES: [string, string][] = [['m3', 'م³'], ['cum', 'م³'], ['M²', 'م²'], ['sqm', 'م²'], ['LM', 'م.ط'], ['Rm', 'م.ط'], ['nos', 'عدد'], ['No.', 'عدد'], ['ton', 'طن'], ['kg', 'كغ'], ['L.S', 'مقطوعية'], ['شكارة', 'كيس'], ['بالالف', 'ألف حبة']]

const COMPARE_CASES: { required: string; offered: string; verdict: string }[] = [
  { required: 'Ready mixed concrete C35/45, SRC cement', offered: 'خرسانة جاهزة C30 أسمنت OPC', verdict: 'mismatch' },
  { required: 'Gypsum board 12.5mm thick, Knauf or approved equal', offered: 'جبس بورد سماكة 12.5 مم جيبروك', verdict: 'partial' },
  { required: 'Cable 4Cx16mm2 0.6/1kV', offered: 'كابل 4×16 مم2 0.6/1 kV', verdict: 'ok' },
  { required: 'Fire rated door 90 min', offered: 'باب مقاوم للحريق 60 دقيقة', verdict: 'mismatch' },
  { required: 'حديد تسليح قطر 16', offered: 'حديد Ø16 سابك', verdict: 'ok' },
]

export type GoldenResult = { group: string; input: string; ok: boolean; expected: string; got: string }

export function runGolden(): GoldenResult[] {
  const out: GoldenResult[] = []
  for (const c of ORDER_CASES) {
    const got = preParseOrder(c.text)
    let ok = got.length === c.lines.length
    c.lines.forEach((e, i) => {
      const g = got[i]
      if (!g) { ok = false; return }
      if (e.name !== undefined && g.name !== e.name) ok = false
      if (g.quantity !== e.quantity) ok = false
      if (g.unit !== e.unit) ok = false
      if (e.details && !(g.details || '').includes(e.details)) ok = false
    })
    out.push({ group: 'نص الطلب', input: c.text, ok, expected: JSON.stringify(c.lines), got: JSON.stringify(got.map(g => ({ name: g.name, quantity: g.quantity, unit: g.unit, details: g.details }))) })
  }
  for (const [raw, want] of UNIT_CASES) {
    const got = normalizeUnit(raw, 'boq') || ''
    out.push({ group: 'الوحدات', input: raw, ok: got === want, expected: want, got })
  }
  for (const c of COMPARE_CASES) {
    const r = compareTexts(c.required, c.offered)
    out.push({ group: 'مقارنة المواصفات', input: `${c.required} ⟷ ${c.offered}`, ok: r.verdict === c.verdict, expected: c.verdict, got: r.verdict })
  }
  return out
}
