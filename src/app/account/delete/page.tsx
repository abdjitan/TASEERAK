'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { clearAllLocalDrafts } from '@/lib/localDraft'
import Glyph from '@/components/shared/Glyph'
import { OPERATOR } from '@/lib/legal'
import { arCount } from '@/lib/text'
import HomeOrAccountLink from '@/components/public/HomeOrAccountLink'

// Public page required by Google Play / the App Store: how to delete a Taseerak account, what is
// deleted and what is kept. A signed-in visitor can delete the account here (POST /api/account/delete).

const C: Record<string, any> = {
  ar: {
    title: 'حذف الحساب', home: 'الرئيسية',
    intro: 'يمكنك حذف حسابك في «تسعيرك» في أي وقت، من الموقع أو من تطبيق الجوال. يتم الحذف فوراً ولا يمكن التراجع عنه.',
    howTitle: 'طريقة الحذف',
    how: ['من التطبيق: الإعدادات ← حذف حسابي.', 'من الموقع: سجّل الدخول ثم افتح هذه الصفحة واضغط «احذف حسابي نهائياً».', 'إن تعذّر عليك ذلك، أو لم يكن لديك التطبيق، راسلنا من بريدك المسجّل على العنوان أدناه، وننفّذ الطلب خلال 30 يوماً.'],
    mailTitle: 'البريد الإلكتروني للدعم', mailHint: 'أرسل طلب الحذف من البريد المسجّل في حسابك.',
    delTitle: 'ما الذي يُحذف',
    del: ['اسمك واسم منشأتك ورقم جوالك وعنوانك وموقعك.', 'مستندات التوثيق التي رفعتها (الرخصة والسجل التجاري).', 'المسودات والإشعارات وتخصصاتك وفروعك وأسعارك المنشورة.', 'رموز الإشعارات على أجهزتك، وبيانات الدخول (البريد وكلمة المرور)، فلا يمكن الدخول إلى الحساب بعدها.', 'تُلغى طلباتك المفتوحة وعروضك التي لم يُبتّ فيها.'],
    keepTitle: 'ما الذي يُحتفظ به ولماذا',
    keep: ['سجلّات الصفقات المكتملة (أوامر الشراء والفواتير والمراسلات المرتبطة بها) تبقى لدى الطرف الآخر باسم «حساب محذوف»، لأنها جزء من سجلّاته.', 'البيانات التي يُلزمنا النظام بحفظها، مثل بيانات الفواتير الضريبية، تُحفظ للمدة التي يحددها النظام ثم تُحذف.'],
    signedOut: 'لحذف حسابك من هنا، سجّل الدخول أولاً.', login: 'تسجيل الدخول',
    confirmLabel: 'اكتب كلمة «حذف» للتأكيد', confirmWord: 'حذف',
    button: 'احذف حسابي نهائياً', deleting: 'جارٍ الحذف…',
    done: 'تم حذف حسابك. شكراً لاستخدامك تسعيرك.',
    adminErr: 'لا يمكن حذف حساب مدير المنصة من هنا.', err: 'تعذّر حذف الحساب. حاول مرة أخرى أو راسل الدعم.',
    delHome: ['اسمك ورقم جوالك وعنوانك وموقعك.', 'المسودات والإشعارات.', 'رموز الإشعارات على أجهزتك، وبيانات الدخول، فلا يمكن الدخول إلى الحساب بعدها.', 'تُلغى طلباتك المفتوحة.'],
    keepHome: ['سجلّات مشترياتك المكتملة (الفواتير والمراسلات المرتبطة بها) تبقى لدى البائع باسم «حساب محذوف»، لأنها جزء من سجلّاته.', 'البيانات التي يُلزمنا النظام بحفظها، مثل بيانات الفواتير الضريبية، تُحفظ للمدة التي يحددها النظام ثم تُحذف.'],
    activeDeals: (n: number) => `لديك ${arCount(n, 'صفقة واحدة', 'صفقتان', 'صفقات', 'صفقة')} قيد التنفيذ. أكملها أو تواصل مع الطرف الآخر قبل الحذف، لأن الحذف يوقف المراسلة والتأكيدات فيها.`,
    openDeals: 'افتح صفقاتي',
    team: (n: number) => `لديك ${arCount(n, 'عضو واحد', 'عضوان', 'أعضاء', 'عضواً')} في فريق الشركة، وسيفقدون الوصول إلى حساب الشركة فور الحذف.`,
    delBiz: ['اسمك واسم منشأتك ورقم جوالك وعنوانك وموقعك.', 'المسودات والإشعارات.', 'رموز الإشعارات على أجهزتك، وبيانات الدخول (البريد وكلمة المرور)، فلا يمكن الدخول إلى الحساب بعدها.', 'تُلغى طلباتك المفتوحة.'],
    backHome: 'العودة إلى الصفحة الرئيسية',
  },
  en: {
    title: 'Delete your account', home: 'Home',
    intro: 'You can delete your Taseerak account at any time, on the website or in the mobile app. Deletion is immediate and cannot be undone.',
    howTitle: 'How to delete',
    how: ['In the app: Settings → Delete my account.', 'On the website: sign in, open this page and press "Delete my account permanently".', 'If you cannot, or you do not have the app, email us from your registered address at the address below and we will complete it within 30 days.'],
    mailTitle: 'Support email', mailHint: 'Send the deletion request from the email registered on your account.',
    delTitle: 'What is deleted',
    del: ['Your name, business name, phone number, address and location.', 'The verification documents you uploaded (licence and commercial registration).', 'Drafts, notifications, specialties, branches and published prices.', 'Your devices’ notification tokens and your sign-in (email and password), so the account can no longer be used.', 'Your open requests and undecided offers are cancelled.'],
    keepTitle: 'What is kept, and why',
    keep: ['Completed deals (purchase orders, invoices and the messages about them) stay with the other party under the name "Deleted account", because they are part of their records.', 'Data the law requires us to keep, such as tax-invoice data, is kept for the legally required period and then deleted.'],
    signedOut: 'To delete your account here, sign in first.', login: 'Sign in',
    confirmLabel: 'Type DELETE to confirm', confirmWord: 'DELETE',
    button: 'Delete my account permanently', deleting: 'Deleting…',
    done: 'Your account has been deleted. Thank you for using Taseerak.',
    adminErr: 'A platform admin account cannot be deleted here.', err: 'Could not delete the account. Try again or contact support.',
    delHome: ['Your name, phone number, address and location.', 'Drafts and notifications.', 'Your devices’ notification tokens and your sign-in, so the account can no longer be used.', 'Your open requests are cancelled.'],
    keepHome: ['Your completed purchases (invoices and the messages about them) stay with the seller under the name "Deleted account", because they are part of their records.', 'Data the law requires us to keep, such as tax-invoice data, is kept for the legally required period and then deleted.'],
    activeDeals: (n: number) => `You have ${n} ${n === 1 ? 'deal' : 'deals'} in progress. Finish them or talk to the other party before deleting: deleting stops the messages and confirmations in them.`,
    openDeals: 'Open my deals',
    team: (n: number) => `You have ${n} company team ${n === 1 ? 'member' : 'members'}; they lose access to the company account as soon as you delete it.`,
    delBiz: ['Your name, business name, phone number, address and location.', 'Drafts and notifications.', 'Your devices’ notification tokens and your sign-in (email and password), so the account can no longer be used.', 'Your open requests are cancelled.'],
    backHome: 'Back to the home page',
  },
  ur: {
    title: 'اکاؤنٹ حذف کریں', home: 'مرکزی صفحہ',
    intro: 'آپ کسی بھی وقت ویب سائٹ یا موبائل ایپ سے اپنا تسعیرک اکاؤنٹ حذف کر سکتے ہیں۔ حذف فوری ہوتا ہے اور واپس نہیں ہو سکتا۔',
    howTitle: 'حذف کرنے کا طریقہ',
    how: ['ایپ میں: ترتیبات ← میرا اکاؤنٹ حذف کریں۔', 'ویب سائٹ پر: لاگ اِن کریں، یہ صفحہ کھولیں اور «میرا اکاؤنٹ مستقل حذف کریں» دبائیں۔', 'اگر ممکن نہ ہو یا آپ کے پاس ایپ نہیں ہے تو اپنی رجسٹرڈ ای میل سے نیچے دیے گئے پتے پر لکھیں، ہم 30 دن کے اندر حذف کر دیں گے۔'],
    mailTitle: 'سپورٹ ای میل', mailHint: 'حذف کی درخواست اپنے اکاؤنٹ میں رجسٹرڈ ای میل سے بھیجیں۔',
    delTitle: 'کیا حذف ہوتا ہے',
    del: ['آپ کا نام، ادارے کا نام، فون نمبر، پتہ اور مقام۔', 'آپ کی اپ لوڈ کردہ تصدیقی دستاویزات (لائسنس اور تجارتی رجسٹریشن)۔', 'ڈرافٹ، اطلاعات، مہارتیں، شاخیں اور شائع شدہ قیمتیں۔', 'آپ کے آلات کے اطلاعاتی ٹوکن اور لاگ اِن (ای میل اور پاس ورڈ)، اس کے بعد اکاؤنٹ استعمال نہیں ہو سکتا۔', 'آپ کی کھلی درخواستیں اور زیرِ غور پیشکشیں منسوخ ہو جاتی ہیں۔'],
    keepTitle: 'کیا محفوظ رہتا ہے اور کیوں',
    keep: ['مکمل سودے (خریداری آرڈر، انوائس اور متعلقہ پیغامات) دوسرے فریق کے پاس «حذف شدہ اکاؤنٹ» کے نام سے رہتے ہیں کیونکہ وہ اس کے ریکارڈ کا حصہ ہیں۔', 'جو ڈیٹا قانوناً رکھنا لازم ہے، جیسے ٹیکس انوائس کا ڈیٹا، مقررہ مدت تک رکھا جاتا ہے پھر حذف کر دیا جاتا ہے۔'],
    signedOut: 'یہاں سے اکاؤنٹ حذف کرنے کے لیے پہلے لاگ اِن کریں۔', login: 'لاگ اِن',
    confirmLabel: 'تصدیق کے لیے «حذف» لکھیں', confirmWord: 'حذف',
    button: 'میرا اکاؤنٹ مستقل حذف کریں', deleting: 'حذف ہو رہا ہے…',
    done: 'آپ کا اکاؤنٹ حذف ہو گیا۔ تسعیرک استعمال کرنے کا شکریہ۔',
    adminErr: 'پلیٹ فارم ایڈمن کا اکاؤنٹ یہاں سے حذف نہیں ہو سکتا۔', err: 'اکاؤنٹ حذف نہیں ہو سکا۔ دوبارہ کوشش کریں یا سپورٹ سے رابطہ کریں۔',
    delHome: ['آپ کا نام، فون نمبر، پتہ اور مقام۔', 'ڈرافٹ اور اطلاعات۔', 'آپ کے آلات کے اطلاعاتی ٹوکن اور لاگ اِن، اس کے بعد اکاؤنٹ استعمال نہیں ہو سکتا۔', 'آپ کی کھلی درخواستیں منسوخ ہو جاتی ہیں۔'],
    keepHome: ['آپ کی مکمل خریداریاں (انوائس اور متعلقہ پیغامات) بیچنے والے کے پاس «حذف شدہ اکاؤنٹ» کے نام سے رہتی ہیں کیونکہ وہ اس کے ریکارڈ کا حصہ ہیں۔', 'جو ڈیٹا قانوناً رکھنا لازم ہے، جیسے ٹیکس انوائس کا ڈیٹا، مقررہ مدت تک رکھا جاتا ہے پھر حذف کر دیا جاتا ہے۔'],
    activeDeals: (n: number) => `آپ کے ${n} سودے جاری ہیں۔ حذف کرنے سے پہلے انہیں مکمل کریں یا دوسرے فریق سے بات کریں، کیونکہ حذف کرنے سے ان میں پیغامات اور تصدیقات رک جاتی ہیں۔`,
    openDeals: 'میرے سودے کھولیں',
    team: (n: number) => `کمپنی کی ٹیم میں آپ کے ${n} رکن ہیں، اور حذف کرتے ہی وہ کمپنی کے اکاؤنٹ تک رسائی کھو دیں گے۔`,
    delBiz: ['آپ کا نام، ادارے کا نام، فون نمبر، پتہ اور مقام۔', 'ڈرافٹ اور اطلاعات۔', 'آپ کے آلات کے اطلاعاتی ٹوکن اور لاگ اِن (ای میل اور پاسورڈ)، اس کے بعد اکاؤنٹ استعمال نہیں ہو سکتا۔', 'آپ کی کھلی درخواستیں منسوخ ہو جاتی ہیں۔'],
    backHome: 'مرکزی صفحے پر واپس جائیں',
  },
}

