// Build a wa.me click-to-chat link from a (possibly local) Saudi phone number.
// Normalizes: removes non-digits, strips 00 / leading 0, adds 966 country code.
export function waLink(phone?: string | null, text?: string): string | null {
  if (!phone) return null
  let p = String(phone).replace(/[^0-9]/g, '')
  if (!p) return null
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('0')) p = '966' + p.slice(1)
  else if (p.length === 9 && p.startsWith('5')) p = '966' + p
  return `https://wa.me/${p}${text ? '?text=' + encodeURIComponent(text) : ''}`
}
