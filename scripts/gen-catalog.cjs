// =============================================================
// gen-catalog.cjs — يولّد ملف مراجعة شامل لكل مواد الكتالوج
// يقرأ البيانات الحقيقية من src/types/index.ts (بدون نسخ يدوي)
// المخرجات: docs/CATALOG_REVIEW.md (للعرض على ذكاء آخر) + docs/catalog.json
// التشغيل: node scripts/gen-catalog.cjs
// =============================================================
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const tmp = path.join(root, '.catalog-tmp')
fs.mkdirSync(tmp, { recursive: true })

function transpile(srcRel, outName) {
  let src = fs.readFileSync(path.join(root, srcRel), 'utf8')
  src = src.replace(/@\/lib\/normalize/g, './normalize') // إصلاح مسار الـ alias
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
  fs.writeFileSync(path.join(tmp, outName), js, 'utf8')
}
transpile('src/lib/normalize.ts', 'normalize.js')
transpile('src/types/index.ts', 'index.js')

const C = require(path.join(tmp, 'index.js'))

const {
  SECTOR_PRODUCTS, SECTOR_LABELS, GROUP_LABELS, SUB_CATEGORIES,
  PRODUCT_SPECS, getDefaultUnit, getProductSpecs, detectSubCategory, getGroupedProducts,
} = C

const sectors = Object.keys(SECTOR_PRODUCTS)
let totalProducts = 0, totalDetailed = 0, totalGeneric = 0

// ---- JSON الكامل (للقراءة الآلية) ----
const jsonOut = { generatedAt: new Date().toISOString(), sectors: {} }

// ---- Markdown ----
const md = []
md.push('# 📦 مراجعة كتالوج المواد — تسعيرك (Taseerak)')
md.push('')
md.push('> ملف مُولّد آلياً من بيانات المنصّة الحقيقية. الهدف عرضه على نموذج ذكاء اصطناعي آخر للمراجعة.')
md.push('')
md.push('## 🎯 المطلوب من المُراجِع (الذكاء الآخر)')
md.push('')
md.push('لكل قطاع ومجموعة أدناه قائمة المواد الحالية. نريد منك أمرين:')
md.push('')
md.push('1. **مواد ناقصة:** اقترح مواد بناء شائعة في السوق السعودي غير موجودة في القائمة (ضمن نفس المجموعة).')
md.push('2. **تخصيص الكميات:** كثير من المواد ما زالت "عامة" (نص حر فقط ⚠️). نريد لكل مادة عامة **حقول مواصفات منظّمة** (مثل الحديد) حتى يصبح طلب الكمية دقيقاً: النوع/المقاس/الدرجة/الشركة/وحدة الطلب… بقيم جاهزة للاختيار.')
md.push('')
md.push('### 🥇 القالب الذهبي (هكذا نريد بقية المواد) — مثال «حديد تسليح»:')
md.push('')
md.push('```ts')
md.push("'حديد تسليح': [")
for (const f of (PRODUCT_SPECS['حديد تسليح'] || [])) {
  md.push(`  { key: '${f.key}', ar: '${f.ar}', en: '${f.en}', options: [${f.options.map(o => `'${o}'`).join(', ')}] },`)
}
md.push('],')
md.push('```')
md.push('')
md.push('> أعد كل اقتراح بنفس هذا الشكل (key/ar/en/options) جاهزاً للّصق. اجعل **آخر حقل دائماً `unit` (وحدة الطلب)**، وأضِف خيار «أي علامة معتمدة» في حقل العلامة التجارية إن وُجد.')
md.push('')
md.push('---')
md.push('')

for (const sector of sectors) {
  const products = SECTOR_PRODUCTS[sector] || []
  const label = (SECTOR_LABELS[sector] || sector)
  jsonOut.sectors[sector] = { label, groups: {} }

  md.push(`## 🏷️ القطاع: ${label} \`(${sector})\` — ${products.length} مادة`)
  md.push('')

  // جمّع المنتجات حسب المجموعة المنطقية
  const grouped = (typeof getGroupedProducts === 'function')
    ? getGroupedProducts(sector)
    : [{ group: '_all', ar: 'الكل', items: products }]

  for (const g of grouped) {
    const gLabel = g.ar || (GROUP_LABELS[g.group] && GROUP_LABELS[g.group].ar) || g.group
    md.push(`### ${g.icon || '📂'} ${gLabel}`)
    md.push('')
    md.push('| المادة | التخصص الفرعي | الوحدة | الحالة | الحقول التفصيلية الحالية |')
    md.push('|---|---|---|---|---|')

    const groupJson = []
    for (const p of g.items) {
      totalProducts++
      const specs = (typeof getProductSpecs === 'function') ? getProductSpecs(p) : (PRODUCT_SPECS[p] || [])
      const hasSpecs = specs && specs.length > 0
      if (hasSpecs) totalDetailed++; else totalGeneric++

      let subLabel = ''
      try {
        const subKey = (typeof detectSubCategory === 'function') ? detectSubCategory(p, sector) : ''
        subLabel = (subKey && SUB_CATEGORIES[sector] && SUB_CATEGORIES[sector][subKey]) ? SUB_CATEGORIES[sector][subKey].ar : ''
      } catch (e) { subLabel = '' }

      const unit = (typeof getDefaultUnit === 'function') ? getDefaultUnit(p, sector) : ''
      const status = hasSpecs ? '✅ مخصّص' : '⚠️ عام'
      const fields = hasSpecs ? specs.map(f => f.ar).join('، ') : '— (نص حر فقط)'

      md.push(`| ${p} | ${subLabel || '—'} | ${unit || '—'} | ${status} | ${fields} |`)
      groupJson.push({ name: p, sub: subLabel, unit, detailed: hasSpecs, fields: specs || [] })
    }
    md.push('')
    jsonOut.sectors[sector].groups[g.group] = { label: gLabel, items: groupJson }
  }
  md.push('---')
  md.push('')
}

