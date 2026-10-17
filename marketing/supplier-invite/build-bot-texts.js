// Builds bot/texts.json for the auto-reply bot (bot/replies.mjs) from the same texts the owner
// sends by hand, and copies the language posters next to the invite page so WhatsApp can fetch
// them by URL. Run from the repo root: node marketing/supplier-invite/build-bot-texts.js
const fs = require('fs');
const path = require('path');
const { reply, fill, varsFor } = require('./messages');
const { base } = require('./links');

const dir = __dirname;
const LANGS = ['ar', 'en', 'ur'];

// Posters travel with the invite page (public/invite/assets/ on the site).
for (const l of LANGS) fs.copyFileSync(path.join(dir, 'posters', `poster-${l}.png`), path.join(dir, 'invite-page', 'assets', `poster-${l}.png`));

const texts = {
  details: Object.fromEntries(LANGS.map(l => [l, fill(reply[l], varsFor(l, ''))])),
  poster: Object.fromEntries(LANGS.map(l => [l, `${base}/invite/assets/poster-${l}.png`])),
  yes: {
    ar: `أهلًا بكم في تسعيرك.
التسجيل يأخذ دقيقتين من الجوال: ${base}/register?role=supplier
بعد التسجيل اختاروا تخصصاتكم، وتصلكم الطلبات المناسبة مباشرة. وإن كان لديكم أي سؤال فاكتبوه هنا.`,
    en: `Welcome to Taseerak.
Registration takes two minutes from your phone: ${base}/register?role=supplier
After registering, choose your specialties and matching requests will reach you directly. If you have any question, write it here.`,
    ur: `تسعیرک میں خوش آمدید۔
رجسٹریشن موبائل سے دو منٹ میں ہو جاتی ہے: ${base}/register?role=supplier
رجسٹر کرنے کے بعد اپنی مہارتیں منتخب کریں، اور متعلقہ درخواستیں براہِ راست آپ تک پہنچیں گی۔ کوئی سوال ہو تو یہاں لکھیں۔`,
  },
  // Voice notes, images, stickers: the bot reads text only.
  textPlease: {
    ar: 'شكرًا لرسالتكم. نرجو كتابة سؤالكم نصًّا، ونرد عليكم فورًا.',
    en: 'Thank you for your message. Please type your question as text and we will reply right away.',
    ur: 'آپ کے پیغام کا شکریہ۔ براہِ کرم اپنا سوال لکھ کر بھیجیں، ہم فوراً جواب دیں گے۔',
  },
  // Used only if the AI call fails or declines.
  fallback: {
    ar: `شكرًا لرسالتكم. تجدون التفاصيل كاملة هنا: ${base}/invite?lang=ar`,
    en: `Thank you for your message. You will find all the details here: ${base}/invite?lang=en`,
    ur: `آپ کے پیغام کا شکریہ۔ مکمل تفصیلات یہاں دیکھیں: ${base}/invite?lang=ur`,
  },
};

fs.mkdirSync(path.join(dir, 'bot'), { recursive: true });
fs.writeFileSync(path.join(dir, 'bot', 'texts.json'), JSON.stringify(texts, null, 2) + '\n', 'utf8');
console.log('bot/texts.json written; posters copied to invite-page/assets');

// The edge function ships its own copy (Supabase deploys only files inside the function folder).
const fn = path.join(dir, '..', '..', 'supabase', 'functions', 'whatsapp-invite-bot');
for (const f of ['replies.mjs', 'ai.mjs', 'texts.json']) fs.copyFileSync(path.join(dir, 'bot', f), path.join(fn, f));
console.log('bot files copied to supabase/functions/whatsapp-invite-bot');
