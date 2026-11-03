// What a vector drawing sheet says, read from its text runs (no AI, no OCR):
//  • title block: drawing number, title, project, scale, revision, date, paper size;
//  • rooms: name + room code («L00-EC-26») + area («577.432 m²»), each with the finish tags
//    (FL/PT/CLG/TRM/SCR/WPS) printed nearest to it (assignFinishTags, by position and scale);
//  • tags: how many times each element code («DRS-254-T13», «BLK-305») is printed on the plan;
//  • keynote legend («FL-303 - RESIN FLOOR FINISH - EPOXY») and wall-type legend
//    («BLK - 305 - BLOCKWORK»); abbreviations («DRS - DOORS», «EC = ENERGY CENTRE»);
//  • general notes («* …») and U-value targets.
// Labels printed twice at the same spot (CAD room tags) are counted once; a tag printed twice at
// different spots stays two, which is why a count is «needs review», never «error».
import type { PdfPageText, PdfTextItem, DrawingSummary, DrawingRoom, DrawingTag } from './types'
import { dedupeItems, phrasesOf, type Phrase } from './layout'

export const TAG_RE = /^([A-Z]{2,4})-(\d{3})(?:-(T\d{1,2}))?$/
const ROOM_CODE_RE = /^[A-Z]\d{2}-[A-Z]{2,3}-\d{2,3}$/
const AREA_RE = /^(\d+(?:[.,]\d+)?)\s*(?:m²|m2|sq\.?\s?m)$/i
const LEGEND_RE = /^([A-Z]{2,4}-\d{3}(?:-T\d{1,2})?)\s*-\s+(.+)$/
const WALL_LEGEND_RE = /^([A-Z]{2,4})\s+-\s+(\d{3})\s+-\s+(.+)$/
const ABBR_RE = /^([A-Z]{2,4})\s*(?:-|=)\s*([A-Z][A-Z .,'/&()-]{2,})$/
const DRAWING_NO_RE = /^[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){4,}$/
const DATE_RE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/
const LABELS = /^(?:drawing no\.?|drawing number|rev\.?|revision|scale|drawing title|title|client|drawing status|project title|project|facility no\.?|contract no\.?|date|reviewed|checked|approved|drawn|model file ref:?|key plan|general notes|notes|sheet|status)$/i
const isArabic = (s: string) => /[؀-ۿ]/.test(s)

/** Items below a label, in its column, until the next label (title-block values). */
function valueBelow(items: PdfTextItem[], label: PdfTextItem, maxLines = 6, colWidth = 260): string | null {
  const cand = items.filter(i => i !== label && !i.r && !isArabic(i.s) && i.y > label.y + 0.5 && i.y < label.y + label.h * maxLines * 1.6
    && i.x >= label.x - label.h * 1.5 && i.x <= label.x + colWidth)
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const out: string[] = []
  for (const c of cand) {
    if (LABELS.test(c.s)) break
    out.push(c.s)
  }
  return out.length ? out.join(' ').replace(/\s+/g, ' ').trim() : null
}

function findLabel(items: PdfTextItem[], re: RegExp): PdfTextItem | null {
  return items.filter(i => re.test(i.s.trim())).sort((a, b) => b.y - a.y)[0] || null
}

export function readDrawingPage(page: PdfPageText, file: string): DrawingSummary {
  const items = dedupeItems(page.items || [])
  const phrases = phrasesOf(items)

  // ── legend / abbreviations (their code runs must not be counted as tags on the plan) ──────
  const legend: Record<string, string> = {}
  const abbreviations: Record<string, string> = {}
  const legendItems = new Set<PdfTextItem>()
  const sorted = phrases.slice().sort((a, b) => a.x - b.x || a.y - b.y)
  const byX = new Map<number, Phrase[]>()
  for (const p of sorted) { const k = Math.round(p.x / 4); byX.set(k, [...(byX.get(k) || []), p]) }
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i]
    let m = p.text.match(LEGEND_RE)
    if (m) {
      let desc = m[2].replace(/\s+/g, ' ').trim()
      // wrapped description lines: right below, starting at the description's x, without a code
      const descX = p.items[1]?.x ?? p.x
      let y = p.y
      for (;;) {
        const next = phrases.find(q => q !== p && q.y > y && q.y - y <= p.h * 1.9 && Math.abs(q.x - descX) <= p.h * 1.5 && !LEGEND_RE.test(q.text) && !TAG_RE.test(q.items[0].s))
        if (!next) break
        desc += ' ' + next.text; y = next.y
      }
      legend[m[1]] = desc.replace(/^-\s*/, '').trim()
      for (const it of p.items) legendItems.add(it)
      continue
    }
    m = p.text.match(WALL_LEGEND_RE)
    if (m) { legend[`${m[1]}-${m[2]}`] = m[3].trim(); for (const it of p.items) legendItems.add(it); continue }
    m = p.text.match(ABBR_RE)
    if (m && p.items.length <= 4 && !/\d/.test(m[1])) abbreviations[m[1]] = m[2].replace(/\s+/g, ' ').trim()
  }

  // ── tags on the plan ──────────────────────────────────────────────────────────────────────
  const tagMap = new Map<string, DrawingTag>()
  for (const it of items) {
    if (legendItems.has(it)) continue
    const s = it.s.trim()
    if (!TAG_RE.test(s)) continue
    const t = tagMap.get(s) || { code: s, count: 0, positions: [] }
    t.count++; t.positions.push({ x: Math.round(it.x), y: Math.round(it.y) })
    tagMap.set(s, t)
  }
  const tags = Array.from(tagMap.values()).sort((a, b) => a.code.localeCompare(b.code))

  // ── rooms: an area label with its room code and name next to it ───────────────────────────
  const rooms: DrawingRoom[] = []
  const codes = items.filter(i => ROOM_CODE_RE.test(i.s))
  for (const a of items) {
    const am = a.s.match(AREA_RE)
    if (!am) continue
    const near = (i: PdfTextItem) => Math.hypot((i.x + i.w / 2) - (a.x + a.w / 2), i.y - a.y)
    const lim = a.h * 5
    const code = codes.filter(c => c.h >= a.h * 0.75 && near(c) <= lim).sort((p, q) => near(p) - near(q))[0] || null
    const name = items.filter(i => i !== a && i !== code && near(i) <= lim && /[A-Z]{2}/.test(i.s) && !ROOM_CODE_RE.test(i.s) && !AREA_RE.test(i.s) && !TAG_RE.test(i.s) && i.h >= a.h * 0.75 && i.h <= a.h * 1.3 && !/^CFL\b/.test(i.s))
      .sort((p, q) => near(p) - near(q))[0] || null
    rooms.push({ name: name?.s || '', code: code?.s || null, area: Number(am[1].replace(',', '.')), x: Math.round(a.x), y: Math.round(a.y) })
  }
  const roomSeen = new Set<string>()
  const roomsU = rooms.filter(r => { const k = `${r.code}|${r.name}|${r.area}`; if (roomSeen.has(k)) return false; roomSeen.add(k); return true })

  // ── notes and U-values ────────────────────────────────────────────────────────────────────
  const notes: string[] = []
  const u_values: { element: string; value: string }[] = []
  const vs = phrases.slice().sort((a, b) => a.y - b.y || a.x - b.x)
  for (let i = 0; i < vs.length; i++) {
    const p = vs[i]
    if (/^\*\s*/.test(p.text)) {
      let note = p.text.replace(/^\*\s*/, '')
      let y = p.y
      for (;;) {
        const next = vs.find(q => q.y > y && q.y - y <= p.h * 1.9 && Math.abs(q.x - p.x) <= p.h * 2 && !/^\*/.test(q.text))
        if (!next || LABELS.test(next.text) || /U-VALUE/i.test(next.text) || /:\s*U-/.test(next.text)) break
        note += ' ' + next.text; y = next.y
      }
      notes.push(note.trim())
    }
    const um = p.text.match(/^(.{3,40}?):\s*(U-\s*\d+(?:\.\d+)?.*)$/)
    if (um) u_values.push({ element: um[1].trim(), value: um[2].trim() })
  }

  // ── title block ───────────────────────────────────────────────────────────────────────────
  const noCands = items.filter(i => DRAWING_NO_RE.test(i.s) && !/\.(rvt|dwg)$/i.test(i.s))
  const modelRef = findLabel(items, /^model file ref:?$/i)
  const sheet_no = noCands.filter(i => !(modelRef && Math.abs(i.y - modelRef.y) < modelRef.h * 3 && Math.abs(i.x - modelRef.x) < 200)).sort((a, b) => b.h - a.h)[0]?.s || null
  const tl = findLabel(items, /^drawing title$/i)
  const pl = findLabel(items, /^project title$/i)
  const rl = findLabel(items, /^rev\.?$/i)
  const scaleIt = items.filter(i => /^1\s*:\s*\d{1,4}$/.test(i.s)).sort((a, b) => b.h - a.h)[0]
  const scaleAlt = items.find(i => /^1:\d{1,4}@A\d$/i.test(i.s))
  const dateIt = items.filter(i => DATE_RE.test(i.s)).sort((a, b) => b.h - a.h)[0]
  let revision: string | null = null
  if (rl) {
    const below = items.filter(i => i !== rl && /^[A-Z0-9]{1,3}$/.test(i.s) && i.y > rl.y && i.y < rl.y + rl.h * 4 && Math.abs(i.x - rl.x) < rl.h * 3).sort((a, b) => a.y - b.y)[0]
    revision = below?.s || null
  }
  const paper = (scaleAlt?.s.match(/@(A\d)/i)?.[1] || null)
  const scale = scaleIt ? scaleIt.s.replace(/\s+/g, ' ') : (scaleAlt ? scaleAlt.s.split('@')[0] : null)
  const unassigned_finish = assignFinishTags(roomsU, tags, page, metresPerPoint(scale))
  return {
    file, page: page.n,
    sheet_no,
    title: tl ? valueBelow(items, tl) : null,
    project: pl ? valueBelow(items, pl, 3) : null,
    scale,
    revision,
    date: dateIt?.s || null,
    paper: paper ? paper.toUpperCase() : null,
    rooms: roomsU, unassigned_finish, tags, legend, abbreviations, notes, u_values,
  }
}

