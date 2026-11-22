'use client'
// «وثّق للمتابعة» (owner 2026-11-18): a buyer browses and tries the platform freely; only when they
// act (send a price request, message a supplier, accept or award an offer) do we ask for what is
// missing (the mobile by SMS code and/or the email by code), in a sheet over the same page. Their
// work stays on the page and the action continues once both are verified. Sellers are still sent to
// /verify by the middleware before anything. The database refuses unverified requests, offers,
// awards and messages anyway (migrations 219/222), so this is the friendly path, not the guard.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import PhoneVerify from '@/components/shared/PhoneVerify'
import EmailVerify from '@/components/shared/EmailVerify'

type Ensure = () => Promise<boolean>
const Ctx = createContext<Ensure>(async () => true)

/** Call before a buyer action: resolves true when the account may act, false if the sheet was closed. */
export function useEnsureVerified(): Ensure { return useContext(Ctx) }

export default function VerifyGateProvider({ children }: { children: React.ReactNode }) {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const [open, setOpen] = useState(false)
  const [p, setP] = useState<any>(null)
  const [email, setEmail] = useState('')
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  async function fetchState(): Promise<{ ok: boolean; prof: any; mail: string }> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: true, prof: null, mail: '' } // signed-out pages handle sign-in themselves
    const [{ data: prof }, { data: req }] = await Promise.all([
      supabase.from('profiles').select('role, phone, phone_verified_at, whatsapp_verified_at, email_verified_at').eq('id', user.id).maybeSingle(),
      supabase.rpc('phone_verify_required'),
    ])
    // buyers need only the mobile; their email is optional and encouraged by a banner (owner 2026-11-19, migration 234)
    const ok = !prof || prof.role === 'admin' || req !== true || (!!prof.phone_verified_at && (prof.role === 'contractor' || !!prof.email_verified_at))
    return { ok, prof, mail: user.email || '' }
  }

  const ensure = useCallback<Ensure>(async () => {
    try {
      const s = await fetchState()
      if (s.ok) return true
      setP(s.prof); setEmail(s.mail); setOpen(true)
      return await new Promise<boolean>(res => { resolver.current = res })
    } catch { return true } // never block on a network hiccup: the database still checks
  }, [])

  function finish(ok: boolean) {
    setOpen(false)
    const r = resolver.current; resolver.current = null
    r?.(ok)
  }

  async function refresh() {
    const s = await fetchState()
    setP(s.prof); setEmail(s.mail)
    if (s.ok) finish(true)
  }

  // Escape closes the sheet and the page behind does not scroll while it is open (UX-156)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const phoneOk = !!p?.phone_verified_at
  const emailOk = !!p?.email_verified_at || p?.role === 'contractor'

  return (
    <Ctx.Provider value={ensure}>
      {children}
      {open && p && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#071827]/60 p-0 sm:p-4" onClick={() => finish(false)}>
          <div dir={dir} role="dialog" aria-modal="true" aria-labelledby="vg-title" onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="vg-title" className="text-lg font-bold text-[#071827]">{L('One step to continue', 'جاری رکھنے کے لیے ایک قدم', 'خطوة واحدة للمتابعة')}</h2>
                <p className="text-sm text-gray-600 mt-1">{L('To protect you and the suppliers, verify your contact details once. What you entered stays as it is.', 'آپ اور سپلائرز کے تحفظ کے لیے اپنی رابطہ تفصیلات ایک بار تصدیق کریں۔ آپ کا درج کردہ سب کچھ محفوظ رہے گا۔', 'لحمايتك وحماية الموردين، وثّق بيانات التواصل مرة واحدة. ما أدخلته يبقى كما هو.')}</p>
              </div>
              <button type="button" onClick={() => finish(false)} aria-label={L('Close', 'بند کریں', 'إغلاق')}
                className="shrink-0 w-11 h-11 grid place-items-center rounded-full bg-gray-100 text-gray-600"><X className="w-5 h-5" aria-hidden /></button>
            </div>

            {!phoneOk && (
              <section className="rounded-2xl border border-gray-200 p-4">
                <div className="font-bold text-[#0B2438] mb-1">{L('Mobile number', 'موبائل نمبر', 'رقم الجوال')}</div>
                <PhoneVerify initialPhone={p.phone || ''} locale={locale} verified={false} waVerified={!!p.whatsapp_verified_at} autoOpen onDone={() => refresh()} />
              </section>
            )}
            {!emailOk && (
              <section className="rounded-2xl border border-gray-200 p-4">
                <div className="font-bold text-[#0B2438] mb-2">{L('Email', 'ای میل', 'البريد الإلكتروني')}</div>
                <EmailVerify currentEmail={email} verified={false} locale={locale} onDone={() => refresh()} />
              </section>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
