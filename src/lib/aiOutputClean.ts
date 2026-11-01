// AI output that is cached and shown to other users (item notes, translations) must never carry a
// way to contact someone off the platform: links, e-mail addresses and phone numbers.

const URL_RE = /(https?:\/\/|www\.)\S+/gi
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g
const PHONE_RE = /[+＋]?[\d٠-٩۰-۹][\d٠-٩۰-۹\s\-().]{6,}[\d٠-٩۰-۹]/g

/** Removes links, e-mail addresses and phone-like digit runs. */
export function stripContacts(s: any, max: number): string {
  return String(s || '')
    .replace(URL_RE, '')
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '')
    .replace(/\s{2,}/g, ' ').trim().slice(0, max)
}

// Arabic-Indic / Persian digits → Latin, so "١٢٠٠" and "1200" compare equal.
const latinDigits = (s: string) => s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))

/** Normalised links / e-mails / phone-like digit runs found in a text. */
export function contactsIn(s: any): string[] {
  const t = String(s || '')
  const out: string[] = []
  for (const m of t.match(URL_RE) || []) out.push('u:' + m.toLowerCase())
  for (const m of t.match(EMAIL_RE) || []) out.push('e:' + m.toLowerCase())
  for (const m of t.match(PHONE_RE) || []) out.push('p:' + latinDigits(m).replace(/\D/g, ''))
  return out
}

/** True when the output carries a link, e-mail or digit run that the input did not have. */
export function addsContacts(input: string, output: string): boolean {
  const known = new Set(contactsIn(input))
  return contactsIn(output).some(c => !known.has(c))
}