/** All drawing pages of all drawing files → one summary per page that has a plan or a legend. */
export function readDrawings(files: { name: string; pages: PdfPageText[] }[]): DrawingSummary[] {
  const out: DrawingSummary[] = []
  for (const f of files) for (const p of f.pages) {
    const s = readDrawingPage(p, f.name)
    if (s.tags.length || s.rooms.length || Object.keys(s.legend).length || s.sheet_no) out.push(s)
  }
  return out
}

/** The family of a code: «DRS-254-T13» → «DRS». */
export const familyOf = (code: string) => code.split('-')[0]

// ── finish tags ↔ rooms ─────────────────────────────────────────────────────────────────────
/** Finish families placed per room: floors, paint, ceilings, skirting, screeds, waterproofing. */
export const FINISH_FAMILIES = ['FL', 'PT', 'CLG', 'TRM', 'SCR', 'WPS']
export const isFinishCode = (code: string) => FINISH_FAMILIES.includes(familyOf(code))

/** Metres on site per PDF point (1/72 in) from «1 : 100» / «1:100»; null when the scale is unknown. */
export function metresPerPoint(scale: string | null): number | null {
  const m = scale?.match(/^1\s*:\s*(\d{1,4})$/)
  const n = m ? Number(m[1]) : 0
  return n > 0 ? (0.0254 / 72) * n : null
}

