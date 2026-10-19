'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { formatDateTime } from '@/lib/deadline'
import { Lightbulb } from 'lucide-react'
import { SUGGESTION_KINDS, SUGGESTION_STATUS } from '@/lib/suggestions'
// «اقتراحاتك» (owner 2026-10-19): buyers and suppliers suggest features, missing materials or
// report problems; they see the status the admin sets (migration 169).
export default function SuggestionsPage() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: { ar: string; en: string; ur: string }) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('contractor')
  const [list, setList] = useState<any[]>([])
  const [kind, setKind] = useState<string>('feature')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const [{ data: prof }, { data }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', session.user.id).single(),
      supabase.from('suggestions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50),
    ])
    setRole(prof?.role || 'contractor'); setList(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function send(e: any) {
    e.preventDefault()
    if (body.trim().length < 3) { setMsg({ ok: false, text: L('Write your suggestion first.', 'پہلے اپنی تجویز لکھیں۔', 'اكتب اقتراحك أولاً.') }); return }
    setSending(true); setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('suggestions').insert({ kind, body: body.trim() })
    setSending(false)
    if (error) {
      setMsg({ ok: false, text: /rate_limited/.test(error.message || '') ? L('You reached today’s limit of suggestions. Try again tomorrow.', 'آج کی تجاویز کی حد پوری ہو گئی۔ کل دوبارہ کوشش کریں۔', 'بلغت الحد اليومي للاقتراحات. حاول غداً.') : L('Could not send — please try again.', 'نہیں بھیجا جا سکا — دوبارہ کوشش کریں۔', 'تعذّر الإرسال — حاول مرة ثانية.') })
      return
    }
    setBody(''); setMsg({ ok: true, text: L('Thank you — the team will read it.', 'شکریہ — ٹیم اسے پڑھے گی۔', 'شكراً لك، سيطّلع عليه فريق تسعيرك.') })
    load()
  }

  if (loading) return <PageLoader />
  const navRole = role === 'admin' ? 'admin' : role === 'supplier' ? 'supplier' : 'contractor'

  return (
    <AppShell title={L('Your suggestions', 'آپ کی تجاویز', 'اقتراحاتك')} nav={getNav(navRole, locale, '/suggestions')} dir={dir}>
      <div className="max-w-xl mx-auto space-y-5">
        <form onSubmit={send} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: '#D4A54322', color: '#9D7425' }}><Lightbulb className="w-5 h-5" /></span>
            <div>
              <h1 className="text-lg font-extrabold" style={{ color: '#0B2438' }}>{L('Help us improve Taseerak', 'تسعیرک کو بہتر بنانے میں مدد کریں', 'ساعدنا في تحسين تسعيرك')}</h1>
              <p className="text-sm text-gray-500 mt-1">{L('A feature you need, a material we don’t have, or a problem you met — tell us.', 'کوئی سہولت، غائب مواد یا مسئلہ — ہمیں بتائیں۔', 'ميزة تحتاجها، أو مادة غير موجودة، أو مشكلة واجهتك — أخبرنا بها.')}</p>
            </div>
          </div>
          <div role="radiogroup" aria-label={L('Type', 'قسم', 'النوع')} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUGGESTION_KINDS.map(k => (
              <button key={k.k} type="button" role="radio" aria-checked={kind === k.k} onClick={() => setKind(k.k)}
                className={`min-h-[44px] rounded-xl border-2 text-sm font-bold ${kind === k.k ? 'border-[#0F6E56] bg-[#0F6E56]/5 text-[#0F6E56]' : 'border-gray-200 bg-white text-gray-600'}`}>{pick(k)}</button>
            ))}
          </div>
          <textarea id="suggestion-body" value={body} onChange={(e: any) => setBody(e.target.value)} maxLength={2000} rows={5} className="input-field"
            placeholder={kind === 'material' ? L('Which material, and how is it usually sold (unit, sizes)?', 'کون سی مواد، اور کیسے بکتی ہے؟', 'ما المادة، وكيف تُباع عادةً (الوحدة، المقاسات)؟') : L('Write your suggestion…', 'اپنی تجویز لکھیں…', 'اكتب اقتراحك…')} />
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
          <button type="submit" disabled={sending} className="w-full min-h-[48px] rounded-xl font-bold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>
            {sending ? L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…') : L('Send suggestion', 'تجویز بھیجیں', 'أرسل الاقتراح')}
          </button>
        </form>

        {list.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold" style={{ color: '#0B2438' }}>{L('Your previous suggestions', 'آپ کی پچھلی تجاویز', 'اقتراحاتك السابقة')}</h2>
            {list.map(s => {
              const st = SUGGESTION_STATUS[s.status] || SUGGESTION_STATUS.new
              const k = SUGGESTION_KINDS.find(x => x.k === s.kind) || SUGGESTION_KINDS[3]
              return (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-500">{pick(k)} · {formatDateTime(s.created_at)}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: st.tone, background: st.tone + '14' }}>{pick(st)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{s.body}</p>
                  {s.admin_note && <p className="text-sm mt-2 rounded-xl bg-gray-50 border border-gray-100 p-2.5 text-gray-700"><b style={{ color: '#0B2438' }}>{L('Taseerak team:', 'تسعیرک ٹیم:', 'فريق تسعيرك:')}</b> {s.admin_note}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
