// Labels of the tender workspace (ar / en / ur). Arabic copy is فصحى.
import type { ItemKind, FlagSeverity } from '@/lib/tender/types'

export type Lfn = (en: string, ur: string, ar: string) => string
export const makeL = (locale: string): Lfn => (en, ur, ar) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

export function kindLabel(k: ItemKind | string, L: Lfn): string {
  if (k === 'material') return L('Material (to suppliers)', 'مواد (سپلائرز کو)', 'مادة (تُرسل للموردين)')
  if (k === 'works') return L('Works (not sent)', 'کام (نہیں بھیجا جاتا)', 'أعمال (لا تُرسل)')
  if (k === 'provisional') return L('Provisional / general', 'عارضی رقم / عمومی', 'مبالغ احتياطية وعامة')
  return L('Heading', 'سرخی', 'عنوان')
}

export const KIND_TONE: Record<string, string> = {
  material: 'bg-[#0F6E56]/10 text-[#0F6E56]',
  works: 'bg-gray-100 text-gray-600',
  provisional: 'bg-[#D4A543]/15 text-[#8F6820]',
  header: 'bg-gray-100 text-gray-500',
}

export function severityLabel(s: FlagSeverity | string, L: Lfn): string {
  if (s === 'error') return L('Error', 'غلطی', 'خطأ')
  if (s === 'warning') return L('Warning', 'انتباہ', 'تنبيه')
  if (s === 'review') return L('Needs review', 'جائزہ درکار', 'يحتاج مراجعة')
  return L('Note', 'نوٹ', 'ملاحظة')
}

export const SEVERITY_TONE: Record<string, string> = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  review: 'bg-sky-50 text-sky-800 border-sky-200',
  info: 'bg-gray-50 text-gray-600 border-gray-200',
}

/** «مقارنة المساحات» status (a difference is «needs review», never an error). */
export function areaStatusLabel(s: string, L: Lfn): string {
  if (s === 'ok') return L('Matches (±5%)', 'مطابق (±5%)', 'مطابق (±5%)')
  if (s === 'review') return L('Needs review', 'جائزہ درکار', 'يحتاج مراجعة')
  if (s === 'partial') return L('Partial sheets', 'جزوی شیٹس', 'لوحات جزئية')
  if (s === 'walls') return L('Walls (not compared)', 'دیواریں (موازنہ نہیں)', 'جدران (لا تُقارن)')
  return L('No room found', 'کوئی کمرہ نہیں ملا', 'لم تُحدَّد غرفة')
}

export const AREA_TONE: Record<string, string> = {
  ok: 'bg-[#0F6E56]/10 text-[#0F6E56]',
  review: 'bg-sky-50 text-sky-800',
  partial: 'bg-[#D4A543]/15 text-[#8F6820]',
  walls: 'bg-gray-100 text-gray-600',
  no_rooms: 'bg-gray-100 text-gray-600',
}

export const fmtNum =(n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 }))
export const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
