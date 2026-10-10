/* تسعيرك — Service Worker: web-push notifications + app-shell offline cache */
const CACHE_VERSION = 'taseerak-v1'
const STATIC_CACHE = CACHE_VERSION + '-static'
const PAGE_CACHE = CACHE_VERSION + '-pages'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // نظّف كاشات الإصدارات السابقة عند النشر الجديد
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

// إستراتيجية الجلب:
//  - أصول Next الثابتة (مُجزّأة المحتوى) والأيقونات: cache-first (لا تتغيّر بلا اسم جديد)
//  - تنقّلات الصفحات: network-first مع احتياطي من الكاش (يفتح التطبيق المثبّت بلا نت)
//  - أي شيء آخر (API/Supabase): تمرير مباشر بلا كاش — بيانات حيّة دائماً
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // لا نلمس Supabase/خدمات خارجية

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.png' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/apple-touch-icon.png'

  if (isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      })
    )
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE)
        try {
          const res = await fetch(req)
          if (res.ok) cache.put(req, res.clone())
          return res
        } catch {
          const hit = await cache.match(req)
          if (hit) return hit
          // احتياطي أخير: أي صفحة محفوظة (أفضل من خطأ المتصفح الأبيض)
          const any = await cache.match('/')
          return any || Response.error()
        }
      })()
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'تسعيرك'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || 'taseerak',
    renotify: true,
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Only same-origin paths: a url like "//evil.com" or "https://..." opens the app home instead.
  const raw = (event.notification.data && event.notification.data.url) || '/'
  const target = (typeof raw === 'string' && raw[0] === '/' && raw[1] !== '/' && raw[1] !== '\\') ? raw : '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.focus()
          if ('navigate' in w) { try { w.navigate(target) } catch (e) {} }
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
