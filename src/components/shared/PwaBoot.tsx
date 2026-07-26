'use client'

import { useEffect, useState } from 'react'

// ── إقلاع PWA: تسجيل الـService Worker لكل الزوار + حثّ التثبيت ─────────────
// التسجيل كان يحدث فقط عند تفعيل الإشعارات (push.ts)، فلا يظهر حثّ التثبيت
// لأغلب الزوار. هنا نسجّله عند التحميل لكل الصفحات (يشمل صفحة الهبوط)،
// ونلتقط beforeinstallprompt لأندرويد، ونعرض إرشاد «أضف للشاشة الرئيسية» في iOS.
const DISMISS_KEY = 'taseerak_install_dismissed'
const DISMISS_DAYS = 14

const TR: Record<string, { title: string; body: string; install: string; later: string; iosTitle: string; ios1: string; ios2: string }> = {
  ar: {
    title: 'ثبّت تطبيق تسعيرك', body: 'أيقونة على شاشتك، فتح أسرع، وإشعارات فورية بالعروض والطلبات.',
    install: 'تثبيت التطبيق', later: 'لاحقاً',
    iosTitle: 'أضِف تسعيرك لشاشتك الرئيسية',
    ios1: 'اضغط زر المشاركة', ios2: 'ثم اختر «إضافة إلى الشاشة الرئيسية»',
  },
  en: {
    title: 'Install the Taseerak app', body: 'Home-screen icon, faster launch, and instant offer notifications.',
    install: 'Install app', later: 'Later',
    iosTitle: 'Add Taseerak to your Home Screen',
    ios1: 'Tap the Share button', ios2: 'then choose “Add to Home Screen”',
  },
  ur: {
    title: 'تسعيرك ایپ انسٹال کریں', body: 'ہوم اسکرین آئیکن، تیز رفتار، اور فوری اطلاعات۔',
    install: 'ایپ انسٹال کریں', later: 'بعد میں',
    iosTitle: 'تسعيرك کو ہوم اسکرین پر شامل کریں',
    ios1: 'شیئر بٹن دبائیں', ios2: 'پھر «ہوم اسکرین میں شامل کریں» منتخب کریں',
  },
}

export default function PwaBoot() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const [locale, setLocale] = useState('ar')

  useEffect(() => {
    // 1) سجّل الـSW لكل زائر (شرط التثبيت وقاعدة الأوفلاين)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }

    try { setLocale(localStorage.getItem('taseerak_locale') || 'ar') } catch {}

    // مثبّت أصلاً؟ لا تعرض شيئاً
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    if (standalone) return

    // مُغلق حديثاً؟ احترم اختيار المستخدم
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (t && Date.now() - t < DISMISS_DAYS * 86400000) return
    } catch {}

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS) {
      // iOS بلا beforeinstallprompt — إرشاد يدوي بعد مهلة قصيرة
      const t = setTimeout(() => { setIos(true); setShow(true) }, 6000)
      return () => clearTimeout(t)
    }

    // أندرويد/كروم: التقط الحدث واعرض زرّنا
    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!show) return null
  const t = TR[locale] || TR.ar
  const dir = locale === 'en' ? 'ltr' : 'rtl'

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }
  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    setDeferred(null); setShow(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  return (
    <div dir={dir} className="fixed inset-x-3 z-[70] lg:hidden animate-slide-up"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-md rounded-2xl bg-white shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <img src="/icons/maskable-192.png" alt="" className="w-11 h-11 rounded-xl border border-gray-100 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{ios ? t.iosTitle : t.title}</div>
            {ios ? (
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                <span className="inline-flex items-center gap-1">{t.ios1}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><rect x="4" y="11" width="16" height="10" rx="2" /></svg>
                </span>
                <br />{t.ios2}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.body}</p>
            )}
            <div className="flex items-center gap-2 mt-2.5">
              {!ios && (
                <button type="button" onClick={install}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: '#F5831F', boxShadow: '0 8px 20px -6px rgba(245,131,31,.5)' }}>
                  {t.install}
                </button>
              )}
              <button type="button" onClick={dismiss} className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700">
                {t.later}
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="close" className="text-gray-300 hover:text-gray-500 shrink-0 text-lg leading-none">×</button>
        </div>
      </div>
    </div>
  )
}