export default function DeleteAccountPage() {
  const { locale, dir } = useTranslation()
  const t = C[locale] || C.ar
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  // role-based lists (a home buyer has no purchase orders or business name) and a warning when deals are still running (UX-100)
  const [homeBuyer, setHomeBuyer] = useState(false)
  const [activeDeals, setActiveDeals] = useState(0)
  const [role, setRole] = useState('')
  const [teamCount, setTeamCount] = useState(0)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      setSignedIn(!!data.session)
      const uid = data.session?.user?.id
      if (!uid) return
      try {
        const { data: p } = await sb.from('profiles').select('role, buyer_type').eq('id', uid).maybeSingle()
        setHomeBuyer(p?.role === 'contractor' && p?.buyer_type === 'individual')
        setRole(p?.role || '')
        // the company's team members lose access at once (UX-119)
        if (p?.role === 'supplier') {
          const { count } = await sb.from('company_members').select('user_id', { count: 'exact', head: true }).eq('company_id', uid).eq('status', 'active')
          setTeamCount(count || 0)
        }
      } catch {}
      try {
        const { data: n, error } = await sb.rpc('my_active_deal_count')
        if (!error && typeof n === 'number') setActiveDeals(n)
      } catch {}
    })
  }, [])

  async function remove() {
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/account/delete', { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setError(j.error === 'admin_cannot_self_delete' ? t.adminErr : t.err); return }
      clearAllLocalDrafts()
      try { await createClient().auth.signOut() } catch {}
      setDone(true)
    } catch { setError(t.err) } finally { setBusy(false) }
  }

  const List = ({ items }: { items: string[] }) => (
    <ul className="list-disc ps-5 space-y-1 text-sm text-gray-600 leading-relaxed">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
  )

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="shrink-0" aria-label="تسعيرك">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/taseerak-metallic-logo.webp" alt="تسعيرك" className="h-11 w-auto" /></a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" />
            <HomeOrAccountLink homeLabel={t.home} />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#0B2438' }}>{t.title}</h1>
          <p className="text-sm text-gray-700 leading-relaxed">{t.intro}</p>
        </div>
        <section><h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{t.howTitle}</h2><List items={t.how} /></section>
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-bold mb-1" style={{ color: '#0B2438' }}>{t.mailTitle}</h2>
          <a href={`mailto:${OPERATOR.email}`} dir="ltr" className="inline-block font-mono text-base font-bold text-[#8F6820] hover:underline select-all break-all">{OPERATOR.email}</a>
          <p className="text-xs text-gray-500 mt-1">{t.mailHint}</p>
        </section>
        <section><h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{t.delTitle}</h2><List items={homeBuyer ? t.delHome : role === 'contractor' ? t.delBiz : t.del} /></section>
        <section><h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{t.keepTitle}</h2><List items={homeBuyer ? t.keepHome : t.keep} /></section>

        <div className="bg-white rounded-2xl border border-red-100 p-5">
          {done ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-[#0F6E56]" role="status"><Glyph e="✅" /> {t.done}</p>
              <a href="/" className="btn-navy">{t.backHome}</a>
            </div>
          ) : signedIn === false ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-600">{t.signedOut}</p>
              <Link href="/login?next=/account/delete" className="min-h-[44px] inline-flex items-center px-4 rounded-xl text-sm font-bold text-white" style={{ background: '#0B2438' }}>{t.login}</Link>
            </div>
          ) : signedIn === null ? (
            <p className="text-sm text-gray-600" role="status" aria-busy="true">{locale === 'en' ? 'Loading…' : locale === 'ur' ? 'لوڈ ہو رہا ہے…' : 'جارٍ التحميل…'}</p>
          ) : signedIn ? (
            <div className="space-y-3">
              {activeDeals > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{t.activeDeals(activeDeals)}{' '}
                  <a href={role === 'supplier' ? '/supplier/deals' : '/contractor/rfqs'} className="inline-flex items-center min-h-[44px] font-bold underline">{t.openDeals}</a>
                </div>
              )}
              {teamCount > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{t.team(teamCount)}</div>
              )}
              <label className="block text-sm font-semibold text-gray-700" htmlFor="confirm-word">{t.confirmLabel}</label>
              <input id="confirm-word" value={word} onChange={e => setWord(e.target.value)} className="input-field max-w-xs" autoComplete="off" />
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button type="button" onClick={remove} disabled={busy || word.trim().toUpperCase() !== t.confirmWord}
                className="btn-danger text-sm">
                {busy ? t.deleting : t.button}
              </button>
              {/* a way back without deleting (UX-184) */}
              <Link href="/settings" className="ms-0 sm:ms-2 inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold border border-gray-200 text-[#0B2438] bg-white hover:bg-gray-50">
                {locale === 'en' ? 'Cancel and go back to Settings' : locale === 'ur' ? 'منسوخ کریں اور ترتیبات پر واپس جائیں' : 'إلغاء والعودة إلى الإعدادات'}
              </Link>
            </div>
          ) : null}
        </div>

        <p className="text-center text-[12px] text-gray-600 pt-4">© 2026 تسعيرك — Taseerak</p>
      </div>
    </div>
  )
}
