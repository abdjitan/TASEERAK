'use client'

// Taseerak luxe loading overlay — shown during the login → dashboard transition.
// Full-screen navy radial scene with an animated "network activating" canvas,
// a floating logo plate, a progress bar and a live status line. Ported from the
// design handoff (loader.html / loader.js) into a controlled React component.
import { useEffect, useRef } from 'react'

export default function AuthLoader({ show = false, progress = 0, status = '', locale = 'ar', dir = 'rtl' }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!show) return
    const c = canvasRef.current!
    if (!c) return
    const x = c.getContext('2d')!
    if (!x) return
    let W = 0, H = 0, D = 1, nodes: any[] = [], hub: any = { x: 0, y: 0 }, pulses: any[] = [], last = performance.now(), nb = 0.5
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    function rs() {
      D = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight
      c.width = W * D; c.height = H * D; x.setTransform(D, 0, 0, D, 0, 0)
      hub = { x: W * 0.5, y: H * 0.42 }; nodes = []
      const n = Math.min(26, Math.max(12, (W * H / 46000) | 0)), mr = Math.min(W, H) * 0.42
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28 + Math.random() * 0.5, r = mr * (0.4 + Math.random() * 0.7)
        const bx = hub.x + Math.cos(a) * r, by = hub.y + Math.sin(a) * r
        nodes.push({ bx, by, x: bx, y: by, dr: Math.random() * 6.28, dist: Math.hypot(bx - hub.x, by - hub.y), g: 0, q: false })
      }
      pulses = []
    }
    function bc() { pulses.push({ r: 0 }); nodes.forEach(s => s.q = Math.random() < 0.85 ? false : 'skip') }
    function fr(now: number) {
      if (!canvasRef.current) return
      const dt = Math.min((now - last) / 1000, 0.05); last = now; if (!reduce) nb -= dt
      if (nb <= 0) { bc(); nb = 2.2 + Math.random() }
      x.clearRect(0, 0, W, H)
      for (const s of nodes) { if (!reduce) s.dr += dt * 0.55; s.x = s.bx + Math.cos(s.dr) * 7; s.y = s.by + Math.sin(s.dr * 0.8) * 7; s.dist = Math.hypot(s.x - hub.x, s.y - hub.y) }
      for (const s of nodes) { const a = 0.07 + s.g * 0.5, col = s.g > 0.02 ? '245,131,31' : '120,160,235'; const g = x.createLinearGradient(hub.x, hub.y, s.x, s.y); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); x.strokeStyle = g; x.lineWidth = 0.7 + s.g; x.beginPath(); x.moveTo(hub.x, hub.y); x.lineTo(s.x, s.y); x.stroke() }
      const mx = Math.hypot(W, H) * 0.55
      for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; if (!reduce) p.r += dt * 300; const lf = 1 - p.r / mx; if (lf <= 0) { pulses.splice(i, 1); continue } x.beginPath(); x.arc(hub.x, hub.y, p.r, 0, 6.28); x.strokeStyle = 'rgba(180,205,255,' + (lf * 0.25) + ')'; x.lineWidth = 1.2; x.stroke(); for (const s of nodes) if (s.q === false && p.r >= s.dist) { s.q = true; s.g = 1 } }
      for (const s of nodes) { if (!reduce) s.g *= 0.96; if (s.g > 0.02) { x.beginPath(); x.arc(s.x, s.y, 2 + 7 * s.g, 0, 6.28); x.fillStyle = 'rgba(245,131,31,' + (s.g * 0.16) + ')'; x.fill() } x.beginPath(); x.arc(s.x, s.y, 2.1, 0, 6.28); x.fillStyle = s.g > 0.02 ? 'rgba(245,131,31,.95)' : 'rgba(150,180,235,.5)'; x.shadowColor = s.g > 0.02 ? 'rgba(245,131,31,.8)' : 'transparent'; x.shadowBlur = 8 * s.g; x.fill(); x.shadowBlur = 0 }
      rafRef.current = requestAnimationFrame(fr)
    }
    window.addEventListener('resize', rs); rs(); rafRef.current = requestAnimationFrame(fr)
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', rs) }
  }, [show])

  const wm = locale === 'en' ? <>TASEER<i>AK</i></> : locale === 'ur' ? <>تسعیر<i>ک</i></> : <>تسعير<i>ك</i></>

  return (
    <div className={`tk-loader ${show ? 'show' : ''}`} dir={dir} aria-hidden={!show}>
      <style>{`
        .tk-loader{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;background:radial-gradient(circle at 50% 38%,#16264f,#0a1530 70%);opacity:0;visibility:hidden;transition:opacity .5s ease,visibility .5s}
        .tk-loader.show{opacity:1;visibility:visible}
        .tk-loader canvas{position:absolute;inset:0;width:100%;height:100%}
        .tk-l-core{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:22px}
        .tk-l-plate{width:122px;height:122px;border-radius:30px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 30px 60px -18px rgba(0,0,0,.6);position:relative;animation:tkFloat 3s ease-in-out infinite}
        .tk-l-plate::after{content:"";position:absolute;inset:-8px;border-radius:38px;border:2px solid rgba(245,131,31,.45);animation:tkPulseRing 2s ease-in-out infinite}
        .tk-l-plate img{width:86px;height:86px;object-fit:contain}
        @keyframes tkFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes tkPulseRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.06);opacity:1}}
        .tk-l-wm{font-family:'Cairo',sans-serif;font-size:30px;font-weight:900;color:#fff}
        .tk-l-wm i{color:#F5831F;font-style:normal}
        .tk-l-bar{width:240px;height:5px;border-radius:100px;background:rgba(255,255,255,.12);overflow:hidden;position:relative}
        .tk-l-bar>span{position:absolute;inset-block:0;inset-inline-start:0;border-radius:100px;background:linear-gradient(90deg,#F5831F,#ffb05e);box-shadow:0 0 12px rgba(245,131,31,.7);transition:width .4s cubic-bezier(.3,.8,.3,1)}
        .tk-l-status{font-family:'Cairo',sans-serif;font-size:14px;font-weight:600;color:rgba(255,255,255,.72);min-height:20px;transition:opacity .3s;text-align:center;padding:0 16px}
        .tk-l-pct{font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:800;color:#ffb05e;letter-spacing:.05em}
        @media (prefers-reduced-motion: reduce){.tk-l-plate,.tk-l-plate::after{animation:none}}
      `}</style>
      <canvas ref={canvasRef} />
      <div className="tk-l-core">
        <div className="tk-l-plate"><img src="/logo.png" alt="تسعيرك" /></div>
        <div className="tk-l-wm">{wm}</div>
        <div className="tk-l-bar"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
      </div>
    </div>
  )
}
