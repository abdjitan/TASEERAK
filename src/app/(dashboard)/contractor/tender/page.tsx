'use client'

// «مسار العطاء» — the company's tenders (draft → review → sent).
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { makeL } from '@/components/tender/labels'

export default function TendersPage() {
  const { locale, dir } = useTranslation()
  const L = makeL(locale)
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: t, error: e } = await supabase.from('tenders').select('id, title, status, summary, created_at, project_rfq_id').eq('contractor_id', data.session.user.id).order('created_at', { ascending: false }).limit(100)
      if (e) setError(L('The tender workspace is not enabled yet.', 'ابھی فعال نہیں۔', 'مسار العطاء غير مفعّل بعد.'))
      setRows(t || [])
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const statusLabel = (s: string) => (s === 'sent' ? L('Sent for pricing', 'قیمت کے لیے بھیجا', 'أُرسل للتسعير') : s === 'review' ? L('Under review', 'جائزہ میں', 'قيد المراجعة') : L('Draft', 'مسودہ', 'مسودة'))

  return (
    <AppShell title={L('Tender pricing', 'ٹینڈر قیمت', 'مسار العطاء')} nav={getNav('contractor', locale, '/contractor/tender')} dir={dir}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B2438]">{L('Tender pricing', 'ٹینڈر قیمت', 'مسار العطاء')}</h1>
            <p className="text-sm text-gray-600 mt-1">{L('Price a tender through suppliers with every number traced to its source.', 'ہر عدد اپنے ماخذ کے ساتھ۔', 'سعّر عطاءً عبر الموردين، وكل رقم مربوط بمصدره.')}</p>
          </div>
          <Link href="/contractor/tender/new" className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            <Glyph e="➕" /> {L('New tender', 'نیا ٹینڈر', 'عطاء جديد')}
          </Link>
        </div>
        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
        {rows === null && <p className="text-sm text-gray-500">{L('Loading…', 'لوڈ ہو رہا ہے…', 'جارٍ التحميل…')}</p>}
        {rows && rows.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            <div className="text-4xl text-[#8F6820] mb-2"><Glyph e="📋" /></div>
            {L('No tenders yet. Upload a bill of quantities with its drawings and specifications to start.', 'ابھی کوئی ٹینڈر نہیں۔', 'لا توجد عطاءات بعد. ارفع جدول كميات مع مخططاته ومواصفاته للبدء.')}
          </div>
        )}
        {(rows || []).map(t => (
          <Link key={t.id} href={`/contractor/tender/${t.id}`} className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-[#D4A543]">
            <div className="flex items-center justify-between gap-2">
              <b className="text-[#0B2438]">{t.title}</b>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.status === 'sent' ? 'bg-[#0F6E56]/10 text-[#0F6E56]' : 'bg-[#D4A543]/15 text-[#8F6820]'}`}>{statusLabel(t.status)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(t.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB')}
              {t.summary?.items ? ` · ${L(`${t.summary.items} items`, `${t.summary.items} آئٹمز`, `${t.summary.items} بنداً`)}` : ''}
              {t.summary?.flags ? ` · ${L('flags', 'نشانات', 'تنبيهات')} ${Object.values(t.summary.flags as Record<string, number>).reduce((s, n) => s + n, 0)}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
