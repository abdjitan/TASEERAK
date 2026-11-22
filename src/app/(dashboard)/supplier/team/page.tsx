'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import Glyph from '@/components/shared/Glyph'
import { arCount } from '@/lib/text'
import { askConfirm } from '@/lib/askConfirm'
import LoadError from '@/components/shared/LoadError'
import { Check } from 'lucide-react'

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
  const [loadFailed, setLoadFailed] = useState(false) // UX-126: a failed load is said, never swallowed
  const failText = L('Something went wrong — please try again.', 'خرابی ہوئی — دوبارہ کوشش کریں۔', 'حدث خطأ، حاول مرة أخرى.')

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setLoadFailed(false)
    const { data, error } = await supabase.rpc('list_company_team')
    if (error) { console.error('list_company_team', error); setLoadFailed(true); setLoading(false); return }
    const j: any = data || {}
    if (!j.ok) { setNotCompany(j.error === 'not_company'); setTeam(null) } else { setTeam(j); setNotCompany(false) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const linkFor = (token: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/team/join/${token}`

  async function createInvite() {
    setBusy('invite'); setMsg('')
    const { data, error } = await createClient().rpc('create_company_invite', { p_role: newRole })
    const j: any = error ? { ok: false } : (data || {})
    if (j.ok) { setLastLink(linkFor(j.token)); await load() }
    else setMsg(j.error === 'too_many_invites'
      ? L('Too many open invitations. Revoke some first.', 'بہت زیادہ دعوتیں کھلی ہیں۔', 'لديك دعوات مفتوحة كثيرة. ألغِ بعضها أولاً.')
      : L('Could not create the link. Try again.', 'لنک نہیں بن سکا۔', 'تعذّر إنشاء الرابط. حاول مرة أخرى.'))
    setBusy('')
  }

  async function revoke(id: string) {
    if (!(await askConfirm(L('Revoke this link? Whoever has it will no longer be able to join.', 'یہ لنک منسوخ کریں؟ جس کے پاس ہے وہ شامل نہیں ہو سکے گا۔', 'إبطال هذا الرابط؟ لن يستطيع من لديه الانضمام به.'), { danger: true, okLabel: L('Revoke the link', 'لنک منسوخ کریں', 'إبطال الرابط'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setBusy(id); setMsg('')
    const { error } = await createClient().rpc('revoke_company_invite', { p_id: id })
    if (error) setMsg(failText)
    await load(); setBusy('')
  }

  async function remove(userId: string, self: boolean) {
    const q = self
      ? L('Leave this company team?', 'ٹیم چھوڑیں؟', 'هل تريد مغادرة فريق الشركة؟')
      : L('Remove this member from the team?', 'رکن کو ہٹائیں؟', 'هل تريد إزالة هذا العضو من الفريق؟')
    if (!(await askConfirm(q, { danger: true, okLabel: self ? L('Yes, leave', 'ہاں، چھوڑیں', 'نعم، غادر') : L('Yes, remove', 'ہاں، ہٹائیں', 'نعم، أزِل'), cancelLabel: L('Go back', 'واپس', 'تراجع') }))) return
    setBusy(userId); setMsg('')
    const { data, error } = await createClient().rpc('remove_company_member', { p_user: userId })
    if (error || !(data as any)?.ok) setMsg(failText)
    else if (self) { window.location.href = '/welcome'; return }
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

        {loadFailed && <LoadError onRetry={() => { setLoading(true); load() }} />}
        {msg && !team?.can_manage && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">{msg}</p>}

        {notCompany && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <div className="text-4xl mb-2"><Glyph e="🏢" /></div>
            <p className="text-sm text-gray-600">{L('Teams are available for company and shop accounts.', 'ٹیم صرف کمپنی اکاؤنٹس کے لیے ہے۔', 'فريق العمل متاح لحسابات الشركات والمحلات.')}</p>
            <Link href="/support?topic=kind" className="inline-flex items-center mt-3 min-h-[44px] px-4 text-sm font-bold text-[#8F6820] hover:underline">{L('Ask support to change the account type', 'اکاؤنٹ کی قسم بدلنے کے لیے سپورٹ سے رابطہ کریں', 'اطلب من الدعم تغيير نوع الحساب')}</Link>
          </div>
        )}

        {team && team.can_manage && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h2 className="font-bold text-navy">{L('Invite a team member', 'رکن کو مدعو کریں', 'دعوة عضو جديد')}</h2>
            <p className="text-[13px] text-gray-600">{L('Each link works once and expires after 7 days. Send it to the employee on WhatsApp.', 'ہر لنک ایک بار اور 7 دن کے لیے۔', 'كل رابط يُستخدم مرة واحدة وينتهي بعد 7 أيام. أرسله إلى الموظف عبر واتساب.')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="input-field w-auto" aria-label={L('Role', 'کردار', 'الدور')}>
                <option value="member">{roleLabel('member')}: {L('prices requests', 'قیمتیں دیتا ہے', 'يسعّر الطلبات')}</option>
                <option value="admin">{roleLabel('admin')}: {L('also invites members', 'اراکین بھی بلاتا ہے', 'يسعّر ويدعو أعضاء')}</option>
              </select>
              <button type="button" onClick={createInvite} disabled={busy === 'invite'} className="min-h-[44px] px-5 rounded-xl font-extrabold text-[#071827] disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
                {busy === 'invite' ? L('Creating…', 'بن رہا ہے…', 'جارٍ الإنشاء…') : L('Create invite link', 'دعوتی لنک بنائیں', 'إنشاء رابط دعوة')}
              </button>
            </div>
            {lastLink && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <div className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-700"><Check className="w-4 h-4" aria-hidden />{L('Link ready', 'لنک تیار', 'الرابط جاهز')}</div>
                <div className="text-xs text-gray-700 break-all" dir="ltr">{lastLink}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copy(lastLink)} className="min-h-[44px] text-sm font-bold px-3 rounded-lg border border-gray-200 bg-white">{copied === lastLink ? L('Copied', 'کاپی ہو گیا', 'تم النسخ') : L('Copy', 'کاپی', 'نسخ')}</button>
                  <a href={waShare(lastLink)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-sm font-bold px-3 rounded-lg text-white" style={{ background: '#0B2438' }}>{L('Send on WhatsApp', 'واٹس ایپ', 'إرسال عبر واتساب')}</a>
                </div>
              </div>
            )}
            {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}

            {(team.invites || []).length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-bold text-gray-500 mb-1.5">{L('Open invitations', 'کھلی دعوتیں', 'دعوات لم تُستخدم بعد')}</div>
                <div className="space-y-1.5">
                  {team.invites.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between gap-2 text-[13px] rounded-lg border border-gray-100 px-3 py-1">
                      <span className="text-gray-600">{roleLabel(i.role)} · {L('expires', 'ختم', 'ينتهي')} {new Date(i.expires_at).toLocaleDateString(locale === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB')}</span>
                      <span className="flex gap-2">
                        <button type="button" onClick={() => copy(linkFor(i.token))} className="min-h-[44px] px-2 font-bold text-navy">{copied === linkFor(i.token) ? L('Copied', 'کاپی ہو گیا', 'تم النسخ') : L('Copy', 'کاپی', 'نسخ')}</button>
                        <button type="button" onClick={() => revoke(i.id)} disabled={busy === i.id} className="min-h-[44px] px-2 font-bold text-red-600">{L('Revoke the link', 'لنک منسوخ کریں', 'إبطال الرابط')}</button>
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
            <h2 className="font-bold text-navy mb-3">{L('Members', 'اراکین', 'الأعضاء')} <span className="ms-1 inline-grid place-items-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-[#0B2438]/10 text-[12px] font-normal">{(team.members || []).length}</span></h2>
            {(team.members || []).length === 0 ? (
              <p className="text-sm text-gray-600">{L('No members yet. Create an invite link above.', 'ابھی کوئی رکن نہیں۔', 'لا يوجد أعضاء بعد. أنشئ رابط دعوة من الأعلى.')}</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {team.members.map((m: any) => {
                  return (
                    <div key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-800 truncate">{m.name || '—'}</div>
                        <div className="text-[12px] text-gray-500">{roleLabel(m.role)}{m.phone ? ` · ${m.phone}` : ''} · {L(`${m.offers} offers`, `${m.offers} آفرز`, (Number(m.offers) || 0) === 0 ? 'لا توجد عروض' : arCount(Number(m.offers), 'عرض واحد', 'عرضان', 'عروض', 'عرضاً'))}</div>
                      </div>
                      {team.can_manage && (
                        <button type="button" onClick={() => remove(m.user_id, false)} disabled={busy === m.user_id} className="min-h-[44px] px-2 text-sm font-bold text-red-600 shrink-0">{L('Remove', 'ہٹائیں', 'إزالة')}</button>
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

        {/* what a team member can and cannot do (persona review: the old note contradicted the deal page) */}
        <div className="text-[12px] text-gray-600 leading-relaxed rounded-xl bg-gray-50 border border-gray-200 p-3">
          <div className="font-bold mb-1" style={{ color: '#0B2438' }}>{L('What team members can do', 'ٹیم ممبر کیا کر سکتے ہیں', 'ما يستطيعه أعضاء الفريق')}</div>
          <ul className="list-disc ps-5 space-y-0.5">
            <li>{L('Price requests in the company name; each offer shows who sent it.', 'کمپنی کے نام سے قیمت دینا؛ ہر آفر پر بھیجنے والے کا نام۔', 'تسعير الطلبات باسم الشركة، ويظهر على كل عرض من أرسله.')}</li>
            <li>{L('See the company deals and their stages.', 'کمپنی کے سودے اور ان کے مراحل دیکھنا۔', 'الاطّلاع على صفقات الشركة ومراحلها.')}</li>
            <li>{L('Only the account owner: managing a deal after the buyer chooses (delivery charges, invoice, delivery), conversations with buyers, specialties, branches and the company profile.', 'صرف اکاؤنٹ کا مالک: خریدار کے انتخاب کے بعد سودے کا انتظام (ڈیلیوری فیس، انوائس، ڈیلیوری)، خریداروں سے بات چیت، سامان، شاخیں اور کمپنی پروفائل۔', 'لصاحب الحساب فقط: إدارة الصفقة بعد اختيار المشتري (رسوم التوصيل والفاتورة والتسليم)، والمحادثات مع المشترين، والتخصصات، والفروع، وملف الشركة.')}</li>
          </ul>
        </div>
      </div>
    </AppShell>
  )
}

function MemberLeave({ onLeave, L }: { onLeave: () => void; L: (en: string, ur: string, ar: string) => string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between gap-3">
      <span className="text-sm text-gray-600">{L('You are a member of this company team.', 'آپ اس ٹیم کے رکن ہیں۔', 'أنت عضو في فريق هذه الشركة.')}</span>
      <button type="button" onClick={onLeave} className="min-h-[44px] px-2 text-sm font-bold text-red-600 shrink-0">{L('Leave team', 'ٹیم چھوڑیں', 'مغادرة الفريق')}</button>
    </div>
  )
}
