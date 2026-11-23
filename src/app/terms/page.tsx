'use client'

import Link from 'next/link'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import HomeOrAccountLink from '@/components/public/HomeOrAccountLink'
import Glyph from '@/components/shared/Glyph'
import LinkEmails from '@/components/shared/LinkEmails'
import { TERMS_VERSION, OPERATOR } from '@/lib/legal'

// Terms for the free open beta (owner, 2026-10-27). Version = TERMS_VERSION (src/lib/legal.ts),
// which must equal public.current_terms_version() (migration 176): users' acceptance is recorded.
const C: Record<string, any> = {
  ar: {
    title: 'الشروط والأحكام',
    updated: `آخر تحديث: 21 نوفمبر 2026 · الإصدار ${TERMS_VERSION}`,
    home: 'الرئيسية',
    intro: `تُشغَّل منصة «تسعيرك» خلال مرحلتها التجريبية باسم «${OPERATOR.ar}»، وللتواصل: ${OPERATOR.email}. باستخدامك المنصة أو إنشاء حساب فيها فإنك توافق على هذه الشروط وعلى سياسة الخصوصية. إن لم توافق عليها فلا تستخدم المنصة.`,
    betaTitle: 'نسخة تجريبية مجانية',
    beta: 'المنصة في مرحلة تجريبية: الخدمة مجانية بالكامل ولا تُحصّل المنصة أي رسوم أو عمولة. قد تتغير بعض الخصائص أو تتوقف، وقد تحدث أعطال أو انقطاعات، ونعمل على إصلاحها في أقرب وقت.',
    sections: [
      ['1. المشغّل والتواصل', `تُشغَّل المنصة خلال المرحلة التجريبية باسم «${OPERATOR.ar}». يُحدَّث هذا البند ببيانات الجهة المشغّلة عند تأسيسها، ويُبلَّغ المستخدمون بذلك. لأي استفسار أو شكوى: ${OPERATOR.email}.`],
      ['2. طبيعة المنصة', 'تسعيرك منصة إلكترونية تربط المشترين بالموردين: ينشر المشتري طلب تسعير، ويقدّم الموردون عروضهم، ويختار المشتري ما يناسبه. المنصة ليست طرفاً في أي اتفاق بين المستخدمين، ولا تبيع المواد ولا تشتريها، ولا تستلم أموال الصفقات. مستند الصفقة الذي تعرضه المنصة ليس فاتورة ضريبية، والفاتورة الرسمية يصدرها المورد.'],
      ['3. المجانية والرسوم مستقبلاً', 'الخدمة مجانية خلال المرحلة التجريبية، ولا تُستقطع أي عمولة من الصفقات. إن قررنا لاحقاً فرض رسوم اشتراك فسنعلن ذلك قبل 30 يوماً على الأقل، ولن تُفرض أي رسوم على حسابك إلا بعد موافقتك الصريحة، ولا تُفرض بأثر رجعي.'],
      ['4. الحساب والأهلية', 'يجب أن تكون مخوّلاً نظاماً بتمثيل المنشأة التي تسجّل باسمها، وأن تكون بياناتك صحيحة ومحدّثة. أنت مسؤول عن سرية بيانات الدخول وعن كل ما يتم عبر حسابك. لا يُستخدم السجل التجاري الواحد إلا في حساب واحد، ومن كان سجلّه مسجّلاً في حساب آخر فله أن يطلب التحقق عبر المنصة. ويُشترط توثيق رقم الجوال والبريد الإلكتروني قبل نشر الطلبات أو تقديم العروض أو المراسلة.'],
      ['5. الطلبات والعروض والأسعار', 'يتحمّل كل مستخدم مسؤولية ما ينشره من طلبات وعروض وأسعار وكميات ومدد توريد. تُدخل الأسعار وتُعرض شاملة ضريبة القيمة المضافة حيث تنطبق. لا تضمن المنصة دقة العروض أو توفر المواد أو التزام أي طرف بها. ويوافق مقدّم العرض على أن تحتفظ المنصة بالأسعار التي يقدّمها بعد فصلها عن هويته وعن الطلب والمشتري، وأن تستخدمها مجمّعة لإعداد إحصاءات ومؤشرات لأسعار السوق في خدماتها الحالية والمستقبلية، دون الكشف عن هويته أو عن سعر عرض بعينه.'],
      ['6. التحقق وعلامة «موثّق»', 'قد تراجع المنصة مستندات المنشآت (مثل السجل التجاري) يدوياً، وقد تستعين بقراءة آلية للمستند للمساعدة في المراجعة. علامة «موثّق» تعني أن المستندات رُوجعت، ولا تعني ضمان جودة المنتجات أو الالتزام بالتوريد. يحق للمنصة سحب العلامة إذا تبيّن عدم صحة المستندات.'],
      ['7. الصفقات والدفع والتسليم', 'يتم الاتفاق والدفع والتسليم مباشرة بين المشتري والمورد وعلى مسؤوليتهما، وعليهما التحقق من بعضهما قبل التعامل. أي نزاع بشأن الجودة أو التسليم أو السداد يكون بين طرفيه، ويمكن للمنصة أن تساعد في التواصل بينهما دون أن تكون ملزمة بحلّه.'],
      ['7 مكرر. البائع المستقل ووسيط التسعير', 'من يسجّل بائعاً مستقلاً (دون سجل تجاري) يعمل وسيط تسعير بين المشتري والمحل أو المنشأة التي توفّر المادة، لا بائعاً لها. ويلتزم بما يلي: أن يسجّل في المنصة مع كل عرض المحلَّ مصدرَ المادة، ولا يظهر اسم هذا المحل للمشتري إلا بعد الترسية؛ وأن يتأكّد من صدور فاتورة ضريبية باسم المشتري وبسعر عرضه نفسه من محل لديه سجل تجاري، ويُشترط رفع الفاتورة الضريبية قبل تأكيد الاستلام. والمستند الذي تُصدره المنصة لعرضه «عرض سعر» وليس فاتورة ضريبية. وتضع المنصة حدّاً لقيمة الصفقة الواحدة للوسيط يرتفع بعدد صفقاته الناجحة، ولها عند المخالفة أن تحذّره أو توقفه مؤقتاً عن تقديم العروض أو توقف حسابه.'],
      ['8. الاستخدامات المحظورة', 'يُمنع: إدخال بيانات كاذبة أو مستندات غير صحيحة، وإنشاء حسابات وهمية أو متعددة للمنشأة نفسها، وانتحال صفة الغير، واستخدام سجل تجاري لا يخصّك، وعرض مواد محظورة نظاماً، ونسخ بيانات المنصة آلياً، ومحاولة اختراقها أو تعطيلها. ويُمنع في الرسائل والطلبات والعروض وكل ما يُنشر على المنصة: الإساءة أو التحرّش أو التهديد، والمحتوى الذي يحضّ على الكراهية أو العنف، والمحتوى الجنسي، والرسائل المزعجة أو الإعلانية غير المرغوب فيها، والاحتيال أو محاولته، وكل محتوى يخالف الأنظمة أو الآداب العامة. لا تتسامح المنصة مع هذا المحتوى: يمكنك الإبلاغ عن أي مستخدم أو حظره من المحادثة، وتراجع الإدارة البلاغات، وتحذف المحتوى المخالف، وتعلّق حساب صاحبه أو توقفه.'],
      ['9. الملكية الفكرية والمحتوى', 'حقوق المنصة وتصميمها وشعارها وبرمجياتها محفوظة لتسعيرك. يحتفظ المستخدم بحقوق ما يرفعه، ويمنح المنصة إذناً باستخدامه وعرضه بالقدر اللازم لتقديم الخدمة.'],
      ['10. حدود المسؤولية', 'تُقدَّم المنصة خلال المرحلة التجريبية «كما هي». لا تتحمل المنصة مسؤولية تصرفات المستخدمين أو جودة المواد أو التسليم أو السداد، ولا الأضرار غير المباشرة أو فوات الربح. ولا يُقصد بأي بند في هذه الشروط استبعاد مسؤولية لا يجوز استبعادها وفق أنظمة المملكة العربية السعودية، ومنها المسؤولية عن الغش أو الخطأ الجسيم من جانب المنصة نفسها.'],
      ['11. التعليق والإنهاء وحذف الحساب', 'يحق للمنصة تعليق أو إيقاف الحساب الذي يخالف هذه الشروط، مع إبلاغ صاحبه بالسبب ما لم يمنع ذلك مانع نظامي. ويمكنك حذف حسابك في أي وقت من الإعدادات أو من صفحة «حذف الحساب».'],
      ['12. البيانات الشخصية', 'نعالج بياناتك وفق سياسة الخصوصية ونظام حماية البيانات الشخصية. اطّلع على سياسة الخصوصية لمعرفة البيانات التي نجمعها وحقوقك. وطلب التسعير الذي ينتهي دون صفقة يُحذف مع عروضه ومحادثاته وملفاته بعد 60 يوماً من انتهائه، بعد إشعارك قبلها بـ7 أيام.'],
      ['13. التعديلات', 'قد نحدّث هذه الشروط. نُبلغك بالتعديلات الجوهرية داخل المنصة أو بالبريد الإلكتروني، وقد نطلب موافقتك على الإصدار الجديد قبل متابعة الاستخدام.'],
      ['14. النظام الواجب التطبيق', 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص الجهات القضائية في المملكة بالنظر في أي نزاع ينشأ عنها.'],
    ],
    privacyLink: 'سياسة الخصوصية',
  },
  en: {
    title: 'Terms & Conditions',
    updated: `Last updated: 21 November 2026 · Version ${TERMS_VERSION}`,
    home: 'Home',
    intro: `During its beta, the Taseerak platform is operated as "${OPERATOR.en}". Contact: ${OPERATOR.email}. By using the platform or creating an account you agree to these Terms and to the Privacy Policy. If you do not agree, do not use the platform.`,
    betaTitle: 'Free beta',
    beta: 'The platform is in beta: the service is completely free and the platform charges no fees or commission. Some features may change or stop, and outages may occur; we work to fix them quickly.',
    sections: [
      ['1. Operator and contact', `During the beta the platform is operated as "${OPERATOR.en}". This clause will be updated with the operating entity's details once it is established, and users will be informed. For any question or complaint: ${OPERATOR.email}.`],
      ['2. Nature of the platform', 'Taseerak is an online platform that connects buyers with suppliers: a buyer posts a request for quotes, suppliers submit offers, and the buyer chooses. The platform is not a party to any agreement between users, does not sell or buy materials, and does not receive deal payments. The deal document shown by the platform is not a tax invoice; the official invoice is issued by the supplier.'],
      ['3. Free service and future fees', 'The service is free during the beta and no commission is taken from deals. If we later introduce subscription fees we will announce them at least 30 days in advance; no fee will be charged to your account without your explicit consent, and none retroactively.'],
      ['4. Account and eligibility', 'You must be legally authorised to represent the business you register, and keep your data accurate and current. You are responsible for your login credentials and for all activity on your account. A commercial registration may be used by one account only; if yours is registered in another account you may request verification through the platform. You must verify your mobile number and email before posting requests, submitting offers or sending messages.'],
      ['5. Requests, offers and prices', 'Each user is responsible for the requests, offers, prices, quantities and delivery times they publish. Prices are entered and shown inclusive of VAT where applicable. The platform does not guarantee the accuracy of offers, the availability of materials, or any party\'s commitment to them. By submitting an offer, the seller agrees that the platform may keep the prices quoted, separated from the seller\'s identity and from the request and the buyer, and use them in aggregate to produce market price statistics and indicators in its current and future services, without revealing the seller\'s identity or any individual offer price.'],
      ['6. Verification and the "Verified" badge', 'The platform may review business documents (such as the commercial registration) manually and may use an automated reading of the document to assist the review. The "Verified" badge means the documents were reviewed; it does not guarantee product quality or delivery. The platform may withdraw the badge if documents prove incorrect.'],
      ['7. Deals, payment and delivery', 'Agreement, payment and delivery take place directly between buyer and supplier at their own responsibility, and each should check the other before dealing. Any dispute over quality, delivery or payment is between the parties; the platform may help them communicate but is not obliged to resolve it.'],
      ['7A. Independent sellers and pricing agents', 'Anyone registered as an independent seller (without a commercial registration) acts as a pricing agent between the buyer and the shop or business that supplies the material, not as its seller. They must: record on the platform, with every offer, the source shop of the material, whose name the buyer sees only after the award; and make sure a tax invoice is issued in the buyer\'s name, at the same price as their offer, by a shop that holds a commercial registration; the tax invoice must be uploaded before receipt is confirmed. The document the platform issues for their offer is a "price quotation", not a tax invoice. The platform caps the value of a single deal for a pricing agent, and the cap rises with the number of successful deals; on a breach it may warn them, temporarily stop them from submitting offers, or suspend their account.'],
      ['8. Prohibited use', 'It is prohibited to: enter false data or documents, create fake or multiple accounts for the same business, impersonate others, use a commercial registration that is not yours, list materials prohibited by law, scrape the platform, or attempt to hack or disrupt it. In messages, requests, offers and anything else posted on the platform it is also prohibited to post abuse, harassment or threats, content promoting hatred or violence, sexual content, spam or unsolicited advertising, fraud or attempted fraud, or any content that breaks the law or public decency. The platform has zero tolerance for such content: you can report or block any user from the chat, the admin reviews reports, removes violating content, and suspends or closes the account responsible.'],
      ['9. Intellectual property and content', 'The platform, its design, logo and software belong to Taseerak. Users keep the rights to what they upload and grant the platform permission to use and display it as needed to provide the service.'],
      ['10. Limitation of liability', 'During the beta the platform is provided "as is". The platform is not liable for users\' conduct, material quality, delivery or payment, nor for indirect losses or lost profits. Nothing in these Terms excludes liability that cannot be excluded under the laws of Saudi Arabia, including liability for fraud or gross negligence by the platform itself.'],
      ['11. Suspension, termination and account deletion', 'The platform may suspend or stop an account that breaches these Terms and will inform its owner of the reason unless legally prevented. You can delete your account at any time from Settings or from the "Delete account" page.'],
      ['12. Personal data', 'We process your data under the Privacy Policy and the Personal Data Protection Law (PDPL). See the Privacy Policy for what we collect and your rights. A price request that ends without a deal is deleted with its offers, conversations and files 60 days after it ended, after notifying you 7 days before.'],
      ['13. Changes', 'We may update these Terms. We will notify you of material changes in the platform or by email, and may ask you to accept the new version before continuing.'],
      ['14. Governing law', 'These Terms are governed by the laws of the Kingdom of Saudi Arabia, and the Saudi courts have jurisdiction over any dispute arising from them.'],
    ],
    privacyLink: 'Privacy Policy',
  },
  ur: {
    title: 'شرائط و ضوابط',
    updated: `آخری تازہ کاری: 21 نومبر 2026 · ورژن ${TERMS_VERSION}`,
    home: 'مرکزی صفحہ',
    intro: `آزمائشی مرحلے کے دوران تسعیرک پلیٹ فارم «${OPERATOR.ur}» کے نام سے چلایا جاتا ہے۔ رابطہ: ${OPERATOR.email}۔ پلیٹ فارم استعمال کرنے یا اکاؤنٹ بنانے سے آپ ان شرائط اور رازداری کی پالیسی سے اتفاق کرتے ہیں۔ اگر آپ متفق نہیں تو پلیٹ فارم استعمال نہ کریں۔`,
    betaTitle: 'مفت آزمائشی ورژن',
    beta: 'پلیٹ فارم آزمائشی مرحلے میں ہے: سروس مکمل طور پر مفت ہے اور پلیٹ فارم کوئی فیس یا کمیشن نہیں لیتا۔ کچھ خصوصیات بدل یا بند ہو سکتی ہیں اور خرابیاں آ سکتی ہیں؛ ہم انہیں جلد ٹھیک کرتے ہیں۔',
    sections: [
      ['1. چلانے والا اور رابطہ', `آزمائشی مرحلے میں پلیٹ فارم «${OPERATOR.ur}» کے نام سے چلایا جاتا ہے۔ چلانے والے ادارے کے قیام پر یہ شق اس کی تفصیلات سے اپ ڈیٹ کی جائے گی اور صارفین کو بتایا جائے گا۔ کسی سوال یا شکایت کے لیے: ${OPERATOR.email}۔`],
      ['2. پلیٹ فارم کی نوعیت', 'تسعیرک ایک آن لائن پلیٹ فارم ہے جو خریداروں کو سپلائرز سے جوڑتا ہے: خریدار قیمت کی درخواست شائع کرتا ہے، سپلائرز پیشکشیں دیتے ہیں اور خریدار انتخاب کرتا ہے۔ پلیٹ فارم صارفین کے کسی معاہدے میں فریق نہیں، نہ مواد بیچتا یا خریدتا ہے اور نہ سودوں کی رقم وصول کرتا ہے۔ پلیٹ فارم کا سودا دستاویز ٹیکس انوائس نہیں؛ سرکاری انوائس سپلائر جاری کرتا ہے۔'],
      ['3. مفت سروس اور آئندہ فیس', 'آزمائشی مرحلے میں سروس مفت ہے اور سودوں سے کوئی کمیشن نہیں لیا جاتا۔ اگر بعد میں سبسکرپشن فیس رکھی گئی تو کم از کم 30 دن پہلے اعلان ہوگا؛ آپ کی واضح منظوری کے بغیر کوئی فیس نہیں لی جائے گی اور نہ پچھلی تاریخ سے۔'],
      ['4. اکاؤنٹ اور اہلیت', 'آپ کو قانونی طور پر اس ادارے کی نمائندگی کا اختیار ہونا چاہیے جس کے نام سے آپ رجسٹر کرتے ہیں، اور آپ کا ڈیٹا درست اور تازہ ہونا چاہیے۔ لاگ اِن کی رازداری اور اکاؤنٹ کی ہر سرگرمی آپ کی ذمہ داری ہے۔ ایک تجارتی رجسٹریشن صرف ایک اکاؤنٹ میں استعمال ہو سکتی ہے؛ اگر آپ کی رجسٹریشن کسی اور اکاؤنٹ میں ہے تو آپ پلیٹ فارم کے ذریعے تصدیق کی درخواست دے سکتے ہیں۔ درخواستیں شائع کرنے، پیشکشیں جمع کرانے یا پیغام بھیجنے سے پہلے موبائل نمبر اور ای میل کی تصدیق لازمی ہے۔'],
      ['5. درخواستیں، پیشکشیں اور قیمتیں', 'ہر صارف اپنی شائع کردہ درخواستوں، پیشکشوں، قیمتوں، مقداروں اور ترسیل کی مدت کا ذمہ دار ہے۔ قیمتیں جہاں لاگو ہو ویلیو ایڈڈ ٹیکس سمیت درج اور ظاہر کی جاتی ہیں۔ پلیٹ فارم پیشکشوں کی درستگی، مواد کی دستیابی یا کسی فریق کی پابندی کی ضمانت نہیں دیتا۔ پیشکش جمع کرانے والا اس پر رضامند ہے کہ پلیٹ فارم اس کی پیش کردہ قیمتیں، اس کی شناخت اور درخواست و خریدار سے الگ کر کے، محفوظ رکھے اور انہیں مجموعی طور پر اپنی موجودہ اور آئندہ خدمات میں مارکیٹ کی قیمتوں کے اعداد و شمار اور اشاریے تیار کرنے کے لیے استعمال کرے، اس کی شناخت یا کسی مخصوص پیشکش کی قیمت ظاہر کیے بغیر۔'],
      ['6. تصدیق اور «تصدیق شدہ» نشان', 'پلیٹ فارم اداروں کی دستاویزات (جیسے تجارتی رجسٹریشن) کا دستی جائزہ لے سکتا ہے اور جائزے میں مدد کے لیے دستاویز کی خودکار قراءت استعمال کر سکتا ہے۔ «تصدیق شدہ» نشان کا مطلب ہے کہ دستاویزات دیکھی گئیں؛ یہ معیار یا ترسیل کی ضمانت نہیں۔ دستاویزات غلط ثابت ہوں تو نشان واپس لیا جا سکتا ہے۔'],
      ['7. سودے، ادائیگی اور ترسیل', 'معاہدہ، ادائیگی اور ترسیل براہِ راست خریدار اور سپلائر کے درمیان اور انہی کی ذمہ داری پر ہوتے ہیں، اور دونوں کو لین دین سے پہلے ایک دوسرے کی جانچ کرنی چاہیے۔ معیار، ترسیل یا ادائیگی کا تنازع فریقین کے درمیان ہے؛ پلیٹ فارم رابطے میں مدد کر سکتا ہے مگر اسے حل کرنے کا پابند نہیں۔'],
      ['7 الف۔ آزاد فروخت کنندہ اور قیمت ایجنٹ', 'جو شخص آزاد فروخت کنندہ (تجارتی رجسٹریشن کے بغیر) کے طور پر رجسٹر ہو، وہ خریدار اور مواد فراہم کرنے والی دکان یا ادارے کے درمیان قیمت ایجنٹ کے طور پر کام کرتا ہے، اس کا فروخت کنندہ نہیں۔ اس پر لازم ہے کہ: ہر پیشکش کے ساتھ پلیٹ فارم پر مواد کی ماخذ دکان درج کرے، جس کا نام خریدار کو صرف سودا طے ہونے کے بعد دکھایا جاتا ہے؛ اور یقینی بنائے کہ تجارتی رجسٹریشن رکھنے والی دکان خریدار کے نام اور اس کی پیشکش کی اسی قیمت پر ٹیکس انوائس جاری کرے؛ وصولی کی تصدیق سے پہلے ٹیکس انوائس اپ لوڈ کرنا لازمی ہے۔ پلیٹ فارم اس کی پیشکش کے لیے جو دستاویز جاری کرتا ہے وہ «قیمت کا اقتباس» ہے، ٹیکس انوائس نہیں۔ پلیٹ فارم قیمت ایجنٹ کے ایک سودے کی مالیت کی حد مقرر کرتا ہے جو کامیاب سودوں کی تعداد کے ساتھ بڑھتی ہے، اور خلاف ورزی پر اسے تنبیہ کر سکتا ہے، عارضی طور پر پیشکشیں جمع کرانے سے روک سکتا ہے یا اس کا اکاؤنٹ معطل کر سکتا ہے۔'],
      ['8. ممنوعہ استعمال', 'منع ہے: جھوٹا ڈیٹا یا دستاویزات دینا، ایک ہی ادارے کے جعلی یا متعدد اکاؤنٹ بنانا، کسی کی نقالی کرنا، کسی اور کی تجارتی رجسٹریشن استعمال کرنا، قانوناً ممنوعہ مواد پیش کرنا، پلیٹ فارم کا ڈیٹا خودکار طور پر نقل کرنا، یا اسے ہیک یا معطل کرنے کی کوشش۔ پیغامات، درخواستوں، پیشکشوں اور پلیٹ فارم پر شائع ہونے والی ہر چیز میں یہ بھی منع ہے: بدسلوکی، ہراسانی یا دھمکی، نفرت یا تشدد پر اکسانے والا مواد، جنسی مواد، ناپسندیدہ یا اشتہاری پیغامات (اسپام)، دھوکہ دہی یا اس کی کوشش، اور قانون یا عوامی اخلاق کے خلاف کوئی بھی مواد۔ پلیٹ فارم ایسے مواد کو برداشت نہیں کرتا: آپ گفتگو سے کسی بھی صارف کی شکایت کر سکتے ہیں یا اسے بلاک کر سکتے ہیں، انتظامیہ شکایات کا جائزہ لیتی ہے، خلاف ورزی والا مواد ہٹاتی ہے، اور ذمہ دار اکاؤنٹ معطل یا بند کرتی ہے۔'],
      ['9. دانشورانہ املاک اور مواد', 'پلیٹ فارم، اس کا ڈیزائن، لوگو اور سافٹ ویئر تسعیرک کی ملکیت ہیں۔ صارف اپنے اپ لوڈ کردہ مواد کے حقوق رکھتا ہے اور سروس فراہم کرنے کے لیے ضروری حد تک اس کے استعمال اور ظاہر کرنے کی اجازت دیتا ہے۔'],
      ['10. ذمہ داری کی حد', 'آزمائشی مرحلے میں پلیٹ فارم «جیسا ہے» فراہم کیا جاتا ہے۔ پلیٹ فارم صارفین کے طرزِ عمل، مواد کے معیار، ترسیل یا ادائیگی، اور بالواسطہ نقصان یا منافع کے نقصان کا ذمہ دار نہیں۔ ان شرائط کی کوئی شق ایسی ذمہ داری ختم نہیں کرتی جو سعودی قوانین کے تحت ختم نہیں کی جا سکتی، بشمول پلیٹ فارم کی اپنی دھوکہ دہی یا سنگین غفلت۔'],
      ['11. معطلی، اختتام اور اکاؤنٹ حذف کرنا', 'شرائط کی خلاف ورزی کرنے والا اکاؤنٹ معطل یا بند کیا جا سکتا ہے اور قانونی رکاوٹ نہ ہو تو مالک کو وجہ بتائی جائے گی۔ آپ کسی بھی وقت ترتیبات سے یا «اکاؤنٹ حذف کریں» صفحے سے اپنا اکاؤنٹ حذف کر سکتے ہیں۔'],
      ['12. ذاتی ڈیٹا', 'ہم آپ کا ڈیٹا رازداری کی پالیسی اور ذاتی ڈیٹا کے تحفظ کے قانون (PDPL) کے مطابق پراسیس کرتے ہیں۔ جمع کیے جانے والے ڈیٹا اور اپنے حقوق کے لیے رازداری کی پالیسی دیکھیں۔ جو قیمت کی درخواست بغیر سودے کے ختم ہو وہ اپنی پیشکشوں، گفتگو اور فائلوں سمیت ختم ہونے کے 60 دن بعد حذف ہو جاتی ہے، اور آپ کو 7 دن پہلے اطلاع دی جاتی ہے۔'],
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
          <a href="/" className="shrink-0" aria-label="تسعيرك">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/taseerak-metallic-logo.webp" alt="تسعيرك" className="h-11 w-auto" /></a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" />
            <HomeOrAccountLink homeLabel={t.home} />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0B2438' }}>{t.title}</h1>
        <p className="text-[12px] text-gray-600 mb-5">{t.updated}</p>

        <p className="text-sm text-gray-700 leading-relaxed mb-4"><LinkEmails text={t.intro} /></p>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg text-[#0B2438]"><Glyph e="ℹ" /></span>
            <h2 className="text-base font-bold text-[#0B2438]">{t.betaTitle}</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{t.beta}</p>
        </div>

        <div className="space-y-5">
          {t.sections.map(([h, body]: string[], i: number) => (
            <section key={i}>
              <h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{h}</h2>
              <p className="text-sm text-gray-600 leading-relaxed"><LinkEmails text={body} /></p>
            </section>
          ))}
        </div>

        <p className="text-center text-sm text-gray-600 mt-10">
          <a href={`mailto:${OPERATOR.email}`} dir="ltr" className="inline-flex items-center min-h-[44px] font-semibold text-[#8F6820] hover:underline">{OPERATOR.email}</a>
        </p>
        <p className="text-center text-[12px] text-gray-600">
          <Link href="/privacy" className="inline-flex items-center min-h-[44px] hover:underline">{t.privacyLink}</Link> · <Link href="/deal-protection" className="inline-flex items-center min-h-[44px] hover:underline">{locale === 'en' ? 'How we protect your deal' : locale === 'ur' ? 'سودے کا تحفظ' : 'كيف نحمي صفقتك'}</Link> · © 2026 تسعيرك — Taseerak
        </p>
      </div>
    </div>
  )
}
