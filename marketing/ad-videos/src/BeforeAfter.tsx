// Ad 3 «قبل وبعد»: the same list priced by the first shop vs. the best offer per item on Taseerak.
// All numbers are illustrative and the frame says so; we never claim a real saving. ~15 s.
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, prog, pop, Rtl, Caption, EndCard } from './theme';

const ROWS = [
  { item: 'حديد تسليح — ٥ طن', before: 14200, after: 13575 },
  { item: 'أسمنت — ٢٠٠ كيس', before: 3400, after: 3100 },
  { item: 'بلك ٢٠ — ٣٠٠٠ حبة', before: 7800, after: 7050 },
  { item: 'رمل — ٤ نقلات', before: 2600, after: 2320 },
];
const ar = (n: number) => Math.round(n).toLocaleString('ar-EG');
const TB = ROWS.reduce((s, r) => s + r.before, 0);
const TA = ROWS.reduce((s, r) => s + r.after, 0);

export const BeforeAfterAd: React.FC = () => {
  const f = useCurrentFrame();
  const afterOn = f >= 175;
  const tableIn = prog(f, 40, 60);
  const totalB = interpolate(f, [70, 140], [0, TB], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const totalA = interpolate(f, [195, 265], [0, TA], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const diff = pop(f, 285, 11);
  return (
    <Rtl style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navy3} 100%)` }}>
      <Caption text="نفس القائمة… مرتين" from={3} to={70} top={180} size={84} />
      <Caption text="قبل: سعر أول محل اتصلت به" from={72} to={172} top={180} size={64} />
      <Caption text="بعد: أفضل عرض لكل مادة في تسعيرك" from={175} to={370} top={180} size={64} color={C.gold2} />

      {f >= 40 && f < 375 && (
        <div style={{ position: 'absolute', top: 400, left: 60, right: 60, opacity: tableIn, fontFamily: FONT }}>
          <div style={{ display: 'flex', fontSize: 34, color: C.muted, padding: '0 30px 18px' }}>
            <div style={{ flex: 1.6 }}>المادة</div>
            <div style={{ flex: 1, textAlign: 'center' }}>قبل</div>
            <div style={{ flex: 1, textAlign: 'center', color: afterOn ? C.gold2 : 'transparent' }}>بعد</div>
          </div>
          {ROWS.map((r, i) => {
            const pb = pop(f, 70 + i * 12, 15);
            const pa = pop(f, 195 + i * 12, 13);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', height: 150, marginBottom: 18, borderRadius: 28, background: 'rgba(255,255,255,.07)', padding: '0 30px' }}>
                <div style={{ flex: 1.6, fontSize: 38, fontWeight: 600 }}>{r.item}</div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 42, opacity: pb, color: afterOn ? C.muted : C.white, textDecoration: afterOn ? 'line-through' : 'none' }}>{ar(r.before)}</div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 46, fontWeight: 700, color: C.gold2, opacity: pa, transform: `scale(${0.6 + pa * 0.4})` }}>{afterOn ? ar(r.after) : ''}</div>
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', height: 160, marginTop: 10, borderRadius: 28, background: C.white, color: C.navy, padding: '0 30px' }}>
            <div style={{ flex: 1.6, fontSize: 44, fontWeight: 700 }}>الإجمالي (ريال)</div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 44, fontWeight: 600, color: afterOn ? '#8A97A6' : C.navy }}>{ar(totalB)}</div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 50, fontWeight: 700, color: C.goldDark }}>{afterOn ? ar(totalA) : ''}</div>
          </div>
          {diff > 0.01 && (
            <div style={{ marginTop: 50, display: 'flex', justifyContent: 'center' }}>
              <div style={{ transform: `scale(${diff})`, background: C.gold, color: C.navy, borderRadius: 999, padding: '26px 60px', fontSize: 52, fontWeight: 700 }}>الفرق: {ar(TB - TA)} ريال</div>
            </div>
          )}
          <div style={{ marginTop: 40, textAlign: 'center', fontSize: 30, color: C.muted }}>أرقام توضيحية، والأسعار الفعلية تحددها عروض الموردين</div>
        </div>
      )}
      <EndCard from={372} line="اطلب كل ما تحتاجه بأفضل أسعار السوق" />
    </Rtl>
  );
};