// ---- ملخّص ----
md.splice(/* after intro */ 0, 0) // no-op keep order
const summary = [
  '## 📊 ملخّص',
  '',
  `- **إجمالي المواد:** ${totalProducts}`,
  `- ✅ **مواد مخصّصة (لها حقول):** ${totalDetailed}`,
  `- ⚠️ **مواد عامة (نص حر فقط — تحتاج تخصيص):** ${totalGeneric}`,
  '',
  '> الأولوية: حوّل المواد ذات العلامة ⚠️ إلى ✅ بإضافة حقول مواصفات لها.',
  '',
  '---',
  '',
]
// أدرج الملخّص بعد العنوان الرئيسي مباشرة (بعد أول 2 سطر)
md.splice(2, 0, ...summary)

fs.writeFileSync(path.join(root, 'docs', 'CATALOG_REVIEW.md'), md.join('\n'), 'utf8')
fs.writeFileSync(path.join(root, 'docs', 'catalog.json'), JSON.stringify(jsonOut, null, 2), 'utf8')

// ── ملفات منفصلة لكل قطاع (لتسليمها لذكاء آخر قطاعاً قطاعاً) ──
const perSectorDir = path.join(root, 'docs', 'catalog')
fs.mkdirSync(perSectorDir, { recursive: true })
for (const sector of Object.keys(jsonOut.sectors)) {
  const sec = jsonOut.sectors[sector]
  let nGen = 0, nDet = 0
  for (const gk of Object.keys(sec.groups)) for (const it of sec.groups[gk].items) (it.detailed ? nDet++ : nGen++)
  const out = []
  out.push(`# كتالوج تسعيرك — قطاع: ${sec.label}`)
  out.push('')
  out.push(`> ملف المواد الفعلي لهذا القطاع في منصّتي (تسعيرك — تسعير وتوريد للمقاولين بالسعودية).`)
  out.push(`> العدد: ${nDet + nGen} مادة — ✅ مخصّصة: ${nDet} · ⚠️ عامة: ${nGen}`)
  out.push('')
  out.push('## المطلوب منك')
  out.push('1. **لا تقترح** مواد عليها ✅ (لها مواصفات أصلاً) ولا تكرّر مادة مذكورة هنا.')
  out.push('2. لكل مادة ⚠️ «عام» اكتب حقول مواصفات جاهزة بصيغة الكود (آخر حقل دائماً `unit`).')
  out.push('3. اقترح فقط المواد **الناقصة تماماً** غير المذكورة في هذه القائمة.')
  out.push('')
  out.push('صيغة الإخراج لكل مادة (استخدم الاسم **حرفياً** كما هو هنا):')
  out.push('```ts')
  out.push("'اسم المادة كما هو': [")
  out.push("  { key: 'type', ar: 'النوع', en: 'Type', options: ['...','...'] },")
  out.push("  { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['...'] },")
  out.push('],')
  out.push('```')
  out.push('')
  out.push('---')
  out.push('')
  for (const gk of Object.keys(sec.groups)) {
    const g = sec.groups[gk]
    out.push(`## ${g.label}`)
    for (const it of g.items) {
      const mark = it.detailed ? '✅' : '⚠️'
      const extra = it.detailed ? ` — حقول: ${it.fields.map(f => f.ar).join('، ')}` : ''
      out.push(`- ${mark} \`${it.name}\` (وحدة: ${it.unit || '—'})${extra}`)
    }
    out.push('')
  }
  fs.writeFileSync(path.join(perSectorDir, `${sector}.md`), out.join('\n'), 'utf8')
}

// نظافة
fs.rmSync(tmp, { recursive: true, force: true })

console.log(`✓ تم التوليد: ${totalProducts} مادة (${totalDetailed} مخصّصة / ${totalGeneric} عامة)`)
console.log('  docs/CATALOG_REVIEW.md')
console.log('  docs/catalog.json')
console.log(`  docs/catalog/<sector>.md  (${Object.keys(jsonOut.sectors).length} ملفات قطاع)`)
