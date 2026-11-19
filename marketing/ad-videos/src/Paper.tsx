// Ad 1 «الورقة»: the contractor's handwritten materials list. Calling shop after shop vs. one photo in
// Taseerak and the offers come to him. ~20 s.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, FONT, HAND, prog, pop, Rtl, Caption, Phone, AppBar, Notice, EndCard } from './theme';

const ITEMS = ['حديد تسليح ١٦ مم — ٥ طن', 'أسمنت مقاوم — ٢٠٠ كيس', 'بلك ٢٠ سم — ٣٠٠٠ حبة', 'رمل أحمر — ٤ نقلات', 'سلك رباط — ١٠ لفات'];

const PaperSheet: React.FC<{ strike?: number; scale?: number; rot?: number; y?: number; opacity?: number }> = ({ strike = 0, scale = 1, rot = -4, y = 980, opacity = 1 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 540 - 400, top: y - 520, width: 800, height: 1040, transform: `rotate(${rot}deg) scale(${scale})`, opacity, background: C.paper, borderRadius: 10, boxShadow: '0 30px 80px rgba(0,0,0,.45)', backgroundImage: 'repeating-linear-gradient(transparent 0 118px, #C9D6E8 118px 121px)', backgroundPosition: '0 150px', direction: 'rtl', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 80%, rgba(120,90,40,.18), transparent 40%), radial-gradient(circle at 85% 15%, rgba(120,90,40,.12), transparent 35%)' }} />
      <div style={{ position: 'absolute', top: 60, right: 70, fontFamily: HAND, fontSize: 64, color: C.ink, fontWeight: 700 }}>طلبية الموقع</div>
      {ITEMS.map((t, i) => {
        const reveal = prog(f, 8 + i * 9, 20 + i * 9);
        const s = Math.max(0, Math.min(1, strike * ITEMS.length - i));
        return (
          <div key={i} style={{ position: 'absolute', top: 205 + i * 121, right: 70, fontFamily: HAND, fontSize: 58, color: C.ink, clipPath: `inset(0 0 0 ${(1 - reveal) * 100}%)` }}>
            {t}
            <div style={{ position: 'absolute', top: '52%', right: 0, height: 6, width: `${s * 100}%`, background: '#B3261E', borderRadius: 3, transform: 'rotate(-1deg)' }} />
          </div>
        );
      })}
    </div>
  );
};

const CALLS = ['مغلق', 'لا يرد', 'سأعود إليك', 'السعر تغيّر', 'غير متوفر', 'اتصل بعد العصر'];

const Calls: React.FC = () => {
  const f = useCurrentFrame();
  const local = f - 80;
  const count = Math.min(19, Math.max(1, Math.floor(interpolate(local, [0, 120], [1, 19.9], { extrapolateRight: 'clamp' }))));
  const shake = Math.sin(local * 1.9) * 7 * (local % 20 < 12 ? 1 : 0);
  return (
    <>
      <div style={{ position: 'absolute', top: 1520, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34 }}>
        <div style={{ width: 150, height: 150, borderRadius: 75, background: '#B3261E', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${shake}deg)`, boxShadow: '0 16px 40px rgba(0,0,0,.4)' }}>
          <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
        </div>
        <div style={{ fontFamily: FONT, color: C.white }}>
          <div style={{ fontSize: 40, color: C.muted }}>عدد المكالمات</div>
          <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1 }}>{count.toLocaleString('ar-EG')}</div>
        </div>
      </div>
      {CALLS.map((t, i) => {
        const p = pop(f, 88 + i * 19, 12);
        const out = prog(f, 88 + i * 19 + 30, 88 + i * 19 + 40);
        if (p <= 0.01 || out >= 1) return null;
        const left = i % 2 ? 120 : 520;
        return (
          <div key={i} style={{ position: 'absolute', top: 380 + (i % 3) * 120, left, opacity: (1 - out), transform: `scale(${p})`, background: C.white, color: C.navy, fontFamily: FONT, fontSize: 46, fontWeight: 600, padding: '18px 38px', borderRadius: 40, boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}>
            {t}
          </div>
        );
      })}
    </>
  );
};

// Inside the phone: the camera frame over the list, a flash, then the parsed list.
const PhoneScreen: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [262, 266, 280], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const parsed = f >= 266;
  return (
    <AbsoluteFill style={{ direction: 'rtl', fontFamily: FONT }}>
      {!parsed ? (
        <AbsoluteFill style={{ background: '#222' }}>
          <div style={{ position: 'absolute', inset: '200px 60px 300px', border: `6px solid ${C.gold}`, borderRadius: 30, background: C.paper, opacity: 0.95 }}>
            {ITEMS.map((t, i) => <div key={i} style={{ fontFamily: HAND, fontSize: 34, color: C.ink, margin: '34px 30px 0' }}>{t}</div>)}
          </div>
          <div style={{ position: 'absolute', bottom: 90, left: '50%', marginLeft: -60, width: 120, height: 120, borderRadius: 60, border: '8px solid #fff', background: f > 255 ? C.gold : 'transparent' }} />
          <div style={{ position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 32 }}>صوّر قائمتك</div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: '#F5F7FA' }}>
          <AppBar title="طلب تسعير جديد" />
          {ITEMS.map((t, i) => {
            const p = pop(f, 270 + i * 4, 14);
            const [name, qty] = t.split(' — ');
            return (
              <div key={i} style={{ position: 'absolute', top: 230 + i * 128, left: 30, right: 30, height: 108, background: '#fff', borderRadius: 24, boxShadow: '0 6px 18px rgba(7,24,39,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', opacity: p, transform: `translateX(${(1 - p) * -200}px)` }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: C.navy }}>{name}</div>
                <div style={{ fontSize: 28, color: C.goldDark, fontWeight: 600 }}>{qty}</div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', bottom: 70, left: 30, right: 30, height: 110, borderRadius: 30, background: C.gold, color: C.navy, fontSize: 38, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${f > 300 && f < 308 ? 0.94 : 1})` }}>أرسل الطلب</div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </AbsoluteFill>
  );
};

