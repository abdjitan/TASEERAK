'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { getNav } from '@/lib/nav'
import { PLANS, isSubscribed, planLabel } from '@/lib/plans'

// باقات اشتراك المورّد + حالته. التفعيل حالياً يدويّ عبر الإدارة (تحويل بنكي → الأدمن يفعّل)
// إلى أن تُربَط بوّابة الدفع (مدى/Apple Pay). زر «اشترك» يرسل طلباً للإدارة عبر الدعم.
export default function SubscriptionPage() {
  const { locale, dir } = useTranslation()
  const [uid, setUid] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState('')
  const [sent, setSent] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUid(session.user.id)
      const { data } = await supabase.from('profiles').select('subscription_plan, subscription_expires_at').eq('id', session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function requestPlan(key: string, name: string) {
    if (!uid) return
    setRequesting(key)
    const supabase = createClient()
    await supabase.from('support_messages').insert({ user_id: uid, sender: 'user', content: `🧾 طلب اشتراك في باقة «${name}». يرجى التواصل لإتمام الدفع والتفعيل.` })
    setRequesting(''); setSent(key)
  }

  if (loading) return <PageLoader />

  const current = profile?.subscription_plan || 'free'
  const active = isSubscribed(profile)

  return (
    <AppShell title={locale === 'en' ? 'Subscription & Plans' : 'الاشتراك والباقات'} nav={getNav('supplier', locale, '/supplier/subscription')} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-gray-400">{locale === 'en' ? 'Your current plan' : 'باقتك الحالية'}</div>
            <div className="text-lg font-extrabold" style={{ color: '#1B2D5B' }}>{planLabel(current)}</div>
            {active && profile?.subscription_expires_at && <div className="text-[11px] text-gray-400">{locale === 'en' ? 'Active until ' : 'سارية حتى '}{new Date(profile.subscription_expires_at).toLocaleDateString('ar-SA-u-ca-gregory')}</div>}
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{active ? (locale === 'en' ? '✓ Subscribed' : '✓ مشترك') : (locale === 'en' ? 'Free' : 'مجاني')}</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div key={p.key} className={`rounded-2xl border p-5 flex flex-col bg-white ${p.featured ? 'border-[#F5831F] shadow-lg' : 'border-gray-100 shadow-sm'}`}>
              {p.featured && <span className="self-start text-[10px] font-extrabold text-white px-2.5 py-1 rounded-full mb-2" style={{ background: '#F5831F' }}>{locale === 'en' ? 'Most popular' : 'الأكثر ملاءمة'}</span>}
              <div className="text-xs text-gray-400">{p.tagline}</div>
              <div className="text-lg font-extrabold mt-0.5" style={{ color: '#1B2D5B' }}>{p.name}</div>
              <div className="text-sm font-extrabold my-2" style={{ color: '#F5831F' }}>{p.price}</div>
              <ul className="space-y-1.5 text-sm text-gray-600 flex-1 mt-1">
                {p.benefits.map((b) => <li key={b} className="flex gap-2"><span className="text-[#0F6E56] font-bold shrink-0">✓</span><span>{b}</span></li>)}
              </ul>
              <div className="mt-4">
                {current === p.key && active ? (
                  <div className="text-center text-sm font-bold text-emerald-600 py-2.5">✓ {locale === 'en' ? 'Your plan' : 'باقتك الحالية'}</div>
                ) : p.key === 'free' ? (
                  <div className="text-center text-xs text-gray-400 py-2.5">{locale === 'en' ? 'Default' : 'الباقة الافتراضية'}</div>
                ) : sent === p.key ? (
                  <div className="text-center text-sm font-bold text-emerald-600 py-2.5">✓ {locale === 'en' ? 'Request sent' : 'أُرسل طلبك'}</div>
                ) : (
                  <button onClick={() => requestPlan(p.key, p.name)} disabled={requesting === p.key}
                    className="w-full py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: p.featured ? '#F5831F' : '#1B2D5B' }}>
                    {requesting === p.key ? '...' : (locale === 'en' ? 'Subscribe' : 'اشترك')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-[#1B2D5B]/5 rounded-2xl p-4 text-sm text-gray-600 text-center leading-relaxed">
          💳 {locale === 'en'
            ? 'To subscribe now: request the plan and our team activates it after payment (bank transfer). Online payment (mada / Apple Pay) is coming soon.'
            : 'للاشتراك الآن: اطلب الباقة ويفعّلها فريقنا بعد الدفع (تحويل بنكي). الدفع الإلكتروني (مدى / Apple Pay) قيد الإضافة قريباً.'}
        </div>
      </div>
    </AppShell>
  )
}
