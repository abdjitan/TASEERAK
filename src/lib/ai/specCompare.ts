// Requirements read out of a specification / BOQ text, and a field-by-field comparison between
// what is REQUIRED (spec document or the buyer's line) and what is OFFERED (supplier's line or the
// BOQ wording). Deterministic: grade, strength, diameter, thickness, standards, brand, «or equal»,
// fire rating, IP, pressure class and cable size are read with rules, so a comparison costs nothing
// and gives the same answer twice. The AI only finds WHICH spec text belongs to which item.
import { normalizeDigits } from '@/lib/ai/numbers'
import { normalizeText } from '@/lib/normalize'

export type Attrs = {
  standards: string[]        // «ASTM A615», «SASO 2222», «BS EN 197-1»
  strength: number | null    // concrete class (MPa, cylinder), from «C30/37», «30 MPa», «30 N/mm2»
  grades: string[]           // «B500B», «GRADE60», «SRC», «OPC», «PN16», «CLASS B», «SDR11»
  diameter_mm: number | null
  thickness_mm: number | null
  dims: string[]             // «60x60», «20x20x40»
  cable: string | null       // «4CX16»
  fire_min: number | null    // fire rating in minutes
  ip: string | null          // «IP65»
  voltage: string | null     // «0.6/1KV»
  brands: string[]
  equal_allowed: boolean     // «or approved equal», «أو ما يعادله»
}

export type CheckStatus = 'ok' | 'mismatch' | 'missing' | 'review'
export type Check = { field: string; label: string; required: string; offered: string; status: CheckStatus }

// Brands commonly named in Saudi BOQs and offers (Arabic and Latin forms → one key).
const BRANDS: [string, string[]][] = [
  ['SABIC', ['sabic', 'سابك']], ['Rajhi Steel', ['rajhi', 'الراجحي']], ['Hadeed', ['hadeed', 'حديد سابك']], ['Ittefaq', ['ittefaq', 'الاتفاق']],
  ['Yamama Cement', ['yamama', 'اليمامه']], ['Saudi Cement', ['saudi cement', 'الاسمنت السعوديه', 'اسمنت السعوديه']], ['Southern Cement', ['southern cement', 'اسمنت الجنوب']], ['Yanbu Cement', ['yanbu cement', 'اسمنت ينبع']], ['Qassim Cement', ['qassim cement', 'اسمنت القصيم']],
  ['Hilti', ['hilti', 'هيلتي']], ['Fosroc', ['fosroc', 'فوسروك']], ['Sika', ['sika', 'سيكا']], ['Mapei', ['mapei', 'مابي']], ['BASF / Master Builders', ['basf', 'master builders', 'ماستر بيلدرز']], ['Henkel', ['henkel', 'هنكل']], ['Bostik', ['bostik', 'بوستيك']], ['Weber', ['weber', 'ويبر']],
  ['Jotun', ['jotun', 'جوتن']], ['National Paints', ['national paints', 'الدهانات الوطنيه']], ['Al Jazeera Paints', ['jazeera', 'الجزيره']], ['Hempel', ['hempel', 'همبل']],
  ['Knauf', ['knauf', 'كناوف']], ['Gyproc', ['gyproc', 'جيبروك']], ['Rockwool', ['rockwool', 'روكوول']], ['Armstrong', ['armstrong', 'ارمسترونج']], ['Saint-Gobain', ['saint-gobain', 'saint gobain', 'سان جوبان']],
  ['Saudi Ceramics', ['saudi ceramics', 'الخزف السعودي']], ['RAK', ['rak ceramics', 'راك']], ['Grohe', ['grohe', 'جروهي']], ['Hansgrohe', ['hansgrohe', 'هانزجروهي']], ['Ideal Standard', ['ideal standard', 'ايديال ستاندرد']], ['Duravit', ['duravit', 'دورافيت']],
  ['Schneider', ['schneider', 'شنايدر']], ['ABB', ['abb']], ['Legrand', ['legrand', 'ليجراند']], ['Siemens', ['siemens', 'سيمنز']], ['Alfanar', ['alfanar', 'الفنار']], ['Riyadh Cables', ['riyadh cable', 'كابلات الرياض']], ['Saudi Cable', ['saudi cable', 'الكابلات السعوديه']], ['Elsewedy', ['elsewedy', 'السويدي']], ['Philips', ['philips', 'فيليبس']],
  ['Grundfos', ['grundfos', 'جرندفوس']], ['KSB', ['ksb']], ['Wilo', ['wilo', 'ويلو']], ['Pentair', ['pentair']], ['Daikin', ['daikin', 'دايكن']], ['Carrier', ['carrier', 'كاريير']], ['Zamil', ['zamil', 'الزامل']], ['York', ['york', 'يورك']], ['Trane', ['trane', 'تران']], ['Gree', ['gree', 'جري']], ['LG', ['lg']], ['Midea', ['midea', 'ميديا']],
  ['Tyco', ['tyco', 'تايكو']], ['Viking', ['viking', 'فايكنج']], ['Victaulic', ['victaulic']], ['Amiantit', ['amiantit', 'اميانتيت']], ['Kingspan', ['kingspan', 'كينجسبان']], ['Obeikan', ['obeikan', 'العبيكان']],
]
const EQUAL_RE = /or\s+(?:an?\s+)?(?:approved\s+)?(?:equal|equivalent)|approved\s+equal|equivalent\s+approved|او\s*(?:ما\s*)?(?:يعادله|يعادلها|يماثله|يماثلها|مماثل|معادل|المعادل|المماثل|ما\s*يكافئه)|أو\s*(?:ما\s*)?(?:يعادله|يعادلها|يماثله|يماثلها|مماثل|معادل)/i
const STD_RE = /\b(SASO|SSA|ASTM|BS\s?EN|BS|EN|ISO|DIN|IEC|NFPA|UL|SBC|AASHTO|ACI|ANSI|AWWA|JIS)\s?(?:[A-Z]{1,2}\s?)?\d+(?:[.\-/:]\d+)*[A-Z]?/gi
const GRADE_RE = /\b(?:B500[ABC](?:-W)?|B420[ABC]?|GRADE\s?\d{2,3}|GR\.?\s?\d{2,3}|FY?\s?\d{3}|S\d{3}(?:JR|J0|J2)?|SRC|OPC|SRPC|PPC|PN\s?\d{1,2}(?:\.\d)?|SDR\s?\d{1,2}(?:\.\d)?|SCH(?:EDULE)?\s?\d{2,3}|CLASS\s?[A-Z0-9]{1,2}|TYPE\s?[IVX]{1,3}|CAT\s?\d[A-Z]?|K\s?\d{3})\b/gi

