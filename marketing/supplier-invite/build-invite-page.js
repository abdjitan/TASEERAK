// Supplier invitation page with a language switch (العربية / English / اردو), phone-first.
// Writes invite-page/index.html + invite-page/assets/*. Meant to be hosted at Taseerak.com/invite
// by the web session (static, no app code). Starts in the phone's language when it is one of the three.
// Hosted at public/invite/ with a rewrite /invite -> /invite/index.html, so asset paths are absolute.
// Run from the repo root: node marketing/supplier-invite/build-invite-page.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = __dirname;
const root = path.join(dir, '..', '..');
const links = JSON.parse(fs.readFileSync(path.join(dir, 'links.json'), 'utf8'));
const out = path.join(dir, 'invite-page');
const assets = path.join(out, 'assets');
fs.mkdirSync(assets, { recursive: true });
const SECTIONS = ['building', 'plumbing', 'electrical', 'finishing', 'hvac_fire', 'tools'];

const T = {
  ar: {
    dir: 'rtl', name: 'العربية',
    kicker: 'دعوة خاصة للموردين في الرياض',
    title: 'طلبات تسعير مواد البناء تصل إلى جوالك مباشرة',
    sub: 'انضم إلى تسعيرك مجانًا، وكن من أوائل الموردين على المنصة.',
    howT: 'كيف تعمل المنصة؟',
    steps: ['يرسل المقاول أو المشتري قائمة المواد التي يحتاجها.', 'يصلك الطلب على جوالك بحسب تخصصك.', 'تسعّر كل مادة على حدة، ويختار المشتري العرض الأنسب له.'],
    whyT: 'ما الذي تحصل عليه؟',
    perks: ['مجاني بالكامل خلال الإطلاق، دون عمولة أو اشتراك.', 'سعرك يراه صاحب الطلب فقط، ولا يراه المنافسون.', 'أمر الشراء والفاتورة ومتابعة التسليم في مكان واحد.', 'المسجلون الأوائل في الرياض تصلهم الطلبات الأولى.'],
    secsT: 'الأقسام',
    secs: ['البناء', 'السباكة', 'الكهرباء', 'التشطيبات', 'التكييف والحريق', 'العدد والمعدات'],
    cta: 'سجّل الآن مجانًا', apps: 'أو حمّل التطبيق',
    help: 'تحتاج مساعدة في التسجيل؟ راسلنا على واتساب.', wa: 'واتساب',
  },
  en: {
    dir: 'ltr', name: 'English',
    kicker: 'A special invitation for Riyadh suppliers',
    title: 'Construction price requests, straight to your phone',
    sub: 'Join Taseerak for free and be among the first suppliers on the platform.',
    howT: 'How it works',
    steps: ['A contractor or buyer sends the list of materials they need.', 'The request reaches your phone, matched to your specialty.', 'You price each item, and the buyer chooses the offer that suits them.'],
    whyT: 'What you get',
    perks: ['Completely free during launch: no commission, no subscription.', 'Only the requester sees your price, never your competitors.', 'Purchase orders, invoices and delivery tracking in one place.', 'Early suppliers in Riyadh receive the first requests.'],
    secsT: 'Sections',
    secs: ['Building', 'Plumbing', 'Electrical', 'Finishing', 'HVAC & Fire', 'Tools'],
    cta: 'Register now, free', apps: 'Or get the app',
    help: 'Need help registering? Message us on WhatsApp.', wa: 'WhatsApp',
  },
  ur: {
    dir: 'rtl', name: 'اردو',
    kicker: 'ریاض کے سپلائرز کے لیے خصوصی دعوت',
    title: 'تعمیراتی سامان کی قیمت کی درخواستیں براہِ راست آپ کے موبائل پر',
    sub: 'تسعیرک میں مفت شامل ہوں اور پلیٹ فارم کے پہلے سپلائرز میں شامل ہوں۔',
    howT: 'یہ کیسے کام کرتا ہے؟',
    steps: ['ٹھیکیدار یا خریدار مطلوبہ سامان کی فہرست بھیجتا ہے۔', 'درخواست آپ کی مہارت کے مطابق آپ کے موبائل پر پہنچتی ہے۔', 'آپ ہر آئٹم کی قیمت دیتے ہیں، اور خریدار اپنے لیے بہترین آفر منتخب کرتا ہے۔'],
    whyT: 'آپ کو کیا ملے گا؟',
    perks: ['لانچ کے دوران مکمل مفت: نہ کمیشن، نہ سبسکرپشن۔', 'آپ کی قیمت صرف درخواست بھیجنے والا دیکھتا ہے، حریف نہیں۔', 'پرچیز آرڈر، انوائس اور ڈیلیوری کی فالو اپ ایک ہی جگہ۔', 'ریاض میں پہلے رجسٹر ہونے والوں کو پہلی درخواستیں ملیں گی۔'],
    secsT: 'شعبے',
    secs: ['تعمیرات', 'پلمبنگ', 'بجلی', 'فنشنگ', 'اے سی و فائر', 'اوزار'],
    cta: 'ابھی مفت رجسٹر کریں', apps: 'یا ایپ ڈاؤن لوڈ کریں',
    help: 'رجسٹریشن میں مدد چاہیے؟ ہمیں واٹس ایپ پر پیغام بھیجیں۔', wa: 'واٹس ایپ',
  },
};

