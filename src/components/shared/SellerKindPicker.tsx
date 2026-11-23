'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SELLER_KINDS, COMPANY_ACTIVITIES, sellerKindOf, tierLabel, type SellerKind } from '@/lib/sellers'
import SellerIcon from '@/components/shared/SellerIcon'
import { askConfirm } from '@/lib/askConfirm'

// The seller's account kind (independent / company) and, for a company, its activity. Saved
// immediately through set_seller_kind; the buyer-facing tier is derived by the DB from this and
// from CR verification, so it is shown here read-only with what it takes to reach "company".
// The kind itself is fixed once chosen (owner 2026-11-16, migration 215): only the company activity
// can still change; switching company ↔ pricing agent needs a new account.
export default function SellerKindPicker({ providerType, supplierTier, locale, onChange }: {
  providerType: string | null | undefined
  supplierTier: string | null | undefined
  locale: string
  onChange?: (providerType: string, supplierTier: string | null) => void
}) {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const pick = (o: any) => (locale === 'en' ? o.en : locale === 'ur' ? o.ur : o.ar)
  // nothing is pre-selected when the kind is still empty: one tap locks it, so it must be a real choice
  const [ptype, setPtype] = useState<string | null>(providerType || null)
  const [tier, setTier] = useState<string | null>(supplierTier || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const kind: SellerKind | null = ptype ? sellerKindOf(ptype) : null
  const kindLocked = !!providerType || !!ptype

  // choosing the kind is final (migration 215): confirm first and say how to change it later
  async function chooseKind(k: SellerKind) {
    const name = pick(SELLER_KINDS[k])
    const ok = await askConfirm(
      L(`Your account type will be "${name}". It can only be changed later through Support.`,
        `آپ کے اکاؤنٹ کی قسم «${name}» ہوگی۔ بعد میں اسے صرف سپورٹ کے ذریعے بدلا جا سکتا ہے۔`,
        `سيكون نوع حسابك «${name}». ولا يمكن تغييره لاحقاً إلا عن طريق الدعم.`),
      { title: L('Confirm the account type', 'اکاؤنٹ کی قسم کی تصدیق', 'تأكيد نوع الحساب'), okLabel: L('Confirm', 'تصدیق کریں', 'تأكيد النوع') })
    if (ok) save(k, k === 'company' ? 'company' : undefined)
  }

  async function save(nextKind: SellerKind, activity?: string) {
    setBusy(true); setErr('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('set_seller_kind', { p_kind: nextKind, p_activity: activity || null })
    if (error) {
      setErr((error as any).hint === 'KIND_LOCKED'
        ? L('The account type can’t be changed directly. Request the change from Support; the admin reviews it.', 'اکاؤنٹ کی قسم براہ راست نہیں بدلی جا سکتی۔ سپورٹ سے درخواست کریں؛ انتظامیہ جائزہ لے گی۔', 'لا يمكن تغيير نوع الحساب مباشرة. اطلب التغيير من الدعم، وتراجعه الإدارة.')
        : L('Could not save. Try again.', 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', 'تعذّر الحفظ. حاول مرة أخرى.'))
      setBusy(false); return
    }
    const np = String(data || (nextKind === 'independent' ? 'individual' : activity || 'company'))
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = user ? await supabase.from('profiles').select('supplier_tier').eq('id', user.id).single() : { data: null }
    setPtype(np); setTier(p?.supplier_tier || null); setBusy(false)
    onChange?.(np, p?.supplier_tier || null)
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {(['company', 'independent'] as SellerKind[]).filter(k => !kindLocked || k === kind).map(k => {
          const on = kind === k
          const info = SELLER_KINDS[k]
          return (
            <button key={k} type="button" disabled={busy} aria-pressed={on}
              onClick={() => { if (!on && !kindLocked) chooseKind(k) }}
              className={`text-start p-3 min-h-11 rounded-xl border-2 transition-all disabled:opacity-60 ${on ? 'border-[#D4A543] bg-[#D4A543]/10' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <div className="font-bold text-sm text-navy"><SellerIcon name={info.icon} /> {pick(info)}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{pick(info.sub)}</div>
            </button>
          )
        })}
      </div>
      {!kind && (
        <p className="text-xs text-[#8F6820] font-semibold">{L('Choose carefully: the account type can only be changed later through Support.', 'احتیاط سے منتخب کریں: اکاؤنٹ کی قسم بعد میں صرف سپورٹ کے ذریعے بدلی جا سکتی ہے۔', 'اختر بعناية: لا يمكن تغيير نوع الحساب لاحقاً إلا عن طريق الدعم.')}</p>
      )}
      {kindLocked && (
        <p className="text-xs text-gray-500">{L('The account type is fixed. To change it, ', 'اکاؤنٹ کی قسم مقرر ہے۔ بدلنے کے لیے ', 'نوع الحساب ثابت. لتغيير النوع ')}<a href="/support?topic=kind" className="font-bold underline text-navy">{L('request it from Support', 'سپورٹ سے درخواست کریں', 'اطلب ذلك من الدعم')}</a>{L(' (admin approval).', ' (انتظامیہ کی منظوری)۔', ' (بموافقة الإدارة).')}</p>
      )}

      {kind === 'company' && (
        <div>
          <p id="skp-activity" className="text-xs font-bold text-gray-600 mb-1.5">{L('What is your main activity?', 'آپ کی بنیادی سرگرمی کیا ہے؟', 'ما نشاطك الرئيسي؟')} *</p>
          {/* UX-038: the star is enforced: the generic «company» has no activity yet */}
          {!COMPANY_ACTIVITIES.some(a => a.k === ptype) && <p className="text-[12px] font-semibold text-[#8F6820] mb-1.5">{L('Required: choose one to finish your profile.', 'ضروری: پروفائل مکمل کرنے کے لیے ایک منتخب کریں۔', 'مطلوب: اختر نشاطاً لإكمال ملفك.')}</p>}
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="skp-activity">
            {COMPANY_ACTIVITIES.map(a => {
              const on = ptype === a.k
              return (
                <button key={a.k} type="button" disabled={busy} aria-pressed={on} onClick={() => { if (!on) save('company', a.k) }}
                  className={`px-3 min-h-11 rounded-full text-xs font-bold border transition-all disabled:opacity-60 ${on ? 'bg-[#D4A543]/10 text-navy border-[#D4A543] border-2' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                  <SellerIcon name={a.icon} /> {pick(a)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {kind && <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
        <div>
          {L('How buyers see you:', 'خریدار آپ کو اس طرح دیکھتے ہیں:', 'تظهر للمشترين ضمن:')} <b className="text-navy">{tierLabel(tier, locale)}</b>
        </div>
        {/* round-2 UX-076: a shop never reaches the «companies & factories» tier, so it is promised the badge only */}
        {kind === 'company' && tier !== 'company' && (
          <div className="mt-1 text-gray-500">
            {ptype === 'retail_shop'
              ? L('Verify your commercial registration so your offers carry the «Verified» badge.', 'اپنی تجارتی رجسٹریشن کی تصدیق کریں تاکہ آپ کی آفرز پر «تصدیق شدہ» بیج آئے۔', 'وثّق سجلك التجاري لتحمل عروضك شارة «موثّق».')
              : L('Verify your commercial registration to appear under "Verified companies & factories".', 'تصدیق شدہ کمپنیوں اور فیکٹریوں میں آنے کے لیے اپنی تجارتی رجسٹریشن کی تصدیق کریں۔', 'وثّق سجلك التجاري لتظهر ضمن «شركات ومصانع موثّقة».')}
            {/* round-5 UX-163: the way to verification, one tap away */}
            {' '}<a href="/settings?tab=docs" className="inline-flex items-center min-h-[44px] font-bold underline text-[#8F6820]">{L('Verify now', 'ابھی تصدیق کریں', 'وثّق الآن')}</a>
          </div>
        )}
        {kind === 'independent' && (
          <div className="mt-1 text-gray-500">
            {L('Your trust comes from your ratings. When you quote, say where the price comes from.',
              'آپ کا اعتماد آپ کی ریٹنگ سے بنتا ہے۔ آفر دیتے وقت بتائیں کہ قیمت کہاں سے ہے۔',
              'تُبنى ثقتك من تقييماتك. وعند تقديم أي عرض، حدّد مصدر السعر.')}
          </div>
        )}
      </div>}
      {err && <p className="text-xs text-red-600" role="alert">{err}</p>}
    </div>
  )
}
