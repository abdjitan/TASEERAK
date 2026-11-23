'use client'
// Dialog focus handling (round-4 UX-116): while `active`, focus moves into the container, Tab and
// Shift+Tab stay inside it, the page behind does not scroll (optional), and when it closes focus
// returns to the element that opened it.
import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, opts?: { lockScroll?: boolean; initial?: 'first' | 'container' }) {
  const lockScroll = opts?.lockScroll ?? false
  const initial = opts?.initial ?? 'first'
  useEffect(() => {
    if (!active) return
    const opener = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null
    const el = ref.current
    const items = () => (el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(x => x.offsetParent !== null || x === document.activeElement) : [])
    // focus after paint so a portal / transition has mounted
    const t = setTimeout(() => {
      if (!el || el.contains(document.activeElement)) return
      const first = initial === 'first' ? items()[0] : null
      if (first) first.focus()
      else { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus() }
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return
      const list = items()
      if (list.length === 0) { e.preventDefault(); return }
      const first = list[0], last = list[list.length - 1]
      const cur = document.activeElement as HTMLElement | null
      if (!el.contains(cur)) { e.preventDefault(); first.focus(); return }
      if (e.shiftKey && cur === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = lockScroll ? document.body.style.overflow : ''
    if (lockScroll) document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      if (lockScroll) document.body.style.overflow = prevOverflow
      // only when focus was inside (or lost with) the dialog: a click elsewhere keeps its own focus
      const cur = document.activeElement
      const lost = !cur || cur === document.body || (el ? el.contains(cur) : false)
      if (lost && opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus()
    }
  }, [active, ref, lockScroll, initial])
}