const up = (s: string) => s.replace(/[\s.-]/g, '').toUpperCase()
const uniq = <T,>(a: T[]) => Array.from(new Set(a))

export function extractAttrs(text: string | null | undefined): Attrs {
  const raw = normalizeDigits(String(text || ''))
  const n = normalizeText(raw)
  const a: Attrs = { standards: [], strength: null, grades: [], diameter_mm: null, thickness_mm: null, dims: [], cable: null, fire_min: null, ip: null, voltage: null, brands: [], equal_allowed: EQUAL_RE.test(raw) || EQUAL_RE.test(n) }
  if (!raw.trim()) return a
  a.standards = uniq((raw.match(STD_RE) || []).map(s => up(s).replace(/^BSEN/, 'BSEN')))
  // concrete class: C30/37, C-30, 30 MPa, 30 N/mm2, «قوة 30 نيوتن», «خرسانة 30 ميجا»
  const c = raw.match(/\bC\s?-?\s?(\d{2})(?:\s?\/\s?\d{2})?\b/i) || raw.match(/(\d{2})\s?(?:MPa|N\/mm2|N\/mm²|نيوتن|ميجا\s?باسكال|ميجا)/i)
  if (c) a.strength = Number(c[1])
  a.grades = uniq((raw.match(GRADE_RE) || []).map(up))
  // diameter: Ø16, 16mm dia, قطر 16, «16 مم» next to bar/pipe words
  const d = raw.match(/(?:Ø|ø|dia\.?|diameter|قطر)\s?(\d+(?:\.\d+)?)\s?(?:mm|مم|ملم)?/i) || raw.match(/(\d+(?:\.\d+)?)\s?(?:mm|مم|ملم)\s?(?:dia|diameter|قطر)/i)
  if (d) a.diameter_mm = Number(d[1])
  const th = raw.match(/(\d+(?:\.\d+)?)\s?(mm|cm|مم|ملم|سم)\s?(?:thick|thk|سماكه|سماكة|سمك)/i) || raw.match(/(?:thickness|thk\.?|سماكه|سماكة|سمك|بسماكة|بسماكه)\s?(?:of\s)?(\d+(?:\.\d+)?)\s?(mm|cm|مم|ملم|سم)?/i)
  if (th) {
    const v = Number(th[1]), u = (th[2] || 'mm').toLowerCase()
    a.thickness_mm = /cm|سم/.test(u) ? v * 10 : v
  }
  a.dims = uniq((raw.match(/\d+(?:\.\d+)?\s?[x×*]\s?\d+(?:\.\d+)?(?:\s?[x×*]\s?\d+(?:\.\d+)?)?/gi) || []).map(s => s.replace(/\s/g, '').replace(/[×*]/g, 'x').toLowerCase()))
  const cab = raw.match(/(\d{1,2})\s?(?:C|core|cores|x|×)\s?[x×]?\s?(\d{1,3}(?:\.\d)?)\s?(?:mm2|mm²|sqmm|مم2|مم²)/i)
  if (cab) a.cable = `${cab[1]}CX${cab[2]}`
  const fr = raw.match(/(\d{2,3})\s?(?:min|minutes|دقيقه|دقيقة)\s?(?:fire|FR|حريق)?/i) || raw.match(/(?:FR|fire\s?rat(?:ed|ing))\s?(\d{2,3})/i)
  if (fr && /fire|FR|حريق|مقاوم/i.test(raw)) a.fire_min = Number(fr[1])
  else { const frh = raw.match(/(\d(?:\.\d)?)\s?(?:hr|hour|ساعه|ساعة)\s?(?:fire|حريق|FR)/i); if (frh) a.fire_min = Number(frh[1]) * 60 }
  const ip = raw.match(/\bIP\s?(\d{2})\b/i); if (ip) a.ip = 'IP' + ip[1]
  const kv = raw.match(/(\d+(?:\.\d+)?\s?\/\s?\d+(?:\.\d+)?)\s?kV/i) || raw.match(/(\d+(?:\.\d+)?)\s?kV\b/i); if (kv) a.voltage = up(kv[1]) + 'KV'
  const brandHits: string[] = []
  // whole words only: «تران» must not match «ترانس», «جري» must not match «جريد»
  const padded = ` ${n.replace(/[()[\]{}،,؛;:+/\\«»"'|.\-–—]/g, ' ').replace(/\s+/g, ' ')} `
  for (const [canon, forms] of BRANDS) if (forms.some(f => padded.includes(` ${normalizeText(f).replace(/-/g, ' ')} `))) brandHits.push(canon)
  const explicit = raw.match(/(?:brand|make|manufacturer|الماركه|الماركة|العلامه|العلامة|الشركه المصنعه|المصنع)\s?[:：]\s?([^،,;\n—-]{2,40})/i)
  if (explicit && !brandHits.some(b => normalizeText(explicit[1]).includes(normalizeText(b)))) brandHits.push(explicit[1].trim())
  a.brands = uniq(brandHits)
  return a
}

