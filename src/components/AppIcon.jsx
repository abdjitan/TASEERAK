// AppIcon — مكوّن أيقونات موحّد للوحات (نفس فكرة الكود المقترح بستايل Tabler،
// لكن برسم SVG داخلي بدون أي مكتبة خارجية: صفر تثبيت، يعمل على جهاز الشركة
// وعلى Vercel بنفس الاستعمال: <AppIcon name=… tone=… variant=… size=… />).

// ألوان PALETTE مطابقة لهوية «تسعيرك» (كحلي + برتقالي + أخضر) بدل البنفسجي الأصلي.
export const PALETTE = {
  brand:   { solid: "#1B2D5B", strong: "#16244a", soft: "rgba(27,45,91,0.10)" },
  success: { solid: "#0F6E56", strong: "#0c5946", soft: "rgba(15,110,86,0.12)" },
  warning: { solid: "#F5831F", strong: "#d96f15", soft: "rgba(245,131,31,0.12)" },
  info:    { solid: "#4F46E5", strong: "#4338CA", soft: "rgba(79,70,229,0.12)" },
  danger:  { solid: "#E11D48", strong: "#BE123C", soft: "rgba(225,29,72,0.12)" },
  neutral: { solid: "#334155", strong: "#1E293B", soft: "rgba(30,41,59,0.10)" },
};

// مسارات SVG (24x24, stroke) — مكافئة لأيقونات Tabler المطلوبة.
const PATHS = {
  orders:     <><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h4" /></>,
  completed:  <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5L15.5 10" /></>,
  offers:     <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></>,
  active:     <path d="M3 12h4l3 8 4-16 3 8h4" />,
  projects:   <><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 17v-3M12 17v-5M15 17v-2" /></>,
  project:    <><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h6" /></>,
  newProject: <><path d="M3 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M12 11v4M10 13h4" /></>,
  pricing:    <><path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1z" /><path d="M9 8h6M9 12h6" /></>,
  waiting:    <><path d="M7 3h10M7 21h10" /><path d="M8 3v3a4 4 0 0 0 8 0V3M8 21v-3a4 4 0 0 1 8 0v3" /></>,
  quoted:     <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
  location:   <><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  results:    <><path d="M5 21V10M12 21V4M19 21v-7" /><path d="M3 21h18" /></>,
  clock:      <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  all:        <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
};

function Glyph({ name, size, stroke, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] || PATHS.orders}
    </svg>
  );
}

export function AppIcon({ name, tone = "brand", variant = "tone", size = 48 }) {
  const c = PALETTE[tone] || PALETTE.brand;
  const glyphSize = Math.round(size * 0.5);
  const radius = Math.round(size * 0.3);
  if (variant === "line") {
    return <Glyph name={name} size={Math.round(size * 0.62)} stroke={1.75} color={c.strong} />;
  }
  const isSolid = variant === "solid";
  return (
    <span style={{ width: size, height: size, borderRadius: radius,
      background: isSolid ? c.solid : c.soft, display: "inline-flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Glyph name={name} size={glyphSize} stroke={1.9} color={isSolid ? "#ffffff" : c.strong} />
    </span>
  );
}
