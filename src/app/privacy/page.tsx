// @ts-nocheck
'use client'

import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

const C = {
  ar: {
    title: 'سياسة الخصوصية',
    updated: 'آخر تحديث: يونيو 2026',
    home: '🏠 الرئيسية',
    intro: 'تحترم منصة «تسعيرك» خصوصيتك وتلتزم بحماية بياناتك وفق نظام حماية البيانات الشخصية (PDPL) في المملكة العربية السعودية. توضّح هذه السياسة البيانات التي نجمعها وكيف نستخدمها.',
    note: 'ملاحظة: هذه نسخة مبدئية. يُنصح بمراجعتها من مستشار قانوني للتأكد من توافقها الكامل مع نظام حماية البيانات الشخصية.',
    sections: [
      ['1. البيانات التي نجمعها', 'بيانات الحساب (اسم المنشأة، البريد، الجوال)، بيانات التحقق (السجل التجاري، الرخصة، الرقم الضريبي)، الموقع والعنوان الوطني، القطاعات والتخصصات، وبيانات الاستخدام (طلبات التسعير، العروض، الرسائل).'],
      ['2. كيف نستخدم بياناتك', 'لتشغيل المنصة، ومطابقة الطلبات بالموردين المناسبين، والتحقق من المنشآت، وإرسال الإشعارات، وتحسين الخدمة، والامتثال للأنظمة.'],
      ['3. مشاركة البيانات', 'تُشارك بياناتك مع الطرف الآخر في الصفقة عند تقديم عرض أو قبوله (لإتمام التعامل)، ومع مزوّدي خدمات موثوقين يشغّلون المنصة (مثل خدمات الاستضافة وقواعد البيانات)، ومع بوابة «واثق» للتحقق من السجل التجاري. لا نبيع بياناتك لأي طرف ثالث.'],
      ['4. التخزين والأمان', 'تُخزَّن بياناتك على بنية تحتية آمنة، وتُشفَّر كلمات المرور، وتُحفظ المستندات الحساسة في تخزين خاص لا يصل إليه إلا المستخدم والإدارة. نطبّق صلاحيات وصول صارمة (RLS) على مستوى قاعدة البيانات.'],
      ['5. مدة الاحتفاظ', 'نحتفظ ببياناتك طوال فترة استخدامك للمنصة وبالقدر اللازم للأغراض النظامية. يمكنك طلب حذف حسابك.'],
      ['6. حقوقك', 'لك الحق في الوصول إلى بياناتك وتصحيحها أو طلب حذفها، وفق ما يسمح به النظام. تواصل معنا لممارسة هذه الحقوق.'],
      ['7. ملفات الارتباط (Cookies)', 'نستخدم ملفات ارتباط ضرورية لتسجيل الدخول وتشغيل المنصة بشكل صحيح.'],
      ['8. خصوصية الأعمال', 'المنصة مخصّصة للمنشآت والأعمال وليست موجّهة للأطفال.'],
      ['9. التعديلات', 'قد نُحدّث هذه السياسة، ويسري التحديث فور نشره على المنصة.'],
      ['10. التواصل', 'لأي استفسار عن خصوصيتك أو بياناتك، تواصل معنا عبر قنوات الدعم في المنصة.'],
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: June 2026',
    home: '🏠 Home',
    intro: 'Taseerak respects your privacy and is committed to protecting your data in line with the Personal Data Protection Law (PDPL) of Saudi Arabia. This policy explains what data we collect and how we use it.',
    note: 'Note: This is a preliminary version. Please have it reviewed by a legal advisor to ensure full compliance with the PDPL.',
    sections: [
      ['1. Data we collect', 'Account data (business name, email, phone), verification data (commercial registration, license, VAT number), location and national address, sectors and specialties, and usage data (RFQs, offers, messages).'],
      ['2. How we use your data', 'To operate the platform, match requests with suitable suppliers, verify businesses, send notifications, improve the service, and comply with regulations.'],
      ['3. Data sharing', 'Your data is shared with the other party to a transaction when an offer is made or accepted (to complete the deal), with trusted service providers that run the platform (such as hosting and database services), and with the "Wathq" gateway to verify commercial registration. We do not sell your data to any third party.'],
      ['4. Storage & security', 'Your data is stored on secure infrastructure, passwords are encrypted, and sensitive documents are kept in private storage accessible only to the user and admin. We enforce strict row-level access controls (RLS) at the database level.'],
      ['5. Retention', 'We retain your data for as long as you use the platform and as required for legal purposes. You may request deletion of your account.'],
      ['6. Your rights', 'You have the right to access, correct, or request deletion of your data, as permitted by law. Contact us to exercise these rights.'],
      ['7. Cookies', 'We use essential cookies for login and to run the platform correctly.'],
      ['8. Business privacy', 'The platform is intended for businesses and is not directed at children.'],
      ['9. Changes', 'We may update this policy; updates take effect once published on the platform.'],
      ['10. Contact', 'For any question about your privacy or data, contact us through the platform support channels.'],
    ],
  },
}

export default function PrivacyPage() {
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
