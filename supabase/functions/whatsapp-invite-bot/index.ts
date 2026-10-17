// whatsapp-invite-bot: WhatsApp Cloud API webhook (coexistence number) for supplier invitations.
// The owner sends the invitation by hand from the WhatsApp Business app; every reply after that comes
// from here: fixed texts for 2 / 3 / «yes», Claude for the rest when ANTHROPIC_API_KEY is set.
// Logic + texts: marketing/supplier-invite/bot (copied here by build-bot-texts.js). Tables: migration 165.
// Deployed with verify_jwt=false: Meta calls it; auth = X-Hub-Signature-256 with WA_APP_SECRET.
// Secrets (owner, dashboard): WA_INVITE_TOKEN, WA_INVITE_PHONE_NUMBER_ID, WA_APP_SECRET,
// WA_VERIFY_TOKEN, ANTHROPIC_API_KEY (optional; without it the fixed texts answer).
// AI cost cap (owner, 2026-10-17): $5 per calendar month (AI_CAP_USD). Every call's tokens are logged
// in invite_messages; before each call the month's cost is summed (invite_ai_tokens_month, migration
// 166). At the cap the fixed texts answer and the admins are notified once that month.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from '@anthropic-ai/sdk'
import { decide } from './replies.mjs'
import { askClaude, costUsd } from './ai.mjs'
import texts from './texts.json' with { type: 'json' }

const GRAPH = Deno.env.get('WA_GRAPH_VERSION') || 'v21.0'
const BASE = Deno.env.get('INVITE_BASE_URL') || 'https://Taseerak.com'
const AI_CAP_USD = Number(Deno.env.get('AI_CAP_USD') || '5')
// Owner messages that open a chat for the bot (the invitation and the one follow-up, messages.js).
const INVITE_PREFIXES = ['السلام عليكم ورحمة الله وبركاته،\nتحية طيبة لفريق', 'السلام عليكم، نذكّركم بدعوة']
const HISTORY_TURNS = 10
const ESCALATION_HOURS = 24

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'GET') {
    // Meta's subscription handshake.
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === Deno.env.get('WA_VERIFY_TOKEN')
    return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('forbidden', { status: 403 })
  }
  if (req.method !== 'POST') return new Response('method', { status: 405 })

  const raw = await req.text()
  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) return new Response('unauthorized', { status: 401 })
  let body: any
  try { body = JSON.parse(raw) } catch { return new Response('bad json', { status: 400 }) }

  // Answer Meta at once; the AI call can take a few seconds.
  EdgeRuntime.waitUntil(handle(body).catch((e) => console.error('invite-bot', e)))
  return new Response('ok', { status: 200 })
})

async function handle(body: any) {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const v = change?.value || {}
      if (change?.field === 'smb_message_echoes') {
        for (const e of v.message_echoes || v.messages || []) await onOwnerEcho(sb, e)
      } else if (change?.field === 'messages') {
        for (const m of v.messages || []) await onInbound(sb, m)
      }
    }
  }
}

// The owner wrote from the app. The invitation (or follow-up) opens the chat for the bot.
async function onOwnerEcho(sb: SupabaseClient, e: any) {
  const phone = digits(e?.to)
  const text: string = e?.text?.body || ''
  if (!phone) return
  const isInvite = INVITE_PREFIXES.some((p) => text.startsWith(p))
  if (isInvite) {
    const shop = text.match(/تحية طيبة لفريق \*(.+?)\*/)?.[1] || null
    await sb.from('invite_chats').upsert({ phone, ...(shop ? { shop_name: shop } : {}), updated_at: new Date().toISOString() }, { onConflict: 'phone' })
  }
  const { data: chat } = await sb.from('invite_chats').select('phone').eq('phone', phone).maybeSingle()
  if (!chat) return
  await sb.from('invite_messages').insert({ phone, role: 'owner', text, wa_message_id: e?.id || null })
  // Anything else the owner types himself pauses the bot in this chat, so it never talks over him.
  if (!isInvite) await sb.from('invite_chats').update({ stage: 'paused', updated_at: new Date().toISOString() }).eq('phone', phone)
}

