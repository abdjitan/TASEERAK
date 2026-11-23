'use client'
// Branded replacement for window.confirm / window.alert (UX audit 2026-11-21, 2026-11-23): the
// browser's grey dialog shows the site address and English OK/Cancel and ignores our design.
// askConfirm() opens a navy/gold modal and resolves true/false; notify() shows a message with one
// gold «حسناً» button and resolves when it is closed. Imperative on purpose, so a call site only
// changes `confirm(x)` → `await askConfirm(x)` and `alert(x)` → `notify(x)` (no provider to wire).
// Escape / backdrop = cancel; Enter = the focused button.
// A destructive confirm (danger) focuses «تراجع», so a stray Enter never deletes anything.
// Focus stays inside the open dialog (Tab cycles, the page behind is inert) and returns to the
// control that opened it when it closes (UX-106).
import { createRoot } from 'react-dom/client'
import { useEffect, useRef, type ReactElement } from 'react'
import { Info, Check, AlertCircle, type LucideIcon } from 'lucide-react'

type Opts = { danger?: boolean; okLabel?: string; cancelLabel?: string; title?: string }
export type NotifyTone = 'info' | 'success' | 'error'
type NotifyOpts = { tone?: NotifyTone; okLabel?: string; title?: string }

function labels() {
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'ar'
  if (lang.startsWith('en')) return { ok: 'Confirm', cancel: 'Go back', done: 'OK', dir: 'ltr' as const }
  if (lang.startsWith('ur')) return { ok: 'تصدیق کریں', cancel: 'واپس', done: 'ٹھیک ہے', dir: 'rtl' as const }
  return { ok: 'تأكيد', cancel: 'تراجع', done: 'حسناً', dir: 'rtl' as const }
}

function Dialog({ message, opts, done }: { message: string; opts: Opts; done: (v: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const l = labels()
  useEffect(() => {
    // destructive: the safe choice has the focus
    ;(opts.danger ? cancelRef.current : okRef.current)?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, opts.danger])
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-[#071827]/60 backdrop-blur-sm" dir={l.dir}
      onClick={() => done(false)} role="presentation">
      <div role="alertdialog" aria-modal="true" aria-label={(opts.title || message).slice(0, 80)} onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl bg-white shadow-2xl border-t-4 ${opts.danger ? 'border-[#b91c1c]' : 'border-[#D4A543]'} p-5 animate-fade-in`}>
        {opts.title && <h2 className="text-base font-bold text-[#071827] mb-1.5">{opts.title}</h2>}
        <p className="text-[15px] leading-relaxed text-[#071827] whitespace-pre-line">{message}</p>
        <div className="mt-5 flex gap-2">
          <button ref={okRef} type="button" onClick={() => done(true)}
            className="flex-1 min-h-11 rounded-xl text-sm font-bold"
            style={opts.danger ? { background: '#b91c1c', color: '#fff' } : { background: '#D4A543', color: '#071827' }}>
            {opts.okLabel || l.ok}
          </button>
          <button ref={cancelRef} type="button" onClick={() => done(false)}
            className="flex-1 min-h-11 rounded-xl text-sm font-bold border border-gray-200 text-[#0B2438] bg-white hover:bg-gray-50">
            {opts.cancelLabel || l.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

const TONE: Record<NotifyTone, { border: string; Icon: LucideIcon; fg: string; bg: string }> = {
  info: { border: '#D4A543', Icon: Info, fg: '#0B2438', bg: '#F5EEDC' },
  success: { border: '#0F6E56', Icon: Check, fg: '#0F6E56', bg: '#E3F2EC' },
  error: { border: '#b91c1c', Icon: AlertCircle, fg: '#b91c1c', bg: '#FDECEC' },
}

function Notice({ message, opts, done }: { message: string; opts: NotifyOpts; done: (v: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null)
  const l = labels()
  const t = TONE[opts.tone || 'info']
  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(true) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done])
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-[#071827]/60 backdrop-blur-sm" dir={l.dir}
      onClick={() => done(true)} role="presentation">
      <div role={opts.tone === 'error' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-label={(opts.title || message).slice(0, 80)} onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border-t-4 p-5 animate-fade-in" style={{ borderTopColor: t.border }}>
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full grid place-items-center" style={{ background: t.bg, color: t.fg }}><t.Icon className="w-4 h-4" strokeWidth={2.2} /></span>
          <div className="min-w-0">
            {opts.title && <h2 className="text-base font-bold text-[#071827] mb-1">{opts.title}</h2>}
            <p className="text-[15px] leading-relaxed text-[#071827] whitespace-pre-line">{message}</p>
          </div>
        </div>
        <button ref={okRef} type="button" onClick={() => done(true)}
          className="mt-5 w-full min-h-11 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>
          {opts.okLabel || l.done}
        </button>
      </div>
    </div>
  )
}

function mount(render: (done: (v: boolean) => void) => ReactElement): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  return new Promise(resolve => {
    // remember where the focus was, make the page behind inert and keep Tab inside the dialog (UX-106)
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const host = document.createElement('div')
    document.body.appendChild(host)
    const behind = Array.from(document.body.children).filter(el => el !== host && !el.hasAttribute('inert')) as HTMLElement[]
    behind.forEach(el => el.setAttribute('inert', ''))
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const f = Array.from(host.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      const at = document.activeElement
      if (e.shiftKey && (at === first || !host.contains(at))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (at === last || !host.contains(at))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trap)
    const root = createRoot(host)
    let settled = false
    const done = (v: boolean) => {
      if (settled) return
      settled = true
      document.removeEventListener('keydown', trap)
      behind.forEach(el => el.removeAttribute('inert'))
      resolve(v)
      setTimeout(() => {
        root.unmount(); host.remove()
        // unless the caller already moved the focus somewhere on purpose
        const now = document.activeElement
        if (opener && opener.isConnected && (!now || now === document.body)) { try { opener.focus() } catch {} }
      }, 0)
    }
    root.render(render(done))
  })
}

export function askConfirm(message: string, opts: Opts = {}): Promise<boolean> {
  return mount(done => <Dialog message={message} opts={opts} done={done} />)
}

/** Branded replacement for window.alert: one gold «حسناً» button; resolves when closed. */
export function notify(message: string, opts: NotifyOpts = {}): Promise<void> {
  return mount(done => <Notice message={message} opts={opts} done={done} />).then(() => undefined)
}
