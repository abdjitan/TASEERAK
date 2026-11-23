# Closed testing: changes made during the test (for the Play production-access form)

Period: from the start of closed testing (early November 2026) to 21 November 2026.
Source: most of these changes came from testers' and early users' feedback, relayed by the owner (for example, the 18 November changes came from the latest tester). A few came from internal reviews.

## English (paste-ready summary)

During closed testing, testers and early users sent us their feedback, and we shipped most of it within days. Main changes:

**Sign-up and verification**
- Mobile numbers are verified with an SMS code (Firebase). Buyers can sign up with their phone number only.
- Buyers can browse freely and verify only when they send a request, message, or award. Verification opens over the same screen, so nothing they typed is lost.
- Accepted numbers: Saudi Arabia, the UAE and Jordan.
- Clearer sign-up for sellers: shop/company vs pricing agent.
- Commercial registration uses the unified national number.
- (19 Nov, tester) Neutral sign-in screen: "Sign in" for everyone, with email sign-in labelled for suppliers.
- (20 Nov, tester) Simpler phone field: just "Mobile number". The system checks the country and explains if the number isn't accepted.
- (21 Nov, tester) Two sign-in options instead of three: mobile, or email (with "sign in with a code" for a forgotten password).
- (21 Nov, tester) Suppliers can also sign in with their verified mobile number (sign-up unchanged).
- (21 Nov, tester) A buyer can ask Support to turn the same account into a supplier account (admin-approved), since one mobile number = one account.
- (21 Nov, tester) Sign-up refuses a mobile number that is already used, in any format, and a new shareable supplier-only sign-up link (taseerak.com/join).
- (21 Nov, tester) Supplier onboarding: the map location fills the region and city by itself and is required for shops; the unused "minimum order value" field was removed; company sellers add their commercial registration before pricing.
- (21 Nov, tester) Requests go to the nearest suppliers who sell the materials, widening until enough are reached (or to the whole region, capped). Shops are never flooded with requests.
- (21 Nov, tester) "Whole region" requests reach suppliers spread across the region. If the first suppliers don't price within 3 hours, more are reached automatically, and the buyer can tap "Find more suppliers".
- (21 Nov, tester) Variety: requests rotate among suppliers (those who received fewer requests recently go first), so it is not always the same shops.
- (21 Nov, tester) The phone sign-in says a new number creates a buyer account and links sellers to their own sign-up; admins get an alert for every new request and can search requests by number.
- (21 Nov, tester) Buyers say once who they buy for (home, or contractor/company). Home buyers get a simpler request (no technical specs, budget or brand; plain unit names), a shorter home screen and fewer badges on offers. A photo that does not look like the material gets a warning (the buyer can keep it).
- (21 Nov, review) The website now leads to the quick mobile sign-up, speaks to homes as well as projects, uses plain words ("deal" instead of "purchase order"), and the deal page has the app menu and a clear next step.

**Requests and offers**
- "Not sure, let the supplier suggest" option for required specifications.
- Product photos beside each requested material.
- Optional budget per unit.
- "You saved X SAR" against the highest quote.
- Easier offer comparison and a "pick the cheapest" button.
- Sellers choose whether prices include VAT.
- Pricing agents are warned when an offer is above their deal limit.
- A link explaining payment, delivery and deal protection before the award.

**Notifications and support**
- New-request alerts reach a company's sales team members.
- WhatsApp notifications only when an in-app alert stays unread.
- A Support page (WhatsApp + message to the team).
- Report and block a user in chat (UGC policy) with admin review.

**Speed and quality**
- Faster pages (cache, skeletons instead of full-screen loaders).
- Real-time fixes.
- Missing Urdu/English texts completed.
- Clearer error messages in the user's language.

**Privacy and safety**
- Updated privacy policy and terms: approximate location, SMS by Google Firebase, 90-day location log.
- Account deletion erases location data.
- Two-step sign-in for administrators.
- Daily backups.

**Catalog**
- 31 new materials (lighting and a bidet mixer), all with photos.
- Fuller block/brick sizes.

## العربي (ملخّص)