/** A short Arabic list of what an Attrs holds (for the UI). */
export function describeAttrs(a: Attrs): string[] {
  const out: string[] = []
  if (a.strength) out.push(`قوة الخرسانة C${a.strength}`)
  if (a.grades.length) out.push(`الدرجة/الفئة: ${a.grades.join('، ')}`)
  if (a.diameter_mm) out.push(`القطر ${a.diameter_mm} مم`)
  if (a.thickness_mm) out.push(`السماكة ${a.thickness_mm} مم`)
  if (a.dims.length) out.push(`المقاس ${a.dims.join('، ')}`)
  if (a.cable) out.push(`الكابل ${a.cable.replace('CX', '×')} مم²`)
  if (a.fire_min) out.push(`مقاومة الحريق ${a.fire_min} دقيقة`)
  if (a.ip) out.push(`درجة الحماية ${a.ip}`)
  if (a.voltage) out.push(`الجهد ${a.voltage}`)
  if (a.standards.length) out.push(`المواصفة القياسية: ${a.standards.join('، ')}`)
  if (a.brands.length) out.push(`الماركة: ${a.brands.join('، ')}${a.equal_allowed ? ' أو ما يعادلها' : ''}`)
  return out
}

// «GRADE60» → «GRADE», «PN16» → «PN»; cement types and rebar grade systems are one family each
const family = (g: string) => /^(?:OPC|SRC|SRPC|PPC)$/.test(g) ? 'CEMENT' : /^(?:B500|B420|GRADE|GR\d|FY?\d)/.test(g) ? 'REBAR' : g.replace(/\d.*$/, '')

/**
 * Compare REQUIRED (spec / buyer) with OFFERED (supplier / BOQ line). Only fields the requirement
 * names are checked. verdict: 'ok' all named fields agree; 'mismatch' at least one contradicts;
 * 'partial' nothing contradicts but some are not stated / need an engineer's look; 'unknown' the
 * requirement names nothing we can check.
 */
