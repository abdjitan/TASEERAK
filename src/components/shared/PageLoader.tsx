// @ts-nocheck
'use client'

// Clean, branded full-page loader used while a page's data loads. Replaces the
// old bare "logo on gray + جارٍ التحميل" screens. Lightweight (no canvas):
// floating logo plate + pulsing orange ring + an indeterminate sweep bar.
import { useTranslation } from '@/i18n'

export default function PageLoader({ label }: any) {
  const { locale, dir } = useTranslation()
  const text = label || (locale === 'en' ? 'Loading…' : locale === 'ur' ? 'لوڈ ہو رہا ہے…' : 'جارٍ التحميل…')
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" dir={dir}
      style={{ background: 'radial-gradient(circle at 50% 38%,#16264f,#0a1530 70%)' }}>
      <style>{`
        .pl-plate{width:104px;height:104px;border-radius:26px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 28px 56px -18px rgba(0,0,0,.6);position:relative;animation:plFloat 3s ease-in-out infinite}
        .pl-plate::after{content:"";position:absolute;inset:-7px;border-radius:33px;border:2px solid rgba(245,131,31,.45);animation:plRing 2s ease-in-out infinite}
        .pl-plate img{width:72px;height:72px;object-fit:contain}
        @keyframes plFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes plRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.06);opacity:1}}
        .pl-bar{width:200px;height:5px;border-radius:100px;background:rgba(255,255,255,.12);overflow:hidden;position:relative}
        .pl-bar>span{position:absolute;inset-block:0;width:40%;border-radius:100px;background:linear-gradient(90deg,#F5831F,#ffb05e);box-shadow:0 0 12px rgba(245,131,31,.7);animation:plSweep 1.2s ease-in-out infinite}
        @keyframes plSweep{0%{inset-inline-start:-40%}100%{inset-inline-start:100%}}
        .pl-txt{font-family:'Cairo',sans-serif;font-size:14px;font-weight:600;color:rgba(255,255,255,.72)}
        @media (prefers-reduced-motion: reduce){.pl-plate,.pl-plate::after,.pl-bar>span{animation:none}.pl-bar>span{inset-inline-start:0;width:100%}}
      `}</style>
      <div className="pl-plate"><img src="/logo.png" alt="تسعيرك" /></div>
      <div className="pl-bar"><span /></div>
      <div className="pl-txt">{text}</div>
    </div>
  )
}
