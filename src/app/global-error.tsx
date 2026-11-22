'use client'
// Last-resort error screen when the root layout itself fails (UX-163). It replaces the whole
// document, so it carries its own <html>/<body> and plain inline styles (no app CSS or providers).
// Arabic first, with a short English line.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#F5F7FA', fontFamily: '"IBM Plex Sans Arabic", Tahoma, Arial, sans-serif', color: '#0B2438' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center', background: '#fff', border: '1px solid #D9E0E8', borderRadius: 24, padding: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/taseerak-metallic-logo.webp" alt="تسعيرك" style={{ height: 72, width: 'auto', margin: '0 auto 20px', display: 'block' }} />
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>حدث خطأ غير متوقع</h1>
          <p style={{ fontSize: 14, color: '#48596E', margin: '0 0 4px' }}>نعتذر، تعذّر عرض هذه الصفحة.</p>
          <p lang="en" dir="ltr" style={{ fontSize: 13, color: '#5B6B7C', margin: '0 0 24px' }}>Sorry, this page could not be shown.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => reset()} style={{ minHeight: 48, padding: '0 24px', borderRadius: 12, border: 0, background: '#D4A543', color: '#071827', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              إعادة المحاولة
            </button>
            <a href="/" style={{ minHeight: 48, padding: '0 24px', borderRadius: 12, border: '1px solid #D9E0E8', color: '#0B2438', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              العودة إلى الرئيسية
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
