// One quantity/number parser for every buyer input (round-4 UX-002). The app shares this file via
// src/lib, so the site and the app read «2,500» the same way:
// - Arabic-Indic / Persian digits become Latin digits;
// - «,» and «٬» are THOUSANDS separators (dropped), never decimals: «2,500» = 2500, «1,000» = 1000;
// - «٫» and «.» are the decimal mark; only the first one is kept;
// - anything else (spaces, letters, units) is dropped.
import { toLatinDigits } from '@/lib/phone'

/** Normalises what the user typed into a clean numeric string (for controlled inputs). */
export function toLatinNumber(v: string): string {
  const s = toLatinDigits(String(v ?? '')).replace(/[,٬]/g, '').replace(/٫/g, '.').replace(/[^0-9.]/g, '')
  const i = s.indexOf('.')
  return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
}

/** Parses a typed number; returns NaN when nothing numeric is left. */
export function parseNumber(v: unknown): number {
  const s = toLatinNumber(String(v ?? ''))
  return s ? parseFloat(s) : NaN
}

/** The shared name other pages (BOQ, tender) adopt: same rules as parseNumber. */
export const parseLocalNumber = parseNumber
