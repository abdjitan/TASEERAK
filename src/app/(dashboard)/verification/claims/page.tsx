'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'

// The current holder's view (171): someone asked for the CR on this account. He sees the
// claimant's name (never the contact or file) and may answer once before the admin decides.
export default function CrClaimsOnMyAccountPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [role, setRole] = useState('contractor')
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState<any[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.rpc('get_my_cr_claims')
    setClaims((data as any[]) || [])
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole(p?.role || 'contractor')
      await load()
      setLoading(false)
    }
    init()
  }, [])

  async function respond(id: string) {
    const text = (drafts[id] || '').trim()
    if (!text) return
    setBusy(id); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.rpc('respond_cr_claim', { p_claim_id: id, p_text: text })
    setBusy('')
    if (error) { setMsg(error.message); return }
    await load()
  }

  if (loading) return <PageLoader />

  const statusLabel = (s: string) => s === 'open' ? L('Under admin review', 'انتظامیہ کے زیرِ جائزہ', 'قيد مراجعة الإدارة')
    : s === 'approved' ? L('Moved to the requester', 'درخواست دہندہ کو منتقل', 'نُقل إلى صاحب الطلب') : s === 'withdrawn' ? L('Withdrawn', 'واپس لیا گیا', 'سُحب الطلب') : L('Rejected', 'مسترد', 'مرفوض')

  return (
    <AppShell title={L('Requests on my registration', 'میری رجسٹریشن پر درخواستیں', 'طلبات على سجلي التجاري')} nav={getNav(role, locale, '/settings')} dir={dir}>
      <div className="max-w-xl mx-auto space-y-3">
        <p className="text-sm text-gray-500 leading-relaxed">
          {L('Someone said the commercial registration on your account is theirs. Tell the admin why it is yours; the admin reviews the documents of both sides and decides. Nothing changes until then.',
             'کسی نے کہا ہے کہ آپ کے اکاؤنٹ کی تجارتی رجسٹریشن اس کی ہے۔ انتظامیہ کو بتائیں کہ یہ آپ کی کیوں ہے؛ انتظامیہ دونوں طرف کی دستاویزات دیکھ کر فیصلہ کرے گی۔ تب تک کچھ نہیں بدلے گا۔',
             'قال شخص إن السجل التجاري المسجّل في حسابك يخصّه. وضّح للإدارة لماذا السجل لك؛ ستراجع الإدارة مستندات الطرفين وتقرر، ولا يتغير شيء قبل ذلك.')}
        </p>
        {msg && <div className="text-sm rounded-xl p-3 bg-red-50 text-red-600 border border-red-200">{msg}</div>}
        {claims.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-3"><Glyph e="📋" /></div>
            <p className="text-gray-500">{L('No requests on your registration.', 'آپ کی رجسٹریشن پر کوئی درخواست نہیں۔', 'لا توجد طلبات على سجلك.')}</p>
          </div>
        ) : claims.map((c: any) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-mono font-bold" style={{ color: '#0B2438' }} dir="ltr">{c.commercial_registration}</span>
              <span className="text-[11px] text-gray-500">{statusLabel(c.status)}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">{L('Requested by', 'درخواست دہندہ', 'صاحب الطلب')}: <b>{c.claimant_name}</b></div>
            <div className="text-[11px] text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleString('ar-SA-u-ca-gregory-nu-latn')}</div>
            {c.holder_response ? (
              <div className="mt-3 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-700"><Glyph e="💬" /> {L('Your answer', 'آپ کا جواب', 'ردّك')}: {c.holder_response}</div>
            ) : c.status === 'open' && (
              <div className="mt-3 space-y-2">
                <textarea value={drafts[c.id] || ''} onChange={(e: any) => setDrafts({ ...drafts, [c.id]: e.target.value })} rows={3} maxLength={2000}
                  className="input-field text-sm" placeholder={L('Why is this registration yours?', 'یہ رجسٹریشن آپ کی کیوں ہے؟', 'لماذا هذا السجل لك؟')} />
                <button type="button" onClick={() => respond(c.id)} disabled={busy === c.id || !(drafts[c.id] || '').trim()}
                  className="px-6 py-2 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: '#D4A543', color: '#0B2438' }}>
                  {busy === c.id ? '…' : L('Send to the admin', 'انتظامیہ کو بھیجیں', 'إرسال إلى الإدارة')}
                </button>
                <div className="text-[11px] text-gray-400">{L('You can answer once.', 'آپ ایک بار جواب دے سکتے ہیں۔', 'يمكنك الرد مرة واحدة.')}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}
