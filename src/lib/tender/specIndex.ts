// Specification book index (rules only): headings → sections with page ranges, and a finder
// that returns the section(s) for a code («DRS-254»), a spec number («08 11 13», «L20») or a
// material («epoxy resin flooring»), each with short quotes and page numbers.
// Works on the extracted lines of each page (see pdfExtract: specs keep lines, not positions).
import type { PdfPageText, SpecIndex, SpecSection, SpecHit } from './types'

// «SECTION 08 11 13 - HOLLOW METAL DOORS AND FRAMES», «08 11 13  HOLLOW METAL…», «Section 230719»
// «SECTION 034883 -- PRECAST CONCRETE DUCTS AND CHAMBERS 1» (double dash, page number after the title)
const CSI_RE = /^(?:section\s+)?(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)\s*(?:[-–—:.]+\s*)?([A-Z][A-Za-z0-9 ,&/()'’-]{3,100}?)(?:\s+\d{1,4})?$/i
// NBS: «L20 Doors, shutters and hatches», «M60 Painting/clear finishing»
const NBS_RE = /^([A-Z]\d{2})\s+(?:[-–]\s*)?([A-Z][A-Za-z ,&/()'’-]{3,80})$/
// «PART 2 - PRODUCTS»
const PART_RE = /^part\s+(\d)\s*[-–—:.]?\s*([A-Z][A-Z ]{3,40})$/i
// «2.3 MANUFACTURERS», «2.3. Hollow metal doors»
const NUM_RE = /^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+([A-Z][A-Za-z0-9 ,&/()'’-]{2,80})$/
// page furniture repeated on every page
const FURNITURE_RE = /^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\/\s*\d+|end of section.*)$/i

// code coordination matrix (CCM) row: «005 FL-303 Resin Floor Finish - Epoxy  096723 AFD»
const CCM_RE = /\b([A-Z]{2,4}-\d{3}(?:-T\d{1,2})?)\s+(.{3,90}?)\s+(\d{6})\s+(?:AFD|CEP|ADSI|SFD)\b/

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ\s-]/g, ' ').replace(/\s+/g, ' ').trim()
const csiId = (s: string) => { const d = s.replace(/\D/g, ''); return d.length >= 6 ? `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)}${d.length > 6 ? '.' + d.slice(6) : ''}` : s }

export function buildSpecIndex(file: string, pages: PdfPageText[]): SpecIndex {
  const sections: SpecSection[] = []
  let top: SpecSection | null = null
  const lastPage = pages.length ? pages[pages.length - 1].n : 0
  // a heading repeated as a running header on every page is the same section, not a new one
  const seenTop = new Map<string, SpecSection>()
  const codes: NonNullable<SpecIndex['codes']> = {}
  for (const p of pages) {
    const lines = p.lines || []
    // a contents page lists many sections (often with dot leaders): its lines are not headings
    const toc = lines.filter(l => CSI_RE.test(l.replace(/\s+/g, ' ').trim()) || /^\d{2}\s?\d{2}\s?\d{2}\b.*(?:\.{4,}|\s\d{1,4})$/.test(l.trim())).length >= 4
    lines.forEach((raw, li) => {
      const line = raw.replace(/\s+/g, ' ').trim()
      const cm = line.match(CCM_RE)
      if (cm && !codes[cm[1]]) codes[cm[1]] = { csi: csiId(cm[3]), title: cm[2].trim(), page: p.n }
      if (toc) return
      if (!line || line.length > 130 || FURNITURE_RE.test(line)) return
      let m = line.match(CSI_RE)
      // «SECTION 21 05 00» alone, the title on the next line
      const bare = !m && line.match(/^section\s+(\d{2}\s?\d{2}\s?\d{2}(?:\.\d{2})?)$/i)
      const nextLine = (lines[li + 1] || '').replace(/\s+/g, ' ').trim()
      if (bare && /^[A-Z][A-Z0-9 ,&/()'’-]{3,100}$/.test(nextLine)) m = [line, bare[1], nextLine] as unknown as RegExpMatchArray
      // a «Section 079200 - Joint sealants» reference inside the text is not a heading: below the
      // page top, only an upper-case title counts
      if (m && (li < 6 || (/^section/i.test(line) && m[2] === m[2].toUpperCase()))) {
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
  return { file, pages: pages.length, sections, ...(Object.keys(codes).length ? { codes } : {}) }
}

const STOP = new Set('the and for with all any shall be to of in on at as by or from this that are is a an per including include includes accordance drawings specifications specification employer requirements details detail system systems type mm no nr item series'.split(' '))
const termsOf = (s: string) => norm(s).split(' ').filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)).map(w => w.slice(0, 7))
// Postings built once per specification (a tender asks for hundreds of items against thousands of
// pages): word → lines, code → lines. Keyed on the pages array, so a new upload builds a new one.
type Posting = [page: number, line: number]
type SpecCache = { lines: Map<number, string[]>; words: Map<string, Posting[]>; codes: Map<string, Posting[]> }
const CODE_TOKEN_RE = /\b([A-Z]{2,4}-\d{3})(?:-T\d{1,2})?\b/g
const caches = new WeakMap<PdfPageText[], SpecCache>()
function cacheOf(pages: PdfPageText[]): SpecCache {
  let c = caches.get(pages)
  if (c) return c
  c = { lines: new Map(), words: new Map(), codes: new Map() }
  const push = (m: Map<string, Posting[]>, k: string, v: Posting) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]) }
  for (const p of pages) {
    const lines = p.lines || []
    c.lines.set(p.n, lines)
    lines.forEach((line, li) => {
      for (const w of new Set(termsOf(line))) push(c!.words, w, [p.n, li])
      const seen = new Set<string>()
      for (const m of line.matchAll(CODE_TOKEN_RE)) {
        // the full token («DRS-254-T13») and its base («b:DRS-254»), once per line
        for (const k of [m[0], 'b:' + m[1]]) if (!seen.has(k)) { seen.add(k); push(c!.codes, k, [p.n, li]) }
      }
    })
  }
  caches.set(pages, c)
  return c
}

/** Sections for a code, a spec number or a material, best first, with quotes from the pages. */
export function findSpec(index: SpecIndex, pages: PdfPageText[], query: string, limit = 3): SpecHit[] {
  const q = (query || '').trim()
  if (!q || !index.sections.length) return []
  const cache = cacheOf(pages)
  const lineAt = (page: number, li: number) => cache.lines.get(page)?.[li] || ''
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
  // 2) a code: every line that names it, then its base («DRS-254»), then its series («DRS-200»)
  const code = q.match(/^([A-Z]{2,4})-(\d)(\d{2})(?:-T\d{1,2})?$/)
  if (code) {
    const done = new Set<string>()
    const pass = (key: string, sc: number) => {
      for (const [pg, li] of cache.codes.get(key) || []) {
        const k = `${pg}:${li}`
        if (done.has(k)) continue
        done.add(k)
        const sec = sectionAt(pg)
        if (sec) add(sec, sc, pg, lineAt(pg, li))
      }
    }
    pass(q, 10)
    pass(`b:${code[1]}-${code[2]}${code[3]}`, 6)
    pass(`b:${code[1]}-${code[2]}00`, 3)
  }
  // 3) words: section titles weigh most, then the body text (the first 40 pages of each section)
  if (!num && (!code || hits.size === 0)) {
    const terms = Array.from(new Set(termsOf(q)))
    if (terms.length) {
      for (const s of tops) {
        const t = termsOf(s.title)
        const m = terms.filter(w => t.includes(w)).length
        if (m) add(s, m * 8, s.page_from, `${s.id} ${s.title}`)
      }
      const perLine = new Map<string, { page: number; li: number; m: number }>()
      for (const w of terms) for (const [page, li] of cache.words.get(w) || []) {
        const k = `${page}:${li}`
        const e = perLine.get(k)
        if (e) e.m++; else perLine.set(k, { page, li, m: 1 })
      }
      const bySec = new Map<SpecSection, { total: number; best: { n: number; page: number; li: number } }>()
      for (const { page, li, m } of Array.from(perLine.values()).sort((a, b) => a.page - b.page || a.li - b.li)) {
        for (const s of tops) {
          if (page < s.page_from || page > Math.min(s.page_to, s.page_from + 40)) continue
          const e = bySec.get(s) || { total: 0, best: { n: 0, page: 0, li: 0 } }
          e.total += m
          if (m > e.best.n) e.best = { n: m, page, li }
          bySec.set(s, e)
        }
      }
      for (const s of tops) {
        const e = bySec.get(s)
        if (e && e.best.n >= Math.min(2, terms.length)) add(s, Math.min(20, e.total) + e.best.n * 2, e.best.page, lineAt(e.best.page, e.best.li))
      }
    }
  }
  return Array.from(hits.values()).sort((a, b) => b.score - a.score).slice(0, limit).map(({ qs, ...h }) => h)
}
