'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { clearAllLocalDrafts } from '@/lib/localDraft'

// Public page required by Google Play / the App Store: how to delete a Taseerak account, what is
// deleted and what is kept. A signed-in visitor can delete the account here (POST /api/account/delete).

const C: Record<string, any> = {
  ar: {
    title: 'حذف الحساب', home: '🏠 الرئيسية',
    intro: 'يمكنك حذف حسابك في «تسعيرك» في أي وقت، من الموقع أو من تطبيق الجوال. يتم الحذف فوراً ولا يمكن التراجع عنه.',
    howTitle: 'طريقة الحذف',
    how: ['من التطبيق: الإعدادات ← حذف حسابي.', 'من الموقع: سجّل الدخول ثم افتح هذه الصفحة واضغط «احذف حسابي نهائياً».', 'إن تعذّر عليك ذلك، راسلنا عبر الدعم في المنصة من البريد المسجّل، وننفّذ الطلب خلال 30 يوماً.'],
    delTitle: 'ما الذي يُحذف',
    del: ['اسمك واسم منشأتك ورقم جوالك وعنوانك وموقعك.', 'مستندات التوثيق التي رفعتها (الرخصة والسجل التجاري).', 'المسودات والإشعارات وتخصصاتك وفروعك وأسعارك المنشورة.', 'رموز الإشعارات على أجهزتك، وبيانات الدخول (البريد وكلمة المرور)، فلا يمكن الدخول إلى الحساب بعدها.', 'تُلغى طلباتك المفتوحة وعروضك التي لم يُبتّ فيها.'],
    keepTitle: 'ما الذي يُحتفظ به ولماذا',
    keep: ['سجلّات الصفقات المكتملة (أوامر الشراء والفواتير والمراسلات المرتبطة بها) تبقى لدى الطرف الآخر باسم «حساب محذوف»، لأنها جزء من سجلّاته.', 'البيانات التي يُلزمنا النظام بحفظها، مثل بيانات الفواتير الضريبية، تُحفظ للمدة التي يحددها النظام ثم تُحذف.'],
    signedOut: 'لحذف حسابك من هنا، سجّل الدخول أولاً.', login: 'تسجيل الدخول',
    confirmLabel: 'اكتب كلمة «حذف» للتأكيد', confirmWord: 'حذف',
    button: 'احذف حسابي نهائياً', deleting: 'جارٍ الحذف…',
    done: 'تم حذف حسابك. شكراً لاستخدامك تسعيرك.',
    adminErr: 'لا يمكن حذف حساب مدير المنصة من هنا.', err: 'تعذّر حذف الحساب. حاول مرة أخرى أو راسل الدعم.',
  },
  en: {
    title: 'Delete your account', home: '🏠 Home',
    intro: 'You can delete your Taseerak account at any time, on the website or in the mobile app. Deletion is immediate and cannot be undone.',
    howTitle: 'How to delete',
    how: ['In the app: Settings → Delete my account.', 'On the website: sign in, open this page and press "Delete my account permanently".', 'If you cannot, message us through in-platform support from your registered email and we will complete it within 30 days.'],
    delTitle: 'What is deleted',
    del: ['Your name, business name, phone number, address and location.', 'The verification documents you uploaded (licence and commercial registration).', 'Drafts, notifications, specialties, branches and published prices.', 'Your devices’ notification tokens and your sign-in (email and password), so the account can no longer be used.', 'Your open requests and undecided offers are cancelled.'],
    keepTitle: 'What is kept, and why',
    keep: ['Completed deals (purchase orders, invoices and the messages about them) stay with the other party under the name "Deleted account", because they are part of their records.', 'Data the law requires us to keep, such as tax-invoice data, is kept for the legally required period and then deleted.'],
    signedOut: 'To delete your account here, sign in first.', login: 'Sign in',
    confirmLabel: 'Type DELETE to confirm', confirmWord: 'DELETE',
    button: 'Delete my account permanently', deleting: 'Deleting…',
    done: 'Your account has been deleted. Thank you for using Taseerak.',
    adminErr: 'A platform admin account cannot be deleted here.', err: 'Could not delete the account. Try again or contact support.',
  },
  ur: {
    title: 'اکاؤنٹ حذف کریں', home: '🏠 مرکزی صفحہ',
    intro: 'آپ کسی بھی وقت ویب سائٹ یا موبائل ایپ سے اپنا تسعیرک اکاؤنٹ حذف کر سکتے ہیں۔ حذف فوری ہوتا ہے اور واپس نہیں ہو سکتا۔',
    howTitle: 'حذف کرنے کا طریقہ',
    how: ['ایپ میں: ترتیبات ← میرا اکاؤنٹ حذف کریں۔', 'ویب سائٹ پر: لاگ اِن کریں، یہ صفحہ کھولیں اور «میرا اکاؤنٹ مستقل حذف کریں» دبائیں۔', 'اگر ممکن نہ ہو تو اپنی رجسٹرڈ ای میل سے پلیٹ فارم سپورٹ کو پیغام بھیجیں، ہم 30 دن کے اندر حذف کر دیں گے۔'],
    delTitle: 'کیا حذف ہوتا ہے',
    del: ['آپ کا نام، ادارے کا نام، فون نمبر، پتہ اور مقام۔', 'آپ کی اپ لوڈ کردہ تصدیقی دستاویزات (لائسنس اور تجارتی رجسٹریشن)۔', 'ڈرافٹ، اطلاعات، مہارتیں، شاخیں اور شائع شدہ قیمتیں۔', 'آپ کے آلات کے اطلاعاتی ٹوکن اور لاگ اِن (ای میل اور پاس ورڈ)، اس کے بعد اکاؤنٹ استعمال نہیں ہو سکتا۔', 'آپ کی کھلی درخواستیں اور زیرِ غور پیشکشیں منسوخ ہو جاتی ہیں۔'],
    keepTitle: 'کیا محفوظ رہتا ہے اور کیوں',
    keep: ['مکمل سودے (خریداری آرڈر، انوائس اور متعلقہ پیغامات) دوسرے فریق کے پاس «حذف شدہ اکاؤنٹ» کے نام سے رہتے ہیں کیونکہ وہ اس کے ریکارڈ کا حصہ ہیں۔', 'جو ڈیٹا قانوناً رکھنا لازم ہے، جیسے ٹیکس انوائس کا ڈیٹا، مقررہ مدت تک رکھا جاتا ہے پھر حذف کر دیا جاتا ہے۔'],
    signedOut: 'یہاں سے اکاؤنٹ حذف کرنے کے لیے پہلے لاگ اِن کریں۔', login: 'لاگ اِن',
    confirmLabel: 'تصدیق کے لیے «حذف» لکھیں', confirmWord: 'حذف',
    button: 'میرا اکاؤنٹ مستقل حذف کریں', deleting: 'حذف ہو رہا ہے…',
    done: 'آپ کا اکاؤنٹ حذف ہو گیا۔ تسعیرک استعمال کرنے کا شکریہ۔',
    adminErr: 'پلیٹ فارم ایڈمن کا اکاؤنٹ یہاں سے حذف نہیں ہو سکتا۔', err: 'اکاؤنٹ حذف نہیں ہو سکا۔ دوبارہ کوشش کریں یا سپورٹ سے رابطہ کریں۔',
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

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setSignedIn(!!data.session))
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
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600">{t.home}</a>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1B2D5B' }}>{t.title}</h1>
          <p className="text-sm text-gray-700 leading-relaxed">{t.intro}</p>
        </div>
        <section><h2 className="text-base font-bold mb-1.5" style={{ color: '#1B2D5B' }}>{t.howTitle}</h2><List items={t.how} /></section>
        <section><h2 className="text-base font-bold mb-1.5" style={{ color: '#1B2D5B' }}>{t.delTitle}</h2><List items={t.del} /></section>
        <section><h2 className="text-base font-bold mb-1.5" style={{ color: '#1B2D5B' }}>{t.keepTitle}</h2><List items={t.keep} /></section>

        <div className="bg-white rounded-2xl border border-red-100 p-5">
          {done ? (
            <p className="text-sm font-bold text-[#0F6E56]" role="status">✅ {t.done}</p>
          ) : signedIn === false ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-600">{t.signedOut}</p>
              <a href="/login?next=/account/delete" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#1B2D5B' }}>{t.login}</a>
            </div>
          ) : signedIn ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700" htmlFor="confirm-word">{t.confirmLabel}</label>
              <input id="confirm-word" value={word} onChange={e => setWord(e.target.value)} className="input-field max-w-xs" autoComplete="off" />
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button type="button" onClick={remove} disabled={busy || word.trim().toUpperCase() !== t.confirmWord}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40">
                {busy ? t.deleting : t.button}
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-center text-xs text-gray-400 pt-4">© 2026 تسعيرك — Taseerak</p>
      </div>
    </div>
  )
}
