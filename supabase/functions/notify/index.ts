// notify: out-of-app delivery for a notification row — web-push now, email when a
// Resend key is set in notify_config. Called by the DB trigger `deliver_notification`
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

    const url: string = (n.data && typeof n.data.url === 'string') ? n.data.url : '/'
    let sent = 0, removed = 0, emailed = false

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

    // ── Email (best-effort; activates once notify_config.resend_api_key is set) ──
    if (cfg.resend_api_key) {
      try {
        const { data: au } = await supabase.auth.admin.getUserById(n.user_id)
        const to = au?.user?.email
        if (to) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.resend_api_key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `تسعيرك <${cfg.from_email || 'no-reply@taseerak.com'}>`,
              to,
              subject: n.title,
              html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:auto"><h2 style="color:#1B2D5B">${escapeHtml(n.title)}</h2><p style="color:#444">${escapeHtml(n.body || '')}</p><a href="https://taseerak.com${url}" style="display:inline-block;background:#F5831F;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">افتح تسعيرك</a></div>`,
            }),
          })
          emailed = res.ok
        }
      } catch (_) { /* email best-effort */ }
    }

    return json({ ok: true, sent, removed, emailed }, 200)
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
