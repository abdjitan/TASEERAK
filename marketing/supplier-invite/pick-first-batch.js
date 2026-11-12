// Picks the first outreach batch (50 Riyadh shops) from the owner's shop lists and writes
// first-batch-50.xlsx with one-click WhatsApp links (message pre-filled, NOT sent: the owner
// presses Send himself). Run: node marketing/supplier-invite/pick-first-batch.js "<path to محلات-حسب-النوع-الدقيق-…xlsx>"
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { opener, direct, fill, varsFor } = require('./messages');
// Never contacted again (legal rules): numbers that replied «إلغاء» or got their one message.
// suppression.txt = one local mobile number per line (05XXXXXXXX), gitignored.
const SUPPRESS_FILE = path.join(__dirname, 'suppression.txt');
const suppressed = new Set(fs.existsSync(SUPPRESS_FILE) ? fs.readFileSync(SUPPRESS_FILE, 'utf8').split(/\s+/).map(x => x.replace(/\D/g, '').replace(/^966/, '0')).filter(Boolean) : []);

const src = process.argv[2];
const QUOTA = { 'البناء والإنشاءات': 20, 'السباكة والمياه': 15, 'الكهرباء والإنارة': 15 };
const PER_TYPE = 4;
// Google place types / names that are not building-material shops.
const BAD = /مول|مركز تسوق|سينما|ترفيه|مطعم|مقهى|فندق|صيدلية|بنك|مدرسة|مستشفى|ملعب|سوبر ?ماركت|هايبر|ايكيا|إيكيا|اكسترا|إكسترا|العثيم|ساكو|هوم سنتر|بندة|كارفور|دانوب|لولو|تمويل|عقار|سيارات|صيانة|فحص|دراجات|حاسب|تقنية المعلومات|اكواخ|أكواخ|تسوق|cinema|mall/i;
// The shop's own name must say what it sells (the type column alone is noisy).
const NAME_OK = {
  'البناء والإنشاءات': /مواد ?بناء|مواد ?البناء|حديد|اسمنت|أسمنت|إسمنت|بلك|بلوك|طوب|خرسان|رمل|بحص|كسار|اخشاب|أخشاب|خشب|بليود|precast|steel|timber|wood|block|concrete|cement|building materials/i,
  'السباكة والمياه': /صحي|سباك|مواسير|أنابيب|انابيب|مضخ|خزان|سخان|تحلي|فلات?ر|مياه|pipe|pump|sanitary|plumb|water/i,
  'الكهرباء والإنارة': /كهرب|إنارة|انارة|اضاءة|إضاءة|ثريات|كابل|أسلاك|اسلاك|طاقة|مولد|electric|lighting|light|cable|solar|power/i,
};

// Reviewed by hand on 2026-10-17: toner shop, metal workshop, appliance/AC shops, gas installer.
// 2026-11-12 review: custom carpenter, wooden trays, appliance store, air treatment are not material suppliers.
const EXCLUDE = /TONERS|تشكيل المعادن|الشويرد|ذرة أكسجين|دخيلكم للغاز|مندي|نجار|صواني|للأجهزة الكهربائية|معالجة هواء/i;
// Water-filter shops dominate the plumbing list; keep a few so pipes and sanitary ware get the seats.
const FILTER_SHOP = /تحلي|فلات?ر/;
const MAX_FILTER_SHOPS = 3;

// Workshops and AV shops are not material suppliers for a first batch.
const SKIP_TYPES = new Set(['حدادة وورش حديد', 'شبكات وصوتيات وشاشات', 'كاميرات وأنظمة أمنية']);

const wb = XLSX.readFile(src, { dense: true });
const shops = [];
const seenPhone = new Set();
for (const sec of Object.keys(QUOTA)) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sec]);
  for (const r of rows) {
    const phone = String(r['الجوال'] || '').replace(/\D/g, '');
    const rating = +r['التقييم'] || 0, reviews = +r['المراجعات'] || 0;
    if (suppressed.has(phone)) continue;
    if (r['المدينة'] !== 'الرياض' || r['واتساب؟'] !== 'نعم' || !/^05\d{8}$/.test(phone)) continue;
    if (rating < 4.2 || reviews < 20 || reviews > 3000) continue;
    if (SKIP_TYPES.has(r['نوع المحل'])) continue;
    if (BAD.test(`${r['الاسم']} ${r['نوع Google'] || ''}`)) continue;
    if (EXCLUDE.test(r['الاسم'] || '')) continue;
    if (!NAME_OK[sec].test(r['الاسم'] || '')) continue;
    shops.push({ sec, type: r['نوع المحل'], r, phone, score: rating * Math.log10(reviews + 1) });
  }
}

