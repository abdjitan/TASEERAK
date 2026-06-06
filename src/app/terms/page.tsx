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
