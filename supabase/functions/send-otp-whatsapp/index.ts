// send-otp-whatsapp: Supabase Auth "Send SMS" hook that delivers the phone OTP over
// WhatsApp (Meta Cloud API, authentication template with a copy-code button).
// Deployed with verify_jwt=false; auth is the Standard Webhooks signature from Supabase.
//
// Edge function secrets (set in the Supabase dashboard, never in the repo):
//   SEND_SMS_HOOK_SECRET      v1,whsec_...   (generated when the hook is enabled)
//   WHATSAPP_TOKEN            permanent system-user token
//   WHATSAPP_PHONE_NUMBER_ID  sender phone number id
//   WHATSAPP_OTP_TEMPLATE     approved authentication template name (e.g. taseerak_otp)
//   WHATSAPP_OTP_LANG         template language code (default: ar)
import { Webhook } from 'npm:standardwebhooks@1.0.0'

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

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: template,
        language: { code: Deno.env.get('WHATSAPP_OTP_LANG') || 'ar' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: otp }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
      },
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    console.error('whatsapp send failed', res.status, t.slice(0, 500))
    return fail(502, 'تعذّر إرسال الرمز عبر واتساب. تأكد أن الرقم عليه واتساب ثم أعد المحاولة.')
  }
  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
