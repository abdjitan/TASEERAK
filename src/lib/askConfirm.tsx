'use client'
// Branded replacement for window.confirm (UX audit 2026-11-21): the browser's grey dialog shows the
// site address and English OK/Cancel and ignores our design. askConfirm() opens a navy/gold modal and
// resolves true/false. Imperative on purpose, so a call site only changes `confirm(x)` →
// `await askConfirm(x)` (no provider to wire). Escape / backdrop = cancel; Enter = confirm.
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'

type Opts = { danger?: boolean; okLabel?: string; cancelLabel?: string }

function labels() {
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'ar'
  if (lang.startsWith('en')) return { ok: 'Confirm', cancel: 'Cancel', dir: 'ltr' as const }
  if (lang.startsWith('ur')) return { ok: 'تصدیق کریں', cancel: 'منسوخ', dir: 'rtl' as const }
  return { ok: 'تأكيد', cancel: 'إلغاء', dir: 'rtl' as const }
}

function Dialog({ message, opts, done }: { message: string; opts: Opts; done: (v: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null)
  const l = labels()
  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-[#071827]/60 backdrop-blur-sm" dir={l.dir}
      onClick={() => done(false)} role="presentation">
      <div role="alertdialog" aria-modal="true" aria-label={message.slice(0, 80)} onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border-t-4 border-[#D4A543] p-5 animate-fade-in">
        <p className="text-[15px] leading-relaxed text-[#071827] whitespace-pre-line">{message}</p>
        <div className="mt-5 flex gap-2">
          <button ref={okRef} type="button" onClick={() => done(true)}
            className="flex-1 min-h-11 rounded-xl text-sm font-extrabold"
            style={opts.danger ? { background: '#b91c1c', color: '#fff' } : { background: '#D4A543', color: '#071827' }}>
            {opts.okLabel || l.ok}
          </button>
          <button type="button" onClick={() => done(false)}
            className="flex-1 min-h-11 rounded-xl text-sm font-bold border border-gray-200 text-[#0B2438] bg-white hover:bg-gray-50">
            {opts.cancelLabel || l.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function askConfirm(message: string, opts: Opts = {}): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    let settled = false
    const done = (v: boolean) => {
      if (settled) return
      settled = true
      resolve(v)
      setTimeout(() => { root.unmount(); host.remove() }, 0)
    }
    root.render(<Dialog message={message} opts={opts} done={done} />)
  })
}
