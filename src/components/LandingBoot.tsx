'use client'

import { useEffect } from 'react'

// Loads the design's landing script (canvas animation + i18n + scroll-reveal)
// and then fires DOMContentLoaded so its boot handler runs regardless of whether
// the page arrived via a full load or client-side navigation.
export default function LandingBoot() {
  useEffect(() => {
    const id = 'taseerak-landing-app'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.src = '/design/app.js'
    s.onload = () => {
      try { document.dispatchEvent(new Event('DOMContentLoaded')) } catch {}
    }
    document.body.appendChild(s)
  }, [])
  return null
}