**التسجيل والتوثيق**
- التحقق من الجوال برمز SMS.
- المشتري يسجّل برقم جواله فقط.
- المشتري يتصفّح بحرية، ويوثّق في نفس الصفحة عند الإرسال.
- أرقام السعودية والإمارات والأردن.
- تسجيل أوضح للموردين: محل أو شركة، أو وسيط تسعير.
- الرقم الوطني الموحد للسجل التجاري.
- (19 نوفمبر، مختبر) شاشة دخول موحّدة: «تسجيل الدخول» للجميع، والدخول بالبريد للموردين.
- (20 نوفمبر، مختبر) خانة الجوال أبسط: «رقم الجوال» فقط، والنظام يتحقق من الدولة ويوضّح إن لم يُقبل الرقم.
- (21 نوفمبر، مختبر) خياران للدخول بدل ثلاثة: الجوال أو البريد الإلكتروني (مع الدخول برمز عند نسيان كلمة المرور).
- (21 نوفمبر، مختبر) المورد أيضاً يستطيع الدخول برقم جواله الموثّق (التسجيل كما هو).
- (21 نوفمبر، مختبر) المشتري يطلب من الدعم تحويل حسابه نفسه إلى مورد بموافقة الإدارة، لأن الرقم الواحد لحساب واحد.
- (21 نوفمبر، مختبر) التسجيل يرفض رقم جوال مستخدماً مسبقاً بأي صيغة، ورابط تسجيل عام للموردين فقط (taseerak.com/join).
- (21 نوفمبر، مختبر) إعداد حساب المورد: الموقع على الخريطة يعبّئ المنطقة والمدينة تلقائياً وإلزامي للمحلات، وحُذف حقل «الحد الأدنى لقيمة الطلب»، والشركة تضيف سجلها التجاري قبل التسعير.
- (21 نوفمبر، مختبر) يصل الطلب إلى الموردين الأقرب ممن يبيعون المواد، ويتسع البحث حتى يبلغ عدداً كافياً (أو كل المنطقة بحد أعلى)، فلا تُغرق المحلات بالطلبات.
- (21 نوفمبر، مختبر) طلب «كل المنطقة» يصل إلى موردين موزّعين على أنحاء المنطقة، وإن لم يسعّر الموردون خلال 3 ساعات يصل الطلب تلقائياً إلى موردين آخرين، وللمشتري زر «ابحث عن موردين آخرين».
- (21 نوفمبر، مختبر) تنوّع الموردين: تتناوب الطلبات بين الموردين (الأقل استقبالاً للطلبات مؤخراً أولاً)، فلا تصل دائماً إلى المحلات نفسها.
- (21 نوفمبر، مختبر) شاشة الدخول بالجوال توضّح أن الرقم الجديد يُنشئ حساب مشتري، ورابط للبائعين إلى تسجيلهم؛ وتنبيه للإدارة مع كل طلب جديد وبحث بالرقم.
- (21 نوفمبر، مختبر) يحدّد المشتري مرة واحدة لمن يشتري (لبيته، أو مقاول أو شركة). لصاحب البيت طلب أبسط (بلا مواصفات فنية أو ميزانية أو ماركة، ووحدات بأسماء واضحة)، وصفحة رئيسية أقصر، وعلامات أقل على العروض. والصورة التي لا تشبه المادة يظهر لها تنبيه (ويمكن إبقاؤها).
- (21 نوفمبر، مراجعة) الموقع يقود إلى التسجيل السريع بالجوال، ويخاطب أصحاب البيوت والمشاريع، بكلمات أبسط («الصفقة» بدل «أمر الشراء»)، وصفحة الصفقة فيها قائمة التطبيق والخطوة التالية.

**الطلبات والعروض**
- خيار «لست متأكداً، يقترحه المورد».
- صورة كل مادة.
- ميزانية للوحدة.
- «وفّرت X ريال».
- مقارنة أسهل.
- خيار الأسعار شاملة الضريبة أو قبلها.
- تحذير سقف وسيط التسعير.
- رابط حماية الصفقة.

**الإشعارات والدعم**
- إشعارات الطلبات لفريق الشركة.
- واتساب عند عدم القراءة.
- صفحة الدعم.
- الإبلاغ والحظر في المحادثات.

**السرعة والجودة**
- صفحات أسرع.
- إكمال الترجمات.
- رسائل خطأ بلغة المستخدم.

**الخصوصية والأمان**
- تحديث الشروط والخصوصية.
- حذف بيانات الموقع مع الحساب.
- تحقق بخطوتين للإدارة.
- نسخ احتياطي يومي.

**الكتالوج**
- 31 مادة جديدة بالصور.
