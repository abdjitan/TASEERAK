// Builds the supplier invitation email (ar / en / ur) as standalone HTML:
// emails/email-<lang>.html + emails/subjects.txt. Placeholder {shop} stays for the sender to fill.
// Run from the repo root: node marketing/supplier-invite/build-emails.js
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const { links, base, display } = require('./links');
const REGISTER = base + '/register?role=supplier';
const out = path.join(dir, 'emails');
fs.mkdirSync(out, { recursive: true });

const NAVY = '#071827', NAVY2 = '#0B2438', GOLD = '#D4A543', GOLD2 = '#F5C55B', INK = '#1B2733', MUTED = '#5B6B7A';

const T = {
  ar: {
    dir: 'rtl', align: 'right', font: "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif",
    subject: 'دعوة للانضمام إلى تسعيرك: طلبات تسعير مواد البناء تصلكم مباشرة',
    preheader: 'سجّلوا مجانًا، دون عمولة، وكونوا من أوائل الموردين في الرياض.',
    kicker: 'دعوة خاصة للموردين في الرياض',
    title: 'طلبات تسعير مواد البناء تصل إلى جوالكم مباشرة',
    hello: 'السلام عليكم ورحمة الله وبركاته،<br>تحية طيبة لفريق <b>{shop}</b>،',
    intro: 'يسعدنا دعوتكم للانضمام إلى <b>تسعيرك</b>، المنصة السعودية التي تصل فيها طلبات تسعير مواد البناء من المقاولين وأصحاب المشاريع مباشرة إلى الموردين المتخصصين.',
    howT: 'كيف تعمل المنصة؟',
    steps: ['يرسل المقاول أو المشتري قائمة المواد التي يحتاجها.', 'يصلكم الطلب على جوالكم بحسب تخصصكم.', 'تسعّرون كل مادة على حدة، ويختار المشتري العرض الأنسب له.'],
    whyT: 'ما الذي تحصلون عليه؟',
    perks: ['مجاني بالكامل خلال الإطلاق، دون عمولة أو اشتراك.', 'أسعاركم يراها صاحب الطلب فقط، ولا يراها المنافسون.', 'أمر الشراء والفاتورة ومتابعة التسليم في مكان واحد.', 'المسجلون الأوائل في الرياض تصلهم الطلبات الأولى.'],
    cta: 'سجّلوا الآن مجانًا',
    apps: 'أو حمّلوا التطبيق:',
    android: 'أندرويد (Google Play)', ios: 'آيفون (App Store)',
    help: 'المنصة متاحة بالعربية والإنجليزية والأردية. ويسعدنا مساعدتكم في التسجيل هاتفيًا أو بزيارة المحل، فقط ردّوا على هذه الرسالة.',
    sign: 'مع التحية،<br><b>فريق تسعيرك</b>',
    foot: 'وصلتكم هذه الرسالة لأن محلكم مدرج كمورد لمواد البناء في الرياض. إذا لم ترغبوا في رسائل أخرى، ردّوا بكلمة «إلغاء» ولن نراسلكم مرة أخرى.',
  },
  en: {
    dir: 'ltr', align: 'left', font: "Inter, 'Segoe UI', Arial, sans-serif",
    subject: 'Invitation to join Taseerak: construction price requests, straight to you',
    preheader: 'Register free, no commission, and be among the first suppliers in Riyadh.',
    kicker: 'A special invitation for Riyadh suppliers',
    title: 'Construction price requests, straight to your phone',
    hello: 'Assalamu alaikum,<br>Warm greetings to the <b>{shop}</b> team,',
    intro: 'We are pleased to invite you to join <b>Taseerak</b>, the Saudi platform where contractors and project owners send price requests for construction materials, delivered directly to specialised suppliers.',
    howT: 'How it works',
    steps: ['A contractor or buyer sends the list of materials they need.', 'The request reaches your phone, matched to your specialty.', 'You price each item separately, and the buyer chooses the offer that suits them.'],
    whyT: 'What you get',
    perks: ['Completely free during launch: no commission, no subscription.', 'Only the requester sees your prices, never your competitors.', 'Purchase orders, invoices and delivery tracking in one place.', 'Early suppliers in Riyadh receive the first requests.'],
    cta: 'Register now, free',
    apps: 'Or get the app:',
    android: 'Android (Google Play)', ios: 'iPhone (App Store)',
    help: 'The platform is available in Arabic, English and Urdu. We are happy to help you register by phone or with a visit to your shop; simply reply to this email.',
    sign: 'Kind regards,<br><b>The Taseerak team</b>',
    foot: 'You received this email because your shop is listed as a construction materials supplier in Riyadh. If you prefer not to hear from us again, reply with "unsubscribe" and we will not contact you again.',
  },
  ur: {
    dir: 'rtl', align: 'right', font: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', Tahoma, Arial, sans-serif",
    subject: 'تسعیرک میں شمولیت کی دعوت: تعمیراتی سامان کی قیمت کی درخواستیں براہِ راست آپ تک',
    preheader: 'مفت رجسٹر کریں، کوئی کمیشن نہیں، اور ریاض کے پہلے سپلائرز میں شامل ہوں۔',
    kicker: 'ریاض کے سپلائرز کے لیے خصوصی دعوت',
    title: 'تعمیراتی سامان کی قیمت کی درخواستیں براہِ راست آپ کے موبائل پر',
    hello: 'السلام علیکم،<br><b>{shop}</b> کی ٹیم کو خوش آمدید،',
    intro: 'ہم آپ کو <b>تسعیرک</b> میں شامل ہونے کی دعوت دیتے ہیں۔ یہ ایک سعودی پلیٹ فارم ہے جہاں ٹھیکیدار اور پروجیکٹ مالکان تعمیراتی سامان کی قیمت کی درخواستیں بھیجتے ہیں، اور یہ درخواستیں براہِ راست متعلقہ سپلائرز تک پہنچتی ہیں۔',
    howT: 'یہ کیسے کام کرتا ہے؟',
    steps: ['ٹھیکیدار یا خریدار مطلوبہ سامان کی فہرست بھیجتا ہے۔', 'درخواست آپ کی مہارت کے مطابق آپ کے موبائل پر پہنچتی ہے۔', 'آپ ہر آئٹم کی الگ قیمت دیتے ہیں، اور خریدار اپنے لیے بہترین آفر منتخب کرتا ہے۔'],
    whyT: 'آپ کو کیا ملے گا؟',
    perks: ['لانچ کے دوران مکمل مفت: نہ کمیشن، نہ سبسکرپشن۔', 'آپ کی قیمتیں صرف درخواست بھیجنے والا دیکھتا ہے، حریف نہیں۔', 'پرچیز آرڈر، انوائس اور ڈیلیوری کی فالو اپ ایک ہی جگہ۔', 'ریاض میں پہلے رجسٹر ہونے والوں کو پہلی درخواستیں ملیں گی۔'],
    cta: 'ابھی مفت رجسٹر کریں',
    apps: 'یا ایپ ڈاؤن لوڈ کریں:',
    android: 'اینڈرائیڈ (Google Play)', ios: 'آئی فون (App Store)',
    help: 'پلیٹ فارم عربی، انگریزی اور اردو میں دستیاب ہے۔ رجسٹریشن میں مدد کے لیے ہم فون پر یا آپ کی دکان پر آ کر حاضر ہیں، بس اس ای میل کا جواب دیں۔',
    sign: 'نیک تمناؤں کے ساتھ،<br><b>ٹیم تسعیرک</b>',
    foot: 'یہ ای میل آپ کو اس لیے ملی کیونکہ آپ کی دکان ریاض میں تعمیراتی سامان کے سپلائر کے طور پر درج ہے۔ اگر آپ مزید پیغامات نہیں چاہتے تو «منسوخ» لکھ کر جواب دیں، ہم دوبارہ رابطہ نہیں کریں گے۔',
  },
};

