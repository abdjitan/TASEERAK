// Find the WORKING Wathq production path for "fullinfo" using YOUR key, and
// confirm real (unmasked) data comes back — before we flip the live site.
//
//   node scripts/test-wathq.mjs <realCR> [randomCR]
//
// Key is read (in order) from: env WATHQ_API_KEY, ./wathq-key.local,
// ./.env.local, ./scripts/wathq-key.local  — all git-ignored, never committed.
import fs from 'node:fs'
import path from 'node:path'

function readKey() {
  if (process.env.WATHQ_API_KEY) return process.env.WATHQ_API_KEY
  for (const f of ['wathq-key.local', '.env.local', path.join('scripts', 'wathq-key.local')]) {
    try {
      const t = fs.readFileSync(f, 'utf8')
      const m = t.match(/^\s*WATHQ_API_KEY\s*=\s*(.+?)\s*$/m)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
      if (f.includes('wathq-key') && t.trim() && !t.includes('=')) return t.trim()
    } catch {}
  }
  return ''
}
const KEY = readKey()
if (!KEY || /ضع_مفتاح/.test(KEY)) { console.log('NO_KEY — ضع مفتاح واثق في ملف scripts/wathq-key.local'); process.exit(1) }

const BASE = process.env.WATHQ_API_BASE || 'https://api.wathq.sa'
const realCR = process.argv[2] || '1010711252'
const randomCR = process.argv[3] || '5458454545'

// Masked sandbox names look like "شركة x xxxx مانxx" — lots of stray x/X.
function looksMasked(name) { return name ? (name.match(/[xX]/g) || []).length >= 3 : false }

// Candidate PRODUCTION paths for the new-legislation "fullinfo" operation.
const CANDIDATES = [
  '/commercial-registration/fullinfo/',
  '/commercialregistration/fullinfo/',
  '/v1/commercial-registration/fullinfo/',
  '/v5/commercialregistration/fullinfo/',
  '/commercial-registration/info/',
  '/v5/commercialregistration/info/',
]

async function call(p, cr) {
  const url = `${BASE}${p}${cr}?language=ar`
  try {
    const res = await fetch(url, { headers: { apiKey: KEY, Accept: 'application/json' }, cache: 'no-store' })
    let j = null; const txt = await res.text(); try { j = JSON.parse(txt) } catch {}
    return { status: res.status, name: j?.name ?? null, body: txt.slice(0, 160) }
  } catch (e) { return { status: 0, err: e.message } }
}

console.log('مفتاح محمّل ✓ (أول 4):', KEY.slice(0, 4) + '…', '| سجل حقيقي:', realCR)
let winner = null
for (const p of CANDIDATES) {
  const r = await call(p, realCR)
  const tag = r.status === 200 && r.name && !looksMasked(r.name) ? '✅ حقيقي'
    : r.status === 200 && looksMasked(r.name) ? '⚠️ مقنّع (تجريبي)'
    : r.status === 200 ? '200'
    : r.status === 404 ? '404 (المسار غلط أو لا يوجد سجل)'
    : r.status === 401 || r.status === 403 ? '🔒 ' + r.status + ' غير مخوّل'
    : String(r.status)
  console.log(`\n${p}\n   →`, tag, '|', r.name ?? r.body ?? r.err ?? '')
  if (r.status === 200 && r.name && !looksMasked(r.name) && !winner) winner = p
}

if (winner) {
  console.log('\n========================================')
  console.log('✅ مسار الإنتاج الشغّال:', winner)
  const rnd = await call(winner, randomCR)
  console.log('   رقم عشوائي (' + randomCR + ') →', rnd.status, rnd.status === 404 ? '✅ صحيح: لا يوجد سجل' : (rnd.name || ''))
  console.log('\nضع في Vercel:  WATHQ_CR_PATH = ' + winner)
} else {
  console.log('\n⚠️ ما لقيت مسار إنتاج يرجّع بيانات حقيقية — يحتاج نراجع تفعيل الباقة في واثق.')
}
