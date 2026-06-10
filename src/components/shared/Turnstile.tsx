// @ts-nocheck
'use client'

// A self-contained Cloudflare Turnstile widget (no npm dependency). It loads
// the Cloudflare script once, renders the widget explicitly, and reports the
// token via onToken. Tokens are single-use, so callers must call .reset()
// (exposed through the ref) after every auth attempt to get a fresh one.
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

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
          callback: (token: string) => onToken && onToken(token),
          'expired-callback': () => onToken && onToken(''),
          'timeout-callback': () => onToken && onToken(''),
          'error-callback': () => { onToken && onToken(''); onError && onError() },
        })
      })
      .catch(() => { onError && onError() })
    return () => {
      cancelled = true
      try {
        if (widgetIdRef.current && (window as any).turnstile) {
          ;(window as any).turnstile.remove(widgetIdRef.current)
        }
      } catch {}
      widgetIdRef.current = null
    }
  }, [siteKey])

  return <div ref={containerRef} dir={dir} style={{ minHeight: 65 }} />
})

export default Turnstile