const subjects = [];
for (const [lang, t] of Object.entries(T)) {
  const ur = lang === 'ur';
  const lh = ur ? '2.1' : '1.75';
  const p = (html, extra = '') => `<p style="margin:0 0 16px;font-size:${ur ? 15 : 16}px;line-height:${lh};color:${INK};${extra}">${html}</p>`;
  const list = (items, numbered) => items.map((s, i) => `
          <tr><td valign="top" width="40" style="padding:0 0 12px;">
            <div style="width:28px;height:28px;border-radius:14px;background:${numbered ? GOLD : '#F6EBD2'};color:${NAVY};font:700 14px/28px Arial,sans-serif;text-align:center;">${numbered ? i + 1 : '&#10003;'}</div>
          </td><td valign="top" style="padding:3px 0 12px;font-size:${ur ? 15 : 16}px;line-height:${lh};color:${INK};text-align:${t.align};">${s}</td></tr>`).join('');
  const btn = (href, label, solid) => `<a href="${href}" style="display:inline-block;margin:4px;padding:${solid ? '15px 34px' : '11px 22px'};border-radius:10px;font-weight:700;font-size:${solid ? 17 : 15}px;text-decoration:none;${solid ? `background:${GOLD};color:${NAVY};` : `border:1.5px solid ${GOLD};color:${NAVY};`}">${label}</a>`;

  const html = `<!doctype html>
<html lang="${lang}" dir="${t.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.subject}</title></head>
<body style="margin:0;padding:0;background:#EEF1F4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F4;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="${t.dir}" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;font-family:${t.font};">
    <tr><td align="center" style="background:${NAVY};background-image:linear-gradient(180deg,${NAVY2},${NAVY});padding:34px 28px 30px;border-bottom:4px solid ${GOLD};">
      <img src="${base}/logo.png" width="96" alt="Taseerak" style="display:block;margin:0 auto 10px;border:0;">
      <div style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;font-size:26px;font-weight:700;color:${GOLD2};">تسعيرك <span style="font-family:Arial,sans-serif;font-size:14px;letter-spacing:3px;color:#C9D4DE;">TASEERAK</span></div>
      <div style="display:inline-block;margin-top:16px;padding:${ur ? '4px 18px 8px' : '6px 18px'};border-radius:999px;background:${GOLD};color:${NAVY};font-size:14px;font-weight:700;">${t.kicker}</div>
      <h1 style="margin:16px 0 0;font-size:${ur ? 24 : 26}px;line-height:${ur ? 1.9 : 1.4};color:#FFFFFF;font-weight:700;">${t.title}</h1>
    </td></tr>
    <tr><td style="padding:32px 34px 8px;text-align:${t.align};">
      ${p(t.hello)}
      ${p(t.intro)}
      <h2 style="margin:26px 0 14px;font-size:18px;color:${NAVY};">${t.howT}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list(t.steps, true)}
      </table>
      <h2 style="margin:18px 0 14px;font-size:18px;color:${NAVY};">${t.whyT}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list(t.perks, false)}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:18px 34px 6px;">
      ${btn(REGISTER, t.cta, true)}
      ${links.apps_live ? `<div style="margin:16px 0 6px;font-size:14px;color:${MUTED};">${t.apps}</div>` : ''}
      ${links.apps_live ? btn(links.android, t.android, false) + btn(links.ios, t.ios, false) : ''}
      <div style="margin-top:12px;font:600 14px Arial,sans-serif;color:${MUTED};direction:ltr;">${display}</div>
    </td></tr>
    <tr><td style="padding:22px 34px 30px;text-align:${t.align};">
      ${p(t.help)}
      ${p(t.sign, 'margin:0;')}
    </td></tr>
    <tr><td style="background:#F6F8FA;padding:18px 34px;text-align:${t.align};font-size:12px;line-height:${ur ? 2 : 1.6};color:${MUTED};border-top:1px solid #E3E8ED;">
      ${t.foot}<br><span style="direction:ltr;unicode-bidi:embed;">${links.email_from}</span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  fs.writeFileSync(path.join(out, `email-${lang}.html`), html, 'utf8');
  subjects.push(`[${lang}]\nSubject: ${t.subject}\nPreheader: ${t.preheader}\n`);
}
fs.writeFileSync(path.join(out, 'subjects.txt'), subjects.join('\n'), 'utf8');
console.log('emails written to', out);