/**
 * Each finish tag goes to the room whose label is nearest, weighted by the room's size: a room of
 * A m² at the sheet scale spans about √A metres, so a tag 300 pt from the label of a 3,000 m² hall
 * can be inside it while 300 pt from a 3 m² WC cannot. Reach = √A converted to points (at least
 * 60 pt, at most 40% of the sheet diagonal); rooms farther than their reach are not candidates, and
 * a tag with no candidate stays unassigned. Among candidates the lowest distance / √reach wins (plain
 * distance / reach lets one huge hall swallow the tags of the small rooms around its label).
 * Confidence is «high» when the tag sits well inside the best room (≤ 0.6 of its reach) and no other
 * room comes close (second score ≥ 1.5× the best); otherwise «low». Without a scale everything is low.
 * Walls are vector lines without text, so this is a proximity guess, never a geometric proof.
 * Mutates the rooms (tags / confidence / low_tags) and returns the unassigned tags.
 */
export function assignFinishTags(rooms: DrawingRoom[], tags: DrawingTag[], page: { w: number; h: number }, mpp: number | null): Record<string, number> {
  const diag = Math.hypot(page.w || 0, page.h || 0) || 4000
  const reachOf = (r: DrawingRoom) => {
    const raw = mpp && r.area ? Math.sqrt(r.area) / mpp : diag * 0.06
    return Math.min(Math.max(raw, 60), diag * 0.4)
  }
  const placed = rooms.filter(r => r.area != null && r.area > 0)
  const reach = placed.map(reachOf)
  const unassigned: Record<string, number> = {}
  for (const t of tags) {
    if (!isFinishCode(t.code)) continue
    for (const p of t.positions) {
      const cand = placed.map((r, i) => {
        const dist = Math.hypot(p.x - r.x, p.y - r.y)
        return { r, ratio: dist / reach[i], score: dist / Math.sqrt(reach[i]) }
      }).filter(c => c.ratio <= 1).sort((a, b) => a.score - b.score)
      if (!cand.length) { unassigned[t.code] = (unassigned[t.code] || 0) + 1; continue }
      const best = cand[0], second = cand[1]
      const high = !!mpp && best.ratio <= 0.6 && (!second || second.score >= best.score * 1.5)
      const r = best.r
      r.tags = r.tags || {}
      r.tags[t.code] = (r.tags[t.code] || 0) + 1
      if (!high) { r.low_tags = Array.from(new Set([...(r.low_tags || []), t.code])); r.confidence = 'low' }
      else if (!r.confidence) r.confidence = 'high'
    }
  }
  return unassigned
}

/** «ENERGY CENTRE PLAN 00 - 1/4 ENLARGED PLAN» → { level: «ENERGY CENTRE PLAN 00 ENLARGED PLAN», n: 1, of: 4 }. */
export function sheetPartOf(title: string | null | undefined): { level: string; n: number; of: number } | null {
  const m = (title || '').match(/(?:^|[\s-])(\d{1,2})\s*\/\s*(\d{1,2})(?=\s|$)/)
  if (!m) return null
  const n = Number(m[1]), of = Number(m[2])
  if (of < 2 || of > 30 || n < 1 || n > of) return null
  const level = (title || '').replace(m[0], ' ').replace(/[^A-Za-z0-9]+/g, ' ').trim().toUpperCase()
  return { level, n, of }
}
