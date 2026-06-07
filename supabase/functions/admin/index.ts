// Supabase Edge Function: "admin"
// Privileged admin actions, callable ONLY by users whose profile.role === 'admin'.
// The service-role key is auto-injected by Supabase (never shipped to the client).
//
// Actions (POST JSON):
//   { action: 'list_emails' }                              -> { emails: { [userId]: {email, phone, ...} } }
//   { action: 'set_password', userId, newPassword }        -> { ok: true }
//
// Deployed via the Supabase MCP. Re-deploy after editing this file.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
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

    // Set a new password for any account.
    if (body.action === 'set_password') {
      const userId = String(body.userId || '')
      const newPassword = String(body.newPassword || '')
      if (!userId || newPassword.length < 8) return json({ error: 'invalid input (password min 8 chars)' }, 400)
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
