// send-otp-whatsapp: Supabase Auth "Send SMS" hook that delivers the phone OTP over
// WhatsApp (Meta Cloud API, authentication template with a copy-code button).
// Deployed with verify_jwt=false; auth is the Standard Webhooks signature from Supabase.
//
// The code goes out in the language the user has the site open in (ar / en / ur): the login
// page records it via set_otp_language() right before requesting the code. If that template
// language isn't approved yet, fall back to Arabic, then English.
//
// Edge function secrets (set in the Supabase dashboard, never in the repo):
//   SEND_SMS_HOOK_SECRET      v1,whsec_...   (generated when the hook is enabled)
//   WHATSAPP_TOKEN            permanent system-user token
//   WHATSAPP_PHONE_NUMBER_ID  sender phone number id
//   WHATSAPP_OTP_TEMPLATE     approved authentication template name (e.g. taseerak_otp)
//   WHATSAPP_OTP_LANG         default language when none is recorded (default: ar)
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const LANGS = ['ar', 'en', 'ur']

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method')
  const payload = await req.text()
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') || '').replace('v1,whsec_', '')
  if (!secret) return fail(500, 'hook secret not configured')

  let data: any
  try {
    data = new Webhook(secret).verify(payload, Object.fromEntries(req.headers))
  } catch (_) {
    return fail(401, 'bad signature')
  }

  const phone = String(data?.user?.phone || '').replace(/[^0-9]/g, '')
  const otp = String(data?.sms?.otp || '')
  if (!phone || !otp) return fail(400, 'missing phone or otp')

  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const template = Deno.env.get('WHATSAPP_OTP_TEMPLATE')
  if (!token || !phoneId || !template) return fail(500, 'whatsapp not configured')

  const lang = await pickLanguage(phone, data?.user?.id)
  const order = [...new Set([lang, 'ar', 'en'])]

  for (const code of order) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: template,
          language: { code },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: otp }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
          ],
        },
      }),
    })
    if (res.ok) return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
    const body = await res.json().catch(() => ({}))
    const errCode = body?.error?.code
    console.error('whatsapp send failed', code, res.status, JSON.stringify(body).slice(0, 500))
    // 132001: template doesn't exist in this language (not approved yet) -> try the next one.
    if (errCode !== 132001) break
  }
  return fail(502, 'تعذّر إرسال الرمز عبر واتساب. تأكد أن الرقم عليه واتساب ثم أعد المحاولة.')
})

async function pickLanguage(phone: string, userId?: string): Promise<string> {
  const fallback = LANGS.includes(Deno.env.get('WHATSAPP_OTP_LANG') || '') ? Deno.env.get('WHATSAPP_OTP_LANG')! : 'ar'
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: rec } = await db.from('otp_language').select('lang').eq('phone', phone).gte('updated_at', since).maybeSingle()
    if (rec?.lang && LANGS.includes(rec.lang)) return rec.lang
    if (userId) {
      const { data: p } = await db.from('profiles').select('preferred_language').eq('id', userId).maybeSingle()
      if (p?.preferred_language && LANGS.includes(p.preferred_language)) return p.preferred_language
    }
  } catch (e) {
    console.error('language lookup failed', String(e))
  }
  return fallback
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
