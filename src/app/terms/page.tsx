'use client'

import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Glyph from '@/components/shared/Glyph'
import { TERMS_VERSION, OPERATOR } from '@/lib/legal'

// Terms for the free open beta (owner, 2026-10-27). Version = TERMS_VERSION (src/lib/legal.ts),
// which must equal public.current_terms_version() (migration 176): users' acceptance is recorded.
const C: Record<string, any> = {
  ar: {
    title: 'الشروط والأحكام',
    updated: `آخر تحديث: 27 أكتوبر 2026 · الإصدار ${TERMS_VERSION}`,
    home: 'الرئيسية',
    intro: `تُشغَّل منصة «تسعيرك» خلال مرحلتها التجريبية باسم «${OPERATOR.ar}»، وللتواصل: ${OPERATOR.email}. باستخدامك المنصة أو إنشاء حساب فيها فإنك توافق على هذه الشروط وعلى سياسة الخصوصية. إن لم توافق عليها فلا تستخدم المنصة.`,
    betaTitle: 'نسخة تجريبية مجانية',
    beta: 'المنصة في مرحلة تجريبية: الخدمة مجانية بالكامل ولا تُحصّل المنصة أي رسوم أو عمولة. قد تتغير بعض الخصائص أو تتوقف، وقد تحدث أعطال أو انقطاعات، ونعمل على إصلاحها في أقرب وقت.',
    sections: [
      ['1. المشغّل والتواصل', `تُشغَّل المنصة خلال المرحلة التجريبية باسم «${OPERATOR.ar}». يُحدَّث هذا البند ببيانات الجهة المشغّلة عند تأسيسها، ويُبلَّغ المستخدمون بذلك. لأي استفسار أو شكوى: ${OPERATOR.email}.`],
      ['2. طبيعة المنصة', 'تسعيرك منصة إلكترونية تربط المشترين بالموردين: ينشر المشتري طلب تسعير، ويقدّم الموردون عروضهم، ويختار المشتري ما يناسبه. المنصة ليست طرفاً في أي اتفاق بين المستخدمين، ولا تبيع المواد ولا تشتريها، ولا تستلم أموال الصفقات. مستند الصفقة الذي تعرضه المنصة ليس فاتورة ضريبية، والفاتورة الرسمية يصدرها المورد.'],
      ['3. المجانية والرسوم مستقبلاً', 'الخدمة مجانية خلال المرحلة التجريبية، ولا تُستقطع أي عمولة من الصفقات. إن قررنا لاحقاً فرض رسوم اشتراك فسنعلن ذلك قبل 30 يوماً على الأقل، ولن تُفرض أي رسوم على حسابك إلا بعد موافقتك الصريحة، ولا تُفرض بأثر رجعي.'],
      ['4. الحساب والأهلية', 'يجب أن تكون مخوّلاً نظاماً بتمثيل المنشأة التي تسجّل باسمها، وأن تكون بياناتك صحيحة ومحدّثة. أنت مسؤول عن سرية بيانات الدخول وعن كل ما يتم عبر حسابك. لا يُستخدم السجل التجاري الواحد إلا في حساب واحد، ومن كان سجلّه مسجّلاً في حساب آخر فله أن يطلب التحقق عبر المنصة.'],
      ['5. الطلبات والعروض والأسعار', 'يتحمّل كل مستخدم مسؤولية ما ينشره من طلبات وعروض وأسعار وكميات ومدد توريد. تُدخل الأسعار وتُعرض شاملة ضريبة القيمة المضافة حيث تنطبق. لا تضمن المنصة دقة العروض أو توفر المواد أو التزام أي طرف بها.'],
      ['6. التحقق وعلامة «موثّق»', 'قد تراجع المنصة مستندات المنشآت (مثل السجل التجاري) يدوياً، وقد تستعين بقراءة آلية للمستند للمساعدة في المراجعة. علامة «موثّق» تعني أن المستندات رُوجعت، ولا تعني ضمان جودة المنتجات أو الالتزام بالتوريد. يحق للمنصة سحب العلامة إذا تبيّن عدم صحة المستندات.'],
      ['7. الصفقات والدفع والتسليم', 'يتم الاتفاق والدفع والتسليم مباشرة بين المشتري والمورد وعلى مسؤوليتهما، وعليهما التحقق من بعضهما قبل التعامل. أي نزاع بشأن الجودة أو التسليم أو السداد يكون بين طرفيه، ويمكن للمنصة أن تساعد في التواصل بينهما دون أن تكون ملزمة بحلّه.'],
      ['8. الاستخدامات المحظورة', 'يُمنع: إدخال بيانات كاذبة أو مستندات غير صحيحة، وإنشاء حسابات وهمية أو متعددة للمنشأة نفسها، وانتحال صفة الغير، واستخدام سجل تجاري لا يخصّك، وعرض مواد محظورة نظاماً، والإساءة إلى المستخدمين، ونسخ بيانات المنصة آلياً، ومحاولة اختراقها أو تعطيلها.'],
      ['9. الملكية الفكرية والمحتوى', 'حقوق المنصة وتصميمها وشعارها وبرمجياتها محفوظة لتسعيرك. يحتفظ المستخدم بحقوق ما يرفعه، ويمنح المنصة إذناً باستخدامه وعرضه بالقدر اللازم لتقديم الخدمة.'],
      ['10. حدود المسؤولية', 'تُقدَّم المنصة خلال المرحلة التجريبية «كما هي». لا تتحمل المنصة مسؤولية تصرفات المستخدمين أو جودة المواد أو التسليم أو السداد، ولا الأضرار غير المباشرة أو فوات الربح. ولا يُقصد بأي بند في هذه الشروط استبعاد مسؤولية لا يجوز استبعادها وفق أنظمة المملكة العربية السعودية، ومنها المسؤولية عن الغش أو الخطأ الجسيم من جانب المنصة نفسها.'],
      ['11. التعليق والإنهاء وحذف الحساب', 'يحق للمنصة تعليق أو إيقاف الحساب الذي يخالف هذه الشروط، مع إبلاغ صاحبه بالسبب ما لم يمنع ذلك مانع نظامي. ويمكنك حذف حسابك في أي وقت من الإعدادات أو من صفحة «حذف الحساب».'],
      ['12. البيانات الشخصية', 'نعالج بياناتك وفق سياسة الخصوصية ونظام حماية البيانات الشخصية. اطّلع على سياسة الخصوصية لمعرفة البيانات التي نجمعها وحقوقك.'],
      ['13. التعديلات', 'قد نحدّث هذه الشروط. نُبلغك بالتعديلات الجوهرية داخل المنصة أو بالبريد الإلكتروني، وقد نطلب موافقتك على الإصدار الجديد قبل متابعة الاستخدام.'],
      ['14. النظام الواجب التطبيق', 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص الجهات القضائية في المملكة بالنظر في أي نزاع ينشأ عنها.'],
    ],
    privacyLink: 'سياسة الخصوصية',
  },
  en: {
    title: 'Terms & Conditions',
    updated: `Last updated: 27 October 2026 · Version ${TERMS_VERSION}`,
    home: 'Home',
    intro: `During its beta, the Taseerak platform is operated as "${OPERATOR.en}". Contact: ${OPERATOR.email}. By using the platform or creating an account you agree to these Terms and to the Privacy Policy. If you do not agree, do not use the platform.`,
    betaTitle: 'Free beta',
    beta: 'The platform is in beta: the service is completely free and the platform charges no fees or commission. Some features may change or stop, and outages may occur; we work to fix them quickly.',
    sections: [
      ['1. Operator and contact', `During the beta the platform is operated as "${OPERATOR.en}". This clause will be updated with the operating entity's details once it is established, and users will be informed. For any question or complaint: ${OPERATOR.email}.`],
      ['2. Nature of the platform', 'Taseerak is an online platform that connects buyers with suppliers: a buyer posts a request for quotes, suppliers submit offers, and the buyer chooses. The platform is not a party to any agreement between users, does not sell or buy materials, and does not receive deal payments. The deal document shown by the platform is not a tax invoice; the official invoice is issued by the supplier.'],
      ['3. Free service and future fees', 'The service is free during the beta and no commission is taken from deals. If we later introduce subscription fees we will announce them at least 30 days in advance; no fee will be charged to your account without your explicit consent, and none retroactively.'],
      ['4. Account and eligibility', 'You must be legally authorised to represent the business you register, and keep your data accurate and current. You are responsible for your login credentials and for all activity on your account. A commercial registration may be used by one account only; if yours is registered in another account you may request verification through the platform.'],
      ['5. Requests, offers and prices', 'Each user is responsible for the requests, offers, prices, quantities and delivery times they publish. Prices are entered and shown inclusive of VAT where applicable. The platform does not guarantee the accuracy of offers, the availability of materials, or any party\'s commitment to them.'],
      ['6. Verification and the "Verified" badge', 'The platform may review business documents (such as the commercial registration) manually and may use an automated reading of the document to assist the review. The "Verified" badge means the documents were reviewed; it does not guarantee product quality or delivery. The platform may withdraw the badge if documents prove incorrect.'],
      ['7. Deals, payment and delivery', 'Agreement, payment and delivery take place directly between buyer and supplier at their own responsibility, and each should check the other before dealing. Any dispute over quality, delivery or payment is between the parties; the platform may help them communicate but is not obliged to resolve it.'],
      ['8. Prohibited use', 'It is prohibited to: enter false data or documents, create fake or multiple accounts for the same business, impersonate others, use a commercial registration that is not yours, list materials prohibited by law, abuse other users, scrape the platform, or attempt to hack or disrupt it.'],
      ['9. Intellectual property and content', 'The platform, its design, logo and software belong to Taseerak. Users keep the rights to what they upload and grant the platform permission to use and display it as needed to provide the service.'],
      ['10. Limitation of liability', 'During the beta the platform is provided "as is". The platform is not liable for users\' conduct, material quality, delivery or payment, nor for indirect losses or lost profits. Nothing in these Terms excludes liability that cannot be excluded under the laws of Saudi Arabia, including liability for fraud or gross negligence by the platform itself.'],
      ['11. Suspension, termination and account deletion', 'The platform may suspend or stop an account that breaches these Terms and will inform its owner of the reason unless legally prevented. You can delete your account at any time from Settings or from the "Delete account" page.'],
      ['12. Personal data', 'We process your data under the Privacy Policy and the Personal Data Protection Law (PDPL). See the Privacy Policy for what we collect and your rights.'],
      ['13. Changes', 'We may update these Terms. We will notify you of material changes in the platform or by email, and may ask you to accept the new version before continuing.'],
      ['14. Governing law', 'These Terms are governed by the laws of the Kingdom of Saudi Arabia, and the Saudi courts have jurisdiction over any dispute arising from them.'],
    ],
    privacyLink: 'Privacy Policy',
  },
  ur: {
    title: 'شرائط و ضوابط',
    updated: `آخری تازہ کاری: 27 اکتوبر 2026 · ورژن ${TERMS_VERSION}`,
    home: 'مرکزی صفحہ',
    intro: `آزمائشی مرحلے کے دوران تسعیرک پلیٹ فارم «${OPERATOR.ur}» کے نام سے چلایا جاتا ہے۔ رابطہ: ${OPERATOR.email}۔ پلیٹ فارم استعمال کرنے یا اکاؤنٹ بنانے سے آپ ان شرائط اور رازداری کی پالیسی سے اتفاق کرتے ہیں۔ اگر آپ متفق نہیں تو پلیٹ فارم استعمال نہ کریں۔`,
    betaTitle: 'مفت آزمائشی ورژن',
    beta: 'پلیٹ فارم آزمائشی مرحلے میں ہے: سروس مکمل طور پر مفت ہے اور پلیٹ فارم کوئی فیس یا کمیشن نہیں لیتا۔ کچھ خصوصیات بدل یا بند ہو سکتی ہیں اور خرابیاں آ سکتی ہیں؛ ہم انہیں جلد ٹھیک کرتے ہیں۔',
    sections: [
      ['1. چلانے والا اور رابطہ', `آزمائشی مرحلے میں پلیٹ فارم «${OPERATOR.ur}» کے نام سے چلایا جاتا ہے۔ چلانے والے ادارے کے قیام پر یہ شق اس کی تفصیلات سے اپ ڈیٹ کی جائے گی اور صارفین کو بتایا جائے گا۔ کسی سوال یا شکایت کے لیے: ${OPERATOR.email}۔`],
      ['2. پلیٹ فارم کی نوعیت', 'تسعیرک ایک آن لائن پلیٹ فارم ہے جو خریداروں کو سپلائرز سے جوڑتا ہے: خریدار قیمت کی درخواست شائع کرتا ہے، سپلائرز پیشکشیں دیتے ہیں اور خریدار انتخاب کرتا ہے۔ پلیٹ فارم صارفین کے کسی معاہدے میں فریق نہیں، نہ مواد بیچتا یا خریدتا ہے اور نہ سودوں کی رقم وصول کرتا ہے۔ پلیٹ فارم کا سودا دستاویز ٹیکس انوائس نہیں؛ سرکاری انوائس سپلائر جاری کرتا ہے۔'],
      ['3. مفت سروس اور آئندہ فیس', 'آزمائشی مرحلے میں سروس مفت ہے اور سودوں سے کوئی کمیشن نہیں لیا جاتا۔ اگر بعد میں سبسکرپشن فیس رکھی گئی تو کم از کم 30 دن پہلے اعلان ہوگا؛ آپ کی واضح منظوری کے بغیر کوئی فیس نہیں لی جائے گی اور نہ پچھلی تاریخ سے۔'],
      ['4. اکاؤنٹ اور اہلیت', 'آپ کو قانونی طور پر اس ادارے کی نمائندگی کا اختیار ہونا چاہیے جس کے نام سے آپ رجسٹر کرتے ہیں، اور آپ کا ڈیٹا درست اور تازہ ہونا چاہیے۔ لاگ اِن کی رازداری اور اکاؤنٹ کی ہر سرگرمی آپ کی ذمہ داری ہے۔ ایک تجارتی رجسٹریشن صرف ایک اکاؤنٹ میں استعمال ہو سکتی ہے؛ اگر آپ کی رجسٹریشن کسی اور اکاؤنٹ میں ہے تو آپ پلیٹ فارم کے ذریعے تصدیق کی درخواست دے سکتے ہیں۔'],
      ['5. درخواستیں، پیشکشیں اور قیمتیں', 'ہر صارف اپنی شائع کردہ درخواستوں، پیشکشوں، قیمتوں، مقداروں اور ترسیل کی مدت کا ذمہ دار ہے۔ قیمتیں جہاں لاگو ہو ویلیو ایڈڈ ٹیکس سمیت درج اور ظاہر کی جاتی ہیں۔ پلیٹ فارم پیشکشوں کی درستگی، مواد کی دستیابی یا کسی فریق کی پابندی کی ضمانت نہیں دیتا۔'],
      ['6. تصدیق اور «تصدیق شدہ» نشان', 'پلیٹ فارم اداروں کی دستاویزات (جیسے تجارتی رجسٹریشن) کا دستی جائزہ لے سکتا ہے اور جائزے میں مدد کے لیے دستاویز کی خودکار قراءت استعمال کر سکتا ہے۔ «تصدیق شدہ» نشان کا مطلب ہے کہ دستاویزات دیکھی گئیں؛ یہ معیار یا ترسیل کی ضمانت نہیں۔ دستاویزات غلط ثابت ہوں تو نشان واپس لیا جا سکتا ہے۔'],
      ['7. سودے، ادائیگی اور ترسیل', 'معاہدہ، ادائیگی اور ترسیل براہِ راست خریدار اور سپلائر کے درمیان اور انہی کی ذمہ داری پر ہوتے ہیں، اور دونوں کو لین دین سے پہلے ایک دوسرے کی جانچ کرنی چاہیے۔ معیار، ترسیل یا ادائیگی کا تنازع فریقین کے درمیان ہے؛ پلیٹ فارم رابطے میں مدد کر سکتا ہے مگر اسے حل کرنے کا پابند نہیں۔'],
      ['8. ممنوعہ استعمال', 'منع ہے: جھوٹا ڈیٹا یا دستاویزات دینا، ایک ہی ادارے کے جعلی یا متعدد اکاؤنٹ بنانا، کسی کی نقالی کرنا، کسی اور کی تجارتی رجسٹریشن استعمال کرنا، قانوناً ممنوعہ مواد پیش کرنا، صارفین سے بدسلوکی، پلیٹ فارم کا ڈیٹا خودکار طور پر نقل کرنا، یا اسے ہیک یا معطل کرنے کی کوشش۔'],
      ['9. دانشورانہ املاک اور مواد', 'پلیٹ فارم، اس کا ڈیزائن، لوگو اور سافٹ ویئر تسعیرک کی ملکیت ہیں۔ صارف اپنے اپ لوڈ کردہ مواد کے حقوق رکھتا ہے اور سروس فراہم کرنے کے لیے ضروری حد تک اس کے استعمال اور ظاہر کرنے کی اجازت دیتا ہے۔'],
      ['10. ذمہ داری کی حد', 'آزمائشی مرحلے میں پلیٹ فارم «جیسا ہے» فراہم کیا جاتا ہے۔ پلیٹ فارم صارفین کے طرزِ عمل، مواد کے معیار، ترسیل یا ادائیگی، اور بالواسطہ نقصان یا منافع کے نقصان کا ذمہ دار نہیں۔ ان شرائط کی کوئی شق ایسی ذمہ داری ختم نہیں کرتی جو سعودی قوانین کے تحت ختم نہیں کی جا سکتی، بشمول پلیٹ فارم کی اپنی دھوکہ دہی یا سنگین غفلت۔'],
      ['11. معطلی، اختتام اور اکاؤنٹ حذف کرنا', 'شرائط کی خلاف ورزی کرنے والا اکاؤنٹ معطل یا بند کیا جا سکتا ہے اور قانونی رکاوٹ نہ ہو تو مالک کو وجہ بتائی جائے گی۔ آپ کسی بھی وقت ترتیبات سے یا «اکاؤنٹ حذف کریں» صفحے سے اپنا اکاؤنٹ حذف کر سکتے ہیں۔'],
      ['12. ذاتی ڈیٹا', 'ہم آپ کا ڈیٹا رازداری کی پالیسی اور ذاتی ڈیٹا کے تحفظ کے قانون (PDPL) کے مطابق پراسیس کرتے ہیں۔ جمع کیے جانے والے ڈیٹا اور اپنے حقوق کے لیے رازداری کی پالیسی دیکھیں۔'],
      ['13. تبدیلیاں', 'ہم ان شرائط کو اپ ڈیٹ کر سکتے ہیں۔ اہم تبدیلیوں کی اطلاع پلیٹ فارم میں یا ای میل سے دی جائے گی، اور جاری رکھنے سے پہلے نئے ورژن کی منظوری مانگی جا سکتی ہے۔'],
      ['14. قابلِ اطلاق قانون', 'یہ شرائط سعودی عرب کے قوانین کے تابع ہیں، اور ان سے پیدا ہونے والے کسی تنازع پر سعودی عدالتوں کو اختیار حاصل ہے۔'],
    ],
    privacyLink: 'رازداری کی پالیسی',
  },
}

export default function TermsPage() {
  const { locale, dir } = useTranslation()
  const t = C[locale] || C.ar

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0B2438' }}>{t.title}</h1>
        <p className="text-xs text-gray-400 mb-5">{t.updated}</p>

        <p className="text-sm text-gray-700 leading-relaxed mb-4">{t.intro}</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg"><Glyph e="⚠" /></span>
            <h2 className="text-base font-extrabold text-amber-800">{t.betaTitle}</h2>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{t.beta}</p>
        </div>

        <div className="space-y-5">
          {t.sections.map(([h, body]: string[], i: number) => (
            <section key={i}>
              <h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{h}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          <a href="/privacy" className="hover:underline">{t.privacyLink}</a> · © 2026 تسعيرك — Taseerak
        </p>
      </div>
    </div>
  )
}
