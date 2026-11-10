'use client'
// Shows user-written text (notes, a hand-written material name, specs) in the reader's language
// (owner 2026-10-31). Only text that looks like another language is sent to /api/translate; the
// requests of one page are batched, and results are remembered on the device. «الأصل» shows the
// original. Falls back to the original text on any failure.
import { useEffect, useState, type ReactNode } from 'react'

type Lang = 'ar' | 'en' | 'ur'
const URDU = /[ٹڈڑںےۓگھ]/
const ARABIC = /[؀-ۿ]/
const LATIN = /[A-Za-z]{3,}/

/** Does this text need translating for a reader in `to`? (cheap script check, no network) */
export function needsTranslate(text: string, to: Lang): boolean {
  const t = (text || '').trim()
  if (t.length < 2) return false
  const latinWords = (t.match(/[A-Za-z]{3,}/g) || []).length
  const arabicLetters = (t.match(/[؀-ۿ]/g) || []).length
  if (to === 'en') return ARABIC.test(t)
  if (to === 'ar') return URDU.test(t) || (latinWords >= 2 && arabicLetters < 4)
  return (ARABIC.test(t) && !URDU.test(t)) || (latinWords >= 2 && arabicLetters < 4) // ur
}

const mem = new Map<string, string>()
const key = (to: Lang, t: string) => `${to}\u0001${t}`
try { const s = JSON.parse(localStorage.getItem('tsk_tr') || '{}'); for (const k of Object.keys(s)) mem.set(k, s[k]) } catch {}
function persist() { try { const o: Record<string, string> = {}; Array.from(mem.entries()).slice(-400).forEach(([k, v]) => { o[k] = v }); localStorage.setItem('tsk_tr', JSON.stringify(o)) } catch {} }

// one batched request per language, a moment after the page asks
const pending: Record<string, { texts: Set<string>; waiters: (() => void)[]; timer: any }> = {}
function request(text: string, to: Lang): Promise<void> {
  return new Promise(resolve => {
    const p = pending[to] || (pending[to] = { texts: new Set(), waiters: [], timer: null })
    p.texts.add(text); p.waiters.push(resolve)
    if (p.timer) return
    p.timer = setTimeout(async () => {
      const batch = Array.from(p.texts); const waiters = p.waiters
      delete pending[to]
      try {
        const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: batch.slice(0, 30), to }) })
        const j = await r.json().catch(() => ({}))
        if (j?.translations) { for (const [src, out] of Object.entries(j.translations)) mem.set(key(to, src), String(out)); persist() }
      } catch {}
      waiters.forEach(w => w())
    }, 250)
  })
}

// Arabic text with Latin runs, e.g. «لاصق (Rapid Stone White Adhesive)»: each Latin run (with its brackets) is
// wrapped in <bdi> (unicode-bidi: isolate) so a line break doesn't scatter its words and brackets (app parity 32817a2).
const LATIN_RUN = /\(?[A-Za-z][A-Za-z0-9\s.,'&\/+\-]*[A-Za-z0-9.]\)?|\([A-Za-z]\)/g
function isolateLatin(s: string): ReactNode {
  if (!/[؀-ۿ]/.test(s) || !/[A-Za-z]/.test(s)) return s
  const out: ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, k = 0
  LATIN_RUN.lastIndex = 0
  while ((m = LATIN_RUN.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    out.push(<bdi key={k++}>{m[0]}</bdi>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

export default function AutoTr({ text, locale, className }: { text: string | null | undefined; locale: string; className?: string }) {
  const to = (['ar', 'en', 'ur'].includes(locale) ? locale : 'ar') as Lang
  const src = (text || '').trim()
  const need = needsTranslate(src, to)
  const [, force] = useState(0)
  const [orig, setOrig] = useState(false)
  useEffect(() => {
    if (!need || mem.has(key(to, src))) return
    let alive = true
    request(src, to).then(() => { if (alive) force(n => n + 1) })
    return () => { alive = false }
  }, [src, to, need])
  if (!src) return null
  const tr = need ? mem.get(key(to, src)) : undefined
  if (!tr || tr === src) return <span className={className} dir="auto">{isolateLatin(src)}</span>
  const L = (en: string, ur: string, ar: string) => (to === 'en' ? en : to === 'ur' ? ur : ar)
  return (
    <span className={className} dir="auto">
      {isolateLatin(orig ? src : tr)}{' '}
      <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setOrig(o => !o) }}
        className="text-[10px] font-bold text-[#8F6820] hover:underline align-middle whitespace-nowrap">
        {orig ? L('Translation', 'ترجمہ', 'الترجمة') : L('Translated · original', 'ترجمہ · اصل', 'مترجم · الأصل')}
      </button>
    </span>
  )
}
