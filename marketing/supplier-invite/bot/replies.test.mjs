// Scenario tests for the fixed (non-AI) part of the bot. No API calls, no cost.
// Run: node marketing/supplier-invite/bot/replies.test.mjs
import { readFileSync } from 'node:fs';
import { decide } from './replies.mjs';

const texts = JSON.parse(readFileSync(new URL('./texts.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.log('FAIL', name); } };
const run = (msg, state) => decide(msg, state, texts);

// Language choice (Latin and Arabic-Indic digits, words).
let r = run('2');
check('2 -> English details + poster', !r.ai && r.nextState.lang === 'en' && r.replies[0].image.endsWith('poster-en.png') && r.replies[0].text.startsWith('Thank you'));
r = run('٣');
check('٣ -> Urdu', r.nextState.lang === 'ur' && r.replies[0].image.endsWith('poster-ur.png'));
r = run('English');
check('English word -> en', r.nextState.lang === 'en');

// Plain yes -> registration link, stage interested, no promise of a call.
for (const [m, lang] of [['نعم', 'ar'], ['ايوه تمام', 'ar'], ['yes please', 'en'], ['ہاں', 'ur'], ['جی ہاں', 'ur']]) {
  r = run(m, { lang });
  check(`yes: ${m}`, !r.ai && r.nextState.stage === 'interested' && r.replies[0].text.includes('/register?role=supplier'));
}
check('yes text promises no call', !/يتصل|يتواصل|call|رابطہ کرے/.test(texts.yes.ar + texts.yes.en + texts.yes.ur));
r = run('نعم', { lang: 'en' });
check('yes reply follows chat language', r.replies[0].text.startsWith('Welcome'));

r = decide('نعم', {}, texts, { ai: true });
check('yes with AI on -> AI, stage interested', r.ai === true && r.nextState.stage === 'interested' && r.replies.length === 0);

// Everything else goes to the AI.
for (const m of ['كم العمولة؟', 'اي شي عن العمولة؟', 'لا مو مهتم', 'عندي فرعين بالسلي والبطحاء، كيف أضيفهم؟', 'do I need a CR?']) {
  r = run(m);
  check(`to AI: ${m}`, r.ai === true && r.replies.length === 0);
}

// Media-only -> ask for text (the bot reads text only).
r = run('', { lang: 'ur' });
check('media-only -> text please (Urdu)', !r.ai && r.replies[0].text === texts.textPlease.ur);

// Owner typed in the chat himself -> silent, even for 2 / yes.
r = decide('2', { stage: 'paused' }, texts, { ai: true });
check('paused chat -> no reply, no AI', r.replies.length === 0 && r.ai === false && r.nextState.stage === 'paused');

// Old opt-out wording is gone from what the owner sends.
const msgs = readFileSync(new URL('../messages.js', import.meta.url), 'utf8');
check('follow-up no longer offers «not again»', !/لن نرسل مرة أخرى/.test(msgs));

console.log(`bot replies: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