const OFFERS = [
  { name: 'مورد الحديد أ', price: '٢٬٨٤٠', best: false },
  { name: 'مورد الحديد ب', price: '٢٬٧١٥', best: true },
  { name: 'مورد الحديد ج', price: '٢٬٧٩٠', best: false },
];

const OffersScreen: React.FC = () => {
  const f = useCurrentFrame();
  const showCompare = f >= 410;
  const glow = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <AbsoluteFill style={{ direction: 'rtl', fontFamily: FONT, background: '#EEF2F6' }}>
      <AppBar title={showCompare ? 'قارن العروض' : 'طلبك'} />
      {!showCompare ? (
        <>
          <Notice delay={330} top={230} title="عرض جديد على الحديد" body="مورد من تخصص الحديد" />
          <Notice delay={345} top={400} title="عرض جديد على الأسمنت" body="مورد من تخصص الأسمنت" />
          <Notice delay={360} top={570} title="عرض جديد على البلك" body="مورد من تخصص البلك" />
          <Notice delay={372} top={740} title="عرضان جديدان على الحديد" body="أصبح لديك ٣ عروض" />
          <Notice delay={384} top={910} title="عرض جديد على الرمل" body="مورد من تخصص الرمل" />
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', top: 230, right: 36, fontSize: 36, fontWeight: 700, color: C.navy }}>حديد تسليح ١٦ مم — ٥ طن</div>
          <div style={{ position: 'absolute', top: 285, right: 36, fontSize: 24, color: '#6B7B8C' }}>السعر للطن بالريال (مثال توضيحي)</div>
          {OFFERS.map((o, i) => {
            const p = pop(f, 414 + i * 6, 14);
            return (
              <div key={i} style={{ position: 'absolute', top: 350 + i * 170, left: 30, right: 30, height: 145, borderRadius: 28, background: o.best ? C.navy : '#fff', border: o.best ? `4px solid ${C.gold}` : '4px solid transparent', boxShadow: o.best ? `0 0 ${30 + glow * 30}px rgba(212,165,67,.6)` : '0 6px 18px rgba(7,24,39,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px', opacity: p, transform: `scale(${0.85 + p * 0.15})` }}>
                <div>
                  <div style={{ fontSize: 34, fontWeight: 700, color: o.best ? C.white : C.navy }}>{o.name}</div>
                  {o.best && <div style={{ fontSize: 26, color: C.gold2, fontWeight: 600, marginTop: 6 }}>أفضل عرض</div>}
                </div>
                <div style={{ fontSize: 50, fontWeight: 700, color: o.best ? C.gold2 : C.navy }}>{o.price}</div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', top: 880, left: 30, right: 30, height: 110, borderRadius: 30, background: C.gold, color: C.navy, fontSize: 38, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: prog(f, 440, 452) }}>اختر أفضل عرض لكل مادة</div>
        </>
      )}
    </AbsoluteFill>
  );
};

export const PaperAd: React.FC = () => {
  const f = useCurrentFrame();
  const bgShift = interpolate(f, [0, 600], [0, 60]);
  const paperOut = prog(f, 205, 235, Easing.inOut(Easing.cubic));
  const phoneIn = prog(f, 215, 245, Easing.out(Easing.back(1.2)));
  const strike = prog(f, 90, 205, Easing.linear);
  return (
    <Rtl style={{ background: `linear-gradient(${170 + bgShift / 6}deg, ${C.navy} 0%, ${C.navy3} 100%)` }}>
      {/* Scene 1–2: the paper and the endless calls */}
      {f < 245 && <PaperSheet strike={strike} scale={1 - paperOut * 0.4} y={980 - paperOut * 150} opacity={1 - paperOut} rot={-4 + Math.sin(f / 30) * 1.2} />}
      <Caption text="كم مكالمة تحتاج لتعرف سعر السوق؟" from={4} to={95} top={150} />
      {f >= 80 && f < 215 && <Calls />}
      <Caption text="محل بعد محل… والوقت يضيع" from={100} to={210} top={150} size={70} color={C.gold2} />

      {/* Scene 3–4: one photo in Taseerak, the offers come to you */}
      {f >= 215 && f < 490 && (
        <Phone y={1100 + (1 - phoneIn) * 900} scale={1}>
          {f < 320 ? <PhoneScreen /> : <OffersScreen />}
        </Phone>
      )}
      <Caption text="صوّر القائمة في تسعيرك" from={235} to={320} top={150} />
      <Caption text="والعروض تصلك أنت" from={322} to={405} top={150} color={C.gold2} />
      <Caption text="قارن، واختر الأفضل لكل مادة" from={408} to={490} top={150} />

      {/* Scene 5: end card */}
      <EndCard from={488} line="طلب واحد… وأفضل عروض السوق بين يديك" />
    </Rtl>
  );
};
