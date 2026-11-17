'use client'
// Suspend an account for a period with a message, lift it, or close the account for good
// (owner 2026-11-17, migration 223). A suspended user sees /banned with the message and the end date;
// every action (requests, quotes, awards, messages) is refused by the database meanwhile.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PERIODS = [
  { k: '1', label: 'يوم واحد', days: 1 },
  { k: '7', label: 'أسبوع', days: 7 },
  { k: '30', label: 'شهر', days: 30 },
  { k: '90', label: '3 أشهر', days: 90 },
  { k: 'perm', label: 'دائم', days: 0 },
]

export default function AccountModeration({ userId, bannedUntil, banReason, onChanged }: {
  userId: string
  bannedUntil?: string | null
  banReason?: string | null
  onChanged: () => void
}) {
  const [period, setPeriod] = useState('7')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const banned = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now()
  const permanent = banned && new Date(bannedUntil!).getFullYear() > 9000

  async function ban() {
    if (reason.trim().length < 3) { setMsg('اكتب رسالة للمستخدم توضّح سبب الإيقاف.'); return }
    const p = PERIODS.find((x) => x.k === period)!
    const until = p.days ? new Date(Date.now() + p.days * 86400000).toISOString() : null
    if (!confirm(`إيقاف الحساب ${p.days ? 'لمدة ' + p.label : 'بشكل دائم'}؟`)) return
    setBusy(true); setMsg('')
    const { error } = await createClient().rpc('admin_ban_user', { p_user: userId, p_until: until, p_reason: reason.trim() })
    setBusy(false)
    if (error) { setMsg('تعذّر الإيقاف: ' + error.message); return }
    setReason(''); onChanged()
  }
  async function unban() {
    setBusy(true); setMsg('')
    const { error } = await createClient().rpc('admin_unban_user', { p_user: userId })
    setBusy(false)
    if (error) { setMsg('تعذّر رفع الإيقاف: ' + error.message); return }
    onChanged()
  }
  async function closeAccount() {
    if (!confirm('إلغاء الحساب نهائياً؟ تُحذف بياناته الشخصية ويُغلق الدخول، وتبقى سجلات صفقاته للطرف الآخر. لا يمكن التراجع.')) return
    if (prompt('للتأكيد اكتب: إلغاء') !== 'إلغاء') return
    setBusy(true); setMsg('')
    const r = await fetch('/api/admin/close-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg('تعذّر إلغاء الحساب: ' + (j?.error || r.status)); return }
    onChanged()
  }

  return (
    <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
      {banned ? (
        <div className="text-sm">
          <div className="font-bold text-red-700">الحساب موقوف {permanent ? 'بشكل دائم' : `حتى ${new Date(bannedUntil!).toLocaleString('ar-SA-u-ca-gregory-nu-latn')}`}</div>
          {banReason && <div className="text-gray-700 mt-1">الرسالة: «{banReason}»</div>}
          <button onClick={unban} disabled={busy} className="mt-2 text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>رفع الإيقاف</button>
        </div>
      ) : (
        <div>
          <div className="text-sm font-bold text-red-700 mb-2">إيقاف الحساب</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {PERIODS.map((p) => (
              <button key={p.k} type="button" onClick={() => setPeriod(p.k)}
                className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${period === p.k ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200'}`}>{p.label}</button>
            ))}
          </div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className="input-field text-sm"
            placeholder="رسالة تظهر للمستخدم (سبب الإيقاف)" />
          <button onClick={ban} disabled={busy} className="mt-2 text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-600 disabled:opacity-50">إيقاف</button>
        </div>
      )}
      <div className="pt-3 border-t border-red-200">
        <button onClick={closeAccount} disabled={busy} className="text-xs px-4 py-2 rounded-xl font-semibold border border-red-400 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50">إلغاء الحساب نهائياً</button>
      </div>
      {msg && <p className="text-xs text-red-700">{msg}</p>}
    </div>
  )
}
