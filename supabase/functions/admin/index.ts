// Supabase Edge Function: "admin"
// Privileged admin actions, callable ONLY by users whose profile.role === 'admin'.
// The service-role key is auto-injected by Supabase (never shipped to the client).
//
// Actions (POST JSON):
//   { action: 'list_emails' }                              -> { emails: { [userId]: {email, phone, ...} } }
//   { action: 'set_password', userId, newPassword }        -> { ok: true }   (never on an admin account)
//   { action: 'set_banned', userId, banned }               -> { ok: true }   (blocks / restores sign-in)
// Both write an audit_logs row. Error texts are generic; details stay in the function log.
//
// Deployed via the Supabase MCP. Re-deploy after editing this file.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Browsers may call this only from the site (and local dev); the origin is echoed only when allowed.
const ALLOWED_ORIGINS = ['https://taseerak.vercel.app', 'http://localhost:3100']
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''

    // Identify the caller from their session JWT.
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: uErr } = await caller.auth.getUser()
    if (uErr || !user) return json({ error: 'unauthorized' }, 401)

    // Service-role client (bypasses RLS) — verify the caller is an admin.
    const admin = createClient(url, service, { auth: { persistSession: false } })
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'admin') return json({ error: 'forbidden: admin only' }, 403)

    const body = await req.json().catch(() => ({}))

    // List all users' emails/phones for the admin panel.
    if (body.action === 'list_emails') {
      const emails: Record<string, unknown> = {}
      let page = 1
      while (page <= 20) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) break
        for (const u of data.users) {
          emails[u.id] = {
            email: u.email,
            phone: u.phone,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed: !!u.email_confirmed_at,
            created_at: u.created_at,
          }
        }
        if (data.users.length < 1000) break
        page++
      }
      return json({ emails })
    }

    const audit = (action: string, entityId: string, detail: Record<string, unknown>) =>
      admin.from('audit_logs').insert({ actor_id: user.id, action, entity: 'profile', entity_id: entityId, detail })
        .then(({ error }) => { if (error) console.error('audit_logs insert failed', action, error.message) })
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // Set a new password for a (non-admin) account.
    if (body.action === 'set_password') {
      const userId = String(body.userId || '')
      const newPassword = String(body.newPassword || '')
      if (!UUID_RE.test(userId) || newPassword.length < 8) return json({ error: 'invalid input (password min 8 chars)' }, 400)
      const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
      // An admin account's password is never set from here (one admin could take over another).
      if (target?.role === 'admin') return json({ error: 'forbidden' }, 403)
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
      if (error) { console.error('set_password failed', error.message); return json({ error: 'could not update the password' }, 400) }
      await audit('admin_set_password', userId, {})
      return json({ ok: true })
    }

    // Block / restore sign-in for an account (deactivating a user in the panel).
    if (body.action === 'set_banned') {
      const userId = String(body.userId || '')
      const banned = body.banned === true
      if (!UUID_RE.test(userId) || typeof body.banned !== 'boolean') return json({ error: 'invalid input' }, 400)
      const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
      if (userId === user.id || target?.role === 'admin') return json({ error: 'forbidden' }, 403)
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: banned ? '876000h' : 'none' })
      if (error) { console.error('set_banned failed', error.message); return json({ error: 'could not update the account' }, 400) }
      await audit(banned ? 'admin_ban_user' : 'admin_unban_user', userId, { banned })
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    console.error('admin function error', String((e as Error)?.message || e))
    return json({ error: 'server error' }, 500)
  }
})
