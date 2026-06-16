// إصلاحات آمنة لإزالة @ts-nocheck تحت strict:
//  1) useState/useRef غير المُنمَّطة → <any>
//  2) فهرسة قواميس التصنيف/الترجمة → (X as any)[  (آمنة، تُجرى مرة على ملف منزوع nocheck)
const fs = require('fs')
const DICTS = ['SECTOR_LABELS','SECTOR_ICONS','SECTOR_COLORS','SUB_CATEGORIES','GROUP_LABELS','SECTOR_PRODUCTS','UNIT_TRANSLATIONS','SUB_UNITS','PRODUCT_SPECS','sectorLabels']
for (const f of process.argv.slice(2)) {
  let c = fs.readFileSync(f, 'utf8')
  const before = c
  c = c.replace(/useState\(null\)/g, 'useState<any>(null)')
  c = c.replace(/useState\(\[\]\)/g, 'useState<any[]>([])')
  c = c.replace(/useState\(\{\}\)/g, 'useState<any>({})')
  c = c.replace(/useRef\(null\)/g, 'useRef<any>(null)')
  for (const d of DICTS) {
    // فقط إن لم تكن مُحاطة مسبقاً بـ as any
    const re = new RegExp('(?<!as any\\)\\s?)\\b' + d + '\\[', 'g')
    c = c.replace(re, '(' + d + ' as any)[')
  }
  if (c !== before) { fs.writeFileSync(f, c, 'utf8'); console.log('fixed', f) }
  else console.log('nochange', f)
}
