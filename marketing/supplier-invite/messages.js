// Supplier invitation texts (WhatsApp). The owner sends `opener` and `followUp` by hand; every
// answer after that comes from the bot (bot/replies.mjs + bot/ai.mjs), never from a person.
// Flow: 1) `opener` (Arabic only, no link) + posters/poster-ar.png; its last line offers English (2) and Urdu (3)
//       2) the shop answers -> bot: 2 / 3 -> `reply.en` / `reply.ur` + poster; «نعم» -> registration link;
//          anything else -> AI answer
//       3) no answer after 3 days -> `followUp` once.
// `direct[lang]` is for a shop whose language is already known (skip the opener).
// Placeholders: {shop} {invite} {apps}. WhatsApp formatting: *bold*. Arabic is MSA.
const { links, base, inviteUrl } = require('./links');

const ESCAPE = 'For English reply *2* · اردو کے لیے *3* لکھیں';

const opener = `السلام عليكم ورحمة الله وبركاته،
تحية طيبة لفريق *{shop}*.

يسعدنا دعوتكم للانضمام إلى *تسعيرك*، المنصة السعودية التي تصل فيها طلبات تسعير مواد البناء من المقاولين والمشترين في الرياض مباشرة إلى جوالكم، بحسب تخصصكم.

▪ مجاني خلال الإطلاق، دون عمولة أو اشتراك
▪ أسعاركم يراها صاحب الطلب فقط، ولا يراها المنافسون
▪ المسجلون الأوائل تصلهم الطلبات الأولى

*ردّوا بكلمة «نعم» ونساعدكم في التسجيل خلال دقيقتين.*

فريق تسعيرك

${ESCAPE}`;

// Manual mode (links.json bot_live=false): nobody answers replies yet, so the invitation carries the
// registration link itself, and the invite page (with its own AR / EN / UR buttons) covers the other
// languages. Same greeting, so the bot still recognises it once it is switched on.
const openerManual = `السلام عليكم ورحمة الله وبركاته،
تحية طيبة لفريق *{shop}*.

يسعدنا دعوتكم للانضمام إلى *تسعيرك*، المنصة السعودية التي تصل فيها طلبات تسعير مواد البناء من المقاولين والمشترين في الرياض مباشرة إلى جوالكم وبريدكم، بحسب تخصصكم.

▪ مجاني خلال الإطلاق، دون عمولة أو اشتراك
▪ أسعاركم يراها صاحب الطلب فقط، ولا يراها المنافسون
▪ المسجلون الأوائل تصلهم الطلبات الأولى

*التسجيل مجاني ويأخذ دقيقتين:*
{register}

فريق تسعيرك

English · اردو: {inviteAny}`;

