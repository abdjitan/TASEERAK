// Picks the first outreach batch (50 Riyadh shops) from the owner's shop lists and writes
// first-batch-50.xlsx with one-click WhatsApp links (message pre-filled, NOT sent: the owner
// presses Send himself). Run: node marketing/supplier-invite/pick-first-batch.js "<path to محلات-حسب-النوع-الدقيق-…xlsx>"
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { opener, direct, followUp, fill, varsFor } = require('./messages');

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
const EXCLUDE = /TONERS|تشكيل المعادن|الشويرد|ذرة أكسجين|دخيلكم للغاز|مندي/i;

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
      seenPhone.add(s.phone); picked.push(s); n++;
    }
  }
}


const intl = p => '966' + p.slice(1);
const chat = p => `https://wa.me/${intl(p)}`;
// kind: 'opener' (Arabic invitation), 'follow' (one reminder), or en/ur/ar (full details, language already known).
const textFor = (kind, shop) => kind === 'opener' ? fill(opener, varsFor('ar', shop)) : kind === 'follow' ? fill(followUp, varsFor('ar', shop)) : fill(direct[kind], varsFor(kind, shop));
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
  ['1. لا يُرسَل شيء تلقائيًا. افتح send-sheet.html (بجانب هذا الملف) في المتصفح: زر «الدعوة» يفتح واتساب والرسالة العربية جاهزة، وأنت من يضغط إرسال.'],
  [require('./links').links.bot_live ? '2. الدعوة بالعربية، وآخر سطر فيها: 2 للإنجليزية و3 للأردية. كل الردود بعد ذلك يرسلها الرد الآلي (bot)، ولا يحتاج أحد أن يرد بنفسه.' : '2. الرد الآلي لم يُربط بعد، لذلك الدعوة فيها رابط التسجيل مباشرة، وآخر سطر رابط صفحة فيها الإنجليزية والأردية. لا يلزمك الرد على أحد.'],
  ['3. مع الدعوة أرفق posters/poster-ar.png (رمز QR فيها يفتح صفحة الدعوة).'],
  ['4. حدّث عمود «الحالة» هنا: أُرسل / ردّ / سجّل / سعّر طلبًا / رفض / لا تراسله.'],
  ['5. متابعة واحدة فقط بعد 3 أيام لمن لم يرد (نصها في messages.js)، ومن رفض لا يُراسل مرة أخرى.'],
  ['6. قبل الإرسال: صحّح الروابط في links.json ثم أعد تشغيل pick-first-batch.js.'],
  [''],
  ['المعايير: الرياض، لديه واتساب، تقييم 4.2+، من 20 إلى 3000 مراجعة، اسم المحل يدل على تخصصه، استبعاد المولات والسلاسل الكبيرة وورش الصيانة، 4 محلات كحد أقصى لكل نوع.'],
  ['راجع الاسم والخريطة قبل الإرسال: التصنيف آلي من بيانات Google وقد يخطئ.'],
];
const ws2 = XLSX.utils.aoa_to_sheet(how);
ws2['!cols'] = [{ wch: 120 }];
XLSX.utils.book_append_sheet(out, ws2, 'طريقة الاستخدام');
XLSX.writeFile(out, path.join(__dirname, 'first-batch-50.xlsx'));

// 2) send-sheet.html = one row per shop with buttons that open WhatsApp with the message ready.
const rowsHtml = picked.map((s, i) => {
  const name = s.r['الاسم'];
  const b = (kind, label, main) => `<a class="b${main ? ' main' : ''}" href="${esc(wa(s.phone, kind, name))}" target="_blank" rel="noopener" data-id="${i + 1}">${label}</a>`;
  return `<tr id="r${i + 1}"><td>${i + 1}</td><td><b>${esc(name)}</b><div class="m">${esc(s.type)} · ${esc(s.r['الحي'] || '')} · ${s.r['التقييم']} (${s.r['المراجعات']})</div></td>
<td class="btns">${b('opener', 'الدعوة', true)}${b('follow', 'متابعة', false)}<span class="sep">لغة معروفة:</span>${b('en', 'English', false)}${b('ur', 'اردو', false)}${s.r['رابط الخريطة'] ? `<a class="b" href="${esc(s.r['رابط الخريطة'])}" target="_blank" rel="noopener">الخريطة</a>` : ''}</td>
<td><label><input type="checkbox" data-sent="${i + 1}"> أُرسلت</label></td></tr>`;
}).join('\n');
const sheet = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>دعوات الموردين: الدفعة الأولى</title>
<style>
body{margin:0;background:#F3F5F7;font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#1B2733}
header{background:#071827;color:#fff;padding:18px 20px;border-bottom:3px solid #D4A543}
header h1{margin:0;font-size:20px;color:#F5C55B} header p{margin:6px 0 0;font-size:13px;color:#C9D4DE}
main{padding:16px;max-width:1100px;margin:auto}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
td{padding:10px;border-bottom:1px solid #E3E8ED;vertical-align:middle;font-size:14px}
.m{font-size:12px;color:#5B6B7A;margin-top:3px}
.btns{white-space:nowrap}
.b{display:inline-block;margin:2px;padding:6px 10px;border:1px solid #D4A543;border-radius:8px;color:#071827;text-decoration:none;font-size:13px}
.b.main{background:#D4A543;font-weight:700}
.sep{font-size:11px;color:#5B6B7A;margin:0 6px}
tr.sent{opacity:.45}
</style></head><body>
<header><h1>دعوات الموردين: الدفعة الأولى (${picked.length} محلًا)</h1>
<p>الزر يفتح واتساب والرسالة جاهزة، ولا يُرسَل شيء إلا عندما تضغط إرسال بنفسك. أول رسالة: «الدعوة» بالعربية مع posters/poster-ar.png. ${require("./links").links.bot_live ? "كل الردود بعدها يرسلها الرد الآلي." : "الرد الآلي لم يُربط بعد: الرسالة فيها رابط التسجيل وصفحة اللغات، فلا يلزمك الرد."} «متابعة» مرة واحدة بعد 3 أيام لمن لم يرد. علامة «أُرسلت» تُحفظ في هذا المتصفح فقط.</p></header>
<main><table>${rowsHtml}</table></main>
<script>
const KEY='taseerak-invite-sent';
let sent={};try{sent=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(sent))}catch(e){}};
document.querySelectorAll('[data-sent]').forEach(cb=>{const id=cb.dataset.sent;cb.checked=!!sent[id];
  document.getElementById('r'+id).classList.toggle('sent',cb.checked);
  cb.addEventListener('change',()=>{sent[id]=cb.checked;save();document.getElementById('r'+id).classList.toggle('sent',cb.checked)})});
</script></body></html>`;
fs.writeFileSync(path.join(__dirname, 'send-sheet.html'), sheet, 'utf8');

console.log('candidates', shops.length, 'picked', picked.length);
console.log('longest link chars', Math.max(...picked.map(s => wa(s.phone, 'ur', s.r['الاسم']).length)));
