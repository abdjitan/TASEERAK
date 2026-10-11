// Builds the invitation workbook from discover-city.mjs output: one-click WhatsApp links
// with the brief's message pre-filled, emails found on shop websites, and landlines to call.
// Suppliers only (contractors / unreviewed noise are left out).
//   node scripts/build-invite-list.mjs --rows <riyadh-rows.json> --emails <emails.json> --out <file.xlsx>
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const jiti = require('jiti')(ROOT + '/scripts/x.js', { alias: { '@': ROOT + '/src' } })
const D = jiti(ROOT + '/src/lib/discovery.ts')
const XLSX = require('xlsx')

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d }
const rows = JSON.parse(fs.readFileSync(arg('rows'), 'utf8'))
const emails = arg('emails') && fs.existsSync(arg('emails')) ? JSON.parse(fs.readFileSync(arg('emails'), 'utf8')) : {}
const OUT = arg('out')
const ORIGIN = 'https://taseerak.vercel.app'

const sup = rows.filter(r => r.relevance === 'supplier')
  .sort((a, b) => D.packLabel(a.pack).localeCompare(D.packLabel(b.pack), 'ar') || (b.google_reviews || 0) - (a.google_reviews || 0))

const EMAIL_SUBJECT = 'دعوة للانضمام إلى تسعيرك: طلبات أسعار مواد بناء من الرياض'

function base(r) {
  return {
    'الاسم': r.name, 'النوع': D.packLabel(r.pack), 'بيبيع (حسب البحث)': (r.found_by || []).slice(0, 6).join('، '),
    'الحي': r.district || '', 'التقييم': r.google_rating ?? '', 'المراجعات': r.google_reviews ?? '',
  }
}
const withLinks = (data, linkCols) => {
  const ws = XLSX.utils.json_to_sheet(data.map(d => d.row))
  const headers = Object.keys(data[0]?.row || {})
  data.forEach((d, i) => {
    for (const [col, url] of Object.entries(d.links)) {
      const c = headers.indexOf(col); if (c < 0 || !url) continue
      const ref = XLSX.utils.encode_cell({ r: i + 1, c })
      ws[ref].l = { Target: url }
    }
  })
  ws['!views'] = [{ RTL: true }]
  return ws
}

const wa = sup.filter(r => r.is_mobile).map(r => {
  const link = D.waLink(r.phone_norm, D.inviteText('الرياض', r.pack, ORIGIN))
  return {
    row: { ...base(r), 'الجوال': '0' + r.phone_norm, 'واتساب (اضغط)': 'افتح واتساب', 'الإيميل': (emails[r.website] || [])[0] || '', 'تم الإرسال؟': '', 'ملاحظات': '', 'الخريطة': r.maps_url ? 'الخريطة' : '' },
    links: { 'واتساب (اضغط)': link, 'الخريطة': r.maps_url },
  }
})
const em = sup.filter(r => (emails[r.website] || []).length).map(r => {
  const to = emails[r.website][0]
  const body = D.inviteText('الرياض', r.pack, ORIGIN).replace('وإذا ما بدك رسائل منا، ردّ بكلمة "إيقاف".', 'وإذا ما بدك رسائل منا، ردّ على هالإيميل بكلمة "إيقاف".')
  return {
    row: { ...base(r), 'الإيميل': to, 'إيميل تاني': emails[r.website][1] || '', 'أرسل (اضغط)': 'افتح الإيميل', 'الجوال': r.phone_norm ? '0' + r.phone_norm : '', 'الموقع': r.website, 'تم الإرسال؟': '' },
    links: { 'أرسل (اضغط)': `mailto:${to}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`, 'الموقع': r.website },
  }
})
// Unsure shops (generic Google type, found by one trade search): mobile only, for a quick look.
const rev = rows.filter(r => r.relevance === 'review' && r.is_mobile)
  .sort((a, b) => D.packLabel(a.pack).localeCompare(D.packLabel(b.pack), 'ar') || (b.google_reviews || 0) - (a.google_reviews || 0))
  .map(r => ({
    row: { ...base(r), 'نوع Google': r.google_type || '', 'الجوال': '0' + r.phone_norm, 'واتساب (اضغط)': 'افتح واتساب', 'مورد؟ (نعم/لا)': '', 'تم الإرسال؟': '', 'الخريطة': r.maps_url ? 'الخريطة' : '' },
    links: { 'واتساب (اضغط)': D.waLink(r.phone_norm, D.inviteText('الرياض', r.pack, ORIGIN)), 'الخريطة': r.maps_url },
  }))
const land = sup.filter(r => !r.is_mobile && r.phone_norm).map(r => ({
  row: { ...base(r), 'الهاتف': '0' + r.phone_norm, 'الإيميل': (emails[r.website] || [])[0] || '', 'الموقع': r.website || '', 'تم الاتصال؟': '', 'ملاحظات': '' },
  links: { 'الموقع': r.website },
}))

const count = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {})
const byPack = Object.entries(count(sup, r => D.packLabel(r.pack))).sort((a, b) => b[1] - a[1])
  .map(([p, n]) => [p, n, sup.filter(r => D.packLabel(r.pack) === p && r.is_mobile).length, sup.filter(r => D.packLabel(r.pack) === p && (emails[r.website] || []).length).length])

const wb = XLSX.utils.book_new()
const summary = XLSX.utils.aoa_to_sheet([
  ['قائمة دعوات موردين الرياض', ''],
  ['موردين', sup.length], ['عندهم واتساب (جوال)', wa.length], ['عندهم إيميل', em.length], ['رقم أرضي بس (اتصال)', land.length], ['محلات غير مؤكدة عندها جوال (ورقة بحاجة نظرة)', rev.length],
  ['بدون أي وسيلة تواصل', sup.filter(r => !r.phone_norm && !(emails[r.website] || []).length).length], [],
  ['طريقة الإرسال', 'اضغط "افتح واتساب" بيفتح المحادثة والرسالة جاهزة، اضغط إرسال، وبعدين حط ✓ بعمود "تم الإرسال؟".'],
  ['تنبيه', 'ابعت من رقم غير رقم رموز التسجيل، وبشكل فردي وعلى دفعات صغيرة (مثلاً 30–50 باليوم) لتجنّب حظر واتساب. اللي بيرد "إيقاف" لا تراسله مرة تانية.'],
  [],
  ['النوع', 'موردين', 'واتساب', 'إيميل'], ...byPack,
])
summary['!views'] = [{ RTL: true }]
XLSX.utils.book_append_sheet(wb, summary, 'الملخص')
if (wa.length) XLSX.utils.book_append_sheet(wb, withLinks(wa), 'واتساب')
if (em.length) XLSX.utils.book_append_sheet(wb, withLinks(em), 'إيميل')
if (rev.length) XLSX.utils.book_append_sheet(wb, withLinks(rev), 'واتساب - بحاجة نظرة')
if (land.length) XLSX.utils.book_append_sheet(wb, withLinks(land), 'اتصال (أرضي)')
wb.Workbook = { Views: [{ RTL: true }] }
XLSX.writeFile(wb, OUT)
console.log('review', rev.length, 'suppliers', sup.length, 'whatsapp', wa.length, 'email', em.length, 'landline', land.length, '→', OUT)