export function compareAttrs(req: Attrs, off: Attrs): { checks: Check[]; verdict: 'ok' | 'mismatch' | 'partial' | 'unknown' } {
  const checks: Check[] = []
  const add = (field: string, label: string, required: string, offered: string, status: CheckStatus) => checks.push({ field, label, required, offered, status })
  if (req.strength) {
    if (off.strength == null) add('strength', 'قوة الخرسانة', `C${req.strength}`, '—', 'missing')
    else add('strength', 'قوة الخرسانة', `C${req.strength}`, `C${off.strength}`, off.strength >= req.strength ? 'ok' : 'mismatch')
  }
  for (const g of req.grades) {
    if (off.grades.includes(g)) add('grade', 'الدرجة/الفئة', g, g, 'ok')
    else {
      const same = off.grades.filter(x => family(x) === family(g))
      // same system (Grade 60 vs Grade 40, PN16 vs PN10) = a contradiction; another system for the
      // same thing (Grade 60 vs B500B) = an engineer has to judge the equivalence
      const sameSystem = same.some(x => x.replace(/\d.*$/, '') === g.replace(/\d.*$/, '')) || family(g) === 'CEMENT'
      add('grade', 'الدرجة/الفئة', g, same.join('، ') || '—', !same.length ? 'missing' : sameSystem ? 'mismatch' : 'review')
    }
  }
  if (req.diameter_mm) add('diameter', 'القطر', `${req.diameter_mm} مم`, off.diameter_mm ? `${off.diameter_mm} مم` : '—', off.diameter_mm == null ? 'missing' : off.diameter_mm === req.diameter_mm ? 'ok' : 'mismatch')
  if (req.thickness_mm) {
    const o = off.thickness_mm
    const st: CheckStatus = o == null ? 'missing' : Math.abs(o - req.thickness_mm) <= req.thickness_mm * 0.05 ? 'ok' : o < req.thickness_mm ? 'mismatch' : 'review'
    add('thickness', 'السماكة', `${req.thickness_mm} مم`, o ? `${o} مم` : '—', st)
  }
  if (req.dims.length) {
    const hit = req.dims.some(d => off.dims.includes(d))
    add('dims', 'المقاس', req.dims.join('، '), off.dims.join('، ') || '—', hit ? 'ok' : off.dims.length ? 'mismatch' : 'missing')
  }
  if (req.cable) add('cable', 'مقطع الكابل', req.cable, off.cable || '—', !off.cable ? 'missing' : off.cable === req.cable ? 'ok' : 'mismatch')
  if (req.fire_min) add('fire', 'مقاومة الحريق', `${req.fire_min} دقيقة`, off.fire_min ? `${off.fire_min} دقيقة` : '—', off.fire_min == null ? 'missing' : off.fire_min >= req.fire_min ? 'ok' : 'mismatch')
  if (req.ip) {
    const r = req.ip.slice(2), o = off.ip?.slice(2)
    add('ip', 'درجة الحماية', req.ip, off.ip || '—', !o ? 'missing' : (Number(o[0]) >= Number(r[0]) && Number(o[1]) >= Number(r[1])) ? 'ok' : 'mismatch')
  }
  if (req.voltage) add('voltage', 'الجهد', req.voltage, off.voltage || '—', !off.voltage ? 'missing' : off.voltage === req.voltage ? 'ok' : 'review')
  for (const s of req.standards) {
    const ok = off.standards.some(x => x === s || x.startsWith(s) || s.startsWith(x))
    add('standard', 'المواصفة القياسية', s, off.standards.join('، ') || '—', ok ? 'ok' : off.standards.length ? 'review' : 'missing')
  }
  if (req.brands.length) {
    const ok = off.brands.some(b => req.brands.includes(b))
    add('brand', 'الماركة', req.brands.join('، ') + (req.equal_allowed ? ' أو ما يعادلها' : ''), off.brands.join('، ') || '—',
      ok ? 'ok' : !off.brands.length ? 'missing' : req.equal_allowed ? 'review' : 'mismatch')
  }
  const verdict = !checks.length ? 'unknown' : checks.some(c => c.status === 'mismatch') ? 'mismatch' : checks.every(c => c.status === 'ok') ? 'ok' : 'partial'
  return { checks, verdict }
}

/** Convenience: compare two texts. */
export function compareTexts(required: string, offered: string) {
  const req = extractAttrs(required), off = extractAttrs(offered)
  return { required: req, offered: off, ...compareAttrs(req, off) }
}

/** Arabic one-liners for the checks that need attention (mismatch first). */
export function issuesAr(checks: Check[]): string[] {
  const order: Record<CheckStatus, number> = { mismatch: 0, review: 1, missing: 2, ok: 3 }
  return checks.filter(c => c.status !== 'ok').sort((a, b) => order[a.status] - order[b.status]).map(c =>
    c.status === 'mismatch' ? `${c.label}: المطلوب ${c.required} والمذكور ${c.offered}`
      : c.status === 'review' ? `${c.label}: المطلوب ${c.required} والمذكور ${c.offered} (يحتاج تحقّقاً)`
        : `${c.label}: المطلوب ${c.required} ولم يُذكر`)
}