const reply = {
  ar: `شكرًا لكم. هذه تفاصيل *تسعيرك*:

*كيف تعمل المنصة؟*
1. يرسل المقاول أو المشتري قائمة المواد التي يحتاجها.
2. يصلكم الطلب على جوالكم بحسب تخصصكم.
3. تسعّرون كل مادة على حدة، ويختار المشتري العرض الأنسب له.

*ما الذي تحصلون عليه؟*
▪ مجاني بالكامل خلال الإطلاق، دون عمولة أو اشتراك
▪ أسعاركم يراها صاحب الطلب فقط، ولا يراها المنافسون
▪ أمر الشراء والفاتورة ومتابعة التسليم في مكان واحد
▪ المسجلون الأوائل في الرياض تصلهم الطلبات الأولى

*الأسهل: ردّوا بكلمة «نعم» ونساعدكم في التسجيل خلال دقيقتين.*

أو اطّلعوا وسجّلوا بأنفسكم:
{invite}{apps}

فريق تسعيرك`,

  en: `Thank you. Here are the details of *Taseerak*:

*How it works*
1. A contractor or buyer sends the list of materials they need.
2. The request reaches your phone, matched to your specialty.
3. You price each item separately, and the buyer chooses the offer that suits them.

*What you get*
▪ Completely free during launch: no commission, no subscription
▪ Only the requester sees your prices, never your competitors
▪ Purchase orders, invoices and delivery tracking in one place
▪ Early suppliers in Riyadh receive the first requests

*Easiest: reply «yes» and we will register you in two minutes.*

Or see the details and register yourself:
{invite}{apps}

The Taseerak team`,

  ur: `شکریہ۔ *تسعیرک* کی تفصیلات یہ ہیں:

*یہ کیسے کام کرتا ہے؟*
1. ٹھیکیدار یا خریدار مطلوبہ سامان کی فہرست بھیجتا ہے۔
2. درخواست آپ کی مہارت کے مطابق آپ کے موبائل پر پہنچتی ہے۔
3. آپ ہر آئٹم کی الگ قیمت دیتے ہیں، اور خریدار اپنے لیے بہترین آفر منتخب کرتا ہے۔

*آپ کو کیا ملے گا؟*
▪ لانچ کے دوران مکمل مفت: نہ کمیشن، نہ سبسکرپشن
▪ آپ کی قیمتیں صرف درخواست بھیجنے والا دیکھتا ہے، حریف نہیں
▪ پرچیز آرڈر، انوائس اور ڈیلیوری کی فالو اپ ایک ہی جگہ
▪ ریاض میں پہلے رجسٹر ہونے والوں کو پہلی درخواستیں ملیں گی

*سب سے آسان: «ہاں» لکھ کر جواب دیں، ہم دو منٹ میں رجسٹر کر دیں گے۔*

یا تفصیلات دیکھیں اور خود رجسٹر کریں:
{invite}{apps}

ٹیم تسعیرک`,
};

// Language already known: greeting + the same details, in one message.
const greet = {
  ar: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة لفريق *{shop}*.\nيسعدنا دعوتكم للانضمام إلى *تسعيرك*، المنصة السعودية التي تصل فيها طلبات تسعير مواد البناء من المقاولين مباشرة إلى الموردين المتخصصين.',
  en: 'Assalamu alaikum, warm greetings to the *{shop}* team.\nWe are pleased to invite you to join *Taseerak*, the Saudi platform where contractors send construction price requests directly to specialised suppliers.',
  ur: 'السلام علیکم، *{shop}* کی ٹیم کو خوش آمدید۔\nہم آپ کو *تسعیرک* میں شامل ہونے کی دعوت دیتے ہیں، یہ ایک سعودی پلیٹ فارم ہے جہاں ٹھیکیدار تعمیراتی سامان کی قیمت کی درخواستیں براہِ راست سپلائرز کو بھیجتے ہیں۔',
};
const direct = Object.fromEntries(Object.keys(reply).map(l => [l, `${greet[l]}\n\n${reply[l].split('\n').slice(2).join('\n')}`]));

// One gentle follow-up after 3 days with no answer to the opener. Never a second one.
const followUp = `السلام عليكم، نذكّركم بدعوة *تسعيرك*: طلبات تسعير مواد البناء تصل إلى جوالكم مجانًا.
للتسجيل أو لأي سؤال ردّوا بكلمة «نعم».

${ESCAPE}`;

const followUpManual = `السلام عليكم، نذكّركم بدعوة *تسعيرك*: طلبات تسعير مواد البناء تصل إلى جوالكم مجانًا.
التسجيل في دقيقتين: {register}

English · اردو: {inviteAny}`;

const APPS = {
  ar: `\nأندرويد: ${links.android}\nآيفون: ${links.ios}`,
  en: `\nAndroid: ${links.android}\niPhone: ${links.ios}`,
  ur: `\nاینڈرائیڈ: ${links.android}\nآئی فون: ${links.ios}`,
};

function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

// Variables for one message: the invite page opens in the chosen language; store links only once both listings are live.
function varsFor(lang, shop) {
  return { shop, invite: inviteUrl(lang), register: `${base}/register?role=supplier`, inviteAny: inviteUrl(), apps: links.apps_live && APPS[lang] ? APPS[lang] : '' };
}

module.exports = { opener: links.bot_live ? opener : openerManual, reply, direct, followUp: links.bot_live ? followUp : followUpManual, fill, varsFor };