async function onInbound(sb: SupabaseClient, m: any) {
  const phone = digits(m?.from)
  if (!phone) return
  const { data: chat } = await sb.from('invite_chats').select('*').eq('phone', phone).maybeSingle()
  if (!chat) return // never invited: the owner's other contacts are left alone

  const text: string = m?.type === 'text' ? (m.text?.body || '') : m?.type === 'button' ? (m.button?.text || '') : m?.type === 'interactive' ? (m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '') : ''
  // Meta retries webhooks: the unique wa_message_id makes a second delivery a no-op.
  const { error: dup } = await sb.from('invite_messages').insert({ phone, role: 'shop', text, wa_message_id: m?.id || null })
  if (dup) return

  // Escalated to the owner (migration 167): silent for 24 hours; if he has not written by then, resume.
  let stage = chat.stage
  if (stage === 'escalated' && chat.escalated_at && Date.now() - Date.parse(chat.escalated_at) > ESCALATION_HOURS * 3600e3) stage = 'invited'

  const apiKey = (Deno.env.get('ANTHROPIC_API_KEY') && await underCap(sb)) ? Deno.env.get('ANTHROPIC_API_KEY') : ''
  const d: any = decide(text, { lang: chat.lang, stage }, texts, { ai: !!apiKey })
  let replies: { text: string; image?: string }[] = d.replies
  const next = { ...d.nextState }
  let usage: any = null

  if (d.ai) {
    let r: any = null
    if (apiKey) {
      try {
        r = await askClaude({ client: new Anthropic({ apiKey }), base: BASE, lang: next.lang, history: await history(sb, phone, m?.id), text })
      } catch (e) { console.error('invite-bot ai', e) }
    }
    if (r?.intent === 'interested') next.stage = 'interested'
    if (r?.intent === 'declined') next.stage = 'declined'
    if (r?.intent === 'escalate' && r?.reply) {
      next.stage = 'escalated'
      await escalate(sb, chat, phone, String(r.reason || '').slice(0, 300), text)
    }
    usage = r?.usage || null
    replies = [{ text: r?.reply || (next.stage === 'interested' ? (texts as any).yes[next.lang] : (texts as any).fallback[next.lang]) }]
  }

  for (const rep of replies) {
    await send(phone, { type: 'text', text: { body: rep.text, preview_url: true } })
    if (rep.image) await send(phone, { type: 'image', image: { link: rep.image } })
    await sb.from('invite_messages').insert({ phone, role: 'bot', text: rep.text, ai_input_tokens: usage?.input_tokens ?? null, ai_output_tokens: usage?.output_tokens ?? null })
  }
  await sb.from('invite_chats').update({ lang: next.lang, stage: next.stage, last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('phone', phone)
}

// Last turns of this chat, oldest first, without the message being answered; owner lines skipped
// (the invitation is described to the model in its system note). Must start with the shop.
async function history(sb: SupabaseClient, phone: string, currentId?: string) {
  const { data } = await sb.from('invite_messages').select('role, text, wa_message_id').eq('phone', phone).order('created_at', { ascending: false }).limit(HISTORY_TURNS + 1)
  const turns = (data || []).filter((r: any) => r.role !== 'owner' && r.wa_message_id !== currentId && r.text).reverse()
    .map((r: any) => ({ role: r.role === 'shop' ? 'user' : 'assistant', content: r.text }))
  while (turns.length && turns[0].role !== 'user') turns.shift()
  return turns
}

// Rare hand-off to the owner: record it and notify every admin with the reason and the message.
async function escalate(sb: SupabaseClient, chat: any, phone: string, reason: string, text: string) {
  await sb.from('invite_chats').update({ escalated_at: new Date().toISOString(), escalation_reason: reason || null }).eq('phone', phone)
  const { data: admins } = await sb.from('profiles').select('id').eq('role', 'admin')
  const who = chat.shop_name || `+${phone}`
  const rows = (admins || []).map((a: any) => ({
    user_id: a.id, type: 'new_message',
    title: `محادثة تحتاج ردّك على واتساب: ${who}`,
    body: `${reason || 'حوّلها الرد الآلي إليك'}\nرسالتهم: «${text.slice(0, 200)}»`,
    data: { kind: 'invite_escalation', url: `/admin/invites?phone=${phone}` },
  }))
  if (rows.length) await sb.from('notifications').insert(rows)
}

// This month's AI spend is under the cap. At the cap: notify every admin once per month.
async function underCap(sb: SupabaseClient) {
  const { data, error } = await sb.rpc('invite_ai_tokens_month')
  if (error) { console.error('invite-bot cap', error); return false } // unknown spend: do not risk it
  const row: any = Array.isArray(data) ? data[0] : data
  const spent = costUsd(Number(row?.input_tokens || 0), Number(row?.output_tokens || 0))
  if (spent < AI_CAP_USD) return true

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('data->>kind', 'invite_ai_cap').gte('created_at', monthStart.toISOString())
  if (!count) {
    const { data: admins } = await sb.from('profiles').select('id').eq('role', 'admin')
    const rows = (admins || []).map((a: any) => ({
      user_id: a.id, type: 'new_message',
      title: 'الرد الآلي بلغ حدّ تكلفة الذكاء الاصطناعي لهذا الشهر',
      body: `بلغت تكلفة الردود الذكية هذا الشهر ${spent.toFixed(2)} دولارًا من ${AI_CAP_USD}. يستمر الرد بالنصوص الثابتة حتى بداية الشهر القادم.`,
      data: { kind: 'invite_ai_cap', url: '/admin/invites' },
    }))
    if (rows.length) await sb.from('notifications').insert(rows)
  }
  return false
}

async function send(to: string, payload: Record<string, unknown>) {
  const token = Deno.env.get('WA_INVITE_TOKEN'), phoneId = Deno.env.get('WA_INVITE_PHONE_NUMBER_ID')
  if (!token || !phoneId) { console.warn('invite-bot: WA secrets missing, reply not sent'); return }
  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload }),
  })
  if (!res.ok) console.error('invite-bot send', res.status, await res.text().catch(() => ''))
}

async function validSignature(raw: string, header: string | null) {
  const secret = Deno.env.get('WA_APP_SECRET')
  if (!secret || !header?.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')
  const got = header.slice(7)
  if (got.length !== hex.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ got.charCodeAt(i)
  return diff === 0
}

const digits = (s: unknown) => String(s || '').replace(/\D/g, '')
