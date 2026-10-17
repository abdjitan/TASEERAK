// Builds the supplier invitation poster (1080x1350) in ar / en / ur:
// poster-<lang>.html, then poster-<lang>.png through headless Edge.
// Run from the repo root: node marketing/supplier-invite/build-posters.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const QRCode = require('qrcode');

const dir = __dirname;
const root = path.join(dir, '..', '..');
const { links, display, inviteUrl } = require('./links');
const out = path.join(dir, 'posters');
fs.mkdirSync(out, { recursive: true });

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SECTIONS = ['building', 'plumbing', 'electrical', 'finishing', 'hvac_fire', 'tools'];

const T = {
  ar: {
    dir: 'rtl', font: "'IBM Plex Sans Arabic'",
    kicker: 'دعوة خاصة للموردين في الرياض',
    title: 'طلبات تسعير مواد البناء<br>تصل إلى جوالك مباشرة',
    sub: 'انضم إلى تسعيرك مجانًا، وكن من أوائل الموردين على المنصة',
    steps: ['يرسل المقاول أو المشتري قائمة المواد التي يحتاجها', 'يصلك الطلب بحسب تخصصك', 'تسعّر كل مادة، ويختار المشتري العرض الأنسب'],
    perks: ['0٪ عمولة', 'مجاني خلال الإطلاق', 'أسعارك لا يراها المنافسون'],
    cta: 'سجّل الآن مجانًا',
    scan: 'امسح الرمز للتسجيل',
    play: 'Google Play', store: 'App Store',
    playPre: 'حمّله من', storePre: 'حمّله من',
    langs: 'العربية · English · اردو',
    secs: ['البناء', 'السباكة', 'الكهرباء', 'التشطيبات', 'التكييف والحريق', 'العدد والمعدات'],
  },
  en: {
    dir: 'ltr', font: "'Inter', 'IBM Plex Sans Arabic'",
    kicker: 'A special invitation for Riyadh suppliers',
    title: 'Construction price requests,<br>straight to your phone',
    sub: 'Join free and be among the first suppliers on Taseerak',
    steps: ['A contractor or buyer sends the list of materials', 'The request reaches you by specialty', 'You price each item, the buyer chooses'],
    perks: ['0% commission', 'Free during launch', 'Your prices stay private'],
    cta: 'Register now, free',
    scan: 'Scan to register',
    play: 'Google Play', store: 'App Store',
    playPre: 'Get it on', storePre: 'Download on the',
    langs: 'العربية · English · اردو',
    secs: ['Building', 'Plumbing', 'Electrical', 'Finishing', 'HVAC & Fire', 'Tools'],
  },
  ur: {
    dir: 'rtl', font: "'Noto Nastaliq Urdu', 'IBM Plex Sans Arabic'",
    kicker: 'ریاض کے سپلائرز کے لیے خصوصی دعوت',
    title: 'تعمیراتی سامان کی قیمت کی درخواستیں<br>براہِ راست آپ کے موبائل پر',
    sub: 'تسعیرک میں مفت شامل ہوں اور پلیٹ فارم کے پہلے سپلائرز میں شامل ہوں',
    steps: ['ٹھیکیدار یا خریدار سامان کی فہرست بھیجتا ہے', 'درخواست آپ کی مہارت کے مطابق آپ تک پہنچتی ہے', 'آپ ہر آئٹم کی قیمت دیں، خریدار بہترین آفر چنے'],
    perks: ['0٪ کمیشن', 'لانچ کے دوران مفت', 'حریف آپ کی قیمتیں نہیں دیکھ سکتے'],
    cta: 'ابھی مفت رجسٹر کریں',
    scan: 'رجسٹر کرنے کے لیے اسکین کریں',
    play: 'Google Play', store: 'App Store',
    playPre: 'ڈاؤن لوڈ کریں', storePre: 'ڈاؤن لوڈ کریں',
    langs: 'العربية · English · اردو',
    secs: ['تعمیرات', 'پلمبنگ', 'بجلی', 'فنشنگ', 'اے سی و فائر', 'اوزار'],
  },
};

