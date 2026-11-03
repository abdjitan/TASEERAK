// Shared shapes of «مسار العطاء» (tender pricing workspace). Pure data, no React, no I/O.
// Every value the workspace shows carries where it came from (BOQ sheet/row, drawing sheet/page,
// spec page) so a number can always be traced back to its source document.

/** One text run of a PDF page, in the rendered page's orientation (top-left origin, y down). */
export type PdfTextItem = {
  s: string   // text
  x: number   // left
  y: number   // baseline
  w: number   // width along the text direction
  h: number   // font height
  r?: number  // text rotation in degrees (0 = horizontal on the rendered page); omitted when 0
}

/** A page as stored after extraction in the browser. Drawings keep positioned items; specs keep lines. */
export type PdfPageText = {
  n: number           // 1-based page number
  w: number           // page width (rendered, scale 1)
  h: number
  items?: PdfTextItem[]
  lines?: string[]
}

export type ExtractedPdf = {
  v: 1
  name: string
  kind: 'drawing' | 'spec' | 'other'
  pages: PdfPageText[]
  numPages: number
  /** pages that had (almost) no text: scanned sheets that need OCR (not done in this phase) */
  emptyPages: number[]
}

export type ItemKind = 'material' | 'works' | 'provisional' | 'header'

export type SourceRef = {
  kind: 'boq' | 'drawing' | 'spec'
  file?: string        // file name as uploaded
  sheet?: string       // BOQ sheet or drawing number
  row?: number         // BOQ row (1-based, as Excel shows it)
  page?: number        // PDF page
  ref?: string         // item ref («14/4 C»), code («DRS-254-T13»), or spec section («08 11 13»)
  quote?: string       // the source words
}

export type FlagSeverity = 'error' | 'warning' | 'review' | 'info'

export type TenderFlag = {
  code: string
  severity: FlagSeverity
  item_key?: string    // TenderItem.key the flag belongs to (none = tender-wide)
  ar: string
  en: string
  sources: SourceRef[]
}

/** One BOQ line as read by boqNrm (before the company reviews it). */
export type TenderItem = {
  key: string               // stable key inside the tender: «<sheet>!<row>»
  ref: string | null        // NRM reference: «<page> <letter>» (e.g. «14/4 C») or the item number
  sheet: string             // sheet name as in the file
  trade: string | null      // trade / bill title («H DOORS AND WINDOWS»)
  section: string | null    // heading inside the trade («H1 DOORS», «CHILLED WATER INSTALLATIONS»)
  series: string | null     // series header («DRS-200 Series»)
  row: number               // Excel row (1-based)
  lead_in: string | null    // the description paragraph above the lettered item
  item_text: string         // the item's own words
  description: string       // lead_in + item_text (what a supplier must read)
  unit: string | null       // app unit (م³، م²، عدد…)
  unit_raw: string | null
  qty: number | null
  rate: number | null
  amount: number | null
  codes: string[]           // bracketed item codes «(DRS-254-T13)»
  refs: string[]            // other codes written in the text («curtain wall EWS-212», «ref FCU-01»)
  spec_refs: string[]       // specification sections named in the text («23 21 13»)
  etimad_code: string | null
  etimad_label: string | null
  kind: ItemKind
  kind_reason: string       // the words that decided the kind (for the reviewer)
  lump_sum: boolean         // unit «Item» with no quantity: priced as one lot
  flags: string[]           // reader flags (qty_missing, unit_missing, …)
}

export type BoqSection = { sheet: string; row: number; title: string; trade: string | null }

export type BoqReadStats = {
  sheets_total: number
  sheets_read: string[]
  sheets_skipped: { name: string; why: string }[]
  header_rows: number
  page_footers: number
  lead_ins: number
  rows_skipped: number
  by_kind: Record<ItemKind, number>
}

export type DrawingRoom = {
  name: string; code: string | null; area: number | null; x: number; y: number
  /** finish tags (FL/PT/CLG/TRM/SCR/WPS) printed inside / nearest this room: code → times */
  tags?: Record<string, number>
  /** 'low' when at least one tag was assigned with low confidence (listed in low_tags) */
  confidence?: 'high' | 'low'
  low_tags?: string[]
}
export type DrawingTag = { code: string; count: number; positions: { x: number; y: number }[] }

export type DrawingSummary = {
  file: string
  page: number
  sheet_no: string | null
  title: string | null
  project: string | null
  scale: string | null
  revision: string | null
  date: string | null
  paper: string | null
  rooms: DrawingRoom[]
  /** finish tags no room could be assigned to (too far from every room label): code → times */
  unassigned_finish?: Record<string, number>
  tags: DrawingTag[]
  legend: Record<string, string>         // keynote / wall-type code → description
  abbreviations: Record<string, string>  // «DRS» → «DOORS»
  notes: string[]
  u_values: { element: string; value: string }[]
  thumb_path?: string | null
}

export type SpecSection = {
  id: string            // «08 11 13», «L20», «2.3»
  title: string
  level: 0 | 1 | 2      // 0 = section, 1 = part / NBS clause, 2 = numbered sub-heading
  page_from: number
  page_to: number
  line: number          // index of the heading line in its page
  parent?: string
}

export type SpecIndex = {
  file: string
  pages: number
  sections: SpecSection[]
  /** code coordination matrix rows: «FL-303 Resin Floor Finish - Epoxy 096723 AFD» → its CSI section */
  codes?: Record<string, { csi: string; title: string; page: number }>
}

export type SpecHit = {
  section: SpecSection
  score: number
  quotes: { page: number; text: string }[]
}
