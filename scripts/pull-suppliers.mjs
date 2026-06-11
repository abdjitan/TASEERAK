// Pull building-material shops from Google Places (New) into Excel, per city.
// Beats Google's 60-results-per-query cap by subdividing DISTRICT x CATEGORY.
// Robust: 15s timeout per request + autosave every 100 searches. One file per city.
//   node scripts/pull-suppliers.mjs --out "C:\\Desktop"            (default: الرياض|جدة|الدمام)
//   node scripts/pull-suppliers.mjs --out "..." --cities "جدة|الدمام"
import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d }
const OUT_DIR = arg('out', process.cwd())
const CONCURRENCY = Number(arg('concurrency', '4'))
const CITIES = arg('cities', '') ? arg('cities', '').split('|') : ['الرياض', 'جدة', 'الدمام']

const DISTRICTS_BY_CITY = {
  'الرياض': ['العليا', 'الملز', 'المروج', 'النخيل', 'الياسمين', 'الورود', 'السليمانية', 'الربوة', 'النزهة', 'الإزدهار', 'الروضة', 'الربيع', 'الصحافة', 'الغدير', 'النرجس', 'الملقا', 'حطين', 'الرحمانية', 'المعذر', 'السويدي', 'العزيزية', 'المنصورة', 'الشفا', 'الحزم', 'بدر', 'اليرموك', 'قرطبة', 'المغرزات', 'الفلاح', 'طويق', 'ظهرة لبن', 'العقيق', 'النفل', 'الواحة', 'المصيف', 'الوزارات', 'الديرة', 'المرسلات', 'الرمال', 'الخليج'],
  'جدة': ['الحمراء', 'الروضة', 'السلامة', 'الشاطئ', 'النعيم', 'الصفا', 'المروة', 'النزهة', 'البوادي', 'الفيصلية', 'الزهراء', 'الرحاب', 'أبحر الشمالية', 'أبحر الجنوبية', 'البغدادية', 'السبيل', 'النسيم', 'الأندلس', 'بني مالك', 'مشرفة', 'الثغر', 'البساتين', 'الواحة', 'الفيحاء', 'السامر', 'المنتزهات', 'الحرازات', 'الكندرة'],
  'الدمام': ['الفيصلية', 'الشاطئ', 'الجلوية', 'الريان', 'النور', 'الأمل', 'البديع', 'الفنار', 'الروضة', 'أحد', 'النزهة', 'المنار', 'الأنوار', 'الجامعيين', 'بدر', 'الخليج', 'طيبة'],
}

const CATEGORIES = [
  'محلات مواد بناء', 'لوازم بناء', 'حديد تسليح', 'أسمنت', 'خرسانة جاهزة', 'بلوك وطابوق', 'رمل وبحص',
  'بلاط وسيراميك', 'رخام وجرانيت', 'دهانات وأصباغ', 'جبس وأسقف', 'ديكورات جبسية', 'ورق جدران',
  'باركيه وأرضيات', 'أدوات صحية', 'سباكة ومواسير', 'مواد كهربائية', 'إنارة وإضاءة', 'كوابل وأسلاك كهربائية',
  'تكييف ومكيفات', 'أخشاب وأبواب', 'ألمنيوم', 'زجاج', 'أبواب حديد وحدادة', 'ستيل ستانلس', 'مظلات وسواتر',
  'عزل مائي وحراري', 'فوم وعوازل', 'عدد وأدوات', 'خردوات', 'معدات بناء', 'تأجير معدات', 'سقالات',
  'مستلزمات سلامة', 'خزانات مياه', 'مضخات مياه', 'مواد لاصقة وسيليكون', 'كراتين وتغليف',
  'منجور وأثاث خشبي', 'أدوات كهربائية يدوية', 'مولدات كهرباء', 'معدات لحام', 'أنابيب PVC',
  'هناجر وإنشاءات معدنية', 'قرميد وأسقف', 'بوابات وأبواب أوتوماتيكية', 'زجاج ومرايا', 'مواد لياسة',
  'كيماويات بناء', 'صرف صحي ومناهل',
]

function readKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY
  if (process.env.GOOGLE_PLACES_API_KEY) return process.env.GOOGLE_PLACES_API_KEY
  for (const f of ['.env.local', '.env', 'google-maps-key.local', path.join('scripts', 'google-maps-key.local')]) {
    try {
      const txt = fs.readFileSync(f, 'utf8')
      const m = txt.match(/^\s*(?:GOOGLE_MAPS_API_KEY|GOOGLE_PLACES_API_KEY)\s*=\s*(.+?)\s*$/m)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
      if (f.includes('google-maps-key') && txt.trim() && !txt.includes('=')) return txt.trim()
    } catch {}
  }
  return ''
}
const KEY = readKey()
if (!KEY || /ضع_مفتاحك|YOUR_KEY|xxxx/i.test(KEY)) { console.log('NO_KEY'); process.exit(1) }

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.location', 'places.rating',
  'places.userRatingCount', 'places.googleMapsUri', 'places.businessStatus', 'places.primaryTypeDisplayName',
  'nextPageToken',
].join(',')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function searchPage(query, pageToken) {
  const body = { textQuery: query, regionCode: 'SA', languageCode: 'ar', pageSize: 20 }
  if (pageToken) body.pageToken = pageToken
  const c = new AbortController(); const timer = setTimeout(() => c.abort(), 15000)
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST', signal: c.signal,
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify(body),
    })
    if (res.status === 429) throw new Error('RATE_429')
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status))
    return data
  } finally { clearTimeout(timer) }
}

const COLS = [
  ['name', 'اسم المحل', 30], ['type', 'النوع', 16], ['phone', 'الجوال', 14], ['website', 'الموقع الإلكتروني', 32],
  ['address', 'العنوان', 42], ['rating', 'التقييم', 8], ['reviews', 'عدد المراجعات', 12], ['city', 'المدينة', 10],
  ['category', 'الصنف المبحوث', 18], ['maps', 'رابط الخريطة', 30],
]
const stamp = new Date().toISOString().slice(0, 10)
function writeSheet(byId, city) {
  const rows = [...byId.values()].sort((a, b) => (b.phone ? 1 : 0) - (a.phone ? 1 : 0) || (b.rating || 0) - (a.rating || 0))
  const aoa = [COLS.map(c => c[1]), ...rows.map(r => COLS.map(c => r[c[0]]))]
  const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = COLS.map(c => ({ wch: c[2] }))
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }
  XLSX.utils.book_append_sheet(wb, ws, 'الموردين')
  const outPath = path.join(OUT_DIR, `موردين-${city}-كامل-${stamp}.xlsx`)
  try { XLSX.writeFile(wb, outPath) } catch {}
  return { count: rows.length, outPath }
}

for (const CITY of CITIES) {
  const DISTRICTS = DISTRICTS_BY_CITY[CITY] || []
  if (!DISTRICTS.length) { console.log(`SKIP ${CITY} (no districts)`); continue }
  const byId = new Map()
  const addPlace = (p, cat) => {
    if (!p || p.businessStatus === 'CLOSED_PERMANENTLY' || byId.has(p.id)) return
    byId.set(p.id, {
      name: p.displayName?.text || '', type: p.primaryTypeDisplayName?.text || '',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '', website: p.websiteUri || '',
      address: p.formattedAddress || '', rating: p.rating ?? '', reviews: p.userRatingCount ?? '',
      city: CITY, category: cat, maps: p.googleMapsUri || '',
    })
  }
  const tasks = []
  for (const d of DISTRICTS) for (const c of CATEGORIES) tasks.push({ c, d })
  console.log(`\n=== ${CITY}: ${tasks.length} بحث (${DISTRICTS.length} أحياء × ${CATEGORIES.length} أصناف) ===`)

  let ti = 0, doneTasks = 0, apiCalls = 0
  const runTask = async (t) => {
    const query = `${t.c} ${t.d} ${CITY}`
    let token = null, page = 0
    do {
      let data
      try { data = await searchPage(query, token); apiCalls++ }
      catch (e) { if (e.message === 'RATE_429') { await sleep(3000); try { data = await searchPage(query, token); apiCalls++ } catch { break } } else break }
      if (!data) break
      for (const p of (data.places || [])) addPlace(p, t.c)
      token = data.nextPageToken || null; page++
      if (token) await sleep(2000)
    } while (token && page < 3)
  }
  const worker = async () => {
    while (ti < tasks.length) {
      await runTask(tasks[ti++])
      if (++doneTasks % 25 === 0) console.log(`[${CITY}] ${doneTasks}/${tasks.length} unique=${byId.size} calls=${apiCalls}`)
      if (doneTasks % 100 === 0) writeSheet(byId, CITY)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  const { count, outPath } = writeSheet(byId, CITY)
  console.log(`CITY_DONE ${CITY} TOTAL ${count} CALLS ${apiCalls} WITH_PHONE ${[...byId.values()].filter(r => r.phone).length}`)
  console.log(`SAVED ${outPath}`)
}
console.log('ALL_DONE')