const playIcon = `<svg viewBox="0 0 24 24" width="34" height="34"><path fill="#F5C55B" d="M4 2.6v18.8c0 .5.6.8 1 .5l10.6-9.4c.3-.3.3-.7 0-1L5 2.1c-.4-.3-1 0-1 .5z"/><path fill="#D4A543" d="M15.6 11.5 19.4 9c.8-.5.8-1.6 0-2.1l-3.8 4.6z" opacity=".0"/></svg>`;
const appleIcon = `<svg viewBox="0 0 24 24" width="34" height="34"><path fill="#F5C55B" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-3.8zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>`;

async function main() {
  const hero = await sharp(path.join(root, 'public/hero/taseerak-market-city.webp'))
    .resize(1080, 640, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82 }).toBuffer();
  const logo = await sharp(path.join(root, 'public/taseerak-metallic-logo.webp')).png().toBuffer();
  const qr = await QRCode.toString(inviteUrl(), { type: 'svg', margin: 0, color: { dark: '#071827', light: '#FFFFFF' } });
  const heroUri = 'data:image/jpeg;base64,' + hero.toString('base64');
  const logoUri = 'data:image/png;base64,' + logo.toString('base64');
  const site = display;
  const icons = [];
  for (const k of SECTIONS) {
    const b = await sharp(path.join(root, `public/images/section-icons/${k}.webp`)).resize(220, 220).png().toBuffer();
    icons.push('data:image/png;base64,' + b.toString('base64'));
  }

  for (const [lang, t] of Object.entries(T)) {
    const ur = lang === 'ur';
    const html = `<!doctype html><html lang="${lang}" dir="${t.dir}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:#071827;overflow:hidden}
body{font-family:${t.font},sans-serif;color:#fff;position:relative}
.hero{position:absolute;inset:0 0 auto 0;height:640px;background:url(${heroUri}) center/cover}
.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,24,39,.35) 0%,rgba(7,24,39,.55) 45%,#071827 100%)}
.frame{position:absolute;inset:28px;border:1.5px solid rgba(212,165,67,.55);border-radius:28px;pointer-events:none}
.wrap{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;padding:${ur ? '52px 72px 48px' : '60px 72px 52px'}}
.logo{width:${ur ? 190 : 220}px;filter:drop-shadow(0 8px 24px rgba(0,0,0,.55))}
.kicker{margin-top:14px;font-size:${ur ? 25 : 26}px;font-weight:600;color:#071827;background:linear-gradient(90deg,#D4A543,#F5C55B);padding:${ur ? '6px 26px 14px' : '8px 26px'};border-radius:999px;letter-spacing:${lang === 'en' ? '.5px' : '0'}}
h1{margin-top:${ur ? 22 : 28}px;text-align:center;font-size:${ur ? 44 : 58}px;line-height:${ur ? 1.6 : 1.25};font-weight:700;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.5)}
.sub{margin-top:${ur ? 14 : 18}px;text-align:center;font-size:${ur ? 23 : 28}px;line-height:${ur ? 1.8 : 1.45};color:#D9E2EA;max-width:880px}
.steps{margin-top:${ur ? 24 : 40}px;display:flex;gap:20px;width:100%}
.step{flex:1;background:linear-gradient(180deg,#102E45,#0B2438);border:1px solid rgba(212,165,67,.35);border-radius:22px;padding:${ur ? '18px 18px 14px' : '26px 22px'};text-align:center}
.num{width:58px;height:58px;margin:0 auto 14px;border-radius:50%;background:linear-gradient(135deg,#F5C55B,#9D7425);color:#071827;font:700 30px/58px 'Inter',sans-serif}
.step p{font-size:${ur ? 19 : 25}px;line-height:${ur ? 1.85 : 1.42};font-weight:500;color:#fff}
.perks{margin-top:${ur ? 24 : 30}px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.perk{font-size:${ur ? 22 : 24}px;font-weight:600;color:#F5C55B;border:1.5px solid rgba(245,197,91,.6);border-radius:999px;padding:${ur ? '4px 24px 12px' : '9px 24px'}}
.secs{margin-top:${ur ? 22 : 30}px;display:flex;justify-content:space-between;width:100%}
.sec{width:140px;display:flex;flex-direction:column;align-items:center;gap:${ur ? 2 : 8}px}
.sec img{width:${ur ? 88 : 100}px;height:${ur ? 88 : 100}px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45))}
.sec span{font-size:${ur ? 17 : 19}px;font-weight:500;color:#C9D4DE;text-align:center;line-height:${ur ? 1.9 : 1.25};white-space:nowrap}
.bottom{margin-top:auto;width:100%;display:flex;align-items:center;gap:30px;background:rgba(255,255,255,.04);border:1px solid rgba(212,165,67,.3);border-radius:24px;padding:24px 28px}
.qr{width:150px;height:150px;background:#fff;border-radius:14px;padding:12px;flex:none}
.qr svg{width:100%;height:100%;display:block}
.cta{flex:1;display:flex;flex-direction:column;gap:${ur ? 6 : 10}px}
.cta .big{font-size:${ur ? 32 : 36}px;font-weight:700;color:#F5C55B;line-height:${ur ? 1.8 : 1.2}}
.cta .site{font:700 34px/1.1 'Inter',sans-serif;color:#fff;letter-spacing:.5px;direction:ltr;text-align:${t.dir === 'rtl' ? 'right' : 'left'}}
.cta .scan{font-size:${ur ? 18 : 20}px;color:#9FB0BF;line-height:${ur ? 1.9 : 1.3}}
.stores{display:flex;flex-direction:column;gap:12px;flex:none}
.store{display:flex;align-items:center;gap:12px;background:#0B2438;border:1.5px solid rgba(245,197,91,.55);border-radius:14px;padding:10px 20px;direction:ltr;min-width:230px}
.store small{display:block;font-size:${ur ? 14 : 15}px;color:#9FB0BF;line-height:${ur ? 1.8 : 1.2};font-family:${t.font},sans-serif}
.store b{display:block;font:700 24px/1.15 'Inter',sans-serif;color:#fff}
.langs{margin-top:18px;font-size:19px;color:#7F93A5;font-family:'IBM Plex Sans Arabic','Inter',sans-serif}
</style></head><body>
<div class="hero"></div><div class="frame"></div>
<div class="wrap">
  <img class="logo" src="${logoUri}" alt="Taseerak">
  <div class="kicker">${t.kicker}</div>
  <h1>${t.title}</h1>
  <p class="sub">${t.sub}</p>
  <div class="steps">${t.steps.map((s, i) => `<div class="step"><div class="num">${i + 1}</div><p>${s}</p></div>`).join('')}</div>
  <div class="perks">${t.perks.map(p => `<span class="perk">${p}</span>`).join('')}</div>
  <div class="secs">${icons.map((src, i) => `<div class="sec"><img src="${src}" alt=""><span>${t.secs[i]}</span></div>`).join('')}</div>
  <div class="bottom">
    <div class="qr">${qr}</div>
    <div class="cta"><div class="big">${t.cta}</div><div class="site">${site}</div><div class="scan">${t.scan}</div></div>
    <div class="stores"${links.apps_live ? '' : ' style="display:none"'}>
      <div class="store">${playIcon}<div><small>${t.playPre}</small><b>${t.play}</b></div></div>
      <div class="store">${appleIcon}<div><small>${t.storePre}</small><b>${t.store}</b></div></div>
    </div>
  </div>
  <div class="langs">${t.langs}</div>
</div></body></html>`;
    const htmlPath = path.join(out, `poster-${lang}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    const png = path.join(out, `poster-${lang}.png`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${path.join(require('os').tmpdir(), 'taseerak-poster-chrome')}`,
      '--window-size=1080,1350', '--virtual-time-budget=8000', `--screenshot=${png}`, 'file:///' + htmlPath.replace(/\\/g, '/')], { stdio: 'ignore' });
    console.log('poster', lang, fs.existsSync(png) ? 'ok' : 'MISSING');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
