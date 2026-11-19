// Shared look for the Taseerak social ads: brand colours, fonts, and the pieces every ad reuses
// (phone frame, notification, end card). 1080x1920, 30 fps, Arabic RTL, MSA copy only.
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { loadFont as loadPlex } from '@remotion/google-fonts/IBMPlexSansArabic';
import { loadFont as loadRuqaa } from '@remotion/google-fonts/ArefRuqaa';

export const FONT = loadPlex('normal', { weights: ['400', '500', '600', '700'], subsets: ['arabic', 'latin'] }).fontFamily;
export const HAND = loadRuqaa('normal', { weights: ['400', '700'], subsets: ['arabic'] }).fontFamily;

export const C = {
  navy: '#071827', navy2: '#0B2438', navy3: '#102E45',
  gold: '#D4A543', gold2: '#F5C55B', goldDark: '#9D7425', green: '#0F6E56',
  paper: '#F3EBDD', ink: '#1E2A44', white: '#FFFFFF', muted: '#8DA2B5',
};

export const fps = 30;

// 0 → 1 between two frames, eased.
export const prog = (f: number, a: number, b: number, ease = Easing.out(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

// Spring pop 0→1 starting at frame delay. Pure (no hooks), safe inside maps and branches.
export const pop = (f: number, delay: number, damping = 14) => spring({ frame: f - delay, fps: 30, config: { damping, mass: 0.7 } });

export const Rtl: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <AbsoluteFill style={{ direction: 'rtl', fontFamily: FONT, color: C.white, ...style }}>{children}</AbsoluteFill>
);

// Big caption at the top of the frame (the line the viewer reads with the sound off).
export const Caption: React.FC<{ text: string; from: number; to?: number; top?: number; size?: number; color?: string; bg?: string }> = ({ text, from, to = 99999, top = 170, size = 76, color = C.white, bg }) => {
  const f = useCurrentFrame();
  const inP = prog(f, from, from + 12);
  const outP = prog(f, to - 10, to);
  const o = inP * (1 - outP);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', top, left: 70, right: 70, textAlign: 'center', opacity: o, transform: `translateY(${(1 - inP) * 30}px)` }}>
      <span style={{ fontSize: size, fontWeight: 700, lineHeight: 1.35, color, background: bg, padding: bg ? '6px 26px' : 0, borderRadius: 18, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{text}</span>
    </div>
  );
};

// A simple modern phone. Children render inside the screen.
export const Phone: React.FC<{ x?: number; y?: number; scale?: number; children?: React.ReactNode; screen?: string }> = ({ x = 540, y = 1060, scale = 1, children, screen = '#F5F7FA' }) => {
  const W = 620, H = 1260;
  return (
    <div style={{ position: 'absolute', left: x - (W * scale) / 2, top: y - (H * scale) / 2, width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 86, background: '#0A0F16', boxShadow: '0 40px 120px rgba(0,0,0,.55), inset 0 0 0 3px #2A3442' }} />
      <div style={{ position: 'absolute', inset: 18, borderRadius: 70, background: screen, overflow: 'hidden' }}>{children}</div>
      <div style={{ position: 'absolute', top: 38, left: W / 2 - 80, width: 160, height: 40, borderRadius: 20, background: '#0A0F16' }} />
    </div>
  );
};

// App header inside the phone screen.
export const AppBar: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ height: 190, background: C.navy, display: 'flex', alignItems: 'flex-end', padding: '0 40px 30px', gap: 18, direction: 'rtl' }}>
    <Img src={staticFile('logo-icon.png')} style={{ width: 64, height: 64, borderRadius: 16, background: C.navy2 }} />
    <div style={{ color: C.white, fontSize: 38, fontWeight: 700 }}>{title}</div>
  </div>
);

// One offer notification card (inside the phone).
export const Notice: React.FC<{ title: string; body: string; delay: number; top: number }> = ({ title, body, delay, top }) => {
  const f = useCurrentFrame();
  const p = pop(f, delay, 13);
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', top: top + (1 - p) * -120, left: 26, right: 26, opacity: Math.min(1, p * 1.4), background: C.white, borderRadius: 30, padding: '24px 30px', boxShadow: '0 14px 40px rgba(7,24,39,.18)', direction: 'rtl', display: 'flex', gap: 22, alignItems: 'center' }}>
      <div style={{ width: 70, height: 70, borderRadius: 20, background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
      </div>
      <div style={{ fontFamily: FONT }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.navy }}>{title}</div>
        <div style={{ fontSize: 26, color: '#4A5B6C', marginTop: 4 }}>{body}</div>
      </div>
    </div>
  );
};

// Closing card shared by every ad.
export const EndCard: React.FC<{ from: number; line: string }> = ({ from, line }) => {
  const f = useCurrentFrame();
  const bg = prog(f, from, from + 14);
  const logo = pop(f, from + 6, 12);
  const t1 = prog(f, from + 16, from + 30);
  const t2 = prog(f, from + 28, from + 42);
  const t3 = prog(f, from + 40, from + 54);
  const shine = interpolate(f, [from + 30, from + 75], [-400, 1400], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (bg <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, ${C.navy3} 0%, ${C.navy} 70%)`, opacity: bg, direction: 'rtl', fontFamily: FONT, alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 430, width: 520, height: 520, transform: `scale(${logo})`, overflow: 'hidden' }}>
        <Img src={staticFile('logo.webp')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: shine, width: 120, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)', transform: 'skewX(-20deg)', mixBlendMode: 'overlay' }} />
      </div>
      <div style={{ position: 'absolute', top: 1040, left: 70, right: 70, textAlign: 'center', opacity: t1, transform: `translateY(${(1 - t1) * 24}px)`, fontSize: 70, fontWeight: 700, color: C.white, lineHeight: 1.35 }}>{line}</div>
      <div style={{ position: 'absolute', top: 1290, left: 0, right: 0, textAlign: 'center', opacity: t2, fontSize: 50, fontWeight: 600, color: C.gold2 }}>سعر السوق بين يديك</div>
      <div style={{ position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: t3, transform: `scale(${0.9 + t3 * 0.1})` }}>
        <div style={{ background: C.gold, color: C.navy, fontSize: 48, fontWeight: 700, padding: '24px 70px', borderRadius: 999 }}>taseerak.com</div>
      </div>
    </AbsoluteFill>
  );
};
