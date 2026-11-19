// Ad 2 «المحلات تتسابق لك»: you send one request and relax; the shops race to price it. ~15 s.
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, prog, pop, Rtl, Caption, EndCard } from './theme';

const SHOPS = [
  { name: 'محل حديد', item: 'حديد تسليح', speed: 70 },
  { name: 'محل أسمنت', item: 'أسمنت مقاوم', speed: 95 },
  { name: 'مصنع بلك', item: 'بلك ٢٠ سم', speed: 120 },
  { name: 'محل أدوات صحية', item: 'مواسير وخلاطات', speed: 150 },
  { name: 'محل كهرباء', item: 'أسلاك وقواطع', speed: 175 },
];
const START = 95;

const Coffee: React.FC<{ f: number }> = ({ f }) => (
  <svg width="260" height="260" viewBox="0 0 100 100" style={{ position: 'absolute', top: 330, left: 410 }}>
    {[0, 1, 2].map((i) => {
      const y = ((f * 0.6 + i * 12) % 36);
      return <path key={i} d={`M${38 + i * 10} ${36 - y} q4 -5 0 -10 q-4 -5 0 -10`} stroke={C.gold2} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity={1 - y / 36} />;
    })}
    <path d="M24 44h46v22a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16Z" fill={C.gold} />
    <path d="M70 50h6a8 8 0 0 1 0 16h-6" stroke={C.gold} strokeWidth="5" fill="none" />
    <rect x="18" y="84" width="60" height="5" rx="2.5" fill={C.goldDark} />
  </svg>
);

export const RaceAd: React.FC = () => {
  const f = useCurrentFrame();
  const done = SHOPS.filter((s) => f >= START + s.speed).length;
  const listIn = prog(f, START - 15, START);
  return (
    <Rtl style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navy3} 100%)` }}>
      <Caption text="ماذا لو تسابقت المحلات على طلبك؟" from={3} to={90} top={190} size={80} />
      {f < 380 && f >= 60 && <Coffee f={f} />}
      <Caption text="أرسلتَ طلبك… وارتحت" from={92} to={200} top={160} size={70} color={C.gold2} />
      <Caption text="والمحلات تسعّر لك الآن" from={202} to={300} top={160} size={70} />
      <Caption text="دع الأسعار تأتيك" from={302} to={380} top={160} size={84} color={C.gold2} />

      {f >= START - 15 && f < 380 && (
        <>
          <div style={{ position: 'absolute', top: 640, left: 0, right: 0, textAlign: 'center', opacity: listIn, fontSize: 44, color: C.muted }}>
            العروض الواصلة: <span style={{ color: C.gold2, fontWeight: 700, fontSize: 64 }}>{done.toLocaleString('ar-EG')}</span>
          </div>
          {SHOPS.map((s, i) => {
            const p = pop(f, START - 12 + i * 4, 15);
            const bar = interpolate(f, [START, START + s.speed], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const ok = bar >= 1;
            const okPop = pop(f, START + s.speed, 10);
            return (
              <div key={i} style={{ position: 'absolute', top: 760 + i * 190, left: 70, right: 70, height: 160, borderRadius: 32, background: ok ? C.white : 'rgba(255,255,255,.07)', border: `3px solid ${ok ? C.gold : 'rgba(255,255,255,.15)'}`, opacity: p, transform: `translateX(${(1 - p) * 300}px) scale(${ok ? 1 + (1 - okPop) * 0.06 : 1})`, padding: '0 40px', display: 'flex', alignItems: 'center', gap: 30 }}>
                <div style={{ width: 90, height: 90, borderRadius: 45, background: ok ? C.gold : 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ok ? (
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scale(${okPop})` }}><path d="M20 6 9 17l-5-5" /></svg>
                  ) : (
                    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={C.gold2} strokeWidth="2.4" strokeLinecap="round" style={{ transform: `rotate(${f * 9}deg)` }}><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                  )}
                </div>
                <div style={{ flex: 1, fontFamily: FONT }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 40, fontWeight: 700, color: ok ? C.navy : C.white }}>{s.name}</span>
                    <span style={{ fontSize: 32, fontWeight: 600, color: ok ? C.green : C.gold2 }}>{ok ? 'أرسل عرضه' : 'يسعّر الآن…'}</span>
                  </div>
                  <div style={{ fontSize: 28, color: ok ? '#5B6B7C' : C.muted, marginTop: 4 }}>{s.item}</div>
                  {!ok && (
                    <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                      <div style={{ width: `${bar * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.gold}, ${C.gold2})` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
      <EndCard from={378} line="اطلب كل ما تحتاجه بأفضل أسعار السوق" />
    </Rtl>
  );
};
