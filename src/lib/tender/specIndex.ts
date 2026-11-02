// Specification book index (rules only): headings → sections with page ranges, and a finder
// that returns the section(s) for a code («DRS-254»), a spec number («08 11 13», «L20») or a
// material («epoxy resin flooring»), each with short quotes and page numbers.
// Works on the extracted lines of each page (see pdfExtract: specs keep lines, not positions).
import type { PdfPageText, SpecIndex, SpecSection, SpecHit } from './types'

// «SECTION 08 11 13 - HOLLOW METAL DOORS AND FRAMES», «08 11 13  HOLLOW METAL…», «Section 230719»
const CSI_RE = /^(?:section\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*(?:[-–—:.]\s*)?([A-Z][A-Za-z0-9 ,&/()'’-]{3,100})$/i
// NBS: «L20 Doors, shutters and hatches», «M60 Painting/clear finishing»
const NBS_RE = /^([A-Z]\d{2})\s+(?:[-–]\s*)?([A-Z][A-Za-z ,&/()'’-]{3,80})$/
// «PART 2 - PRODUCTS»
const PART_RE = /^part\s+(\d)\s*[-–—:.]?\s*([A-Z][A-Z ]{3,40})$/i
// «2.3 MANUFACTURERS», «2.3. Hollow metal doors»
const NUM_RE = /^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+([A-Z][A-Za-z0-9 ,&/()'’-]{2,80})$/
// page furniture repeated on every page
const FURNITURE_RE = /^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\/\s*\d+|end of section.*)$/i

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ\s-]/g, ' ').replace(/\s+/g, ' ').trim()
const csiId = (s: string) => { const d = s.replace(/\D/g, ''); return d.length >= 6 ? `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)}${d.length > 6 ? '.' + d.slice(6) : ''}` : s }

export function buildSpecIndex(file: string, pages: PdfPageText[]): SpecIndex {
  const sections: SpecSection[] = []
  let top: SpecSection | null = null
  const lastPage = pages.length ? pages[pages.length - 1].n : 0
  // a heading repeated as a running header on every page is the same section, not a new one
  const seenTop = new Map<string, SpecSection>()
  for (const p of pages) {
    const lines = p.lines || []
    lines.forEach((raw, li) => {
      const line = raw.replace(/\s+/g, ' ').trim()
      if (!line || line.length > 130 || FURNITURE_RE.test(line)) return
      let m = line.match(CSI_RE)
      if (m && (/^section/i.test(line) || li < 6)) {
        const id = csiId(m[1])
        const prev = seenTop.get(id)
        if (prev) { prev.page_to = Math.max(prev.page_to, p.n); top = prev; return }
        if (top) top.page_to = Math.max(top.page_from, p.n - (li < 3 ? 1 : 0))
        top = { id, title: m[2].trim(), level: 0, page_from: p.n, page_to: lastPage, line: li }
        seenTop.set(id, top); sections.push(top)
        return
      }
      m = line.match(NBS_RE)
      if (m && li < 8 && !/^[A-Z]\d{2}\s+(?:mm|kg|no)\b/i.test(line)) {
        const id = m[1]
        const prev = seenTop.get(id)
        if (prev) { prev.page_to = Math.max(prev.page_to, p.n); top = prev; return }
        if (top) top.page_to = Math.max(top.page_from, p.n - (li < 3 ? 1 : 0))
        top = { id, title: m[2].trim(), level: 0, page_from: p.n, page_to: lastPage, line: li }
        seenTop.set(id, top); sections.push(top)
        return
      }
      m = line.match(PART_RE)
      if (m) { sections.push({ id: `${top ? top.id + ' ' : ''}PART ${m[1]}`, title: m[2].trim(), level: 1, page_from: p.n, page_to: p.n, line: li, parent: top?.id }); return }
      m = line.match(NUM_RE)
      if (m && m[2] === m[2].toUpperCase()) {
        sections.push({ id: `${top ? top.id + ' ' : ''}${m[1]}`, title: m[2].trim(), level: 2, page_from: p.n, page_to: p.n, line: li, parent: top?.id })
      }
    })
  }
  // sub-headings end where the next heading of the same parent starts
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    if (s.level === 0) continue
    const next = sections.slice(i + 1).find(o => o.level <= s.level || o.parent !== s.parent)
    const parent = sections.find(o => o.level === 0 && o.id === s.parent)
    s.page_to = next ? Math.max(s.page_from, next.page_from) : (parent?.page_to ?? s.page_from)
  }
  return { file, pages: pages.length, sections }
}

const STOP = new Set('the and for with all any shall be to of in on at as by or from this that are is a an per including include includes accordance drawings specifications specification employer requirements details detail system systems type mm no nr item series'.split(' '))
const termsOf = (s: string) => norm(s).split(' ').filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)).map(w => w.slice(0, 7))
// the words of each page's lines, computed once per page (a tender asks for hundreds of items)
const pageTerms = new WeakMap<PdfPageText, Set<string>[]>()
function termsOfPage(p: PdfPageText): Set<string>[] {
  let t = pageTerms.get(p)
  if (!t) { t = (p.lines || []).map(l => new Set(termsOf(l))); pageTerms.set(p, t) }
  return t
}

/** Sections for a code, a spec number or a material, best first, with quotes from the pages. */
export function findSpec(index: SpecIndex, pages: PdfPageText[], query: string, limit = 3): SpecHit[] {
  const q = (query || '').trim()
  if (!q || !index.sections.length) return []
  const pageOf = new Map(pages.map(p => [p.n, p]))
  const tops = index.sections.filter(s => s.level === 0)
  const sectionAt = (page: number) => tops.filter(s => s.page_from <= page && s.page_to >= page).sort((a, b) => b.page_from - a.page_from)[0] || null
  const hits = new Map<string, SpecHit & { qs: number[] }>()
  const add = (sec: SpecSection, score: number, page: number, text: string) => {
    const h = hits.get(sec.id) || { section: sec, score: 0, quotes: [], qs: [] as number[] }
    h.score += score
    if (text && !h.quotes.some(x => x.text === text.slice(0, 300))) {
      // keep the 3 strongest quotes, strongest first
      const at = h.qs.findIndex(s => s < score)
      const i = at < 0 ? h.quotes.length : at
      h.quotes.splice(i, 0, { page, text: text.slice(0, 300) }); h.qs.splice(i, 0, score)
      h.quotes = h.quotes.slice(0, 3); h.qs = h.qs.slice(0, 3)
    }
    hits.set(sec.id, h)
  }
  // 1) a section number
  const num = q.match(/^\s*(\d{2}\s?\d{2}\s?\d{1,2}(?:\.\d{2})?)\s*$/) || q.match(/^\s*([A-Z]\d{2})\s*$/)
  if (num) {
    const id = /^\d/.test(num[1]) ? csiId(num[1].padEnd(6, '0')) : num[1]
    for (const s of tops.filter(t => t.id === id || t.id.startsWith(id))) add(s, 100, s.page_from, `${s.id} ${s.title}`)
  }
  // 2) a code: every line that names it (and its series «DRS-200»)
  const code = q.match(/^([A-Z]{2,4})-(\d)(\d{2})(?:-T\d{1,2})?$/)
  if (code) {
    const exact = new RegExp(`\\b${q.replace(/[-]/g, '\\-')}\\b`)
    const base = new RegExp(`\\b${code[1]}-${code[2]}${code[3]}\\b`)
    const series = new RegExp(`\\b${code[1]}-${code[2]}00\\b`)
    for (const p of pages) for (const line of p.lines || []) {
      const sc = exact.test(line) ? 10 : base.test(line) ? 6 : series.test(line) ? 3 : 0
      if (!sc) continue
      const sec = sectionAt(p.n)
      if (sec) add(sec, sc, p.n, line)
    }
  }
  // 3) words: section titles weigh most, then the body text
  if (!num && (!code || hits.size === 0)) {
    const terms = Array.from(new Set(termsOf(q)))
    if (terms.length) {
      for (const s of tops) {
        const t = termsOf(s.title)
        const m = terms.filter(w => t.includes(w)).length
        if (m) add(s, m * 8, s.page_from, `${s.id} ${s.title}`)
      }
      for (const s of tops) {
        let best = { n: 0, page: 0, text: '' }
        let total = 0
        for (let n = s.page_from; n <= Math.min(s.page_to, s.page_from + 40); n++) {
          const pg = pageOf.get(n)
          if (!pg) continue
          const lts = termsOfPage(pg)
          lts.forEach((lt, li) => {
            let m = 0
            for (const w of terms) if (lt.has(w)) m++
            total += m
            if (m > best.n) best = { n: m, page: n, text: (pg.lines || [])[li] || '' }
          })
        }
        if (best.n >= Math.min(2, terms.length)) add(s, Math.min(20, total) + best.n * 2, best.page, best.text)
      }
    }
  }
  return Array.from(hits.values()).sort((a, b) => b.score - a.score).slice(0, limit).map(({ qs, ...h }) => h)
}
