// @ts-nocheck
'use client'

import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const C = {
  ar: {
    title: 'الشروط والأحكام',
    updated: 'آخر تحديث: يونيو 2026',
    home: '🏠 الرئيسية',
    intro: 'مرحباً بك في منصة «تسعيرك». باستخدامك المنصة فإنك توافق على هذه الشروط والأحكام بالكامل. إذا لم توافق عليها، يُرجى عدم استخدام المنصة.',
    liabilityTitle: 'إخلاء مسؤولية مهم',
    liability: '«تسعيرك» منصة وسيطة لنقل المعلومات وتسهيل التواصل فقط — لا تبيع ولا توّرد ولا تشتري ولا تتوسّط مالياً. جميع الاتفاقيات والمدفوعات والتسليم والجودة تتم مباشرةً بين المقاول والمورد وعلى مسؤوليتهما الكاملة. لا تتحمّل المنصة أيّ مسؤولية — قانونية أو مالية أو جنائية أو غيرها — عن أي عملية نصب أو احتيال أو سرقة أو غشّ أو تزوير أو إخلال بالاتفاق أو ضرر أو أي تصرّف غير قانوني يقع بين المستخدمين أو من أي طرف. التحقّق والعناية الواجبة مسؤولية الطرفين وحدهما. وتتعاون المنصة مع الجهات المختصة عند ورود طلب نظامي، لكنها ليست طرفاً في أي نزاع ولا تضمن أو تكفل أي طرف أو منتج أو خدمة.',
    note: 'ملاحظة: هذه نسخة مبدئية. يُنصح بمراجعتها من قِبل مستشار قانوني معتمد قبل الإطلاق الرسمي لضمان توافقها مع أنظمة المملكة العربية السعودية.',
    sections: [
      ['1. طبيعة المنصة', 'تسعيرك منصة وسيطة إلكترونية تربط المقاولين بالموردين والمصانع لطلب أسعار المواد وتلقي العروض. المنصة ليست طرفاً في أي صفقة تتم بين المستخدمين، ولا تبيع ولا توّرد المواد بنفسها.'],
      ['2. الأهلية والحساب', 'يجب أن تكون مخوّلاً نظاماً لتمثيل منشأتك. أنت مسؤول عن دقة بياناتك وعن سرية بيانات الدخول الخاصة بك وعن جميع الأنشطة التي تتم عبر حسابك.'],
      ['3. طلبات التسعير والعروض', 'المقاول ينشر طلب تسعير، والموردون يقدّمون عروضهم. الأسعار والعروض والكميات ومدد التسليم يقدّمها المستخدمون على مسؤوليتهم، والمنصة لا تضمن دقتها أو توفّرها.'],
      ['4. التحقق وعلامة «موثّق»', 'قد تظهر علامة «موثّق» للموردين الذين تمت مراجعة مستنداتهم. هذه العلامة لا تُعدّ ضماناً لجودة المنتجات أو الالتزام بالتسليم، وتبقى مسؤولية التحقّق والعناية الواجبة على عاتق الطرفين.'],
      ['5. الصفقات والدفع', 'تتم الاتفاقيات والدفع والتسليم مباشرةً بين المقاول والمورد. المنصة غير مسؤولة عن جودة المواد أو التسليم أو السداد أو أي نزاع ينشأ بين الطرفين.'],
      ['6. الاستخدامات المحظورة', 'يُمنع استخدام المنصة لأي غرض غير قانوني، أو إدخال بيانات كاذبة، أو انتحال صفة الغير، أو محاولة اختراق المنصة أو الإضرار بها أو بمستخدميها.'],
      ['7. الملكية الفكرية', 'جميع حقوق المنصة وتصميمها وشعارها ومحتواها مملوكة لـ«تسعيرك». لا يجوز نسخها أو إعادة استخدامها دون إذن كتابي.'],
      ['8. إخلاء المسؤولية', 'تُقدَّم المنصة «كما هي». ضمن الحدود التي يسمح بها النظام، لا تتحمّل تسعيرك أي مسؤولية عن أضرار مباشرة أو غير مباشرة تنشأ عن استخدام المنصة أو الصفقات التي تتم عبرها.'],
      ['9. الإنهاء', 'يحق لتسعيرك تعليق أو إنهاء أي حساب يخالف هذه الشروط دون إشعار مسبق.'],
      ['10. التعديلات', 'قد نقوم بتحديث هذه الشروط من وقت لآخر، ويسري التحديث فور نشره على المنصة.'],
      ['11. القانون الواجب التطبيق', 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص الجهات القضائية السعودية بالنظر في أي نزاع.'],
      ['12. التواصل', 'لأي استفسار بخصوص هذه الشروط، تواصل معنا عبر قنوات الدعم في المنصة.'],
    ],
  },
  en: {
    title: 'Terms & Conditions',
    updated: 'Last updated: June 2026',
    home: '🏠 Home',
    intro: 'Welcome to Taseerak. By using the platform you agree to these Terms & Conditions in full. If you do not agree, please do not use the platform.',
    liabilityTitle: 'Important disclaimer',
    liability: 'Taseerak is an intermediary for transmitting information and enabling contact only — it does not sell, supply, buy, or act as a financial intermediary. All agreements, payments, delivery, and quality take place directly between the contractor and the supplier and at their full responsibility. The platform bears NO liability — legal, financial, criminal, or otherwise — for any scam, fraud, theft, deception, forgery, breach of agreement, damage, or any illegal act occurring between users or by any party. Verification and due diligence are solely the responsibility of both parties. The platform cooperates with the competent authorities upon lawful request, but is not a party to any dispute and does not guarantee any party, product, or service.',
    note: 'Note: This is a preliminary version. Please have it reviewed by a qualified legal advisor before official launch to ensure compliance with the laws of Saudi Arabia.',
    sections: [
      ['1. Nature of the platform', 'Taseerak is an online intermediary that connects contractors with suppliers and factories to request material prices and receive offers. The platform is not a party to any transaction between users and does not itself sell or supply materials.'],
      ['2. Eligibility & account', 'You must be authorized to represent your business. You are responsible for the accuracy of your data, for keeping your login credentials confidential, and for all activity under your account.'],
      ['3. RFQs & offers', 'Contractors post requests for quotes and suppliers submit offers. Prices, offers, quantities and delivery times are provided by users at their own responsibility; the platform does not guarantee their accuracy or availability.'],
      ['4. Verification & the "Verified" badge', 'A "Verified" badge may appear for suppliers whose documents have been reviewed. It is not a guarantee of product quality or delivery; due diligence remains the responsibility of both parties.'],
      ['5. Transactions & payment', 'Agreements, payment and delivery take place directly between the contractor and the supplier. The platform is not responsible for material quality, delivery, payment, or any dispute between the parties.'],
      ['6. Prohibited use', 'You may not use the platform for any unlawful purpose, enter false data, impersonate others, or attempt to hack or harm the platform or its users.'],
      ['7. Intellectual property', 'All rights to the platform, its design, logo and content belong to Taseerak and may not be copied or reused without written permission.'],
      ['8. Disclaimer', 'The platform is provided "as is". To the extent permitted by law, Taseerak is not liable for any direct or indirect damages arising from use of the platform or transactions made through it.'],
      ['9. Termination', 'Taseerak may suspend or terminate any account that violates these Terms without prior notice.'],
      ['10. Changes', 'We may update these Terms from time to time; updates take effect once published on the platform.'],
      ['11. Governing law', 'These Terms are governed by the laws of the Kingdom of Saudi Arabia, and Saudi courts have jurisdiction over any dispute.'],
      ['12. Contact', 'For any question about these Terms, contact us through the platform support channels.'],
    ],
  },
  ur: {
    title: 'شرائط و ضوابط',
    updated: 'آخری تازہ کاری: جون 2026',
    home: '🏠 مرکزی صفحہ',
    intro: 'تسعیرک پلیٹ فارم میں خوش آمدید۔ پلیٹ فارم استعمال کرنے سے آپ ان شرائط و ضوابط سے مکمل اتفاق کرتے ہیں۔ اگر آپ متفق نہیں ہیں تو براہ کرم پلیٹ فارم استعمال نہ کریں۔',
    liabilityTitle: 'اہم دستبرداری (ذمہ داری سے انکار)',
    liability: '«تسعیرک» صرف معلومات کی ترسیل اور رابطہ آسان بنانے والا ثالث پلیٹ فارم ہے — یہ نہ بیچتا ہے، نہ سپلائی کرتا ہے، نہ خریدتا ہے اور نہ مالی ثالثی کرتا ہے۔ تمام معاہدے، ادائیگیاں، ترسیل اور معیار براہِ راست ٹھیکیدار اور سپلائر کے درمیان اور انہی کی مکمل ذمہ داری پر ہوتے ہیں۔ پلیٹ فارم صارفین کے درمیان یا کسی بھی فریق کی جانب سے کسی دھوکہ دہی، فراڈ، چوری، جعل سازی، معاہدے کی خلاف ورزی، نقصان یا کسی بھی غیر قانونی عمل کے لیے کوئی قانونی، مالی، فوجداری یا کسی اور قسم کی ذمہ داری نہیں اٹھاتا۔ تصدیق اور مناسب احتیاط صرف دونوں فریقوں کی ذمہ داری ہے۔ پلیٹ فارم قانونی درخواست پر متعلقہ حکام کے ساتھ تعاون کرتا ہے، لیکن کسی تنازع میں فریق نہیں اور کسی فریق، پروڈکٹ یا سروس کی ضمانت نہیں دیتا۔',
    note: 'نوٹ: یہ ابتدائی نسخہ ہے۔ سرکاری اجراء سے پہلے سعودی عرب کے قوانین سے مطابقت یقینی بنانے کے لیے کسی مستند قانونی مشیر سے جائزہ لینے کی سفارش کی جاتی ہے۔',
    sections: [
      ['1. پلیٹ فارم کی نوعیت', 'تسعیرک ایک آن لائن ثالث پلیٹ فارم ہے جو ٹھیکیداروں کو سپلائرز اور فیکٹریوں سے مواد کی قیمتیں طلب کرنے اور پیشکشیں وصول کرنے کے لیے جوڑتا ہے۔ پلیٹ فارم صارفین کے درمیان کسی لین دین میں فریق نہیں اور خود مواد نہیں بیچتا یا سپلائی کرتا۔'],
      ['2. اہلیت اور اکاؤنٹ', 'آپ کو اپنے ادارے کی نمائندگی کا قانونی اختیار ہونا چاہیے۔ آپ اپنے ڈیٹا کی درستگی، اپنی لاگ اِن معلومات کی رازداری اور اپنے اکاؤنٹ سے ہونے والی تمام سرگرمیوں کے ذمہ دار ہیں۔'],
      ['3. قیمت کی درخواستیں اور پیشکشیں', 'ٹھیکیدار قیمت کی درخواست شائع کرتے ہیں اور سپلائرز اپنی پیشکشیں جمع کراتے ہیں۔ قیمتیں، پیشکشیں، مقدار اور ترسیل کا وقت صارفین اپنی ذمہ داری پر فراہم کرتے ہیں؛ پلیٹ فارم ان کی درستگی یا دستیابی کی ضمانت نہیں دیتا۔'],
      ['4. تصدیق اور «تصدیق شدہ» نشان', 'جن سپلائرز کی دستاویزات کا جائزہ لیا گیا ہو ان کے لیے «تصدیق شدہ» نشان ظاہر ہو سکتا ہے۔ یہ پروڈکٹ کے معیار یا ترسیل کی ضمانت نہیں؛ مناسب احتیاط دونوں فریقوں کی ذمہ داری ہے۔'],
      ['5. لین دین اور ادائیگی', 'معاہدے، ادائیگی اور ترسیل براہِ راست ٹھیکیدار اور سپلائر کے درمیان ہوتے ہیں۔ پلیٹ فارم مواد کے معیار، ترسیل، ادائیگی یا فریقین کے درمیان کسی تنازع کا ذمہ دار نہیں۔'],
      ['6. ممنوعہ استعمال', 'پلیٹ فارم کو کسی غیر قانونی مقصد، جھوٹا ڈیٹا درج کرنے، کسی کی نقالی کرنے، یا پلیٹ فارم یا اس کے صارفین کو ہیک یا نقصان پہنچانے کی کوشش کے لیے استعمال کرنا منع ہے۔'],
      ['7. دانشورانہ املاک', 'پلیٹ فارم، اس کے ڈیزائن، لوگو اور مواد کے تمام حقوق «تسعیرک» کی ملکیت ہیں اور تحریری اجازت کے بغیر نقل یا دوبارہ استعمال نہیں کیے جا سکتے۔'],
      ['8. ذمہ داری سے انکار', 'پلیٹ فارم «جیسا ہے» فراہم کیا جاتا ہے۔ قانون کی اجازت کی حد تک، تسعیرک پلیٹ فارم کے استعمال یا اس کے ذریعے ہونے والے لین دین سے پیدا ہونے والے کسی بھی براہِ راست یا بالواسطہ نقصان کا ذمہ دار نہیں۔'],
      ['9. اختتام', 'تسعیرک ان شرائط کی خلاف ورزی کرنے والے کسی بھی اکاؤنٹ کو بغیر پیشگی اطلاع کے معطل یا ختم کر سکتا ہے۔'],
      ['10. تبدیلیاں', 'ہم وقتاً فوقتاً ان شرائط کو اپ ڈیٹ کر سکتے ہیں؛ اپ ڈیٹ پلیٹ فارم پر شائع ہوتے ہی نافذ العمل ہو جاتی ہے۔'],
      ['11. قابلِ اطلاق قانون', 'یہ شرائط سعودی عرب کے قوانین کے تابع ہیں، اور کسی بھی تنازع پر سعودی عدالتوں کو دائرہ اختیار حاصل ہے۔'],
      ['12. رابطہ', 'ان شرائط کے بارے میں کسی سوال کے لیے، پلیٹ فارم کے سپورٹ چینلز کے ذریعے ہم سے رابطہ کریں۔'],
    ],
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
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1B2D5B' }}>{t.title}</h1>
        <p className="text-xs text-gray-400 mb-5">{t.updated}</p>

        <p className="text-sm text-gray-700 leading-relaxed mb-4">{t.intro}</p>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">⚠️</span>
            <h2 className="text-base font-extrabold text-red-700">{t.liabilityTitle}</h2>
          </div>
          <p className="text-sm text-red-800 leading-relaxed font-medium">{t.liability}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-6">⚠️ {t.note}</div>

        <div className="space-y-5">
          {t.sections.map(([h, body], i) => (
            <section key={i}>
              <h2 className="text-base font-bold mb-1.5" style={{ color: '#1B2D5B' }}>{h}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">© 2026 تسعيرك — Taseerak</p>
      </div>
    </div>
  )
}
