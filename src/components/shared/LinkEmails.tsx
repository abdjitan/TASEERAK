// Shows a text with every email address as an isolated LTR mailto link (round-4 UX-145): inside Arabic
// text an address like info@taseerak.com otherwise flips around the «@» and the dot.
import type { ReactNode } from 'react'

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export default function LinkEmails({ text }: { text: string }) {
  const out: ReactNode[] = []
  let last = 0, k = 0, m: RegExpExecArray | null
  EMAIL.lastIndex = 0
  while ((m = EMAIL.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<bdi key={k++} dir="ltr"><a href={`mailto:${m[0]}`} className="font-semibold text-[#8F6820] underline underline-offset-2">{m[0]}</a></bdi>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
