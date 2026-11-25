'use client'

// «تسعير مناقصة» (tender pricing) — the company's tenders (draft → review → sent).
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import Glyph from '@/components/shared/Glyph'
import { getNav } from '@/lib/nav'
import { makeL } from '@/components/tender/labels'
import { arItems, dateLocale } from '@/lib/text'
import { friendlyError } from '@/lib/friendlyError'
import { askConfirm, notify } from '@/lib/askConfirm'
import { storedBuyerType } from '@/lib/buyerType'
import HomeModeNotice from '@/components/tender/HomeModeNotice'

export default function TendersPage() {
  const { locale, dir } = useTranslation()
  const L = makeL(locale)
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState('')
  const [homeMode, setHomeMode] = useState(false)
  const [sentCounts, setSentCounts] = useState<Record<string, { done: number; all: number }>>({})

  useEffect(() => {
    // «لبيتي» mode hides tenders (never deletes them): say so, with the way back, instead of a silent redirect (UX-098)
    if (storedBuyerType() === 'individual') { setHomeMode(true); return }
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: bt } = await supabase.from('profiles').select('buyer_type').eq('id', data.session.user.id).maybeSingle()
      if ((bt as any)?.buyer_type === 'individual') { setHomeMode(true); return }
      const { data: t, error: e } = await supabase.from('tenders').select('*').eq('contractor_id', data.session.user.id).order('created_at', { ascending: false }).limit(100)
      // a missing table = not enabled on the server; anything else = the real error (connection…), with a retry
      if (e) setError(/relation|does not exist|schema cache/i.test(e.message || '') ? L('Tender pricing is not enabled yet.', 'ٹینڈر کی قیمت ابھی فعال نہیں۔', 'تسعير المناقصات غير مفعّل بعد.') : friendlyError(e.message, L('Could not load your tenders. Check your connection and try again.', 'آپ کے ٹینڈرز لوڈ نہیں ہو سکے۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر تحميل مناقصاتك. تحقّق من الاتصال وحاول مرة أخرى.'), locale))
      setRows(t || [])
      // a partly sent tender (round-5 UX-021): «أُرسل جزء منها (X من Y)», counted per tender when the column exists
      const partial = (t || []).filter((x: any) => x.status !== 'sent' && x.project_rfq_id).slice(0, 20)
      for (const x of partial) {
        try {
          const [{ count: all, error: e1 }, { count: done, error: e2 }] = await Promise.all([
            supabase.from('tender_items').select('id', { count: 'exact', head: true }).eq('tender_id', x.id).eq('kind', 'material'),
            supabase.from('tender_items').select('id', { count: 'exact', head: true }).eq('tender_id', x.id).eq('kind', 'material').not('sent_rfq_id', 'is', null),
          ])
          if (e1 || e2 || typeof all !== 'number' || typeof done !== 'number') continue
          setSentCounts(m => ({ ...m, [x.id]: { done, all } }))
        } catch { /* the chip then shows without numbers */ }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // «حذف» an unsent tender (UX-142): its items and files go with it; a sent one is kept (it points at its request)
  async function removeTender(t: any) {
    if (!(await askConfirm(L(`Delete the tender «${t.title}»? Its items, your approvals and its files will be deleted. This cannot be undone.`, `ٹینڈر «${t.title}» حذف کریں؟ اس کے آئٹمز، آپ کی منظوریاں اور فائلیں حذف ہو جائیں گی۔ یہ واپس نہیں ہو سکتا۔`, `حذف المناقصة «${t.title}»؟ ستُحذف بنودها واعتماداتك وملفاتها، ولا يمكن التراجع.`), { danger: true, okLabel: L('Delete', 'حذف کریں', 'حذف'), cancelLabel: L('Keep it', 'رکھیں', 'إبقاؤها') }))) return
    const supabase = createClient()
    // the stored files first (best effort), while their rows can still be read
    try {
      const { data: f } = await supabase.from('tender_files').select('storage_path, extracted_path').eq('tender_id', t.id)
      const paths = (f || []).flatMap((x: any) => [x.storage_path, x.extracted_path]).filter(Boolean)
      if (paths.length) await supabase.storage.from('tenders').remove(paths)
    } catch { /* orphaned files never block the delete */ }
    const { error: e } = await supabase.from('tenders').delete().eq('id', t.id)
    if (e) { await notify(friendlyError(e.message, L('Could not delete the tender. Check your connection and try again.', 'ٹینڈر حذف نہیں ہو سکا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', 'تعذّر حذف المناقصة. تحقّق من الاتصال وحاول مرة أخرى.'), locale), { tone: 'error' }); return }
    setRows(rs => (rs || []).filter(r => r.id !== t.id))
  }

  // a tender with a request but not «sent» was sent in part and stays open (round-5 UX-021)
  const isPartial = (t: any) => t.status !== 'sent' && !!t.project_rfq_id
  const statusLabel = (t: any) => {
    if (t.status === 'sent') return L('Sent for pricing', 'قیمت کے لیے بھیجا', 'أُرسلت للتسعير')
    if (isPartial(t)) {
      const c = sentCounts[t.id]
      return c ? L(`Partly sent (${c.done} of ${c.all})`, `جزوی طور پر بھیجا گیا (${c.all} میں سے ${c.done})`, `أُرسل جزء منها (${c.done} من ${c.all})`) : L('Partly sent', 'جزوی طور پر بھیجا گیا', 'أُرسل جزء منها')
    }
    return t.status === 'review' ? L('Awaiting your approval', 'آپ کی منظوری کا منتظر', 'بانتظار اعتمادك') : L('Draft', 'مسودہ', 'مسودة')
  }
  // the offers: straight to the request when the tender knows it (round-5 UX-158), else the project page
  const offersHref = (t: any) => (t.rfq_id ? `/contractor/rfq/${t.rfq_id}` : `/contractor/project/${t.project_rfq_id}`)

  return (
    <AppShell title={homeMode ? L('Company tools', 'کمپنی کے ٹولز', 'أدوات الشركات') : L('Tender pricing', 'ٹینڈر کی قیمت', 'تسعير مناقصة')} nav={getNav('contractor', locale, '/contractor/tender')} dir={dir}>
      {homeMode ? <HomeModeNotice locale={locale} what="tender" /> : (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B2438]">{L('Tender pricing', 'ٹینڈر کی قیمت', 'تسعير مناقصة')}</h1>
            <p className="text-sm text-gray-600 mt-1">{L('For a full tender: an Excel bill of quantities with its drawings and specifications. Every number is traced to its source and nothing goes to suppliers before you approve it.', 'پورے ٹینڈر کے لیے: Excel میں مقداروں کا جدول، ڈرائنگز اور تفصیلات کے ساتھ۔ ہر عدد اپنے ماخذ سے جڑا ہے اور آپ کی منظوری سے پہلے کچھ سپلائرز کو نہیں جاتا۔', 'للمناقصة الكاملة: جدول كميات بصيغة Excel مع مخططاته ومواصفاته. يُربط كل رقم بمصدره، ولا يُرسل شيء للموردين قبل اعتمادك.')}</p>
          </div>
          <Link href="/contractor/tender/new" className="min-h-11 inline-flex items-center px-5 py-2.5 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
            <Glyph e="➕" /> {L('New tender', 'نیا ٹینڈر', 'مناقصة جديدة')}
          </Link>
        </div>
        {error && (
          <div className="rounded-xl border border-[#D4A543]/40 bg-[#D4A543]/[.06] p-3 text-sm text-[#0B2438] flex flex-wrap items-center justify-between gap-2" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 px-4 rounded-xl font-bold text-sm border border-[#0B2438]/30 bg-white">{L('Try again', 'دوبارہ کوشش کریں', 'إعادة المحاولة')}</button>
          </div>
        )}
        {rows === null && (
          <div className="space-y-3 animate-pulse" aria-busy="true" aria-label={L('Loading', 'لوڈ ہو رہا ہے', 'جارٍ التحميل')}>
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100" />)}
          </div>
        )}
        {rows && rows.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            <div className="text-4xl text-[#8F6820] mb-2"><Glyph e="📋" /></div>
            <p>{L('No tenders yet. Upload a bill of quantities with its drawings and specifications to start.', 'ابھی کوئی ٹینڈر نہیں۔ شروع کرنے کے لیے مقداروں کا جدول اس کی ڈرائنگز اور تفصیلات کے ساتھ اپ لوڈ کریں۔', 'لا توجد مناقصات بعد. ارفع جدول كميات مع مخططاته ومواصفاته للبدء.')}</p>
            <Link href="/contractor/tender/new" className="mt-4 inline-flex items-center min-h-11 px-5 rounded-xl font-bold text-sm text-[#071827]" style={{ background: 'linear-gradient(135deg,#F5C55B,#D4A543)' }}>
              <Glyph e="➕" /> {L('New tender', 'نیا ٹینڈر', 'مناقصة جديدة')}
            </Link>
          </div>
        )}
        {(rows || []).map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-gray-200 hover:border-[#D4A543]">
            <Link href={`/contractor/tender/${t.id}`} className="block p-4">
              <div className="flex items-center justify-between gap-2">
                <b className="text-[#0B2438]">{t.title}</b>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.status === 'sent' ? 'bg-[#0F6E56]/10 text-[#0F6E56]' : 'bg-[#D4A543]/15 text-[#8F6820]'}`}>{statusLabel(t)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(t.created_at).toLocaleDateString(dateLocale(locale))}
                {t.summary?.items ? ` · ${L(`${t.summary.items} items`, `${t.summary.items} آئٹمز`, arItems(Number(t.summary.items)))}` : ''}
                {t.summary?.flags ? ` · ${L('flags', 'نشانات', 'تنبيهات')} ${Object.values(t.summary.flags as Record<string, number>).reduce((s, n) => s + n, 0)}` : ''}
              </p>
            </Link>
            {(t.status === 'sent' || isPartial(t)) && t.project_rfq_id && (
              <Link href={offersHref(t)} className="flex items-center min-h-11 px-4 border-t border-gray-100 text-sm font-bold text-[#8F6820] hover:underline">
                {L('View the offers received →', 'موصول آفرز دیکھیں ←', 'عرض العروض الواردة ←')}
              </Link>
            )}
            {t.status !== 'sent' && (
              <div className="flex items-center justify-between gap-2 px-4 border-t border-gray-100">
                <Link href={`/contractor/tender/${t.id}`} className="flex items-center min-h-11 text-sm font-bold text-[#8F6820] hover:underline">
                  {L('Continue the review →', 'جائزہ جاری رکھیں ←', 'متابعة المراجعة ←')}
                </Link>
                {/* a partly sent tender points at a request: it is kept, like a sent one */}
                {!isPartial(t) && <button type="button" onClick={() => removeTender(t)} className="min-h-11 px-3 text-sm font-bold text-red-700 hover:underline">
                  <Glyph e="🗑" /> {L('Delete', 'حذف کریں', 'حذف')}
                </button>}
              </div>
            )}

          </div>
        ))}
      </div>
      )}
    </AppShell>
  )
}
