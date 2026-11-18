// Country code → Arabic name for the admin pages (user locations, migration 229).
const AR: Record<string, string> = {
  SA: 'السعودية', JO: 'الأردن', AE: 'الإمارات', KW: 'الكويت', QA: 'قطر', BH: 'البحرين', OM: 'عُمان',
  EG: 'مصر', YE: 'اليمن', SY: 'سوريا', LB: 'لبنان', IQ: 'العراق', PS: 'فلسطين', SD: 'السودان',
  PK: 'باكستان', IN: 'الهند', BD: 'بنغلاديش', PH: 'الفلبين', TR: 'تركيا', US: 'أمريكا', GB: 'بريطانيا', DE: 'ألمانيا',
}
export function countryAr(code?: string | null): string {
  if (!code) return '—'
  return AR[code.toUpperCase()] || code.toUpperCase()
}
export const outsideSaudi = (code?: string | null) => !!code && code.toUpperCase() !== 'SA'
