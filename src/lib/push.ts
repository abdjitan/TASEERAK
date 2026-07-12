'use client'

import { createClient } from '@/lib/supabase/client'

// إشعارات المتصفح (Web Push) — تسجيل الاشتراك في push_subscriptions ليصل المستخدم
// إشعارٌ حتى لو التطبيق مغلق. المفتاح العام يأتي من get_vapid_public_key (RPC).
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

export function pushPermission(): PushState {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission as PushState
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!pushSupported()) return { ok: false, error: 'unsupported' }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, error: 'denied' }

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { ok: false, error: 'no-session' }
    const { data: vapid } = await supabase.rpc('get_vapid_public_key')
    if (!vapid) return { ok: false, error: 'no-vapid' }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid as string) })
    }
    const j: any = sub.toJSON()
    if (!j?.endpoint || !j?.keys?.p256dh || !j?.keys?.auth) return { ok: false, error: 'bad-subscription' }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: session.user.id,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      user_agent: (navigator.userAgent || '').slice(0, 200),
    }, { onConflict: 'endpoint' })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'error' }
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      const supabase = createClient()
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    }
  } catch (_) { /* best-effort */ }
}