(async () => {
  await sharp(path.join(root, 'public/hero/taseerak-market-city.webp')).resize(1200, 700, { fit: 'cover' }).jpeg({ quality: 78 }).toFile(path.join(assets, 'hero.jpg'));
  await sharp(path.join(root, 'public/taseerak-metallic-logo.webp')).png().toFile(path.join(assets, 'logo.png'));
  for (const k of SECTIONS) await sharp(path.join(root, `public/images/section-icons/${k}.webp`)).resize(160, 160).png().toFile(path.join(assets, `${k}.png`));

  const waNum = String(links.whatsapp_business || '').replace(/\D/g, '');
  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>تسعيرك | دعوة الموردين · Taseerak | Supplier invitation</title>
<meta name="description" content="طلبات تسعير مواد البناء تصل إلى جوالك مباشرة. Construction price requests, straight to your phone.">
<meta property="og:title" content="تسعيرك | Taseerak | تسعیرک">
<meta property="og:description" content="دعوة خاصة للموردين في الرياض · A special invitation for Riyadh suppliers">
<meta property="og:image" content="${links.live_site}/invite/assets/hero.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;600;700&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--navy:#071827;--navy2:#0B2438;--navy3:#102E45;--gold:#D4A543;--gold2:#F5C55B;--ink:#E7EDF2;--muted:#9FB0BF}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--navy);color:var(--ink);font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;line-height:1.6}
html[lang=en] body{font-family:Inter,'Segoe UI',sans-serif}
html[lang=ur] body{font-family:'Noto Nastaliq Urdu','IBM Plex Sans Arabic',sans-serif;line-height:2.1}
.lang{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:8px;padding:10px 16px;background:rgba(7,24,39,.92);backdrop-filter:blur(6px);border-bottom:1px solid rgba(212,165,67,.3)}
.lang button{font:600 15px/1 'IBM Plex Sans Arabic',Inter,sans-serif;padding:10px 18px;border-radius:999px;border:1.5px solid rgba(245,197,91,.6);background:transparent;color:var(--gold2);cursor:pointer;min-width:84px}
.lang button[data-l=ur]{font-family:'Noto Nastaliq Urdu','IBM Plex Sans Arabic',sans-serif;padding:4px 18px 10px}
.lang button[aria-pressed=true]{background:linear-gradient(90deg,var(--gold),var(--gold2));color:var(--navy);border-color:transparent}
.hero{position:relative;padding:36px 16px 28px;text-align:center;background:linear-gradient(180deg,rgba(7,24,39,.35),rgba(7,24,39,.7) 55%,var(--navy)),url(/invite/assets/hero.jpg) center/cover}
.hero img{width:150px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.5))}
.kicker{display:inline-block;margin-top:10px;padding:5px 16px;border-radius:999px;background:linear-gradient(90deg,var(--gold),var(--gold2));color:var(--navy);font-weight:700;font-size:14px}
h1{margin:16px auto 8px;max-width:640px;font-size:clamp(26px,6.5vw,40px);line-height:1.3;color:#fff}
html[lang=ur] h1{line-height:1.9}
.sub{max-width:560px;margin:auto;color:#D3DDE6;font-size:17px}
main{max-width:720px;margin:auto;padding:8px 16px 40px}
h2{margin:28px 0 12px;font-size:20px;color:var(--gold2)}
.card{display:flex;gap:12px;align-items:flex-start;background:linear-gradient(180deg,var(--navy3),var(--navy2));border:1px solid rgba(212,165,67,.3);border-radius:16px;padding:14px;margin-bottom:10px}
.n{flex:none;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--gold2),#9D7425);color:var(--navy);font:700 17px/34px Inter,sans-serif;text-align:center}
.ok{flex:none;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--gold2);color:var(--gold2);font:700 14px/23px Inter,sans-serif;text-align:center}
.perk{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px}
.secs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center}
.secs img{width:72px;height:72px}
.secs span{display:block;font-size:14px;color:#C9D4DE}
.cta{margin-top:30px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(212,165,67,.35);border-radius:20px;padding:22px 16px}
.btn{display:block;width:100%;max-width:420px;margin:0 auto;padding:15px;border-radius:14px;background:linear-gradient(90deg,var(--gold),var(--gold2));color:var(--navy);font-weight:700;font-size:19px;text-decoration:none}
.site{margin-top:8px;font:700 18px Inter,sans-serif;color:#fff;direction:ltr}
.apps-t{margin:18px 0 8px;color:var(--muted);font-size:15px}
.stores{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.store{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;border:1.5px solid rgba(245,197,91,.55);color:#fff;text-decoration:none;font:700 16px Inter,sans-serif;direction:ltr;min-width:160px;justify-content:center}
.help{margin-top:18px;font-size:15px;color:var(--muted)}
.help a{color:var(--gold2)}
footer{text-align:center;color:#5F7486;font-size:13px;padding:0 16px 30px;direction:ltr}
</style></head><body>
<nav class="lang" aria-label="Language">
  <button data-l="ar" aria-pressed="true">العربية</button><button data-l="en" aria-pressed="false">English</button><button data-l="ur" aria-pressed="false">اردو</button>
</nav>
<header class="hero">
  <img src="/invite/assets/logo.png" alt="Taseerak">
  <div><span class="kicker" data-t="kicker"></span></div>
  <h1 data-t="title"></h1>
  <p class="sub" data-t="sub"></p>
</header>
<main>
  <h2 data-t="howT"></h2><div id="steps"></div>
  <h2 data-t="whyT"></h2><div id="perks"></div>
  <h2 data-t="secsT"></h2>
  <div class="secs">${SECTIONS.map((k, i) => `<div><img src="/invite/assets/${k}.png" alt=""><span data-sec="${i}"></span></div>`).join('')}</div>
  <section class="cta">
    <a class="btn" href="/register?role=supplier" data-t="cta"></a>
    <div class="site">${links.site.replace(/^https?:\/\//, '')}</div>
    <div class="apps-t" data-t="apps"${links.apps_live ? '' : ' hidden'}></div>
    <div class="stores"${links.apps_live ? '' : ' hidden'}>
      <a class="store" href="${links.android}">Google Play</a>
      <a class="store" href="${links.ios}">App Store</a>
    </div>
    ${waNum && !/X/.test(links.whatsapp_business) ? `<p class="help"><span data-t="help"></span> <a href="https://wa.me/${waNum}" data-t="wa"></a></p>` : ''}
  </section>
</main>
<footer>Taseerak.com · ${links.email_from}</footer>
<script>
const T=${JSON.stringify(Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v])))};
function setLang(l){
  const t=T[l]||T.ar; document.documentElement.lang=l; document.documentElement.dir=t.dir;
  document.querySelectorAll('[data-t]').forEach(e=>{e.textContent=t[e.dataset.t]});
  document.querySelectorAll('[data-sec]').forEach(e=>{e.textContent=t.secs[+e.dataset.sec]});
  document.getElementById('steps').innerHTML=t.steps.map((s,i)=>'<div class="card"><span class="n">'+(i+1)+'</span><div>'+s+'</div></div>').join('');
  document.getElementById('perks').innerHTML=t.perks.map(s=>'<div class="perk"><span class="ok">&#10003;</span><div>'+s+'</div></div>').join('');
  document.querySelectorAll('.lang button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===l)));
  try{localStorage.setItem('taseerak-invite-lang',l)}catch(e){}
}
document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.l)));
let start='ar';
try{start=new URLSearchParams(location.search).get('lang')||localStorage.getItem('taseerak-invite-lang')||''}catch(e){}
if(!T[start]){const nav=(navigator.language||'ar').slice(0,2);start=T[nav]?nav:'ar'}
setLang(start);
</script>
</body></html>`;
  fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');
  console.log('invite page written to', out);
})().catch(e => { console.error(e); process.exit(1); });
