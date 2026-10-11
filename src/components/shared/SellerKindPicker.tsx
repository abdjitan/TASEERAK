'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SELLER_KINDS, COMPANY_ACTIVITIES, sellerKindOf, tierLabel, type SellerKind } from '@/lib/sellers'

// The seller's account kind (independent / company) and, for a company, its activity. Saved
// immediately through set_seller_kind; the buyer-facing tier is derived by the DB from this and
// from CR verification, so it is shown here read-only with what it takes to reach "company".
export default function SellerKindPicker({ providerType, supplierTier, locale, onChange }: {
  providerType: string | null | undefined
  supplierTier: string | null | undefined
  locale: string
  onChange?: (providerType: string, supplierTier: string | null) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: any) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  const [ptype, setPtype] = useState<string>(providerType || 'company')
  const [tier, setTier] = useState<string | null>(supplierTier || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const kind: SellerKind = sellerKindOf(ptype)

  async function save(nextKind: SellerKind, activity?: string) {
    setBusy(true); setErr('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('set_seller_kind', { p_kind: nextKind, p_activity: activity || null })
    if (error) { setErr(L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔', 'تعذّر الحفظ. حاول مرة أخرى.')); setBusy(false); return }
    const np = String(data || (nextKind === 'independent' ? 'individual' : activity || 'company'))
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = user ? await supabase.from('profiles').select('supplier_tier').eq('id', user.id).single() : { data: null }
    setPtype(np); setTier(p?.supplier_tier || null); setBusy(false)
    onChange?.(np, p?.supplier_tier || null)
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {(['company', 'independent'] as SellerKind[]).map(k => {
          const on = kind === k
          const info = SELLER_KINDS[k]
          return (
            <button key={k} type="button" disabled={busy} aria-pressed={on}
              onClick={() => { if (!on) save(k, k === 'company' ? 'company' : undefined) }}
              className={`text-start p-3 rounded-xl border-2 transition-all disabled:opacity-60 ${on ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <div className="font-bold text-sm text-navy">{info.icon} {pick(info)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{pick(info.sub)}</div>
            </button>
          )
        })}
      </div>

      {kind === 'company' && (
        <div>
          <p className="text-xs font-bold text-gray-600 mb-1.5">{L('Main activity', 'بنیادی سرگرمی', 'النشاط الرئيسي')}</p>
          <div className="flex flex-wrap gap-2">
            {COMPANY_ACTIVITIES.map(a => {
              const on = ptype === a.k
              return (
                <button key={a.k} type="button" disabled={busy} aria-pressed={on} onClick={() => { if (!on) save('company', a.k) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-60 ${on ? 'bg-navy text-white border-navy' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                  {a.icon} {pick(a)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
        <div>
          {L('How buyers see you:', 'خریدار آپ کو اس طرح دیکھتے ہیں:', 'تظهر للمشترين ضمن:')} <b className="text-navy">{tierLabel(tier, locale)}</b>
        </div>
        {kind === 'company' && tier !== 'company' && (
          <div className="mt-1 text-gray-500">
            {L('Verify your commercial registration to appear under "Verified companies & factories".',
              'تصدیق شدہ کمپنیوں میں آنے کے لیے اپنا سی آر تصدیق کریں۔',
              'وثّق سجلك التجاري لتظهر ضمن «شركات ومصانع معتمدة».')}
          </div>
        )}
        {kind === 'independent' && (
          <div className="mt-1 text-gray-500">
            {L('Your trust comes from your ratings. When you quote, say where the price comes from.',
              'آپ کا اعتماد آپ کی ریٹنگ سے بنتا ہے۔',
              'تُبنى ثقتك من تقييماتك. وعند تقديم أي عرض، حدّد مصدر السعر.')}
          </div>
        )}
      </div>
      {err && <p className="text-xs text-red-600" role="alert">{err}</p>}
    </div>
  )
}
