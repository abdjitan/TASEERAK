'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// A signed-in visitor sees «حسابي» instead of «تسجيل الدخول» + «ابدأ الآن» in the top bar
// (round-5 UX-128). The landing is static HTML, so the swap is done on its elements: the sign-in
// link is hidden and the «start» button becomes «My account» (its i18n key changes too, so a
// language switch keeps it). /login sends a signed-in user to their own home.
function markSignedIn() {
  try {
    document.querySelectorAll<HTMLElement>('a.js-login').forEach(a => { a.hidden = true; a.style.display = 'none' })
    document.querySelectorAll<HTMLAnchorElement>('header a[data-i18n="register"], nav a[data-i18n="register"], .nav a[data-i18n="register"]').forEach(a => {
      a.setAttribute('data-i18n', 'my_account')
      a.href = '/login'
      const lang = document.documentElement.lang
      a.textContent = lang === 'en' ? 'My account' : lang === 'ur' ? 'میرا اکاؤنٹ' : 'حسابي'
    })
  } catch {}
}

// Loads the design's landing script (canvas animation + i18n + scroll-reveal)
// and then fires DOMContentLoaded so its boot handler runs regardless of whether
// the page arrived via a full load or client-side navigation.
export default function LandingBoot() {
  useEffect(() => {
    let signedIn = false
    createClient().auth.getSession().then(({ data }: any) => {
      signedIn = !!data?.session
      if (signedIn) markSignedIn()
    }, () => {})
    const id = 'taseerak-landing-app'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.src = '/design/app.js'
    s.onload = () => {
      try { document.dispatchEvent(new Event('DOMContentLoaded')) } catch {}
      if (signedIn) markSignedIn()
    }
    document.body.appendChild(s)
  }, [])
  return null
}
