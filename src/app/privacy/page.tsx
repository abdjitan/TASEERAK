'use client'

import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Glyph from '@/components/shared/Glyph'

const C: Record<string, any> = {
  ar: {
    title: 'سياسة الخصوصية',
    updated: 'آخر تحديث: 1 نوفمبر 2026',
    home: 'الرئيسية',
    intro: 'تحترم منصة «تسعيرك» خصوصيتك وتلتزم بحماية بياناتك وفق نظام حماية البيانات الشخصية (PDPL) في المملكة العربية السعودية. تنطبق هذه السياسة على الموقع وعلى تطبيق «تسعيرك» للجوال (أندرويد وآيفون)، وتوضّح البيانات التي نجمعها وكيف نستخدمها.',
    note: 'الجهة المسؤولة عن بياناتك خلال المرحلة التجريبية: «تسعيرك (نسخة تجريبية)». للتواصل بشأن بياناتك: info@taseerak.com',
    sections: [
      ['1. البيانات التي نجمعها', 'بيانات الحساب (الاسم واسم المنشأة والبريد والجوال)، وبيانات التحقق (السجل التجاري والرخصة والرقم الضريبي)، والموقع والعنوان الوطني، والقطاعات والتخصصات، وبيانات الاستخدام (طلبات التسعير والعروض والرسائل والصور والملفات التي ترفعها)، ورمز الإشعارات لجهازك إن سمحت بالإشعارات.'],
      ['2. تطبيق الجوال والصلاحيات', 'لا يطلب التطبيق أي صلاحية إلا عند استخدام الميزة المرتبطة بها، ويمكنك رفضها: الكاميرا والصور لتصوير المواد والمستندات، ولا تُرفع الصورة إلا عندما تختار ذلك. الموقع (اختياري) لتحديد عنوان التوصيل والموردين القريبين. الميكروفون للإملاء الصوتي، وتحوّل خدمة الكلام في جهازك (من Google أو Apple) الصوت إلى نص، ولا تحفظ «تسعيرك» أي تسجيل صوتي. الإشعارات: نحفظ رمز الإشعارات لجهازك لإرسال التنبيهات، ويُحذف عند تسجيل الخروج أو حذف الحساب.'],
      ['3. كيف نستخدم بياناتك', 'لتشغيل المنصة، ومطابقة الطلبات بالموردين المناسبين، والتحقق من المنشآت، وإرسال الإشعارات، وقراءة الطلبات المكتوبة والمصوّرة وجداول الكميات آلياً، وتحسين الخدمة، والامتثال للأنظمة.'],
      ['4. مشاركة البيانات ومزوّدو الخدمة', 'تُشارك بياناتك مع الطرف الآخر في الصفقة عند تقديم عرض أو قبوله لإتمام التعامل، ويبقى اسم المشتري مخفياً قبل اختيار المورد إن طلب ذلك. ونستعين بمزوّدي خدمة موثوقين يعالجون البيانات نيابةً عنا فقط: Supabase (قاعدة البيانات والتخزين وتسجيل الدخول)، وVercel (استضافة الموقع)، وExpo (توصيل إشعارات التطبيق)، وCloudflare Turnstile (التحقق من أن المستخدم ليس برنامجاً آلياً)، وخرائط Google (تحويل الموقع إلى عنوان)، ومزوّدا الذكاء الاصطناعي Anthropic Claude (أساساً) وGoogle Gemini (لملفات PDF والمستندات الممسوحة وللبحث على الإنترنت): عند استخدامك ميزات القراءة الآلية يُرسل إليهما المحتوى المطلوب قراءته فقط، مثل نص الطلب وصور المواد وجداول الكميات ومستندات المواصفات ومستند السجل التجاري الذي ترفعه (لمساعدة الإدارة في مراجعته)، وقد يُستخدم وصف المادة أو صورتها في بحث على الإنترنت لفهمها، وبوابة «واثق» (التحقق من السجل التجاري).'],
      ['5. لا بيع ولا إعلانات ولا تتبّع', 'لا نبيع بياناتك لأي طرف، ولا نعرض إعلانات، ولا نتتبّعك عبر التطبيقات أو المواقع الأخرى.'],
      ['6. التخزين والأمان', 'تُخزَّن بياناتك على بنية تحتية آمنة، وتُشفَّر كلمات المرور، وتُحفظ المستندات الحساسة في تخزين خاص لا يصل إليه إلا أطرافها والإدارة عبر روابط مؤقتة. ونطبّق صلاحيات وصول صارمة (RLS) على مستوى قاعدة البيانات. تُخزَّن البيانات لدى مزوّدينا على خوادم في الاتحاد الأوروبي (فرانكفورت، ألمانيا)، وهذا نقل للبيانات خارج المملكة نلتزم بأن يتم وفق ضمانات لائحة نقل البيانات الشخصية خارج المملكة، مثل البنود التعاقدية المعيارية وتقييم المخاطر، وبالحد الأدنى اللازم من البيانات. ولا يطّلع على حسابك من فريق تسعيرك إلا المشرفون، عند الحاجة لحل مشكلة تخصّك، عبر «عرض الدعم» للقراءة فقط ودون معرفة كلمة المرور، ويُشترط تسجيل سبب الاطلاع، ويُسجَّل كل اطلاع، ويصلك إشعار به.'],
      ['7. مدة الاحتفاظ وحذف الحساب', 'طلب التسعير الذي ينتهي دون صفقة (انتهت مدته أو أُلغي أو أُغلق دون قبول عرض) يُحذف بعد 60 يوماً من انتهائه، مع عروضه ومحادثاته وملفاته المرفوعة (الصور وملفات المواصفات والمرفقات)، ونُشعر صاحب الطلب قبل الحذف بـ7 أيام. ولا نحتفظ منه إلا بسطر إحصائي مجهول الهوية (التاريخ والقطاعات والمنطقة والأعداد) دون أسماء أو نصوص أو ملفات. أما الطلبات التي انتهت بصفقة فتُحفظ مع مستنداتها (أمر الشراء والفاتورة والاستلام وسجل الدفع) بصفتها سجلات تعامل. وتُحذف سجلات الحد من المحاولات (ومنها ما يرتبط بعنوان IP) بعد يومين، والإشعارات المقروءة بعد 180 يوماً. وتبقى بقية بياناتك ما دام حسابك قائماً. يمكنك حذف حسابك فوراً من التطبيق (الإعدادات ← حذف حسابي) أو من صفحة taseerak.vercel.app/account/delete. عند الحذف تُمحى بياناتك الشخصية ومستندات التوثيق وبيانات الدخول، وتبقى سجلّات الصفقات المكتملة لدى الطرف الآخر باسم «حساب محذوف»، وتُحفظ البيانات التي يُلزمنا النظام بحفظها (مثل بيانات الفواتير الضريبية) للمدة النظامية ثم تُحذف.'],
      ['8. حقوقك', 'وفق نظام حماية البيانات الشخصية لك الحق في: العلم بكيفية معالجة بياناتك، والوصول إليها والحصول على نسخة منها، وطلب تصحيحها أو إتلافها، والرجوع عن موافقتك. راسلنا على info@taseerak.com وسنرد خلال 30 يوماً. ويحق لك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).'],
      ['9. ملفات الارتباط (Cookies)', 'نستخدم في الموقع ملفات ارتباط ضرورية لتسجيل الدخول وتشغيل المنصة فقط.'],
      ['10. خصوصية الأعمال', 'المنصة مخصّصة لشراء مواد البناء وبيعها، وليست موجّهة للأطفال.'],
      ['11. التعديلات', 'قد نُحدّث هذه السياسة، ويسري التحديث فور نشره على المنصة.'],
      ['12. التواصل', 'لأي استفسار عن خصوصيتك أو بياناتك: info@taseerak.com، أو عبر قنوات الدعم في المنصة.'],
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 1 November 2026',
    home: 'Home',
    intro: 'Taseerak respects your privacy and is committed to protecting your data in line with the Personal Data Protection Law (PDPL) of Saudi Arabia. This policy covers the website and the Taseerak mobile app (Android and iPhone), and explains what data we collect and how we use it.',
    note: 'Responsible for your data during the beta: "Taseerak (beta)". Contact about your data: info@taseerak.com',
    sections: [
      ['1. Data we collect', 'Account data (name, business name, email, phone), verification data (commercial registration, licence, VAT number), location and national address, sectors and specialties, usage data (price requests, offers, messages, and the photos and files you upload), and your device’s notification token if you allow notifications.'],
      ['2. Mobile app permissions', 'The app asks for a permission only when you use the feature that needs it, and you may decline: camera and photos to photograph materials and documents (a photo is uploaded only when you choose to); location (optional) to set the delivery address and find nearby suppliers; microphone for voice dictation, where your phone’s speech service (Google or Apple) turns speech into text and Taseerak keeps no audio; notifications, for which we store your device’s notification token, deleted when you sign out or delete your account.'],
      ['3. How we use your data', 'To operate the platform, match requests with suitable suppliers, verify businesses, send notifications, read written and photographed requests and bills of quantities automatically, improve the service, and comply with regulations.'],
      ['4. Sharing and service providers', 'Your data is shared with the other party to a deal when an offer is made or accepted, to complete it; a buyer who asks stays anonymous until choosing a supplier. Trusted providers process data only on our behalf: Supabase (database, storage and sign-in), Vercel (website hosting), Expo (app notification delivery), Cloudflare Turnstile (bot check), Google Maps (turning a location into an address), the AI providers Anthropic Claude (mainly) and Google Gemini (for PDF and scanned documents and for web lookups): when you use the automatic-reading features, only the content to be read is sent to them, such as a request’s text, material photos, bills of quantities, specification documents and the commercial registration document you upload (to assist the admin review), and a material’s description or photo may be used in a web search to understand it; and the Wathq gateway (commercial registration check).'],
      ['5. No selling, no ads, no tracking', 'We do not sell your data, show no advertising, and do not track you across other apps or websites.'],
      ['6. Storage & security', 'Your data is stored on secure infrastructure, passwords are encrypted, and sensitive documents are kept in private storage that only the parties concerned and the admin can open, through short-lived links. We enforce strict row-level access controls (RLS) in the database. Data is stored with our providers on servers in the European Union (Frankfurt, Germany); this is a transfer outside the Kingdom, which we commit to make under the safeguards of the Saudi regulation on transferring personal data abroad, such as standard contractual clauses and a risk assessment, limited to the minimum data needed. Within the Taseerak team, only admins can view your account, when needed to solve a problem for you, through a read-only «support view» and without your password; a reason must be recorded, every access is logged, and you are notified.'],
      ['7. Retention and account deletion', 'A price request that ends without a deal (expired, cancelled, or closed without an accepted offer) is deleted 60 days after it ended, together with its offers, conversations and uploaded files (photos, spec files, attachments); the buyer is notified 7 days before. Only an anonymous statistics line is kept (date, sectors, region, counts), with no names, text or files. Requests that led to a deal are kept with their documents (purchase order, invoice, receipt and payment records) as transaction records. Rate-limit records (including IP-based ones) are deleted after 2 days, and read notifications after 180 days. The rest of your data is kept while your account exists. You can delete your account at once in the app (Settings → Delete my account) or at taseerak.vercel.app/account/delete. Deletion erases your personal data, verification documents and sign-in; completed deals stay with the other party under "Deleted account", and data the law requires us to keep (such as tax-invoice data) is kept for the legal period and then deleted.'],
      ['8. Your rights', 'Under the PDPL you have the right to: be informed how your data is processed, access it and obtain a copy, request its correction or destruction, and withdraw your consent. Email info@taseerak.com and we will reply within 30 days. You may also complain to the Saudi Data & AI Authority (SDAIA).'],
      ['9. Cookies', 'On the website we use only essential cookies, for sign-in and to run the platform.'],
      ['10. Audience', 'The platform is for buying and selling building materials and is not directed at children.'],
      ['11. Changes', 'We may update this policy; updates take effect once published on the platform.'],
      ['12. Contact', 'For any question about your privacy or data: info@taseerak.com, or the platform support channels.'],
    ],
  },
  ur: {
    title: 'رازداری کی پالیسی',
    updated: 'آخری تازہ کاری: 1 نومبر 2026',
    home: 'مرکزی صفحہ',
    intro: 'تسعیرک آپ کی رازداری کا احترام کرتا ہے اور سعودی عرب کے ذاتی ڈیٹا کے تحفظ کے قانون (PDPL) کے مطابق آپ کے ڈیٹا کے تحفظ کا پابند ہے۔ یہ پالیسی ویب سائٹ اور تسعیرک موبائل ایپ (اینڈرائیڈ اور آئی فون) دونوں پر لاگو ہوتی ہے۔',
    note: 'آزمائشی مرحلے میں آپ کے ڈیٹا کا ذمہ دار: «تسعیرک (آزمائشی ورژن)»۔ ڈیٹا کے بارے میں رابطہ: info@taseerak.com',
    sections: [
      ['1. ہم کون سا ڈیٹا جمع کرتے ہیں', 'اکاؤنٹ کا ڈیٹا (نام، ادارے کا نام، ای میل، فون)، تصدیقی ڈیٹا (تجارتی رجسٹریشن، لائسنس، ٹیکس نمبر)، مقام اور قومی پتہ، شعبے اور مہارتیں، استعمال کا ڈیٹا (قیمت کی درخواستیں، پیشکشیں، پیغامات، اور آپ کی اپ لوڈ کردہ تصاویر اور فائلیں)، اور اگر آپ اطلاعات کی اجازت دیں تو آپ کے آلے کا اطلاعاتی ٹوکن۔'],
      ['2. موبائل ایپ کی اجازتیں', 'ایپ کوئی اجازت صرف متعلقہ فیچر استعمال کرنے پر مانگتی ہے اور آپ انکار کر سکتے ہیں: کیمرہ اور تصاویر، سامان اور دستاویزات کی تصویر کے لیے (تصویر صرف آپ کے کہنے پر اپ لوڈ ہوتی ہے)؛ مقام (اختیاری) ڈیلیوری پتے اور قریبی سپلائرز کے لیے؛ مائیکروفون آواز سے لکھنے کے لیے، جہاں آپ کے فون کی اسپیچ سروس (Google یا Apple) آواز کو متن میں بدلتی ہے اور تسعیرک کوئی آواز محفوظ نہیں کرتا؛ اطلاعات کے لیے آپ کے آلے کا ٹوکن، جو لاگ آؤٹ یا اکاؤنٹ حذف کرنے پر مٹا دیا جاتا ہے۔'],
      ['3. ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں', 'پلیٹ فارم چلانے، درخواستوں کو موزوں سپلائرز سے ملانے، اداروں کی تصدیق، اطلاعات بھیجنے، تحریری اور تصویری درخواستوں اور مقداروں کی فہرست کو خودکار طور پر پڑھنے، سروس بہتر بنانے اور قوانین کی پابندی کے لیے۔'],
      ['4. اشتراک اور سروس فراہم کنندگان', 'سودا مکمل کرنے کے لیے پیشکش دینے یا قبول کرنے پر آپ کا ڈیٹا دوسرے فریق کے ساتھ شیئر ہوتا ہے؛ خریدار چاہے تو سپلائر چننے تک اس کا نام چھپا رہتا ہے۔ قابلِ اعتماد فراہم کنندگان صرف ہماری طرف سے ڈیٹا پر کام کرتے ہیں: Supabase (ڈیٹابیس، اسٹوریج اور لاگ اِن)، Vercel (ویب سائٹ ہوسٹنگ)، Expo (ایپ اطلاعات)، Cloudflare Turnstile (بوٹ چیک)، Google Maps (مقام سے پتہ)، مصنوعی ذہانت فراہم کنندگان Anthropic Claude (بنیادی طور پر) اور Google Gemini (PDF اور اسکین شدہ دستاویزات اور انٹرنیٹ تلاش کے لیے): خودکار پڑھنے کی خصوصیات استعمال کرنے پر صرف پڑھا جانے والا مواد بھیجا جاتا ہے، جیسے درخواست کا متن، مواد کی تصاویر، مقداروں کی فہرستیں، تفصیلات کی دستاویزات اور آپ کی اپ لوڈ کردہ تجارتی رجسٹریشن دستاویز (انتظامیہ کے جائزے میں مدد کے لیے)، اور کسی مواد کو سمجھنے کے لیے اس کی تفصیل یا تصویر انٹرنیٹ تلاش میں استعمال ہو سکتی ہے؛ اور «واثق» گیٹ وے (تجارتی رجسٹریشن کی تصدیق)۔'],
      ['5. نہ فروخت، نہ اشتہار، نہ ٹریکنگ', 'ہم آپ کا ڈیٹا فروخت نہیں کرتے، اشتہار نہیں دکھاتے، اور دوسری ایپس یا ویب سائٹس پر آپ کو ٹریک نہیں کرتے۔'],
      ['6. ذخیرہ اور سیکیورٹی', 'آپ کا ڈیٹا محفوظ انفراسٹرکچر پر رکھا جاتا ہے، پاس ورڈ خفیہ کیے جاتے ہیں، اور حساس دستاویزات نجی اسٹوریج میں رکھی جاتی ہیں جنہیں صرف متعلقہ فریق اور انتظامیہ عارضی لنکس کے ذریعے کھول سکتے ہیں۔ ہم ڈیٹابیس میں سخت رسائی کنٹرول (RLS) نافذ کرتے ہیں۔ ڈیٹا ہمارے فراہم کنندگان کے یورپی یونین (فرینکفرٹ، جرمنی) کے سرورز پر محفوظ ہوتا ہے؛ یہ مملکت سے باہر منتقلی ہے، جسے ہم بیرونِ ملک ذاتی ڈیٹا کی منتقلی کے سعودی ضابطے کی ضمانتوں، جیسے معیاری معاہداتی شقوں اور خطرے کی جانچ، کے مطابق اور کم سے کم ضروری ڈیٹا تک محدود رکھنے کا عہد کرتے ہیں۔ تسعیرک ٹیم میں صرف منتظمین، آپ کا کوئی مسئلہ حل کرنے کے لیے، پاس ورڈ کے بغیر صرف پڑھنے والے «سپورٹ ویو» کے ذریعے آپ کا اکاؤنٹ دیکھ سکتے ہیں؛ وجہ درج کرنا لازمی ہے، ہر رسائی ریکارڈ ہوتی ہے اور آپ کو اطلاع دی جاتی ہے۔'],
      ['7. مدتِ حفاظت اور اکاؤنٹ حذف کرنا', 'جو قیمت کی درخواست بغیر سودے کے ختم ہو (مدت ختم، منسوخ، یا کوئی پیشکش قبول کیے بغیر بند) وہ ختم ہونے کے 60 دن بعد اپنی پیشکشوں، گفتگو اور اپ لوڈ کردہ فائلوں (تصاویر، تفصیلات کی فائلیں، منسلکات) سمیت حذف کر دی جاتی ہے؛ خریدار کو 7 دن پہلے اطلاع دی جاتی ہے۔ صرف ایک گمنام شماریاتی سطر رکھی جاتی ہے (تاریخ، شعبے، علاقہ، تعداد) جس میں نام، متن یا فائلیں نہیں ہوتیں۔ جو درخواستیں سودے تک پہنچیں وہ اپنی دستاویزات (پرچیز آرڈر، انوائس، وصولی اور ادائیگی کا ریکارڈ) کے ساتھ لین دین کے ریکارڈ کے طور پر رکھی جاتی ہیں۔ کوششوں کی حد کے ریکارڈ (بشمول IP پر مبنی) 2 دن بعد اور پڑھی ہوئی اطلاعات 180 دن بعد حذف ہو جاتی ہیں۔ باقی ڈیٹا اکاؤنٹ موجود رہنے تک رکھا جاتا ہے۔ آپ ایپ میں (ترتیبات ← میرا اکاؤنٹ حذف کریں) یا taseerak.vercel.app/account/delete پر فوراً اکاؤنٹ حذف کر سکتے ہیں۔ حذف کرنے پر آپ کا ذاتی ڈیٹا، تصدیقی دستاویزات اور لاگ اِن مٹ جاتے ہیں؛ مکمل سودے دوسرے فریق کے پاس «حذف شدہ اکاؤنٹ» کے نام سے رہتے ہیں، اور قانوناً لازم ڈیٹا (جیسے ٹیکس انوائس) مقررہ مدت تک رکھ کر حذف کیا جاتا ہے۔'],
      ['8. آپ کے حقوق', 'ذاتی ڈیٹا کے تحفظ کے قانون کے تحت آپ کو حق ہے: یہ جاننے کا کہ آپ کا ڈیٹا کیسے پراسیس ہوتا ہے، اس تک رسائی اور اس کی نقل لینے کا، اس کی تصحیح یا تلفی کی درخواست کا، اور اپنی رضامندی واپس لینے کا۔ info@taseerak.com پر لکھیں، ہم 30 دن میں جواب دیں گے۔ آپ سعودی ڈیٹا و مصنوعی ذہانت اتھارٹی (سدایا) میں شکایت بھی کر سکتے ہیں۔'],
      ['9. کوکیز', 'ویب سائٹ پر ہم صرف لاگ اِن اور پلیٹ فارم چلانے کے لیے ضروری کوکیز استعمال کرتے ہیں۔'],
      ['10. صارفین', 'یہ پلیٹ فارم تعمیراتی سامان کی خرید و فروخت کے لیے ہے اور بچوں کے لیے نہیں۔'],
      ['11. تبدیلیاں', 'ہم اس پالیسی کو اپ ڈیٹ کر سکتے ہیں؛ اپ ڈیٹ پلیٹ فارم پر شائع ہوتے ہی نافذ ہو جاتی ہے۔'],
      ['12. رابطہ', 'اپنی رازداری یا ڈیٹا کے بارے میں کسی سوال کے لیے: info@taseerak.com، یا پلیٹ فارم کے سپورٹ چینلز۔'],
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
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0B2438' }}>{t.title}</h1>
        <p className="text-xs text-gray-400 mb-5">{t.updated}</p>

        <p className="text-sm text-gray-700 leading-relaxed mb-4">{t.intro}</p>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-600 mb-6"><Glyph e="✉" /> {t.note}</div>

        <div className="space-y-5">
          {t.sections.map(([h, body]: string[], i: number) => (
            <section key={i}>
              <h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{h}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">© 2026 تسعيرك — Taseerak</p>
      </div>
    </div>
  )
}
