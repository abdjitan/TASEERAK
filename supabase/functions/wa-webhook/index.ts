// wa-webhook: the WhatsApp Cloud API webhook for app 5079474582271556 (owner 2026-11-14).
//  - GET: Meta's subscription handshake (WA_VERIFY_TOKEN).
//  - POST from Meta (X-Hub-Signature-256 with WA_APP_SECRET):
//      statuses → the phone_confirmed check: delivered/read = the number has WhatsApp
//      (profiles.whatsapp_verified_at); error 131026 = no WhatsApp on that number.
//      messages / echoes → forwarded unchanged to whatsapp-invite-bot (supplier-invite replies).
//  - POST ?action=check {user_id} with the service-role key (from /api/phone/confirm):
//      sends the phone_confirmed template to the user's verified phone.
// Deployed with verify_jwt=false.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = 'v21.0'
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && !!Deno.env.get('WA_VERIFY_TOKEN')
      && url.searchParams.get('hub.verify_token') === Deno.env.get('WA_VERIFY_TOKEN')
    return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('forbidden', { status: 403 })
  }
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  if (url.searchParams.get('action') === 'check') {
    const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!auth || auth !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return new Response('unauthorized', { status: 401 })
    const { user_id } = await req.json().catch(() => ({}))
    return json(await sendCheck(sb, String(user_id || '')))
  }

  const raw = await req.text()
  const sig = req.headers.get('x-hub-signature-256')
  if (!(await validSignature(raw, sig))) return new Response('unauthorized', { status: 401 })
  let body: any
  try { body = JSON.parse(raw) } catch { return new Response('bad json', { status: 400 }) }

  let forward = false
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const v = change?.value || {}
      if (change?.field === 'smb_message_echoes' || (v.messages && v.messages.length)) forward = true
      for (const s of v.statuses || []) EdgeRuntime.waitUntil(onStatus(sb, s).catch((e) => console.error('wa-webhook status', e)))
      if (change?.field === 'messages') {
        const names: Record<string, string> = {}
        for (const c of v.contacts || []) if (c?.wa_id) names[String(c.wa_id)] = String(c?.profile?.name || '')
        for (const m of v.messages || []) EdgeRuntime.waitUntil(onInbound(sb, m, names).catch((e) => console.error('wa-webhook inbound', e)))
      }
    }
  }
  if (forward) {
    // the supplier-invite bot keeps handling replies; same body and signature so it can verify it
    EdgeRuntime.waitUntil(fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-invite-bot`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(sig ? { 'x-hub-signature-256': sig } : {}) }, body: raw,
    }).then(() => {}, (e) => console.error('wa-webhook forward', e)))
  }
  return new Response('ok', { status: 200 })
})

// Someone wrote to the Taseerak number: keep the message (admins read it, migration 209) and send
// one free welcome reply per number per 24 h. Invited shops (invite_chats) are the invite bot's.
const WELCOME = 'أهلاً بك في تسعيرك.\n\nهذا الرقم مخصّص لإشعارات المنصة.\n• لطلب أسعار مواد البناء أو للتسجيل كمورد: https://taseerak.com\n• للمساعدة: راسلنا من «الدعم والرسائل» داخل حسابك، أو على info@taseerak.com\n\nWelcome to Taseerak. This number sends platform notifications. Visit https://taseerak.com or email info@taseerak.com for help.'

async function onInbound(sb: any, m: any, names: Record<string, string>) {
  const phone = String(m?.from || '').replace(/\D/g, '')
  if (!phone) return
  const text = m?.text?.body || m?.button?.text || m?.interactive?.button_reply?.title || m?.interactive?.list_reply?.title || null
  const name = names[phone] || null
  await sb.from('wa_inbound_messages').upsert({ phone, name, type: m?.type || null, text: text ? String(text).slice(0, 2000) : null, wa_message_id: m?.id || null }, { onConflict: 'wa_message_id', ignoreDuplicates: true })
  const { data: invited } = await sb.from('invite_chats').select('phone').eq('phone', phone).maybeSingle()
  const { data: c } = await sb.from('wa_inbound_contacts').select('last_auto_reply_at').eq('phone', phone).maybeSingle()
  const now = new Date()
  const due = !invited && (!c?.last_auto_reply_at || now.getTime() - new Date(c.last_auto_reply_at).getTime() > 24 * 3600 * 1000)
  await sb.from('wa_inbound_contacts').upsert({ phone, ...(name ? { name } : {}), last_message_at: now.toISOString(), ...(due ? { last_auto_reply_at: now.toISOString() } : {}) }, { onConflict: 'phone' })
  if (!due) return
  const token = Deno.env.get('WHATSAPP_TOKEN') || ''
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''
  if (!token || !phoneId) return
  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: WELCOME, preview_url: false } }),
  })
  if (!res.ok) await sb.from('system_errors_log').insert({ context: 'wa-webhook:welcome', message: `${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`.split(token).join('[token]') })
}

async function onStatus(sb: any, s: any) {
  const id = s?.id
  if (!id) return
  const { data: p } = await sb.from('profiles').select('id, wa_check_status').eq('wa_check_msg_id', id).maybeSingle()
  if (!p) return // a notification, not a phone check
  const st = String(s.status || '')
  if (st === 'delivered' || st === 'read') {
    await sb.from('profiles').update({ wa_check_status: st, whatsapp_verified_at: new Date().toISOString() }).eq('id', p.id)
  } else if (st === 'failed') {
    const code = Number(s?.errors?.[0]?.code || 0)
    await sb.from('profiles').update({ wa_check_status: code === 131026 ? 'no_whatsapp' : 'failed' }).eq('id', p.id)
    await sb.from('system_errors_log').insert({ context: 'wa-webhook:phone_check', message: JSON.stringify(s?.errors || []).slice(0, 400), user_id: p.id })
  } else if (st === 'sent' && !p.wa_check_status) {
    await sb.from('profiles').update({ wa_check_status: 'sent' }).eq('id', p.id)
  }
}

async function sendCheck(sb: any, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: 'bad user' }
  const token = Deno.env.get('WHATSAPP_TOKEN') || ''
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''
  if (!token || !phoneId) return { ok: false, error: 'config' }
  const { data: p } = await sb.from('profiles').select('phone, phone_verified_at, preferred_language').eq('id', userId).maybeSingle()
  const to = String(p?.phone || '').replace(/\D/g, '')
  if (!p?.phone_verified_at || !/^\d{11,15}$/.test(to)) return { ok: false, error: 'not verified' }
  const lang = p.preferred_language === 'en' ? 'en' : p.preferred_language === 'ur' ? 'ur' : 'ar'
  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: 'phone_confirmed', language: { code: lang } } }),
  })
  const out: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = Number(out?.error?.code || 0)
    await sb.from('profiles').update({ wa_check_status: code === 131026 ? 'no_whatsapp' : 'failed' }).eq('id', userId)
    await sb.from('system_errors_log').insert({ context: 'wa-webhook:send_check', message: `${res.status} ${JSON.stringify(out?.error || out).slice(0, 400)}`.split(token).join('[token]'), user_id: userId })
    return { ok: false, error: 'send', code }
  }
  await sb.from('profiles').update({ wa_check_msg_id: out?.messages?.[0]?.id || null, wa_check_status: 'sent' }).eq('id', userId)
  return { ok: true }
}

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  const secret = Deno.env.get('WA_APP_SECRET')
  if (!secret || !header?.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, '0')).join('')
  const got = header.slice(7)
  if (got.length !== hex.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ got.charCodeAt(i)
  return diff === 0
}

function json(o: unknown) { return new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } }) }
