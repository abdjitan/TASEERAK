'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { inviteLink } from '@/lib/referral'
import { MessageCircle, Copy, Share2, Check, UserPlus } from 'lucide-react'

// «ادعُ من تعرفه» (owner 2026-10-17): buyers and suppliers invite people they know. The link opens
// the signup page with the account type chosen; the new account is linked to the inviter
// (migration 159) and the inviter sees how many joined.
export default function InviteFriendsPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('contractor')
  const [code, setCode] = useState('')
  const [joined, setJoined] = useState(0)
  const [who, setWho] = useState<'supplier' | 'contractor'>('supplier')
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const [{ data: prof }, { data: inv, error }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', session.user.id).single(),
        supabase.rpc('my_invite'),
      ])
      const r = prof?.role || 'contractor'
      setRole(r)
      // a supplier usually knows other suppliers; a buyer knows other buyers
      setWho(r === 'supplier' ? 'supplier' : 'contractor')
      if (error || !inv) setFailed(true)
      else { setCode((inv as any).code || ''); setJoined(Number((inv as any).joined) || 0) }
      setLoading(false)
    })()
  }, [])

  if (loading) return <PageLoader />

  const link = code ? inviteLink(code, who) : ''
  // the message is in Arabic, the language the invited person most likely reads
  const message = who === 'supplier'
    ? `أدعوك للانضمام إلى «تسعيرك»: تصلك طلبات تسعير مواد البناء من المشترين في منطقتك، وتسعّر ما تبيعه فقط. التسجيل مجاني:\n${link}`
    : `أدعوك لتجربة «تسعيرك»: أرسل قائمة مواد البناء التي تحتاجها، وتصلك أسعار عدة موردين لتختار الأنسب. التسجيل مجاني:\n${link}`

  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  async function share() {
    try { if ((navigator as any).share) await (navigator as any).share({ title: 'تسعيرك', text: message }); else await copy() } catch {}
  }
  const navRole = role === 'admin' ? 'admin' : role === 'supplier' ? 'supplier' : 'contractor'

  return (
    <AppShell title={L('Invite someone you know', 'کسی جاننے والے کو دعوت دیں', 'ادعُ من تعرفه')} nav={getNav(navRole, locale, '/invite-friends')} dir={dir}>
      <div className="max-w-xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: '#D4A54322', color: '#9D7425' }}><UserPlus className="w-5 h-5" /></span>
            <div>
              <h1 className="text-lg font-extrabold" style={{ color: '#0B2438' }}>{L('Invite someone you know', 'کسی جاننے والے کو دعوت دیں', 'ادعُ من تعرفه')}</h1>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {L('Send a link to a supplier or a buyer you know. More suppliers mean more prices for every request; more buyers mean more requests for every supplier.',
                  'کسی جاننے والے سپلائر یا خریدار کو لنک بھیجیں۔ زیادہ سپلائرز یعنی ہر درخواست پر زیادہ قیمتیں؛ زیادہ خریدار یعنی ہر سپلائر کو زیادہ درخواستیں۔',
                  'أرسل رابطاً لمورد أو مشترٍ تعرفه. كلما زاد الموردون زادت الأسعار على كل طلب، وكلما زاد المشترون زادت الطلبات لكل مورد.')}
              </p>
            </div>
          </div>

          {failed ? (
            <p role="alert" className="mt-5 text-sm rounded-xl bg-red-50 border border-red-200 text-red-700 p-3">{L('Could not load your invite link — please try again.', 'دعوتی لنک نہیں کھل سکا — دوبارہ کوشش کریں۔', 'تعذّر تحميل رابط الدعوة — حاول مرة ثانية.')}</p>
          ) : (<>
            <div className="mt-5">
              <div className="text-sm font-bold mb-2" style={{ color: '#0B2438' }}>{L('Who are you inviting?', 'آپ کس کو دعوت دے رہے ہیں؟', 'من تدعو؟')}</div>
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {([['supplier', L('A supplier', 'سپلائر', 'مورداً'), L('a shop, factory or seller', 'دکان، فیکٹری یا بیچنے والا', 'محل أو مصنع أو بائع')], ['contractor', L('A buyer', 'خریدار', 'مشترياً'), L('a contractor or a customer', 'ٹھیکیدار یا گاہک', 'مقاول أو عميل')]] as const).map(([k, label, hint]) => (
                  <button key={k} type="button" role="radio" aria-checked={who === k} onClick={() => setWho(k)}
                    className={`text-start px-3 py-2.5 rounded-xl border-2 min-h-[44px] ${who === k ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-gray-200 bg-white'}`}>
                    <div className="text-sm font-bold" style={{ color: who === k ? '#0F6E56' : '#0B2438' }}>{label}</div>
                    <div className="text-[12px] text-gray-500">{hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed" dir="rtl">{message}</div>

            <div className="mt-4 grid gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl font-bold text-white" style={{ background: '#0F6E56' }}>
                <MessageCircle className="w-5 h-5" /> {L('Send on WhatsApp', 'واٹس ایپ پر بھیجیں', 'أرسل عبر واتساب')}
              </a>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copy} className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl font-bold border-2 border-gray-200 text-[#0B2438]">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? L('Copied', 'کاپی ہو گیا', 'تمّ النسخ') : L('Copy', 'کاپی', 'نسخ')}
                </button>
                <button type="button" onClick={share} className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl font-bold border-2 border-gray-200 text-[#0B2438]">
                  <Share2 className="w-4 h-4" /> {L('Share', 'شیئر', 'مشاركة')}
                </button>
              </div>
            </div>
          </>)}
        </div>

        {!failed && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold" style={{ color: '#0B2438' }}>{L('Joined through your invite', 'آپ کی دعوت سے شامل ہوئے', 'انضمّوا عن طريق دعوتك')}</div>
              <div className="text-[12px] text-gray-500">{L('Counted when the new account signs in for the first time.', 'نیا اکاؤنٹ پہلی بار لاگ ان ہونے پر شمار ہوتا ہے۔', 'يُحتسب عند أول دخول للحساب الجديد.')}</div>
            </div>
            <div className="text-3xl font-extrabold tabular-nums" style={{ color: '#0F6E56' }}>{joined}</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