// Round-robin across shop types inside each section, best score first, max PER_TYPE per type.
const picked = [];
for (const [sec, quota] of Object.entries(QUOTA)) {
  const byType = {};
  for (const s of shops.filter(x => x.sec === sec).sort((a, b) => b.score - a.score)) (byType[s.type] ||= []).push(s);
  const types = Object.keys(byType).sort((a, b) => byType[b].length - byType[a].length);
  let n = 0;
  for (let round = 0; round < PER_TYPE && n < quota; round++) {
    for (const t of types) {
      const s = byType[t][round];
      if (!s || seenPhone.has(s.phone) || n >= quota) continue;
      if (FILTER_SHOP.test(s.r['الاسم']) && picked.filter(p => FILTER_SHOP.test(p.r['الاسم'])).length >= MAX_FILTER_SHOPS) continue;
      seenPhone.add(s.phone); picked.push(s); n++;
    }
  }
}


// Pilot of PILOT_SIZE (legal session): top up from the best remaining shops when a section is short.
const PILOT_SIZE = 50;
for (const x of shops.slice().sort((a, b) => b.score - a.score)) {
  if (picked.length >= PILOT_SIZE) break;
  if (FILTER_SHOP.test(x.r['الاسم']) && picked.filter(p => FILTER_SHOP.test(p.r['الاسم'])).length >= MAX_FILTER_SHOPS) continue;
  if (!seenPhone.has(x.phone) && !picked.includes(x)) { seenPhone.add(x.phone); picked.push(x); }
}

