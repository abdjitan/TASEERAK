# حزمة دعوة الموردين

**لا يُرسَل منها شيء تلقائيًا.** صاحب المنصة يرسل بنفسه من رقم WhatsApp Business.
كل الروابط ورموز QR على **Taseerak.com**، فلا يبدأ الإرسال قبل ربط الدومين.

## طريقة الإرسال (العربية أولًا، والردود آلية)
1. **الدعوة:** من `send-sheet.html` اضغط «الدعوة» عند المحل. يفتح واتساب ومعه رسالة عربية قصيرة بلا رابط، آخر سطر فيها: «For English reply 2 · اردو کے لیے 3 لکھیں». أرفق `posters/poster-ar.png` ثم اضغط إرسال.
2. **كل الردود بعدها آلية** (`bot/`): 2 أو 3 → التفاصيل والصورة بلغته، «نعم» → رابط التسجيل، وأي سؤال آخر يجيب عنه الذكاء الاصطناعي. لا أحد يرد بيده.
3. **لم يرد بعد 3 أيام:** زر «متابعة» مرة واحدة.
4. **لغة المحل معروفة مسبقًا (إنجليزي أو أردو):** زر «English» أو «اردو» يرسل التفاصيل كاملة بلغته مباشرة.

20 إلى 30 محلًا في اليوم. التصنيف آلي من بيانات Google: راجع الاسم والخريطة قبل كل إرسال.
الرد الآلي (`bot/SPEC.md`) يعمل بعد ربط رقم الواتساب، والذكاء الاصطناعي بعد موافقتك على تكلفته.

## الملفات
| الملف | ما هو |
| --- | --- |
| `links.json` | الروابط والمفاتيح: `domain_live` (مفعّل: كل الروابط على Taseerak.com)، `apps_live` (عند نشر التطبيقين)، رقم واتساب الأعمال. |
| `links.js` | يختار الرابط بحسب `domain_live`. |
| `messages.js` | `opener` (الدعوة العربية)، `reply` (التفاصيل بكل لغة)، `direct` (لغة معروفة)، `followUp`. |
| `bot/` | الرد الآلي: `replies.mjs` (الردود الثابتة)، `ai.mjs` (الذكاء الاصطناعي)، `texts.json`، `SPEC.md` (المواصفات والتكلفة). |
| `posters/poster-ar.png` | صورة الدعوة الأساسية. |
| `posters/poster-en.png` · `poster-ur.png` | الصورة بالإنجليزية أو الأردية، يرسلها الرد الآلي. |
| `invite-page/` | صفحة الدعوة بأزرار اللغات الثلاث، مستضافة على /invite في الموقع. رمز QR يفتحها. |
| `emails/email-ar.html` · `email-en` · `email-ur` | قوالب الإيميل، العربي هو الافتراضي. العناوين في `emails/subjects.txt`. |
| `send-sheet.html` | صفحة الإرسال لكل محل. محلي فقط. |
| `first-batch-50.xlsx` | جدول المتابعة لأول 48 محلًا (بناء 20، سباكة 15، كهرباء 13). محلي فقط، لا يُرفع إلى GitHub. |

أزرار Google Play وApp Store مخفية في الصور والإيميل والصفحة حتى يصبح `apps_live` = true.

## إعادة البناء بعد أي تعديل على الروابط أو النصوص
```bash
node marketing/supplier-invite/build-posters.js
```
```bash
node marketing/supplier-invite/build-bot-texts.js
```
```bash
node marketing/supplier-invite/build-emails.js
```
```bash
node marketing/supplier-invite/build-invite-page.js
```
```bash
node marketing/supplier-invite/pick-first-batch.js "C:/Users/abdji/OneDrive/Desktop/taseeraK/الموردين/الموردين/محلات-حسب-النوع-الدقيق-2026-10-14.xlsx"
```
بعد `build-invite-page.js` تُنسخ `invite-page/` إلى `public/invite/` في الموقع عن طريق جلسة التطوير.
