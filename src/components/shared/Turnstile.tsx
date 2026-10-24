'use client'

// A self-contained Cloudflare Turnstile widget (no npm dependency). It loads
// the Cloudflare script once, renders the widget explicitly, and reports the
// token via onToken. Tokens are single-use, so callers must call .reset()
// (exposed through the ref) after every auth attempt to get a fresh one.
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as any).turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('turnstile-script-failed')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

const Turnstile = forwardRef(function Turnstile(
  { siteKey, onToken, onError, theme = 'light', dir = 'rtl' }: any,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [errCode, setErrCode] = useState('') // logged, not shown
  // no token after an error or 15 s: offer «حاول مرة أخرى» (as in the app)
  const [stuck, setStuck] = useState(false)
  const gotToken = useRef(false)
  const lang = typeof document !== 'undefined' ? (document.documentElement.lang || 'ar') : 'ar'
  const retry = () => {
    setStuck(false); setErrCode('')
    try { if (widgetIdRef.current && (window as any).turnstile) (window as any).turnstile.reset(widgetIdRef.current) } catch {}
    if (!widgetIdRef.current) window.location.reload()
  }

  useImperativeHandle(ref, () => ({
    reset() {
      try {
        if (widgetIdRef.current && (window as any).turnstile) {
          ;(window as any).turnstile.reset(widgetIdRef.current)
        }
      } catch {}
    },
  }))

  useEffect(() => {
    let cancelled = false
    if (!siteKey) return
    loadScript()
      .then(() => {
        const ts = (window as any).turnstile
        if (cancelled || !containerRef.current || !ts || widgetIdRef.current) return
        widgetIdRef.current = ts.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => { gotToken.current = true; setStuck(false); setErrCode(''); onToken && onToken(token) },
          'expired-callback': () => onToken && onToken(''),
          'timeout-callback': () => onToken && onToken(''),
          'error-callback': (code: string) => {
            setErrCode(String(code || 'unknown')); if (!gotToken.current) setStuck(true)
            try { console.warn('[turnstile] error', code) } catch {}
            onToken && onToken(''); onError && onError()
          },
        })
      })
      .catch(() => { setStuck(true); onError && onError() })
    const t = setTimeout(() => { if (!gotToken.current) setStuck(true) }, 15000)
    return () => {
      clearTimeout(t)
      cancelled = true
      try {
        if (widgetIdRef.current && (window as any).turnstile) {
          ;(window as any).turnstile.remove(widgetIdRef.current)
        }
      } catch {}
      widgetIdRef.current = null
    }
  }, [siteKey])

  return (
    <div>
      <div ref={containerRef} dir={dir} style={{ minHeight: 65 }} />
      {/* the error code is logged, not shown: Turnstile retries itself and usually succeeds right after */}
      {stuck && (
        <p dir={dir} style={{ fontSize: 12, textAlign: 'center', marginTop: 6, color: '#9D7425', fontWeight: 600 }}>
          {lang.startsWith('en') ? 'The security check did not finish. ' : lang.startsWith('ur') ? 'سیکیورٹی چیک مکمل نہیں ہوا۔ ' : 'لم يكتمل فحص الأمان. '}
          <button type="button" onClick={retry} style={{ textDecoration: 'underline', fontWeight: 700 }}>{lang.startsWith('en') ? 'Try again' : lang.startsWith('ur') ? 'دوبارہ کوشش کریں' : 'حاول مرة أخرى'}</button>
        </p>
      )}
    </div>
  )
})

export default Turnstile
