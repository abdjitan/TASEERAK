// تنميط آمن للوسائط ضمنية النوع (any) في الأنماط الشائعة فقط — لا تلمس وسائط مُنمَّطة (فيها ":")
const fs = require('fs')
const ARR = 'map|filter|forEach|find|some|every|findIndex|flatMap'
for (const f of process.argv.slice(2)) {
  let c = fs.readFileSync(f, 'utf8')
  const before = c
  // .method((a, b) => عناصر مصفوفة بمعاملين
  c = c.replace(new RegExp('\\.(' + ARR + '|sort|reduce)\\(\\((\\w+),\\s*(\\w+)\\)\\s*=>', 'g'), '.$1(($2: any, $3: any) =>')
  // .method((a) =>
  c = c.replace(new RegExp('\\.(' + ARR + '|sort|reduce)\\(\\((\\w+)\\)\\s*=>', 'g'), '.$1(($2: any) =>')
  // .method(a =>  (بدون أقواس، معامل واحد)
  c = c.replace(new RegExp('\\.(' + ARR + ')\\((\\w+)\\s*=>', 'g'), '.$1(($2: any) =>')
  // معالجات أحداث: onX={e =>
  c = c.replace(/\b(on[A-Z]\w+)=\{(\w+)\s*=>/g, '$1={($2: any) =>')
  // تعريفات دوال بمعامل/معاملين عاريين
  c = c.replace(/\b(async\s+)?function\s+(\w+)\((\w+)\)\s*\{/g, '$1function $2($3: any) {')
  c = c.replace(/\b(async\s+)?function\s+(\w+)\((\w+),\s*(\w+)\)\s*\{/g, '$1function $2($3: any, $4: any) {')
  if (c !== before) { fs.writeFileSync(f, c, 'utf8'); console.log('fixed', f) }
  else console.log('nochange', f)
}
