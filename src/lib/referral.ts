// «ادعُ من تعرفه» (migration 159). An invite link carries ?ref=<code>; the code is kept on this
// device until the new account is signed in, then claimed once (claim_referral links the accounts).
const KEY = 'tsk_ref'

// Called on the register/login pages: remember ?ref= from the link.
export function captureRef() {
  try {
    const r = new URLSearchParams(window.location.search).get('ref')
    if (r && /^[a-z0-9]{4,12}$/i.test(r)) localStorage.setItem(KEY, r.toLowerCase())
  } catch {}
}

// Called once a session exists: link the new account to whoever invited it, then forget the code.
export async function claimPendingRef(supabase: any) {
  let code: string | null = null
  try { code = localStorage.getItem(KEY) } catch {}
  if (!code) return
  try {
    const { error } = await supabase.rpc('claim_referral', { p_code: code })
    if (!error) localStorage.removeItem(KEY)
  } catch {}
}

// The link a person shares; `role` pre-selects the account type on the signup page.
export function inviteLink(code: string, role: 'supplier' | 'contractor') {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://taseerak.vercel.app'
  return `${origin}/register?role=${role}&ref=${encodeURIComponent(code)}`
}
