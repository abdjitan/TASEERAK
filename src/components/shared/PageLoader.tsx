// @ts-nocheck
'use client'

// Branded page loader — matches the login look (navy scene, floating logo
// plate, orbiting pulsing dots). KEY UX choice: it stays INVISIBLE for the
// first ~350ms, so most data loads finish first and the user sees nothing at
// all (feels instant). Only genuinely slow loads reveal the branded scene.
import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'

export default function PageLoader() {
  const { dir, locale } = useTranslation()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 350)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null // seamless: fast loads show nothing

  const wm = locale === 'en' ? <>TASEER<i>AK</i></> : locale === 'ur' ? <>تسعیر<i>ک</i></> : <>تسعير<i>ك</i></>

  return (
    <div className="tk-pl" dir={dir}>
      <style>{`
        .tk-pl{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:radial-gradient(circle at 50% 42%,#16264f,#0a1530 70%);animation:tkFade .35s ease}
        @keyframes tkFade{from{opacity:0}to{opacity:1}}
        .tk-pl-wrap{position:relative;width:170px;height:170px;display:grid;place-items:center}
        .tk-pl-plate{width:96px;height:96px;border-radius:26px;background:#fff;display:grid;place-items:center;box-shadow:0 24px 50px -16px rgba(0,0,0,.55);position:relative;z-index:2;animation:tkFloat 3s ease-in-out infinite}
        .tk-pl-plate::after{content:"";position:absolute;inset:-7px;border-radius:32px;border:2px solid rgba(245,131,31,.45);animation:tkRing 2s ease-in-out infinite}
        .tk-pl-plate img{width:64px;height:64px;object-fit:contain}
        .tk-pl-orbit{position:absolute;inset:0;animation:tkSpin 7s linear infinite}
        .tk-pl-dot{position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px;border-radius:50%;background:#F5831F;box-shadow:0 0 10px rgba(245,131,31,.85);animation:tkBlink 1.7s ease-in-out infinite}
        .tk-pl-wm{font-family:'Cairo',sans-serif;font-size:24px;font-weight:900;color:#fff;letter-spacing:.5px}
        .tk-pl-wm i{color:#F5831F;font-style:normal}
        @keyframes tkFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes tkRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.06);opacity:1}}
        @keyframes tkSpin{to{transform:rotate(360deg)}}
        @keyframes tkBlink{0%,100%{opacity:.3}50%{opacity:1}}
        @media (prefers-reduced-motion: reduce){.tk-pl-orbit,.tk-pl-plate,.tk-pl-plate::after{animation:none}}
      `}</style>
      <div className="tk-pl-wrap">
        <div className="tk-pl-orbit">
          {[0, 60, 120, 180, 240, 300].map((a, i) => (
            <span key={a} className="tk-pl-dot"
              style={{ transform: `rotate(${a}deg) translate(80px)`, animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <div className="tk-pl-plate"><img src="/logo.png" alt="تسعيرك" /></div>
      </div>
      <div className="tk-pl-wm">{wm}</div>
    </div>
  )
}
