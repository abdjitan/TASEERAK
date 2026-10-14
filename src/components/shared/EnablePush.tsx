'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import { pushSupported, pushPermission, enablePush, disablePush, type PushState } from '@/lib/push'
import Glyph from '@/components/shared/Glyph'

// زر تفعيل إشعارات المتصفح. variant='card' للإعدادات، variant='nudge' للافتة باللوحة.
export default function EnablePush({ variant = 'card' }: { variant?: 'card' | 'nudge' }) {
  const [state, setState] = useState<PushState>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const { locale } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)

  useEffect(() => {
    setState(pushPermission())
    ;(async () => {
      if (!pushSupported()) return
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager.getSubscription()
        setSubscribed(!!sub)
      } catch (_) { /* ignore */ }
    })()
  }, [])

  async function turnOn() {
    setBusy(true)
    const r = await enablePush()
    setBusy(false)
    setState(pushPermission())
    if (r.ok) setSubscribed(true)
  }
  async function turnOff() {
    setBusy(true); await disablePush(); setBusy(false); setSubscribed(false)
  }

  if (!pushSupported()) {
    if (variant === 'nudge') return null
    return <div className="text-xs text-gray-400"><Glyph e="🔔" /> {L('Browser notifications are not supported on this device/browser.', 'اس ڈیوائس/براؤزر پر براؤزر نوٹیفکیشن کی سہولت نہیں ہے۔', 'إشعارات المتصفح غير مدعومة على هذا الجهاز/المتصفح.')}</div>
  }

  const active = state === 'granted' && subscribed

  if (variant === 'nudge') {
    if (active || state === 'denied') return null
    return (
      <button onClick={turnOn} disabled={busy} className="flex items-center justify-between gap-3 w-full rounded-2xl p-4 mb-4 text-white hover:shadow-lg transition-shadow disabled:opacity-60" style={{ background: 'linear-gradient(120deg,#0B2438,#0F6E56)' }}>
        <div className="text-start">
          <div className="font-extrabold text-sm"><Glyph e="🔔" /> {L('Turn on browser notifications', 'براؤزر نوٹیفکیشن آن کریں', 'فعّل إشعارات المتصفح')}</div>
          <div className="text-[12px] text-blue-50 mt-0.5">{L('Get new requests and offers instantly, even when the app is closed.', 'نئی درخواستیں اور آفرز فوراً ملیں گی، چاہے ایپ بند ہو۔', 'لتصلك الطلبات والعروض الجديدة فوراً حتى والتطبيق مغلق.')}</div>
        </div>
        <span className="shrink-0 text-sm font-bold bg-white/20 rounded-full px-3 py-1.5">{busy ? '...' : L('Turn on', 'آن کریں', 'تفعيل')}</span>
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="text-sm font-bold text-gray-700"><Glyph e="🔔" /> {L('Browser notifications', 'براؤزر نوٹیفکیشن', 'إشعارات المتصفح')}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {active ? L('On — you will get alerts even when the app is closed.', 'آن ہے — ایپ بند ہونے پر بھی الرٹ ملیں گے۔', 'مُفعّلة — ستصلك التنبيهات حتى والتطبيق مغلق.')
            : state === 'denied' ? L('Blocked — allow them in your browser site settings.', 'بلاک ہے — اپنے براؤزر کی سائٹ سیٹنگز سے آن کریں۔', 'محظورة — فعّلها من إعدادات الموقع في متصفحك.')
            : L('Turn them on to get new requests and offers instantly.', 'آن کریں تاکہ نئی درخواستیں اور آفرز فوراً ملیں۔', 'فعّلها لتصلك الطلبات والعروض الجديدة فوراً.')}
        </div>
      </div>
      {active ? (
        <button onClick={turnOff} disabled={busy} className="text-xs px-4 py-2 rounded-xl font-bold border border-gray-200 text-gray-600 disabled:opacity-50">{busy ? '...' : L('Turn off', 'بند کریں', 'إيقاف')}</button>
      ) : state !== 'denied' ? (
        <button onClick={turnOn} disabled={busy} className="text-xs px-4 py-2 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>{busy ? '...' : L('Turn on', 'آن کریں', 'تفعيل')}</button>
      ) : null}
    </div>
  )
}
