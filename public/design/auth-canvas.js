/* Compact brand network canvas for auth pages. Needs a <canvas id="auth-canvas"> inside .auth-brand */
(function () {
  const c = document.getElementById('auth-canvas'); if (!c) return;
  const x = c.getContext('2d');
  let W, H, D, nodes = [], hub, pulses = [], last = performance.now(), nb = 0.8;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rs() {
    D = Math.min(devicePixelRatio || 1, 2); const p = c.parentElement;
    W = p.clientWidth; H = p.clientHeight; c.width = W * D; c.height = H * D;
    c.style.width = W + 'px'; c.style.height = H + 'px'; x.setTransform(D, 0, 0, D, 0, 0);
    hub = { x: W * .5, y: H * .5 }; nodes = [];
    const n = Math.min(15, Math.max(8, (W * H / 44000) | 0)), mr = Math.min(W, H) * .42;
    for (let i = 0; i < n; i++) { const a = i / n * 6.28 + Math.random() * .4, r = mr * (.5 + Math.random() * .55); const bx = hub.x + Math.cos(a) * r, by = hub.y + Math.sin(a) * r; nodes.push({ bx, by, x: bx, y: by, dr: Math.random() * 6.28, dist: Math.hypot(bx - hub.x, by - hub.y), g: 0, q: false }); }
    pulses = [];
  }
  function bc() { pulses.push({ r: 0 }); nodes.forEach(s => s.q = Math.random() < .8 ? false : 'skip'); }
  function fr(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now; if (!reduce) nb -= dt;
    if (nb <= 0) { bc(); nb = 3.4 + Math.random() * 1.2; }
    x.clearRect(0, 0, W, H);
    for (const s of nodes) { if (!reduce) s.dr += dt * .5; s.x = s.bx + Math.cos(s.dr) * 6; s.y = s.by + Math.sin(s.dr * .8) * 6; s.dist = Math.hypot(s.x - hub.x, s.y - hub.y); }
    for (const s of nodes) { const a = .08 + s.g * .5, col = s.g > .02 ? '245,131,31' : '150,180,235'; const g = x.createLinearGradient(hub.x, hub.y, s.x, s.y); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); x.strokeStyle = g; x.lineWidth = .7 + s.g; x.beginPath(); x.moveTo(hub.x, hub.y); x.lineTo(s.x, s.y); x.stroke(); }
    const mx = Math.hypot(W, H) * .6;
    for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; if (!reduce) p.r += dt * 320; const lf = 1 - p.r / mx; if (lf <= 0) { pulses.splice(i, 1); continue; } x.beginPath(); x.arc(hub.x, hub.y, p.r, 0, 6.28); x.strokeStyle = 'rgba(180,205,255,' + (lf * .28) + ')'; x.lineWidth = 1.3; x.stroke(); for (const s of nodes) if (s.q === false && p.r >= s.dist) { s.q = true; s.g = 1; } }
    for (const s of nodes) { if (!reduce) s.g *= .965; if (s.g > .02) { x.beginPath(); x.arc(s.x, s.y, 2 + 7 * s.g, 0, 6.28); x.fillStyle = 'rgba(245,131,31,' + (s.g * .16) + ')'; x.fill(); } x.beginPath(); x.arc(s.x, s.y, 2.2, 0, 6.28); x.fillStyle = s.g > .02 ? 'rgba(245,131,31,.95)' : 'rgba(170,198,250,.6)'; x.shadowColor = s.g > .02 ? 'rgba(245,131,31,.8)' : 'transparent'; x.shadowBlur = 9 * s.g; x.fill(); x.shadowBlur = 0; }
    const hg = x.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 40); hg.addColorStop(0, 'rgba(245,131,31,.28)'); hg.addColorStop(1, 'rgba(245,131,31,0)'); x.fillStyle = hg; x.beginPath(); x.arc(hub.x, hub.y, 40, 0, 6.28); x.fill();
    x.beginPath(); x.arc(hub.x, hub.y, 9 + Math.sin(now / 600) * 1.2, 0, 6.28); x.strokeStyle = 'rgba(245,131,31,.85)'; x.lineWidth = 2; x.stroke();
    x.beginPath(); x.arc(hub.x, hub.y, 4, 0, 6.28); x.fillStyle = '#fff'; x.shadowColor = 'rgba(245,131,31,.9)'; x.shadowBlur = 14; x.fill(); x.shadowBlur = 0;
    requestAnimationFrame(fr);
  }
  addEventListener('resize', rs); rs(); requestAnimationFrame(fr);
})();
