// «هل تقصد …؟» for common e-mail typos (owner 2026-11-22: a seller signed up with «gmail.comm» and never
// got the confirmation link). Returns the corrected address, or null when nothing looks wrong.
const FIX: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'icloud.co': 'icloud.com',
}

export function emailTypoSuggestion(raw: string): string | null {
  const email = String(raw || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const user = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!domain) return null
  // wrong ending: .comm / .con / .cmo / .vom → .com (.om/.cm are real country domains, left alone)
  const base = domain.replace(/\.(comm+|con|cmo|vom|xom|coom|c0m)$/, '.com')
  const fixed = FIX[base] || base
  if (fixed !== domain) return `${user}@${fixed}`
  return null
}
