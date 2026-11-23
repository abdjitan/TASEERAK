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

// Batched requests per language, a moment after the page asks. The server takes 30 texts per call,
// so a long page is sent in chunks of 30; a text the server did not translate (its limit, a network
// error) goes back in the queue with a growing delay, at most 3 tries (round-4 UX-099).
const CHUNK = 30
const MAX_TRIES = 3
const queue: Record<string, { texts: Set<string>; timer: any }> = {}
const waiting = new Map<string, (() => void)[]>() // key(to, text) → resolvers
const tries = new Map<string, number>()
function settle(k: string) { const w = waiting.get(k); waiting.delete(k); w?.forEach(f => f()) }
function schedule(to: Lang, delay: number) {
  const p = queue[to] || (queue[to] = { texts: new Set(), timer: null })
  if (p.timer) return
  p.timer = setTimeout(() => flush(to), delay)
}
async function flush(to: Lang) {
  const p = queue[to]
  if (!p) return
  const all = Array.from(p.texts)
  delete queue[to]
  const retry: string[] = []
  for (let i = 0; i < all.length; i += CHUNK) {
    const batch = all.slice(i, i + CHUNK)
    try {
      const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: batch, to }) })
      const j = await r.json().catch(() => ({}))
      if (j?.translations) { for (const [src, out] of Object.entries(j.translations)) mem.set(key(to, src), String(out)); persist() }
    } catch {}
    for (const t of batch) {
      const k = key(to, t)
      if (mem.has(k)) { tries.delete(k); settle(k); continue }
      const n = (tries.get(k) || 0) + 1
      tries.set(k, n)
      if (n >= MAX_TRIES) settle(k) // give up quietly: the original stays on screen
      else retry.push(t)
    }
  }
  if (retry.length) {
    const q = queue[to] || (queue[to] = { texts: new Set(), timer: null })
    retry.forEach(t => q.texts.add(t))
    const worst = Math.max(...retry.map(t => tries.get(key(to, t)) || 1))
    if (!q.timer) q.timer = setTimeout(() => flush(to), 1500 * 2 ** (worst - 1)) // 1.5 s, then 3 s
  }
}
function request(text: string, to: Lang): Promise<void> {
  return new Promise(resolve => {
    const k = key(to, text)
    if (mem.has(k) || (tries.get(k) || 0) >= MAX_TRIES) { resolve(); return }
    const w = waiting.get(k)
    if (w) { w.push(resolve); return } // already queued or in flight
    waiting.set(k, [resolve])
    const p = queue[to] || (queue[to] = { texts: new Set(), timer: null })
    p.texts.add(text)
    schedule(to, 250)
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

// noToggle: inside a clickable row (a <button> or <a>) the «original» toggle would be a button inside a
// button, invalid HTML (UX-109); show the translation with a small non-interactive «مترجم» tag instead.
export default function AutoTr({ text, locale, className, noToggle }: { text: string | null | undefined; locale: string; className?: string; noToggle?: boolean }) {
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
  if (noToggle) return <span className={className} dir="auto">{isolateLatin(tr)} <span className="text-[12px] font-bold text-[#8F6820] whitespace-nowrap">({L('translated', 'ترجمہ', 'مترجم')})</span></span>
  return (
    <span className={className} dir="auto">
      {isolateLatin(orig ? src : tr)}{' '}
      <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setOrig(o => !o) }}
        className="inline-flex items-center min-h-[44px] px-2 text-[12px] font-bold text-[#8F6820] hover:underline align-middle whitespace-nowrap">
        {orig ? L('Translation', 'ترجمہ', 'الترجمة') : L('Translated · original', 'ترجمہ · اصل', 'مترجم · الأصل')}
      </button>
    </span>
  )
}
