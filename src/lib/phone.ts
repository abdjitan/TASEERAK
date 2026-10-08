// Saudi mobile normalisation. Accepts what people actually type: 05XXXXXXXX, 5XXXXXXXX,
// 9665XXXXXXXX, +966 5X XXX XXXX, 00966…, and Arabic-Indic / Persian digits.
const DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
}

export function toLatinDigits(s: string): string {
  return (s || '').replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] || d)
}

/** Returns the national 9-digit mobile (5XXXXXXXX) or null if it isn't a Saudi mobile. */
function nationalMobile(input: string): string | null {
  let d = toLatinDigits(input).replace(/[^0-9]/g, '')
  if (d.startsWith('00966')) d = d.slice(5)
  else if (d.startsWith('966')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  return /^5[0-9]{8}$/.test(d) ? d : null
}

/** E.164 digits without "+", as Supabase Auth stores it: 9665XXXXXXXX. */
export function toE164Sa(input: string): string | null {
  const n = nationalMobile(input)
  return n ? '966' + n : null
}

/** Local display / profile format: 05XXXXXXXX. */
export function toLocalSa(input: string): string | null {
  const n = nationalMobile(input)
  return n ? '0' + n : null
}
