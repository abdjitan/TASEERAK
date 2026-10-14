'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'

// Company team: the owner (or an admin member) invites sales staff with a one-time link. A
// member signs in with their own account and quotes on behalf of the company; their offers
// belong to the company. Deals after award and conversations stay with the owner for now.
export default function SupplierTeamPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<any>(null)
  const [notCompany, setNotCompany] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member')
  const [lastLink, setLastLink] = useState('')
  const [copied, setCopied] = useState('')

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const { data } = await supabase.rpc('list_company_team')
    const j: any = data || {}
    if (!j.ok) { setNotCompany(j.error === 'not_company'); setTeam(null) } else { setTeam(j); setNotCompany(false) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const linkFor = (token: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/team/join/${token}`

  async function createInvite() {
    setBusy('invite'); setMsg('')
    const { data } = await createClient().rpc('create_company_invite', { p_role: newRole })
    const j: any = data || {}
    if (j.ok) { setLastLink(linkFor(j.token)); await load() }
    else setMsg(j.error === 'too_many_invites'
      ? L('Too many open invitations. Revoke some first.', 'بہت زیادہ دعوتیں کھلی ہیں۔', 'لديك دعوات مفتوحة كثيرة. ألغِ بعضها أولاً.')
      : L('Could not create the link. Try again.', 'لنک نہیں بن سکا۔', 'تعذّر إنشاء الرابط. حاول مرة أخرى.'))
    setBusy('')
  }

  async function revoke(id: string) {
    setBusy(id)
    await createClient().rpc('revoke_company_invite', { p_id: id })
    await load(); setBusy('')
  }

  async function remove(userId: string, self: boolean) {
    const q = self
      ? L('Leave this company team?', 'ٹیم چھوڑیں؟', 'هل تريد مغادرة فريق الشركة؟')
      : L('Remove this member from the team?', 'رکن کو ہٹائیں؟', 'هل تريد إزالة هذا العضو من الفريق؟')
    if (!window.confirm(q)) return
    setBusy(userId)
    const { data } = await createClient().rpc('remove_company_member', { p_user: userId })
    if ((data as any)?.ok && self) { window.location.href = '/welcome'; return }
    await load(); setBusy('')
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 2000) } catch {}
  }
  const waShare = (link: string) => `https://wa.me/?text=${encodeURIComponent(
    L(`Join our team on Taseerak to price requests on behalf of ${team?.company_name || 'the company'}: ${link}`,
      `تسعیرک پر ہماری ٹیم میں شامل ہوں: ${link}`,
      `انضم إلى فريق ${team?.company_name || 'الشركة'} في تسعيرك لتسعير الطلبات باسم الشركة: ${link}`))}`

  const roleLabel = (r: string) => r === 'admin' ? L('Admin', 'ایڈمن', 'مشرف') : L('Sales', 'سیلز', 'مبيعات')

  if (loading) return <PageLoader />

  return (
    <AppShell title={L('Team', 'ٹیم', 'فريق العمل')} nav={getNav('supplier', locale, '/supplier/team')} dir={dir}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-navy"><Glyph e="👥" /> {L('Team', 'ٹیم', 'فريق العمل')}{team?.company_name ? ` · ${team.company_name}` : ''}</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {L('Your sales staff sign in with their own accounts and price requests on behalf of the company. Every offer they send belongs to the company and shows who sent it.',
              'آپ کا عملہ اپنے اکاؤنٹ سے کمپنی کی جانب سے قیمتیں دیتا ہے۔',
              'يدخل موظفو المبيعات بحساباتهم الخاصة ويسعّرون الطلبات باسم الشركة. كل عرض يرسلونه يُسجَّل للشركة مع اسم من أرسله.')}
          </p>
        </div>

        {notCompany && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <div className="text-4xl mb-2"><Glyph e="🏢" /></div>
            <p className="text-sm text-gray-600">{L('Teams are available for company and shop accounts.', 'ٹیم صرف کمپنی اکاؤنٹس کے لیے ہے۔', 'فريق العمل متاح لحسابات الشركات والمحلات.')}</p>
            <Link href="/settings" className="inline-block mt-3 text-sm font-bold text-[#9D7425] hover:underline">{L('Change account type in settings', 'ترتیبات میں تبدیل کریں', 'غيّر نوع الحساب من الإعدادات')}</Link>
          </div>
        )}

        {team && team.can_manage && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h2 className="font-bold text-navy">{L('Invite a team member', 'رکن کو مدعو کریں', 'دعوة عضو جديد')}</h2>
            <p className="text-xs text-gray-500">{L('Each link works once and expires after 7 days. Send it to the employee on WhatsApp.', 'ہر لنک ایک بار اور 7 دن کے لیے۔', 'كل رابط يُستخدم مرة واحدة وينتهي بعد ٧ أيام. أرسله إلى الموظف عبر واتساب.')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="input-field w-auto" aria-label={L('Role', 'کردار', 'الدور')}>
                <option value="member">{roleLabel('member')}: {L('prices requests', 'قیمتیں دیتا ہے', 'يسعّر الطلبات')}</option>
                <option value="admin">{roleLabel('admin')}: {L('also invites members', 'اراکین بھی بلاتا ہے', 'يسعّر ويدعو أعضاء')}</option>
              </select>
              <button type="button" onClick={createInvite} disabled={busy === 'invite'} className="btn-orange px-5 py-2.5 rounded-xl font-bold disabled:opacity-50">
                {busy === 'invite' ? L('Creating…', 'بن رہا ہے…', 'جارٍ الإنشاء…') : L('Create invite link', 'دعوتی لنک بنائیں', 'إنشاء رابط دعوة')}
              </button>
            </div>
            {lastLink && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <div className="text-xs font-bold text-emerald-700">✓ {L('Link ready', 'لنک تیار', 'الرابط جاهز')}</div>
                <div className="text-xs text-gray-700 break-all" dir="ltr">{lastLink}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copy(lastLink)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white">{copied === lastLink ? '✓ ' + L('Copied', 'کاپی', 'تم النسخ') : L('Copy', 'کاپی', 'نسخ')}</button>
                  <a href={waShare(lastLink)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: '#25D366' }}>{L('Send on WhatsApp', 'واٹس ایپ', 'إرسال عبر واتساب')}</a>
                </div>
              </div>
            )}
            {msg && <p className="text-xs text-red-600" role="alert">{msg}</p>}

            {(team.invites || []).length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-bold text-gray-500 mb-1.5">{L('Open invitations', 'کھلی دعوتیں', 'دعوات لم تُستخدم بعد')}</div>
                <div className="space-y-1.5">
                  {team.invites.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-gray-100 px-3 py-2">
                      <span className="text-gray-600">{roleLabel(i.role)} · {L('expires', 'ختم', 'ينتهي')} {new Date(i.expires_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB')}</span>
                      <span className="flex gap-2">
                        <button type="button" onClick={() => copy(linkFor(i.token))} className="font-bold text-navy">{copied === linkFor(i.token) ? '✓' : L('Copy', 'کاپی', 'نسخ')}</button>
                        <button type="button" onClick={() => revoke(i.id)} disabled={busy === i.id} className="font-bold text-red-500">{L('Revoke', 'منسوخ', 'إلغاء')}</button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {team && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-navy mb-3">{L('Members', 'اراکین', 'الأعضاء')} <span className="text-gray-400 font-normal">({(team.members || []).length})</span></h2>
            {(team.members || []).length === 0 ? (
              <p className="text-sm text-gray-400">{L('No members yet. Create an invite link above.', 'ابھی کوئی رکن نہیں۔', 'لا يوجد أعضاء بعد. أنشئ رابط دعوة من الأعلى.')}</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {team.members.map((m: any) => {
                  return (
                    <div key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-800 truncate">{m.name || '—'}</div>
                        <div className="text-[11px] text-gray-400">{roleLabel(m.role)}{m.phone ? ` · ${m.phone}` : ''} · {m.offers} {L('offers', 'آفرز', 'عرض')}</div>
                      </div>
                      {team.can_manage && (
                        <button type="button" onClick={() => remove(m.user_id, false)} disabled={busy === m.user_id} className="text-xs font-bold text-red-500 shrink-0">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {team && !team.is_owner && (
          <MemberLeave onLeave={async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) remove(user.id, true)
          }} L={L} />
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          {L('Note: after an offer is accepted, the deal (delivery, invoice) and conversations with the buyer are handled from the company owner account.',
            'نوٹ: آفر قبول ہونے کے بعد ڈیل کمپنی مالک کے اکاؤنٹ سے ہوتی ہے۔',
            'ملاحظة: بعد قبول العرض، تُدار الصفقة (التوصيل والفاتورة) والمحادثات مع المشتري من حساب مالك الشركة.')}
        </p>
      </div>
    </AppShell>
  )
}

function MemberLeave({ onLeave, L }: { onLeave: () => void; L: (en: string, ur: string, ar: string) => string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between gap-3">
      <span className="text-sm text-gray-600">{L('You are a member of this company team.', 'آپ اس ٹیم کے رکن ہیں۔', 'أنت عضو في فريق هذه الشركة.')}</span>
      <button type="button" onClick={onLeave} className="text-xs font-bold text-red-500 shrink-0">{L('Leave team', 'ٹیم چھوڑیں', 'مغادرة الفريق')}</button>
    </div>
  )
}
