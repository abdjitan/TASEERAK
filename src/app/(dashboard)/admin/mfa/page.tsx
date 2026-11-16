'use client'
// Admin two-step sign-in (owner 2026-11-16). Every /admin page needs an aal2 session (middleware);
// this page enrolls an authenticator app (TOTP: Google Authenticator, Microsoft Authenticator, …)
// the first time, then asks for the 6-digit code on each new sign-in. Supabase Auth MFA.
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Stage = 'loading' | 'enroll' | 'verify' | 'error'

export default function AdminMfaPage() {
  return <Suspense fallback={null}><AdminMfa /></Suspense>
}

function AdminMfa() {
  const supabase = createClient()
  const router = useRouter()
  const search = useSearchParams()
  const next = (() => { const n = search.get('next') || '/admin'; return n.startsWith('/admin') && !n.startsWith('/admin/mfa') ? n : '/admin' })()
  const [stage, setStage] = useState<Stage>('loading')
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.currentLevel === 'aal2') { router.replace(next); return }
        const { data: f, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        const verified = (f?.totp || []).find((x: any) => x.status === 'verified')
        if (verified) { setFactorId(verified.id); setStage('verify'); return }
        // drop half-finished enrolments, then start a new one
        for (const x of (f?.all || []) as any[]) if (x.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: x.id })
        const { data: e, error: eErr } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Taseerak admin ' + new Date().toISOString().slice(0, 10) })
        if (eErr) throw eErr
        setFactorId(e.id); setQr(e.totp.qr_code); setSecret(e.totp.secret); setStage('enroll')
      } catch (e: any) {
        setErr(e?.message || 'تعذّر بدء التحقق بخطوتين.'); setStage('error')
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    const c = code.replace(/\D/g, '')
    if (c.length !== 6) { setErr('اكتب الرمز المكوّن من 6 أرقام.'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: c })
    setBusy(false)
    if (error) { setErr('الرمز غير صحيح أو انتهت صلاحيته. اكتب الرمز الظاهر الآن في التطبيق.'); setCode(''); return }
    // the session is now aal2: reload so the middleware sees the new cookie
    window.location.assign(next)
  }

  return (
    <div dir="rtl" className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-[#071827]">التحقق بخطوتين للإدارة</h1>
        {stage === 'loading' && <p className="mt-4 text-gray-500">جارٍ التحميل…</p>}

        {stage === 'enroll' && (
          <>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              لحماية لوحة الإدارة، اربط حسابك بتطبيق مصادقة على جوالك (Google Authenticator أو Microsoft Authenticator).
            </p>
            <ol className="mt-3 text-sm text-gray-700 list-decimal pr-5 space-y-1">
              <li>افتح التطبيق واختر «إضافة حساب» ثم «مسح رمز QR».</li>
              <li>امسح الرمز أدناه.</li>
              <li>اكتب الرمز المكوّن من 6 أرقام الظاهر في التطبيق.</li>
            </ol>
            {qr && <img src={qr} alt="QR" className="mx-auto mt-4 w-48 h-48 bg-white" />}
            <details className="mt-2 text-xs text-gray-500">
              <summary className="cursor-pointer">لا تستطيع المسح؟ أدخل المفتاح يدوياً</summary>
              <code dir="ltr" className="block mt-1 break-all select-all bg-gray-50 p-2 rounded">{secret}</code>
            </details>
          </>
        )}
        {stage === 'verify' && (
          <p className="mt-3 text-sm text-gray-600">اكتب الرمز المكوّن من 6 أرقام الظاهر الآن في تطبيق المصادقة على جوالك.</p>
        )}

        {(stage === 'enroll' || stage === 'verify') && (
          <form onSubmit={(e) => { e.preventDefault(); submit() }} className="mt-4">
            <input
              dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
              value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))}
              className="w-full text-center text-2xl tracking-[0.5em] font-bold border border-gray-300 rounded-xl py-3 focus:outline-none focus:border-[#D4A543]"
              placeholder="000000"
            />
            <button type="submit" disabled={busy} className="mt-3 w-full rounded-xl bg-[#D4A543] text-[#071827] font-bold py-3 disabled:opacity-60">
              {busy ? 'جارٍ التحقق…' : stage === 'enroll' ? 'تفعيل ودخول' : 'دخول'}
            </button>
          </form>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {stage === 'error' && (
          <button onClick={() => window.location.reload()} className="mt-4 w-full rounded-xl border border-gray-300 py-2.5 font-semibold">إعادة المحاولة</button>
        )}
      </div>
    </div>
  )
}
