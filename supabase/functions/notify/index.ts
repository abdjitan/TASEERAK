// notify: out-of-app delivery for a notification row — web push, mobile-app push (Expo), and
// email when a Resend key is set in notify_config. Called by the DB trigger `deliver_notification`
// via pg_net with an `x-notify-secret` header (deployed with verify_jwt=false; auth
// is the shared secret compared against notify_config.notify_secret).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method' }, 405)
    const secret = req.headers.get('x-notify-secret') || ''
    const { notification_id } = await req.json().catch(() => ({}))
    if (!notification_id) return json({ error: 'bad request' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: cfg } = await supabase.from('notify_config').select('*').eq('id', true).single()
    if (!cfg || !cfg.notify_secret || secret !== cfg.notify_secret) return json({ error: 'unauthorized' }, 401)

    const { data: n } = await supabase.from('notifications').select('*').eq('id', notification_id).single()
    if (!n || !n.user_id) return json({ ok: true, skip: 'no-notification' }, 200)

    // Same-origin path only: an url like "@evil.com/x" or "//evil.com" must not become a link.
    const rawUrl = (n.data && typeof n.data.url === 'string') ? n.data.url : '/'
    const url: string = /^\/(?![\/\\])[^\s"'<>]*$/.test(rawUrl) ? rawUrl : '/'
    let sent = 0, removed = 0, emailed = false, appSent = 0, appRemoved = 0

    // ── Web push ──
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', n.user_id)
    if (subs && subs.length && cfg.vapid_public && cfg.vapid_private) {
      webpush.setVapidDetails(`mailto:${cfg.from_email || 'no-reply@taseerak.com'}`, cfg.vapid_public, cfg.vapid_private)
      const payload = JSON.stringify({ title: n.title, body: n.body || '', url, tag: n.type })
      for (const s of subs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
          sent++
        } catch (e: any) {
          const code = e?.statusCode || 0
          if (code === 404 || code === 410) { await supabase.from('push_subscriptions').delete().eq('id', s.id); removed++ }
        }
      }
    }

    // ── Mobile app push (Expo push service → FCM on Android, APNs on iPhone) ──
    // Tokens come from device_tokens (register_device_token, migration 136). data.url is the web
    // path; the app maps it to its own screen. Tokens Expo reports as DeviceNotRegistered are dropped.
    const { data: devices } = await supabase.from('device_tokens').select('token').eq('user_id', n.user_id)
    if (devices && devices.length) {
      try {
        const messages = devices.slice(0, 100).map((d: any) => ({
          to: d.token, title: n.title, body: n.body || '', data: { url, type: n.type },
          sound: 'default', priority: 'high',
          // R17: a new matching price request uses the app's loud channel (importance MAX, lock screen);
          // older builds without it fall back to 'default'. The admin «no supplier» alert is not one.
          channelId: n.type === 'new_rfq' && !(n.data && n.data.uncovered) ? 'rfq-new' : 'default',
        }))
        const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
        const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN')
        if (expoToken) headers.Authorization = `Bearer ${expoToken}`
        const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(messages) })
        const out = await res.json().catch(() => null)
        const tickets: any[] = Array.isArray(out?.data) ? out.data : []
        for (let i = 0; i < tickets.length; i++) {
          const t = tickets[i]
          if (t?.status === 'ok') appSent++
          else if (t?.details?.error === 'DeviceNotRegistered') {
            await supabase.from('device_tokens').delete().eq('token', messages[i].to); appRemoved++
          }
        }
      } catch (_) { /* app push best-effort */ }
    }

    // ── Email (ops audit 2026-11-01): only what people want by email, spaced out, never when they
    // switched it off (profiles.email_notifications). Chat messages become one «لديك رسائل جديدة»
    // (never the text: it can carry contact details); team copies and admin alerts are not emailed.
    if (cfg.resend_api_key && !(n.data && (n.data.team_copy || n.data.uncovered))) {
      try {
        // type → minimum minutes between two emails of that kind to the same person
        const GAP: Record<string, number> = {
          new_rfq: 60, rfq_offer: 30, new_message: 180, offer_accepted: 0, offer_rejected: 0, rfq_expiring: 0,
          reminder_deliver: 0, reminder_receipt: 0, account_verified: 0, verification_rejected: 0, cr_claim: 0,
        }
        const gap = GAP[n.type]
        const { data: prof } = gap === undefined ? { data: null as any }
          : await supabase.from('profiles').select('email_notifications, preferred_language').eq('id', n.user_id).maybeSingle()
        if (prof && prof.email_notifications !== false) {
          const { data: last } = await supabase.from('email_sends').select('sent_at').eq('user_id', n.user_id).eq('kind', n.type).maybeSingle()
          const due = !last || gap === 0 || (Date.now() - new Date(last.sent_at).getTime()) >= gap * 60000
          const { data: au } = due ? await supabase.auth.admin.getUserById(n.user_id) : { data: null as any }
          const to = au?.user?.email
          if (due && to && !to.endsWith('@deleted.invalid')) {
            const lang = prof.preferred_language === 'en' ? 'en' : prof.preferred_language === 'ur' ? 'ur' : 'ar'
            const T = (en: string, ur: string, ar: string) => (lang === 'en' ? en : lang === 'ur' ? ur : ar)
            const site = Deno.env.get('SITE_URL') || 'https://taseerak.vercel.app'
            const settings = `${site}/settings`
            const isMsg = n.type === 'new_message'
            const title: string = isMsg ? T('You have new messages on Taseerak', 'تسعیرک پر آپ کے نئے پیغامات ہیں', 'لديك رسائل جديدة في تسعيرك') : n.title
            const body: string = isMsg ? T('Open Taseerak to read and reply.', 'پڑھنے اور جواب دینے کے لیے تسعیرک کھولیں۔', 'افتح تسعيرك لقراءتها والرد عليها.') : (n.body || '')
            const open = T('Open Taseerak', 'تسعیرک کھولیں', 'افتح تسعيرك')
            const stop = T('Stop these emails', 'یہ ای میلز بند کریں', 'إيقاف هذه الرسائل')
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${cfg.resend_api_key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: `Taseerak <${cfg.from_email || 'no-reply@taseerak.com'}>`,
                to,
                subject: title,
                headers: { 'List-Unsubscribe': `<${settings}>` },
                text: `${title}\n\n${body}\n\n${open}: ${site}${url}\n\n${stop}: ${settings}`,
                html: `<div dir="${lang === 'en' ? 'ltr' : 'rtl'}" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:auto"><h2 style="color:#0B2438">${escapeHtml(title)}</h2><p style="color:#444">${escapeHtml(body)}</p><a href="${site}${url}" style="display:inline-block;background:#D4A543;color:#071827;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${open}</a><p style="margin-top:28px;font-size:12px"><a href="${settings}" style="color:#999">${stop}</a></p></div>`,
              }),
            })
            emailed = res.ok
            if (res.ok) await supabase.from('email_sends').upsert({ user_id: n.user_id, kind: n.type, sent_at: new Date().toISOString() })
            else await supabase.from('system_errors_log').insert({ context: 'notify:email', message: `${res.status} ${(await res.text().catch(() => '')).slice(0, 400)}`, user_id: n.user_id })
          }
        }
      } catch (e: any) {
        try { await supabase.from('system_errors_log').insert({ context: 'notify:email', message: String(e?.message || e).slice(0, 500), user_id: n.user_id }) } catch (_) { /* ignore */ }
      }
    }

    return json({ ok: true, sent, removed, appSent, appRemoved, emailed }, 200)
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]))
}
