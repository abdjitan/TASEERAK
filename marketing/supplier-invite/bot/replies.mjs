// Auto-reply brain for supplier invitations on WhatsApp. Pure function, no I/O: the webhook
// (Supabase edge function, Deno) loads the chat state, calls decide(), and then either sends the
// fixed replies it returns or, when `ai` is true, asks Claude through bot/ai.mjs. Nobody on the
// team answers chats by hand: every message gets a reply from here or from the AI.
//
// decide(text, state, texts) -> { replies: [{ text, image? }], nextState, ai: bool }
//   text   : the shop's message (string; media-only messages arrive as '')
//   state  : { lang: 'ar'|'en'|'ur', stage: 'invited'|'interested'|'declined' }
//   texts  : bot/texts.json (built from messages.js by build-bot-texts.js)
//
// Fixed (free, instant) answers: the language choice and a plain «yes». Everything else goes to
// the AI, which answers in the chat's language from the facts in bot/ai.mjs.

const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[٠-٩۰-۹]/g, d => AR_DIGITS[d])
    .replace(/[ً-ْٰـ]/g, '') // diacritics, tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ک/g, 'ك').replace(/ی/g, 'ي').replace(/ہ/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (t, words) => words.some(w => new RegExp(`(^|\\s)${w}(\\s|$)`).test(t));

const YES = ['نعم', 'ايوه', 'ايوا', 'اي', 'اكيد', 'تمام', 'موافق', 'ابغى', 'ابي', 'سجلني', 'yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'interested', 'ہاں', 'ہان', 'جی', 'جی ہاں', 'ٹھیک', 'ٹھیک ہے', 'theek'].map(normalize);
const LANG = Object.fromEntries(Object.entries({ '1': 'ar', '2': 'en', '3': 'ur', 'عربي': 'ar', 'arabic': 'ar', 'english': 'en', 'انجليزي': 'en', 'urdu': 'ur', 'اردو': 'ur', 'اوردو': 'ur' }).map(([k, v]) => [normalize(k), v]));

// opts.ai: true when the AI is switched on (ANTHROPIC_API_KEY set). Then «yes» also goes to the
// AI so the welcome reads like a person; the fixed «yes» text is the fallback when it is off.
export function decide(text, state = {}, texts, opts = {}) {
  const st = { lang: 'ar', stage: 'invited', ...state };
  const t = normalize(text);
  const L = st.lang;
  const fixed = (replies, patch = {}) => ({ replies, nextState: { ...st, ...patch }, ai: false });

  // The owner typed in this chat himself: the bot stays out of the conversation.
  if (st.stage === 'paused') return fixed([]);

  // Voice notes, images, stickers: the AI cannot hear or see them here, so ask for text.
  if (!t) return fixed([{ text: texts.textPlease[L] }]);

  if (Object.prototype.hasOwnProperty.call(LANG, t)) {
    const lang = LANG[t];
    return fixed([{ text: texts.details[lang], image: texts.poster[lang] }], { lang });
  }

  // A plain «yes» in a short message that is not a question («اي شي عن العمولة؟» is a question).
  const short = t.split(' ').length <= 4 && !/[?؟]/.test(String(text));
  if (short && has(t, YES)) {
    if (opts.ai) return { replies: [], nextState: { ...st, stage: 'interested' }, ai: true };
    return fixed([{ text: texts.yes[L] }], { stage: 'interested' });
  }

  return { replies: [], nextState: st, ai: true };
}