// The template greets «تحية طيبة لفريق {{1}}»: Google names carry English duplicates, branches and
// product lists, so {{1}} gets the shop's own Arabic name, at most 40 characters, cut at a word.
const AR = /[؀-ۿ]/;
// Reviewed by hand (2026-11-12): names the rules below would still shorten badly.
const NAME_FIX = {
  'فلاتر تحلية المياة.دار الحرملية للمضخات وتحلية المياة': 'دار الحرملية للمضخات وتحلية المياه',
  'للسباكة والكهرباء شركة ضفيره المطيري للمقاوللات': 'شركة ضفيرة المطيري',
  'شهاب القمة كهرباء انارة ادوات صحية سباكة طاقة شمسية': 'شهاب القمة',
  'شركة معاذ المتحدة للتجارة لبيع مواد البناء أسمنت بلك رمل بلط': 'شركة معاذ المتحدة للتجارة',
  'مؤسسة الهدل للتجاره فرع لبن مبسط مواد بناء رمل اسمنت جميع مواد البناء': 'مؤسسة الهدل للتجارة',
  'Aljehath Trading (شركة الجهات الأصلية للتجارة)(Original Entities Building Materials Trading Est.)': 'شركة الجهات الأصلية للتجارة',
  'شركة مصنع الجداول للمضخات الزراعية وقطع غيارها': 'شركة مصنع الجداول للمضخات الزراعية',
  'شركة نقاء السلسبيل لفلاتر المياه وأجهزة ومحطات معالجة وتحليه المياه': 'شركة نقاء السلسبيل لفلاتر المياه',
  'مؤسسه بيت الخزانات (إحدي فروع مؤسسة الحسيني التجارية)': 'مؤسسة بيت الخزانات',
  'مؤسسة حمد عبدالعزيز المهيدب للادوات الصحية': 'مؤسسة حمد عبدالعزيز المهيدب',
  'الضوء الوهاج للإنارة و الكهرباء فرع الياسمين BRG LIGHTING': 'الضوء الوهاج للإنارة والكهرباء',
  'مبسط موادبناءاسمنت ورمل وبلاط سهم الطرق': 'سهم الطرق لمواد البناء',
  'هاتش للأدوات الصحية شارع التخصصي': 'هاتش للأدوات الصحية',
  'بدائع لبنان (الخزان)': 'بدائع لبنان',
};
// Latin brand + Arabic name in one string («SMCO Lighting سمكو اضاءة»): keep the Arabic words.
const latinPrefix = n => (AR.test(n) && /^[A-Za-z]/.test(n)) ? n.replace(/^[A-Za-z0-9 .&'-]+/, '').trim() : n;
function shortName(name) {
  const raw = String(name || '').replace(/[‎‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();
  if (NAME_FIX[raw]) return NAME_FIX[raw];
  let n = raw;
  // Drop bracketed English duplicates when the name has Arabic.
  if (AR.test(n)) n = n.replace(/\([^)]*[A-Za-z][^)]*\)/g, ' ');
  // Split off English halves, branches and product lists: « | », « – », « - », «،», «,», «/».
  const parts = n.split(/\s*[|–—]\s*|\s+-\s*|\s*-\s+|[،,/]/).map(x => x.trim()).filter(Boolean);
  n = (AR.test(n) ? parts.find(x => AR.test(x)) : parts[0]) || n;
  n = latinPrefix(n.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()).replace(/\s+فرع\s.*$/, '');
  if (n.length > 40) n = n.slice(0, 41).replace(/\s+\S*$/, '');
  return n;
}
const intl = p => '966' + p.slice(1);
const chat = p => `https://wa.me/${intl(p)}`;
// kind: 'opener' (Arabic invitation), 'follow' (one reminder), or en/ur/ar (full details, language already known).
const textFor = (kind, shop) => kind === 'opener' ? fill(opener, varsFor('ar', shop)) : fill(direct[kind], varsFor(kind, shop));
const wa = (p, kind, shop) => `${chat(p)}?text=${encodeURIComponent(textFor(kind, shop))}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 1) Excel = the tracking sheet. Pre-filled messages are too long for an Excel link (2,083 characters),
//    so the Excel opens the plain chat and the send buttons live in send-sheet.html.
const header = ['#', 'القسم', 'نوع المحل', 'الاسم', 'الحي', 'الجوال', 'التقييم', 'المراجعات', 'الإيميل', 'المحادثة', 'الخريطة', 'الحالة', 'اللغة', 'تاريخ الإرسال', 'ملاحظات'];
const data = [header];
picked.forEach((s, i) => {
  data.push([i + 1, s.sec, s.type, s.r['الاسم'], s.r['الحي'] || '', '0' + s.phone.slice(1), s.r['التقييم'], s.r['المراجعات'], s.r['الإيميل'] || '',
    'واتساب', 'الخريطة', 'لم يُرسل', '', '', '']);
});
const ws = XLSX.utils.aoa_to_sheet(data);
picked.forEach((s, i) => {
  ws[XLSX.utils.encode_cell({ r: i + 1, c: 9 })].l = { Target: chat(s.phone) };
  if (s.r['رابط الخريطة']) ws[XLSX.utils.encode_cell({ r: i + 1, c: 10 })].l = { Target: s.r['رابط الخريطة'] };
});
ws['!cols'] = [4, 16, 22, 40, 14, 13, 7, 9, 26, 9, 9, 12, 9, 12, 26].map(w => ({ wch: w }));
const out = XLSX.utils.book_new();
out.Workbook = { Views: [{ RTL: true }] };
XLSX.utils.book_append_sheet(out, ws, 'الدفعة الأولى');
const how = [
  ['طريقة الاستخدام'],
  ['1. الإرسال صار من رقم تسعيرك على WhatsApp Cloud API بقالب معتمد (supplier_invite)، لا من جوالك: هذا الملف للمتابعة فقط، والقائمة المرسلة في pilot-50.csv.'],
  [require('./links').links.bot_live ? '2. الدعوة بالعربية، وآخر سطر فيها: 2 للإنجليزية و3 للأردية. كل الردود بعد ذلك يرسلها الرد الآلي (bot)، ولا يحتاج أحد أن يرد بنفسه.' : '2. الرد الآلي لم يُربط بعد، لذلك الدعوة فيها رابط التسجيل مباشرة، وآخر سطر رابط صفحة فيها الإنجليزية والأردية. لا يلزمك الرد على أحد.'],
  ['3. مع الدعوة أرفق posters/poster-ar.png (رمز QR فيها يفتح صفحة الدعوة).'],
  ['4. حدّث عمود «الحالة» هنا: أُرسل / ردّ / سجّل / سعّر طلبًا / رفض / لا تراسله.'],
  ['5. رسالة واحدة فقط لكل محل: لا متابعة ولا تذكير. من ردّ «إلغاء» يُضاف رقمه فورًا إلى suppression.txt، وكذلك كل من أُرسلت له الدعوة، فلا يظهر في أي دفعة قادمة.'],
  ['6. من 30 إلى 50 رسالة في اليوم كحد أقصى، باسم المحل. راقب «تقييم الجودة» للرقم في WhatsApp Manager، وأوقف الإرسال إذا انخفض أو كثرت حالات الحظر.'],
  ['7. قبل الإرسال: صحّح الروابط في links.json ثم أعد تشغيل pick-first-batch.js.'],
  [''],
  ['المعايير: الرياض، لديه واتساب، تقييم 4.2+، من 20 إلى 3000 مراجعة، اسم المحل يدل على تخصصه، استبعاد المولات والسلاسل الكبيرة وورش الصيانة، 4 محلات كحد أقصى لكل نوع.'],
  ['راجع الاسم والخريطة قبل الإرسال: التصنيف آلي من بيانات Google وقد يخطئ.'],
];
const ws2 = XLSX.utils.aoa_to_sheet(how);
ws2['!cols'] = [{ wch: 120 }];
XLSX.utils.book_append_sheet(out, ws2, 'طريقة الاستخدام');
XLSX.writeFile(out, path.join(__dirname, 'first-batch-50.xlsx'));

// 2) pilot-50.csv = the list the API sender uses (template supplier_invite, {{1}} = shop name).
// No wa.me send sheet any more: those links send from the owner's personal WhatsApp.
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const csv = ['phone_e164,shop_name,lang,section,shop_type', ...picked.map(x => [intl(x.phone), shortName(x.r['الاسم']), 'ar', x.sec, x.type].map(csvCell).join(','))].join('\n');
fs.writeFileSync(path.join(__dirname, 'pilot-50.csv'), '\ufeff' + csv + '\n', 'utf8');
const oldSheet = path.join(__dirname, 'send-sheet.html');
if (fs.existsSync(oldSheet)) fs.unlinkSync(oldSheet);

console.log('candidates', shops.length, 'picked', picked.length);
console.log('longest link chars', Math.max(...picked.map(s => wa(s.phone, 'ur', s.r['الاسم']).length)));
