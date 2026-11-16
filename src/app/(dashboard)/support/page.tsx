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

const SUPPORT_WHATSAPP = '12135614366'

export default function SupportPage() {
  return <Suspense fallback={null}><Support /></Suspense>
}

function Support() {
  const { locale, dir } = useTranslation()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const search = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => { createClient().auth.getUser().then(({ data }: any) => setUserId(data?.user?.id || null)) }, [])
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
