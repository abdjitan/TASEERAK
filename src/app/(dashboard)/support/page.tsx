'use client'
// «الدعم» (owner 2026-11-16): one place to reach Taseerak — the company WhatsApp, or a message to
// the admin team (support_messages thread, answered from /admin/users/<id>).
// ?topic=kind pre-fills a request to change the account type (company ↔ pricing agent), which only
// the admin can approve.
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import SupportThread from '@/components/shared/SupportThread'
import Glyph from '@/components/shared/Glyph'
import { askConfirm } from '@/lib/askConfirm'

const SUPPORT_WHATSAPP = '12135614366'

export default function SupportPage() {
  return <Suspense fallback={null}><Support /></Suspense>
}

function Support() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const search = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [me, setMe] = useState<any>(null) // role + supplier_conversion_requested_at (238)
  const [convMsg, setConvMsg] = useState('')
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }: any) => {
      const uid = data?.user?.id || null
      setUserId(uid)
      if (uid) { const { data: p } = await sb.from('profiles').select('role, supplier_conversion_requested_at').eq('id', uid).maybeSingle(); setMe(p) }
    })
  }, [])
  async function askConversion() {
    if (!(await askConfirm(L('Ask to turn your account into a supplier account? Your number and email stay the same; the team reviews the request.', 'اپنے اکاؤنٹ کو سپلائر اکاؤنٹ میں بدلنے کی درخواست کریں؟ آپ کا نمبر اور ای میل وہی رہیں گے؛ ٹیم درخواست کا جائزہ لے گی۔', 'طلب تحويل حسابك إلى حساب مورد؟ يبقى رقمك وبريدك كما هما، ويراجع الفريق الطلب.')))) return
    const { error } = await createClient().rpc('request_supplier_conversion', { p_note: null })
    if (error) { setConvMsg(error.message); return }
    setMe((m: any) => ({ ...(m || {}), supplier_conversion_requested_at: new Date().toISOString() }))
    setConvMsg('')
  }
  const topic = search.get('topic')
  const prefill = topic === 'kind'
    ? L('I would like to change my account type (company / pricing agent). Reason: ', 'میں اپنے اکاؤنٹ کی قسم بدلنا چاہتا ہوں (کمپنی / قیمت ایجنٹ)۔ وجہ: ', 'أرغب في تغيير نوع حسابي (شركة / وسيط تسعير). السبب: ')
    : ''
  const waText = encodeURIComponent(L('Hello Taseerak, I need help with: ', 'السلام علیکم تسعیرک، مجھے مدد چاہیے: ', 'مرحباً تسعيرك، أحتاج مساعدة بخصوص: '))

  return (
    <div dir={dir} className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#071827]">{L('Support', 'سپورٹ', 'الدعم')}</h1>
        <p className="text-sm text-gray-500 mt-1">{L('Reach the Taseerak team on WhatsApp, or send a message to the admin team here.', 'تسعیرک ٹیم سے واٹس ایپ پر رابطہ کریں، یا یہاں انتظامیہ کو پیغام بھیجیں۔', 'تواصل مع فريق تسعيرك على واتساب، أو أرسل رسالة إلى الإدارة من هنا.')}</p>
      </div>

      <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${waText}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100 transition">
        <div>
          <div className="font-bold text-emerald-900"><Glyph e="💬" /> {L('WhatsApp the Taseerak team', 'تسعیرک ٹیم کو واٹس ایپ کریں', 'راسل فريق تسعيرك على واتساب')}</div>
          <div className="text-xs text-emerald-800 mt-0.5" dir="ltr">+1 213 561 4366</div>
        </div>
        <span className="text-sm font-bold text-emerald-900">{L('Open', 'کھولیں', 'فتح')}</span>
      </a>

      {me?.role === 'contractor' && (
        <div className="rounded-2xl border border-[#D4A543]/50 bg-[#D4A543]/10 p-4">
          <div className="font-bold text-[#071827]">{L('Turn my account into a supplier account', 'میرا اکاؤنٹ سپلائر اکاؤنٹ میں بدلیں', 'تحويل حسابي إلى مورد')}</div>
          <div className="text-xs text-gray-600 mt-0.5">{L('Sell on Taseerak with the same number and email. The team reviews the request; any open request or unfinished deal must be completed first.', 'اسی نمبر اور ای میل سے تسعیرک پر فروخت کریں۔ ٹیم درخواست کا جائزہ لے گی؛ کوئی کھلی درخواست یا نامکمل سودا پہلے مکمل ہونا چاہیے۔', 'بع على تسعيرك بنفس رقمك وبريدك. يراجع الفريق الطلب، ويلزم أولاً إنهاء أي طلب تسعير مفتوح أو صفقة لم تكتمل.')}</div>
          {me?.supplier_conversion_requested_at
            ? <div className="mt-2 text-sm font-bold text-[#0F6E56]">✓ {L('Request sent. We will notify you when it is approved.', 'درخواست بھیج دی گئی۔ منظوری پر ہم آپ کو اطلاع دیں گے۔', 'تم إرسال الطلب، وسنُبلغك عند الموافقة.')}</div>
            : <button type="button" onClick={askConversion} className="mt-2 px-4 py-2 rounded-xl bg-[#D4A543] text-[#071827] text-sm font-bold">{L('Request the change', 'درخواست بھیجیں', 'أرسل الطلب')}</button>}
          {convMsg && <div className="mt-2 text-xs text-red-600">{convMsg}</div>}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#0B2438] mb-1">{L('Message the admin team', 'انتظامیہ کو پیغام', 'رسالة إلى الإدارة')}</h2>
        <p className="text-sm text-gray-500 mb-4">{L('Write about any issue or request; the team replies here and you get a notification.', 'کسی بھی مسئلے یا درخواست کے بارے میں لکھیں؛ ٹیم یہیں جواب دے گی اور آپ کو اطلاع ملے گی۔', 'اكتب عن أي مشكلة أو طلب، وسيردّ الفريق هنا ويصلك إشعار.')}</p>
        {topic === 'kind' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">{L('Changing the account type needs the admin’s approval. Tell us why; we may ask for documents.', 'اکاؤنٹ کی قسم بدلنے کے لیے انتظامیہ کی منظوری ضروری ہے۔ وجہ بتائیں؛ ہم دستاویزات مانگ سکتے ہیں۔', 'تغيير نوع الحساب يحتاج موافقة الإدارة. اذكر السبب، وقد نطلب منك مستندات.')}</p>
        )}
        {userId && <SupportThread userId={userId} viewerRole="user" initialText={prefill} />}
      </div>
    </div>
  )
}
