/* ============================================================
   تسعيرك — Taseerak Landing  ·  App logic
   i18n · animated background · interactions
   ============================================================ */

/* ---------- i18n dictionary ---------- */
const I18N = {
  ar: {
    dir: "rtl",
    demo_b1: "البناء والإنشاءات", demo_b2: "التشطيبات", demo_b3: "الكهرباء", demo_b4: "السباكة",
    nav_home: "الرئيسية", nav_how: "كيف يعمل", nav_sectors: "الأقسام", nav_boq: "قائمة المواد", nav_why: "لماذا نحن",
    login: "تسجيل الدخول", register: "ابدأ الآن",
    hero_eyebrow: "قارن أسعار السوق بين يديك",
    hero_h1a: "اطلب ما تحتاجه", hero_h1b: "وقارن عروض", hero_h1c: "عدة موردين",
    hero_lead: "اكتب ما تحتاجه أو صوّره، أو ارفع قائمة المواد. نوجّه طلبك إلى الموردين الذين يبيعون ما تحتاجه، لتستقبل عروضهم وتقارن بينها وتختار الأنسب لبيتك أو مشروعك، مجاناً خلال مرحلة الإطلاق، بلا رسوم ولا عمولة.",
    hero_cta1: "ابدأ الآن مجاناً", hero_cta2: "كيف يعمل؟",
    trust1: "حالة توثيق كل مورد ظاهرة أمامك", trust2: "يصل طلبك إلى الموردين المختصين فقط", trust3: "كل الأسعار شاملة الضريبة",
    lc_title: "خلاط مغسلة", lc_sub: "طلب تسعير · السباكة والمياه", lc_live: "مثال توضيحي",
    lc_s1: "محل أدوات صحية (أ)", lc_m1: "محل · سجلّه موثّق",
    lc_s2: "موزّع أدوات صحية (ب)", lc_m2: "موزّع تجاري",
    lc_s3: "محل سباكة (ج)", lc_m3: "مورّد قريب منك",
    lc_unit: "ر.س / قطعة، شامل الضريبة", lc_saved: "الفرق بين أعلى عرض وأقلّه في هذا المثال:",
    chip1: "تصلك العروض على جوالك", chip2: "قارن الأسعار واختر الأنسب",
    tb_build: "البناء والإنشاءات", tb_finish: "التشطيبات", tb_furn: "الأثاث والديكور", tb_light: "الكهرباء والإنارة", tb_plumb: "السباكة والمياه", tb_hvac: "التكييف والحريق", tb_tools: "العُدد والسلامة", tb_mach: "الآليات الثقيلة", tb_out: "الحدائق والخارجيات",
    packs_eyebrow: "لبيتك", packs_h: "جهّز بيتك", packs_p: "اختر ما تريد تجديده، ونجهّز لك قائمة المواد لتصلك عروض الموردين.",
    pk_bathroom: "تجديد حمّام", pk_paint: "دهان شقة", pk_lighting: "إنارة غرفة", pk_ac: "تكييف غرفة", pk_heater: "تغيير سخان", pk_curtains: "ستائر غرفة", pk_outdoor: "جلسة خارجية", pk_office: "تجهيز مكتب فخم",
    boq_cta: "ارفع قائمتك الآن",
    faq_eyebrow: "أسئلة شائعة", faq_h: "قبل أن تبدأ",
    faq_q1: "كيف أدفع؟", faq_a1: "تدفع للمورد مباشرة بالطريقة التي تتفقان عليها عند التسليم أو قبله. لا تحتفظ تسعيرك بأي مبالغ.",
    faq_q2: "من يوصل الطلب؟", faq_a2: "المورد الذي تختار عرضه هو من يوصل المواد إلى موقعك، أو تستلمها منه بنفسك إن اخترت الاستلام. يظهر في العرض هل يشمل التوصيل وموعده.",
    faq_q3: "هل الخدمة مجانية؟", faq_a3: "نعم. إرسال طلب التسعير ومقارنة العروض مجانيان خلال مرحلة الإطلاق، بلا رسوم ولا عمولة.",
    faq_q4: "كيف أعرف المورد؟", faq_a4: "يظهر بجانب كل مورد ما إذا كان سجلّه التجاري موثّقاً، مع تقييمات المشترين السابقين. ولا يرى المورد اسمك أو رقمك حتى تختار عرضه.", faq_q5: "هل الأسعار شاملة الضريبة؟", faq_a5: "نعم، كل سعر يظهر لك شامل ضريبة القيمة المضافة، وسعر البائع غير المسجّل في الضريبة سعر نهائي.",
    faq_more: "اعرف كيف نحمي صفقتك",
    trustbar_lbl: "كل الأقسام:",
    how_eyebrow: "أربع خطوات بسيطة", how_h: "كيف يعمل تسعيرك؟", how_p: "من الطلب إلى استلام المواد، كل شيء في مكان واحد ومنظّم.",
    step1_t: "أرسل طلب التسعير", step1_p: "اكتب المادة أو صوّرها أو ارفع قائمتك، وحدّد الكمية وموقع التسليم.",
    step2_t: "استقبل عروض الموردين", step2_p: "يصل طلبك إلى الموردين الذين يبيعون ما تحتاجه، ليقدّموا عروضهم.",
    step3_t: "قارن واختر", step3_p: "تُعرض العروض مرتّبة حسب السعر، فيتّضح لك العرض الأوفر بنظرة، ثم تختار الأنسب لبيتك أو مشروعك.",
    step4_t: "تابِع صفقتك", step4_p: "بعد اختيار العرض تتابع التسليم خطوة بخطوة، مع ملخّص جاهز للطباعة.",
    sectors_eyebrow: "ابدأ من القسم", sectors_h: "كل ما تحتاجه في مكان واحد", sectors_p: "من مصباح لمنزلك إلى مواد مشروع كامل — نوجّه طلبك إلى الموردين المختصين.",
    cat_hvac: "التكييف والحريق", cat_hvac_p: "مكيفات، دكت، مراوح، رشاشات وإطفاء.", cat_mach: "الآليات الثقيلة", cat_mach_p: "حفارات، رافعات، شاحنات، مضخات خرسانة.", cat_out: "الحدائق والخارجيات", cat_out_p: "عشب، ري، إنترلوك، أسوار.", cat_light: "الكهرباء والإنارة", cat_light_p: "ثريات، سبوتات، إنارة خارجية وديكور.", cat_furn: "الأثاث والديكور", cat_furn_p: "طاولات، كنب، خزائن، ستائر، مجالس.", cat_finish: "التشطيبات", cat_finish_p: "بلاط، رخام، دهانات، جبس، أبواب.", cat_bath: "السباكة والمياه", cat_bath_p: "خلاطات، أدوات صحية، مواسير، سخانات.", cat_tools: "العُدد والسلامة", cat_tools_p: "عُدد يدوية وكهربائية، مسامير وأقفال، سقالات، سلامة.", cat_build: "البناء والإنشاءات", cat_build_p: "أسمنت، حديد، بلوك، خرسانة، عوازل.",
    sec_civil: "مدني", sec_civil_p: "حديد، أسمنت، خرسانة، بلوك، تصريف.",
    sec_arch: "معماري", sec_arch_p: "بلاط، دهانات، أبواب، جبس، أسقف، زجاج.",
    sec_elec: "كهرباء", sec_elec_p: "كابلات، لوحات، إنارة LED، محوّلات.",
    sec_mech: "ميكانيك", sec_mech_p: "مواسير، مضخّات، محابس، تكييف، رشّاشات.",
    sec_equipment: "آليات ومعدات", sec_equipment_p: "حفّارات، رافعات، مولّدات، سقالات، معدات تنفيذ.", sec_store: "محل توريد", sec_store_p: "محلات مواد بناء عامة ومستلزمات متنوّعة.",
    boq_eyebrow: "طلب كبير؟", boq_h: "ارفع قائمة المواد أو صوّرها… ونحن نوزّعها على الموردين",
    boq_p: "لا داعي لكتابة كل مادة يدوياً. ارفع قائمتك أو صوّرها، فيستخرج النظام كل مادة تلقائياً ويرسلها إلى الموردين الذين يبيعونها.",
    boq_l1: "استخراج تلقائي لكل مواد القائمة", boq_l2: "تحديد القسم المناسب لكل مادة", boq_l3: "طلب واحد بعدة بنود، وتختار أفضل سعر لكل مادة", boq_l4: "مقارنة العروض لكل مادة مع الإجمالي",
    demo_file: "قائمة-المواد.xlsx", demo_extract: "استخراج تلقائي + توجيه",
    demo_m1: "حديد تسليح Ø16", demo_m2: "بلاط بورسلان 60×60", demo_m3: "كابل XLPE 4×16", demo_m4: "مواسير PPR مقاس 1 بوصة",
    demo_q1: "42 طن", demo_q2: "850 م²", demo_q3: "320 م", demo_q4: "180 م",
    demo_foot_l: "إجمالي البنود المستخرجة", demo_foot_r: "4 مواد · 4 أقسام",
    stats_eyebrow: "بُنيت للمشترين والموردين", stats_h: "منصة واحدة، كل ما تحتاجه", stats_p: "",
    stat1_l: "أقسام متخصّصة", stat2_l: "لغات بالكامل", stat3_l: "مادة في الكتالوج", stat4_l: "رسوم أو عمولة",
    why_eyebrow: "لماذا تسعيرك", why_h: "ليست متجراً… بل سوق تسعير حقيقي", why_p: "كل ما يميّزنا مبني لخدمة سوق مواد البناء السعودي.",
    f1_t: "مجاني خلال الإطلاق، بلا رسوم ولا عمولة", f1_p: "قارن عروض الموردين في مكان واحد. لا تدفع شيئاً للمنصة خلال مرحلة الإطلاق، فالطلب والمقارنة مجانيان.",
    f2_t: "توجيه دقيق للطلبات", f2_p: "يصل كل طلب إلى الموردين الذين يبيعون ما فيه، في منطقتك.",
    f3_t: "ثلاث لغات", f3_p: "واجهة المنصة متاحة بالعربية والإنجليزية والأردو.",
    f4_t: "رفع قائمة المواد", f4_p: "قائمة موادك مكتوبة أو مصوّرة تتحوّل إلى طلب تسعير منظّم في ثوانٍ.",
    f5_t: "تعرف من تتعامل معه", f5_p: "يظهر بجانب كل مورد ما إذا كان سجلّه التجاري موثّقاً، لتعرف مع من تتعامل.",
    f6_t: "طلب سريع", f6_p: "اكتب ما تحتاجه، أو تحدّث به، أو صوّره، ونرتّبه لك في قائمة تصل إلى الموردين.",
    cta_h: "هل أنت مستعد لتسعير طلبك القادم؟", cta_p: "انضم إلى تسعيرك اليوم، ودع الموردين يتنافسون على طلبك.",
    cta_b1: "ابدأ الآن مجاناً", cta_b2: "تواصل معنا عبر واتساب",
    foot_tag: "منصة التسعير والتوريد لمواد البناء في السعودية. اطلب، قارن، واختر بثقة.",
    foot_c1: "المنتج", foot_c1_1: "كيف يعمل", foot_c1_2: "الأقسام", foot_c1_3: "قائمة المواد", foot_c1_4: "مؤشر الأسعار",
    foot_c2: "للموردين", foot_c2_1: "انضم كمورد", foot_c2_6: "انضم كوسيط تسعير", hero_seller_q: "صاحب محل أو مورد مواد؟", hero_seller_cta: "سجّل كمورد", foot_c2_5: "انضم كشركة أو محل", foot_c2_2: "التوثيق", foot_c2_3: "كيف تصلك الطلبات", foot_c2_4: "الأسئلة الشائعة",
    foot_c3: "الشركة", foot_c3_1: "من نحن", foot_c3_2: "راسلنا بالبريد", foot_c3_6: "تواصل معنا عبر واتساب", foot_wa_note: "رقم تسعيرك الرسمي على واتساب للأعمال", my_account: "حسابي", foot_c3_3: "الخصوصية", foot_c3_4: "الشروط", foot_c3_5: "كيف نحمي صفقتك",
    foot_copy: "© 2026 تسعيرك. جميع الحقوق محفوظة.",
  },
  en: {
    dir: "ltr",
    demo_b1: "Building", demo_b2: "Finishing", demo_b3: "Electrical", demo_b4: "Plumbing",
    nav_home: "Home", nav_how: "How it works", nav_sectors: "Sections", nav_boq: "Materials list", nav_why: "Why us",
    login: "Sign in", register: "Get started",
    hero_eyebrow: "Compare market prices in your hands",
    hero_h1a: "Order what you need", hero_h1b: "and compare offers from", hero_h1c: "several suppliers",
    hero_lead: "Type what you need, snap a photo, or upload your materials list. Taseerak sends it to the suppliers who sell what you need, so you can compare their offers and choose what fits your home or project, free during launch, with no fees and no commission.",
    hero_cta1: "Start free", hero_cta2: "How does it work?",
    trust1: "Each supplier's verification status is in front of you", trust2: "Your request reaches only suppliers who sell it", trust3: "Every price includes VAT",
    lc_title: "Basin mixer", lc_sub: "Price request · Plumbing & water", lc_live: "Illustrative example",
    lc_s1: "Sanitary-ware shop (A)", lc_m1: "Shop · Registration verified",
    lc_s2: "Sanitary-ware distributor (B)", lc_m2: "Commercial distributor",
    lc_s3: "Plumbing shop (C)", lc_m3: "Supplier near you",
    lc_unit: "SAR / piece, incl. VAT", lc_saved: "Gap between the highest and lowest offer here:",
    chip1: "Offers arrive on your phone", chip2: "Compare prices and choose",
    tb_build: "Building & structure", tb_finish: "Finishing", tb_furn: "Furniture & decor", tb_light: "Electrical & lighting", tb_plumb: "Plumbing & water", tb_hvac: "AC & firefighting", tb_tools: "Tools & safety", tb_mach: "Heavy machinery", tb_out: "Garden & outdoor",
    packs_eyebrow: "For your home", packs_h: "Get your home ready", packs_p: "Choose what you want to renovate; we prepare the materials list and suppliers send you offers.",
    pk_bathroom: "Bathroom renovation", pk_paint: "Paint an apartment", pk_lighting: "Light a room", pk_ac: "Air-condition a room", pk_heater: "Replace a water heater", pk_curtains: "Curtains for a room", pk_outdoor: "Outdoor sitting area", pk_office: "An elegant office",
    boq_cta: "Upload your list now",
    faq_eyebrow: "Questions", faq_h: "Before you start",
    faq_q1: "How do I pay?", faq_a1: "You pay the supplier directly, in the way you agree, at or before delivery. Taseerak never holds any money.",
    faq_q2: "Who delivers the order?", faq_a2: "The supplier whose offer you choose delivers to your location, or you collect from them if you chose pickup. The offer shows whether delivery is included and when.",
    faq_q3: "Is the service free?", faq_a3: "Yes. Sending a price request and comparing offers are free during the launch phase, with no fees and no commission.",
    faq_q4: "How do I know the supplier?", faq_a4: "Each supplier shows whether its commercial registration is verified, with ratings from earlier buyers. The supplier does not see your name or number until you choose its offer.", faq_q5: "Do the prices include VAT?", faq_a5: "Yes. Every price you see includes VAT, and a seller who is not VAT-registered gives a final price.",
    faq_more: "How we protect your deal",
    trustbar_lbl: "Every section:",
    how_eyebrow: "Four simple steps", how_h: "How Taseerak works", how_p: "From request to delivery, everything in one organized place.",
    step1_t: "Send a price request", step1_p: "Type or photograph the material, or upload your list; set the quantity and delivery location.",
    step2_t: "Receive supplier offers", step2_p: "Your request reaches the suppliers who sell what you need, and they send their offers.",
    step3_t: "Compare & pick", step3_p: "Offers are sorted by price, so the best value is clear at a glance; then pick what fits your home or project.",
    step4_t: "Follow your deal", step4_p: "After you choose an offer, follow the delivery step by step, with a print-ready summary.",
    sectors_eyebrow: "Start with a section", sectors_h: "Everything you need, in one place", sectors_p: "From one lamp for your home to a full project — we route your request to the right suppliers.",
    cat_hvac: "AC & firefighting", cat_hvac_p: "AC units, ducts, fans, sprinklers.", cat_mach: "Heavy machinery", cat_mach_p: "Excavators, cranes, trucks, concrete pumps.", cat_out: "Garden & outdoor", cat_out_p: "Turf, irrigation, interlock, fencing.", cat_light: "Electrical & lighting", cat_light_p: "Chandeliers, spots, outdoor and decor lighting.", cat_furn: "Furniture & decor", cat_furn_p: "Tables, sofas, wardrobes, curtains, majlis.", cat_finish: "Finishing", cat_finish_p: "Tiles, marble, paints, gypsum, doors.", cat_bath: "Plumbing & water", cat_bath_p: "Mixers, sanitary ware, pipes, heaters.", cat_tools: "Tools & safety", cat_tools_p: "Hand and power tools, fasteners and locks, scaffolding, safety.", cat_build: "Building & structure", cat_build_p: "Cement, rebar, blocks, concrete, insulation.",
    sec_civil: "Civil", sec_civil_p: "Rebar, cement, concrete, blocks, drainage.",
    sec_arch: "Architectural", sec_arch_p: "Tiles, paint, doors, gypsum, ceilings, glass.",
    sec_elec: "Electrical", sec_elec_p: "Cables, panels, LED lighting, transformers.",
    sec_mech: "Mechanical", sec_mech_p: "Pipes, pumps, valves, HVAC, sprinklers.",
    sec_equipment: "Machinery", sec_equipment_p: "Excavators, cranes, generators, scaffolding.", sec_store: "Supply Store", sec_store_p: "General building-materials stores & misc. supplies.",
    boq_eyebrow: "A big order?", boq_h: "Upload or photograph your materials list… we route it to suppliers",
    boq_p: "No need to type every item. Upload your list or photograph it; the system extracts every material and sends it to the suppliers who sell it.",
    boq_l1: "Auto-extract every item on the list", boq_l2: "The right section for each material", boq_l3: "One request with many items; pick the best price per material", boq_l4: "Compare offers per material, with totals",
    demo_file: "materials-list.xlsx", demo_extract: "Auto-extract + route",
    demo_m1: "Rebar Ø16", demo_m2: "Porcelain tile 60×60", demo_m3: "XLPE cable 4×16", demo_m4: "PPR pipe, 1 inch",
    demo_q1: "42 ton", demo_q2: "850 m²", demo_q3: "320 m", demo_q4: "180 m",
    demo_foot_l: "Total items extracted", demo_foot_r: "4 materials · 4 sections",
    stats_eyebrow: "Built for buyers and suppliers", stats_h: "One platform, everything you need", stats_p: "",
    stat1_l: "Specialized sections", stat2_l: "Full languages", stat3_l: "Catalog materials", stat4_l: "Fees or commission",
    why_eyebrow: "Why Taseerak", why_h: "Not a store… a real quoting marketplace", why_p: "Everything that sets us apart is built for the Saudi construction market.",
    f1_t: "Free during launch: no fees, no commission", f1_p: "Compare supplier offers in one place. You pay the platform nothing during the launch phase: requesting and comparing are free.",
    f2_t: "Accurate routing", f2_p: "Each request reaches the suppliers who sell what is in it, in your area.",
    f3_t: "Three languages", f3_p: "The platform is available in Arabic, English and Urdu.",
    f4_t: "Upload a list", f4_p: "Your materials list, typed or photographed, becomes one organized price request in seconds.",
    f5_t: "Know who you are dealing with", f5_p: "Each supplier shows whether its commercial registration is verified, so you know who you are dealing with.",
    f6_t: "Quick request", f6_p: "Write what you need, say it or photograph it; we turn it into a list that reaches suppliers.",
    cta_h: "Ready to price your next order?", cta_p: "Join Taseerak today and let suppliers compete for your request.",
    cta_b1: "Start now for free", cta_b2: "Contact us on WhatsApp",
    foot_tag: "The procurement & quoting platform for construction materials in Saudi Arabia. Request, compare, choose with confidence.",
    foot_c1: "Product", foot_c1_1: "How it works", foot_c1_2: "Sections", foot_c1_3: "Materials list", foot_c1_4: "Price index",
    foot_c2: "For suppliers", foot_c2_1: "Join as supplier", foot_c2_6: "Join as a pricing agent", hero_seller_q: "Own a shop or supply materials?", hero_seller_cta: "Sign up as a supplier", foot_c2_5: "Join as a company or shop", foot_c2_2: "Verification", foot_c2_3: "How requests reach you", foot_c2_4: "FAQ",
    foot_c3: "Company", foot_c3_1: "About", foot_c3_2: "Email us", foot_c3_6: "Contact us on WhatsApp", foot_wa_note: "Taseerak’s official WhatsApp Business number", my_account: "My account", foot_c3_3: "Privacy", foot_c3_4: "Terms", foot_c3_5: "How we protect your deal",
    foot_copy: "© 2026 Taseerak. All rights reserved.",
  },
  ur: {
    dir: "rtl",
    demo_b1: "تعمیراتی", demo_b2: "فنشنگ", demo_b3: "بجلی", demo_b4: "پلمبنگ",
    nav_home: "ہوم", nav_how: "کیسے کام کرتا ہے", nav_sectors: "حصے", nav_boq: "مواد کی فہرست", nav_why: "ہمیں کیوں",
    login: "سائن اِن", register: "شروع کریں",
    hero_eyebrow: "مارکیٹ کی قیمتوں کا موازنہ آپ کے ہاتھ میں",
    hero_h1a: "جو چاہیے منگوائیں", hero_h1b: "اور کئی سپلائرز کی", hero_h1c: "پیشکشوں کا موازنہ کریں",
    hero_lead: "جو چاہیے لکھیں، تصویر لیں یا مواد کی فہرست اپ لوڈ کریں۔ تسعیرک اسے ان سپلائرز تک پہنچاتا ہے جو آپ کی مطلوبہ چیز بیچتے ہیں، تاکہ آپ پیشکشوں کا موازنہ کر کے اپنے گھر یا منصوبے کے لیے بہترین انتخاب کریں، لانچ کے دوران مفت، نہ فیس نہ کمیشن۔",
    hero_cta1: "مفت شروع کریں", hero_cta2: "یہ کیسے کام کرتا ہے؟",
    trust1: "ہر سپلائر کی تصدیق کی حالت آپ کے سامنے ہے", trust2: "آپ کی درخواست صرف متعلقہ سپلائرز تک پہنچتی ہے", trust3: "ہر قیمت VAT سمیت ہے",
    lc_title: "بیسن مکسر", lc_sub: "درخواست · پلمبنگ اور پانی", lc_live: "مثال",
    lc_s1: "سینیٹری کی دکان (A)", lc_m1: "دکان · رجسٹریشن تصدیق شدہ",
    lc_s2: "سینیٹری ڈسٹری بیوٹر (B)", lc_m2: "تجارتی تقسیم کار",
    lc_s3: "پلمبنگ کی دکان (C)", lc_m3: "آپ کے قریب سپلائر",
    lc_unit: "ریال / عدد، VAT سمیت", lc_saved: "اس مثال میں سب سے زیادہ اور سب سے کم پیشکش کا فرق:",
    chip1: "آفرز آپ کے فون پر آتی ہیں", chip2: "قیمتوں کا موازنہ کریں اور بہترین چنیں",
    tb_build: "تعمیر و ڈھانچہ", tb_finish: "فنشنگ", tb_furn: "فرنیچر اور سجاوٹ", tb_light: "بجلی اور روشنی", tb_plumb: "پلمبنگ اور پانی", tb_hvac: "اے سی اور فائر", tb_tools: "اوزار اور حفاظت", tb_mach: "بھاری مشینری", tb_out: "باغ اور بیرونی",
    packs_eyebrow: "آپ کے گھر کے لیے", packs_h: "اپنا گھر تیار کریں", packs_p: "جو تجدید کرنا ہے چنیں، ہم سامان کی فہرست تیار کریں گے اور سپلائرز آپ کو پیشکشیں بھیجیں گے۔",
    pk_bathroom: "باتھ روم کی تجدید", pk_paint: "اپارٹمنٹ پینٹ", pk_lighting: "کمرے کی روشنی", pk_ac: "کمرے کا اے سی", pk_heater: "گیزر بدلیں", pk_curtains: "کمرے کے پردے", pk_outdoor: "بیرونی بیٹھک", pk_office: "شاندار دفتر",
    boq_cta: "ابھی اپنی فہرست اپ لوڈ کریں",
    faq_eyebrow: "عام سوالات", faq_h: "شروع کرنے سے پہلے",
    faq_q1: "ادائیگی کیسے کروں؟", faq_a1: "آپ سپلائر کو براہ راست، طے شدہ طریقے سے، ڈیلیوری پر یا پہلے ادائیگی کرتے ہیں۔ تسعیرک کوئی رقم اپنے پاس نہیں رکھتا۔",
    faq_q2: "آرڈر کون پہنچاتا ہے؟", faq_a2: "جس سپلائر کی پیشکش آپ چنیں وہی سامان آپ کے مقام تک پہنچاتا ہے، یا آپ خود وصول کرتے ہیں۔ پیشکش میں ڈیلیوری اور اس کا وقت لکھا ہوتا ہے۔",
    faq_q3: "کیا سروس مفت ہے؟", faq_a3: "جی ہاں۔ لانچ کے مرحلے میں قیمت کی درخواست بھیجنا اور آفرز کا موازنہ مفت ہے، نہ فیس نہ کمیشن۔",
    faq_q4: "سپلائر کو کیسے پہچانوں؟", faq_a4: "ہر سپلائر کے ساتھ دکھایا جاتا ہے کہ اس کی تجارتی رجسٹریشن تصدیق شدہ ہے یا نہیں، پچھلے خریداروں کی ریٹنگ کے ساتھ۔ سپلائر آپ کا نام یا نمبر تب تک نہیں دیکھتا جب تک آپ اس کی پیشکش نہ چنیں۔", faq_q5: "کیا قیمتوں میں VAT شامل ہے؟", faq_a5: "جی ہاں۔ آپ کو نظر آنے والی ہر قیمت میں VAT شامل ہے، اور جو فروخت کنندہ VAT میں رجسٹرڈ نہیں اس کی قیمت حتمی ہے۔",
    faq_more: "ہم آپ کے سودے کی حفاظت کیسے کرتے ہیں",
    trustbar_lbl: "ہر شعبے کی خدمت:",
    how_eyebrow: "چار آسان مراحل", how_h: "تسعیرک کیسے کام کرتا ہے", how_p: "درخواست سے ترسیل تک، سب کچھ ایک منظم جگہ پر۔",
    step1_t: "درخواست بھیجیں", step1_p: "مواد لکھیں یا تصویر لیں یا فہرست اپ لوڈ کریں؛ مقدار اور ترسیل کا مقام طے کریں۔",
    step2_t: "سپلائرز کی پیشکشیں وصول کریں", step2_p: "آپ کی درخواست ان سپلائرز تک پہنچتی ہے جو آپ کی مطلوبہ چیز بیچتے ہیں، اور وہ اپنی پیشکشیں بھیجتے ہیں۔",
    step3_t: "موازنہ اور انتخاب", step3_p: "پیشکشیں قیمت کے لحاظ سے ترتیب میں ہوتی ہیں، بہترین ایک نظر میں؛ پھر اپنے گھر یا منصوبے کے لیے موزوں چنیں۔",
    step4_t: "اپنی ڈیل دیکھیں", step4_p: "پیشکش چننے کے بعد ڈیلیوری قدم بہ قدم دیکھیں، پرنٹ کے لیے تیار خلاصے کے ساتھ۔",
    sectors_eyebrow: "سیکشن سے شروع کریں", sectors_h: "ہر چیز، ایک جگہ", sectors_p: "گھر کے ایک لیمپ سے پورے پراجیکٹ تک — ہم آپ کی درخواست درست سپلائرز تک پہنچاتے ہیں۔",
    cat_hvac: "اے سی اور فائر", cat_hvac_p: "اے سی، ڈکٹ، پنکھے، اسپرنکلر۔", cat_mach: "بھاری مشینری", cat_mach_p: "کھدائی مشین، کرین، ٹرک، کنکریٹ پمپ۔", cat_out: "باغ اور بیرونی", cat_out_p: "گھاس، آبپاشی، انٹرلاک، باڑ۔", cat_light: "روشنی", cat_light_p: "جھومر، اسپاٹ، بیرونی اور آرائشی لائٹس۔", cat_furn: "فرنیچر اور سجاوٹ", cat_furn_p: "میزیں، صوفے، الماریاں، پردے، مجلس۔", cat_finish: "فنشنگ", cat_finish_p: "ٹائلیں، ماربل، پینٹ، جپسم، دروازے۔", cat_bath: "پلمبنگ اور پانی", cat_bath_p: "مکسر، سینیٹری، پائپ، گیزر۔", cat_tools: "اوزار اور حفاظت", cat_tools_p: "ہاتھ اور بجلی کے اوزار، کیل اور تالے، سکیفولڈنگ، حفاظت۔", cat_build: "تعمیر و ڈھانچہ", cat_build_p: "سیمنٹ، سریا، بلاک، کنکریٹ، انسولیشن۔",
    sec_civil: "سول", sec_civil_p: "سریا، سیمنٹ، کنکریٹ، بلاک، نکاسی۔",
    sec_arch: "تعمیراتی", sec_arch_p: "ٹائلیں، پینٹ، دروازے، جپسم، چھتیں، شیشہ۔",
    sec_elec: "بجلی", sec_elec_p: "کیبلز، پینلز، LED روشنی، ٹرانسفارمر۔",
    sec_mech: "مکینیکل", sec_mech_p: "پائپ، پمپ، والو، ایئر کنڈیشننگ۔",
    sec_equipment: "مشینری", sec_equipment_p: "کھدائی مشینیں، کرینیں، جنریٹر، سہارے۔", sec_store: "سپلائی اسٹور", sec_store_p: "عام تعمیراتی مواد اور متفرق سامان۔",
    boq_eyebrow: "بڑا آرڈر؟", boq_h: "مواد کی فہرست اپ لوڈ کریں یا تصویر لیں… ہم اسے سپلائرز تک پہنچاتے ہیں",
    boq_p: "ہر آئٹم لکھنے کی ضرورت نہیں۔ اپنی فہرست اپ لوڈ کریں یا اس کی تصویر لیں، اور نظام ہر مواد خود نکال کر انہیں بیچنے والے سپلائرز تک پہنچاتا ہے۔",
    boq_l1: "فہرست کے ہر آئٹم کا خودکار اخراج", boq_l2: "ہر مواد کے لیے درست حصہ", boq_l3: "کئی آئٹمز کی ایک درخواست، ہر مواد کی بہترین قیمت چنیں", boq_l4: "ہر مواد کی پیشکشوں کا موازنہ، کل رقم کے ساتھ",
    demo_file: "materials-list.xlsx", demo_extract: "خودکار اخراج + رہنمائی",
    demo_m1: "سریا Ø16", demo_m2: "پورسلین ٹائل 60×60", demo_m3: "XLPE کیبل 4×16", demo_m4: "PPR پائپ، 1 انچ",
    demo_q1: "42 ٹن", demo_q2: "850 م²", demo_q3: "320 م", demo_q4: "180 م",
    demo_foot_l: "کل نکالے گئے آئٹم", demo_foot_r: "4 مواد · 4 حصے",
    stats_eyebrow: "خریداروں اور سپلائرز کے لیے", stats_h: "ایک پلیٹ فارم، سب کچھ", stats_p: "",
    stat1_l: "خصوصی حصے", stat2_l: "مکمل زبانیں", stat3_l: "کیٹلاگ میں اشیاء", stat4_l: "فیس یا کمیشن",
    why_eyebrow: "تسعیرک کیوں", why_h: "اسٹور نہیں… ایک حقیقی قیمت مارکیٹ", why_p: "ہماری ہر خصوصیت سعودی تعمیراتی مارکیٹ کے لیے بنی ہے۔",
    f1_t: "لانچ کے دوران مفت: نہ فیس، نہ کمیشن", f1_p: "سپلائرز کی آفرز کا ایک جگہ موازنہ کریں۔ لانچ کے مرحلے میں پلیٹ فارم کو آپ کچھ ادا نہیں کرتے: درخواست اور موازنہ مفت ہیں۔",
    f2_t: "ذہین رہنمائی", f2_p: "ہر درخواست آپ کے علاقے میں ان سپلائرز تک پہنچتی ہے جو اس کی چیزیں بیچتے ہیں۔",
    f3_t: "تین زبانیں", f3_p: "پلیٹ فارم عربی، انگریزی اور اردو میں دستیاب ہے۔",
    f4_t: "فہرست اپ لوڈ", f4_p: "آپ کے سامان کی فہرست، لکھی ہوئی یا تصویر میں، سیکنڈوں میں ایک منظم درخواست بن جاتی ہے۔",
    f5_t: "جانیں آپ کس سے معاملہ کر رہے ہیں", f5_p: "ہر سپلائر کے ساتھ دکھایا جاتا ہے کہ اس کا تجارتی رجسٹریشن (CR) تصدیق شدہ ہے یا نہیں، تاکہ آپ جانیں کس سے معاملہ کر رہے ہیں۔",
    f6_t: "فوری درخواست", f6_p: "لکھیں، بولیں یا تصویر لیں، ہم اسے سپلائرز تک پہنچنے والی فہرست بنا دیتے ہیں۔",
    cta_h: "اپنے اگلے آرڈر کی قیمت لگانے کے لیے تیار؟", cta_p: "آج تسعیرک میں شامل ہوں اور سپلائرز کو مقابلہ کرنے دیں۔",
    cta_b1: "ابھی مفت شروع کریں", cta_b2: "واٹس ایپ پر رابطہ کریں",
    foot_tag: "سعودی عرب میں تعمیراتی سامان کے لیے قیمت اور سپلائی پلیٹ فارم۔ درخواست، موازنہ، اعتماد سے انتخاب۔",
    foot_c1: "پروڈکٹ", foot_c1_1: "کیسے کام کرتا ہے", foot_c1_2: "حصے", foot_c1_3: "مواد کی فہرست", foot_c1_4: "قیمت انڈیکس",
    foot_c2: "سپلائرز کے لیے", foot_c2_1: "بطور سپلائر شامل ہوں", foot_c2_6: "بطور قیمت ایجنٹ شامل ہوں", hero_seller_q: "دکان کے مالک یا سامان فراہم کرتے ہیں؟", hero_seller_cta: "بطور سپلائر رجسٹر کریں", foot_c2_5: "بطور کمپنی یا دکان شامل ہوں", foot_c2_2: "تصدیق", foot_c2_3: "درخواستیں آپ تک کیسے پہنچتی ہیں", foot_c2_4: "عام سوالات",
    foot_c3: "کمپنی", foot_c3_1: "ہمارے بارے میں", foot_c3_2: "ای میل کریں", foot_c3_6: "واٹس ایپ پر رابطہ کریں", foot_wa_note: "تسعیرک کا سرکاری واٹس ایپ بزنس نمبر", my_account: "میرا اکاؤنٹ", foot_c3_3: "رازداری", foot_c3_4: "شرائط", foot_c3_5: "ہم آپ کے سودے کی حفاظت کیسے کرتے ہیں",
    foot_copy: "© 2026 تسعیرک۔ جملہ حقوق محفوظ ہیں۔",
  }
};

/* ---------- Apply language ---------- */
function setLang(lang) {
  const dict = I18N[lang];
  if (!dict) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dict.dir;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (dict[k] != null) el.textContent = dict[k];
  });
  document.querySelectorAll(".lang button, .foot-bottom .langs button").forEach(b => {
    b.classList.toggle("on", b.dataset.lang === lang);
    b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
  });
  try { localStorage.setItem("taseerak_lang", lang); localStorage.setItem("taseerak_locale", lang); } catch (e) {}
}

/* ============================================================
   Animated background — blueprint grid + supplier network
   ============================================================ */
function initCanvas() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W, H, DPR, hub, suppliers = [], pulses = [], quotes = [], ripples = [], motes = [];
  let mouse = { x: -9999, y: -9999 }, px = 0, py = 0;
  let last = performance.now(), t = 0, nextBroadcast = 0.7;

  let ACCENT = window.__bgAccent || "212,165,67";
  let MOTION = window.__bgMotion != null ? window.__bgMotion : 1;
  window.setBgAccent = (rgb) => { ACCENT = rgb; window.__bgAccent = rgb; };
  window.setBgMotion = (m) => { MOTION = m; window.__bgMotion = m; };

  const C = {
    line:  "196,206,220",
    node:  "214,222,232",
    req:   "226,232,240",
    get offer() { return ACCENT; },
    best:  "245,197,91"
  };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const hero = canvas.parentElement;
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    hub = { x: W * 0.5, y: H * 0.47, pulse: 0, flash: 0 };
    const count = Math.min(22, Math.max(11, Math.floor(W * H / 62000)));
    suppliers = [];
    const maxR = Math.min(W, H) * 0.46;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (Math.random() - .5) * 0.45;
      const rad = maxR * (0.40 + Math.random() * 0.66);
      const bx = hub.x + Math.cos(ang) * rad * 1.4;
      const by = hub.y + Math.sin(ang) * rad;
      suppliers.push({
        bx, by, x: bx, y: by, r: Math.random() * 1.6 + 1.7,
        drift: Math.random() * 6.28, dsp: 0.4 + Math.random() * 0.5,
        dist: Math.hypot(bx - hub.x, by - hub.y), glow: 0, quoted: false,
        depth: 0.5 + Math.random() * 0.5
      });
    }
    pulses = []; quotes = []; ripples = [];
    // faint depth motes
    motes = Array.from({ length: 46 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.3 + 0.4, a: Math.random() * 0.35 + 0.05,
      vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6,
      depth: 0.3 + Math.random() * 0.9, ph: Math.random() * 6.28
    }));
  }

  function broadcast() {
    pulses.push({ r: 0, life: 1 });
    const responders = [];
    suppliers.forEach((s, i) => { s.quoted = false; if (Math.random() < 0.82) responders.push(i); });
    if (!responders.length) responders.push((Math.random() * suppliers.length) | 0);
    hub._wave = { responders, winner: responders[(Math.random() * responders.length) | 0] };
  }

  function spawnQuote(s, isBest) {
    const mx = (s.x + hub.x) / 2, my = (s.y + hub.y) / 2;
    const nx = -(hub.y - s.y), ny = (hub.x - s.x), nl = Math.hypot(nx, ny) || 1;
    const bend = (Math.random() * 0.16 + 0.08) * (Math.random() < .5 ? 1 : -1);
    quotes.push({
      sx: s.x, sy: s.y, cx: mx + (nx / nl) * s.dist * bend, cy: my + (ny / nl) * s.dist * bend,
      t: 0, speed: 0.32 + Math.random() * 0.12, best: isBest, trail: []
    });
  }

  const bez = (a, c, b, t) => { const u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; };

  function glowDot(x, y, r, rgb, a, bloom) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28);
    ctx.fillStyle = "rgba(" + rgb + "," + a + ")";
    if (bloom) { ctx.shadowColor = "rgba(" + rgb + ",0.9)"; ctx.shadowBlur = bloom; }
    ctx.fill(); ctx.shadowBlur = 0;
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!reduce) { t += dt; nextBroadcast -= dt; }
    if (nextBroadcast <= 0) { broadcast(); nextBroadcast = (3.6 + Math.random() * 1.3) / Math.max(0.15, MOTION); }

    const txm = mouse.x > -999 ? (mouse.x - W / 2) : 0;
    const tym = mouse.y > -999 ? (mouse.y - H / 2) : 0;
    px += (txm * 0.016 - px) * 0.05; py += (tym * 0.016 - py) * 0.05;

    ctx.clearRect(0, 0, W, H);

    // depth wash (subtle blue + warm) for richness
    const dw = ctx.createRadialGradient(hub.x + px, hub.y + py, 10, hub.x, hub.y, Math.max(W, H) * 0.6);
    dw.addColorStop(0, "rgba(16,46,69,0.22)");
    dw.addColorStop(0.55, "rgba(11,36,56,0.08)");
    dw.addColorStop(1, "rgba(8,17,40,0)");
    ctx.fillStyle = dw; ctx.fillRect(0, 0, W, H);

    // far motes
    for (const m of motes) {
      if (!reduce) { m.x += m.vx * dt * m.depth; m.y += m.vy * dt * m.depth; m.ph += dt; }
      if (m.x < -5) m.x = W + 5; if (m.x > W + 5) m.x = -5;
      if (m.y < -5) m.y = H + 5; if (m.y > H + 5) m.y = -5;
      const a = m.a * (0.5 + 0.5 * Math.sin(m.ph));
      glowDot(m.x + px * m.depth * 2, m.y + py * m.depth * 2, m.r, C.node, a.toFixed(3), 0);
    }

    ctx.save();
    ctx.translate(px, py);

    // supplier idle drift
    for (const s of suppliers) {
      if (!reduce) s.drift += dt * s.dsp;
      s.x = s.bx + Math.cos(s.drift) * 7;
      s.y = s.by + Math.sin(s.drift * 0.8) * 7;
      s.dist = Math.hypot(s.x - hub.x, s.y - hub.y);
    }

    // connection lines (gradient hub->node)
    for (const s of suppliers) {
      const a = 0.07 + s.glow * 0.5;
      const g = ctx.createLinearGradient(hub.x, hub.y, s.x, s.y);
      const col = s.glow > 0.02 ? C.offer : C.line;
      g.addColorStop(0, "rgba(" + col + "," + (a * 1.1).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + col + ",0)");
      ctx.strokeStyle = g; ctx.lineWidth = 0.7 + s.glow * 1.2;
      ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(s.x, s.y); ctx.stroke();
    }

    // orbiting dashed rings around hub (luxe detail)
    ctx.save();
    ctx.setLineDash([2, 10]);
    [58, 92].forEach((rr, i) => {
      ctx.lineDashOffset = (i ? -1 : 1) * t * 14;
      ctx.strokeStyle = "rgba(" + C.req + "," + (0.10 - i * 0.03).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, rr, 0, 6.28); ctx.stroke();
    });
    ctx.restore();

    // broadcast pulses
    const maxR = Math.hypot(W, H) * 0.62;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      if (!reduce) p.r += dt * 340 * MOTION;
      p.life = 1 - p.r / maxR;
      if (p.life <= 0) { pulses.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(hub.x, hub.y, p.r, 0, 6.28);
      ctx.strokeStyle = "rgba(" + C.req + "," + (p.life * 0.30).toFixed(3) + ")";
      ctx.lineWidth = 1.4; ctx.stroke();
      const wave = hub._wave;
      if (wave) for (const idx of wave.responders) {
        const s = suppliers[idx];
        if (!s.quoted && p.r >= s.dist) { s.quoted = true; s.glow = 1; spawnQuote(s, idx === wave.winner); }
      }
    }

    // quotes with comet trails
    for (let i = quotes.length - 1; i >= 0; i--) {
      const q = quotes[i];
      if (!reduce) q.t += dt * q.speed * MOTION;
      const tt = Math.min(q.t, 1);
      const x = bez(q.sx, q.cx, hub.x, tt), y = bez(q.sy, q.cy, hub.y, tt);
      q.trail.unshift({ x, y }); if (q.trail.length > 9) q.trail.pop();
      const col = q.best ? C.best : C.offer;
      for (let k = q.trail.length - 1; k > 0; k--) {
        const ta = (1 - k / q.trail.length) * 0.5;
        ctx.strokeStyle = "rgba(" + col + "," + ta.toFixed(3) + ")";
        ctx.lineWidth = (q.best ? 2.6 : 1.9) * (1 - k / q.trail.length);
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(q.trail[k].x, q.trail[k].y); ctx.lineTo(q.trail[k - 1].x, q.trail[k - 1].y); ctx.stroke();
      }
      glowDot(x, y, q.best ? 3.2 : 2.4, col, 0.96, q.best ? 16 : 9);
      if (q.t >= 1) {
        ripples.push({ r: 0, life: 1, best: q.best });
        hub.pulse = 1; if (q.best) hub.flash = 1;
        quotes.splice(i, 1);
      }
    }

    // arrival ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      if (!reduce) rp.r += dt * 95 * MOTION;
      rp.life -= dt * 1.7;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      const col = rp.best ? C.best : C.offer;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, 11 + rp.r, 0, 6.28);
      ctx.strokeStyle = "rgba(" + col + "," + (rp.life * 0.5).toFixed(3) + ")";
      ctx.lineWidth = rp.best ? 2.2 : 1.2; ctx.stroke();
    }

    // supplier nodes
    for (const s of suppliers) {
      if (!reduce) s.glow *= 0.963;
      if (s.glow > 0.02) glowDot(s.x, s.y, s.r + 8 * s.glow, C.offer, (s.glow * 0.16).toFixed(3), 0);
      glowDot(s.x, s.y, s.r + 4, C.node, (0.05 * s.depth).toFixed(3), 0); // soft halo
      if (s.glow > 0.02) glowDot(s.x, s.y, s.r, C.offer, 0.96, 10 * s.glow);
      else glowDot(s.x, s.y, s.r, C.node, (0.5 + s.depth * 0.2).toFixed(3), 0);
    }

    // hub (contractor / RFQ origin) — layered bloom
    if (!reduce) { hub.pulse *= 0.94; hub.flash *= 0.93; }
    const corePulse = 1 + Math.sin(now / 620) * 0.12 + hub.pulse * 0.5;
    const hb = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 46);
    const flashCol = hub.flash > 0.05 ? C.best : C.offer;
    hb.addColorStop(0, "rgba(" + flashCol + "," + (0.30 + hub.flash * 0.2).toFixed(3) + ")");
    hb.addColorStop(1, "rgba(" + flashCol + ",0)");
    ctx.fillStyle = hb; ctx.beginPath(); ctx.arc(hub.x, hub.y, 46, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(hub.x, hub.y, 10 * corePulse, 0, 6.28);
    ctx.strokeStyle = "rgba(" + C.offer + ",0.9)"; ctx.lineWidth = 2; ctx.stroke();
    glowDot(hub.x, hub.y, 4.6, "255,255,255", 0.96, 18);

    ctx.restore();

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.22, W / 2, H * 0.42, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(8,17,40,0)");
    vg.addColorStop(1, "rgba(8,17,40,0.5)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (reduce) return; // a single still frame
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  let visible = true, running = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    }).observe(canvas.parentElement);
  }

  window.addEventListener("resize", resize);
  canvas.parentElement.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
  });
  canvas.parentElement.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });
  resize();
  requestAnimationFrame(frame);
}

/* ============================================================
   Count-up
   ============================================================ */
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const dur = 1500, start = performance.now();
  const isAr = document.documentElement.dir === "rtl";
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    let val = Math.round(target * eased);
    el.textContent = val;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   Reveal + counters + staged demo rows
   ============================================================ */
function revealEl(el) {
  el.classList.add("show");
  el.querySelectorAll?.("[data-count]").forEach(c => {
    if (!c.dataset.done) { c.dataset.done = "1"; countUp(c); }
  });
  // Failsafe: guarantee the final visible state even if the CSS transition
  // doesn't tick (some embedded/preview renderers pause rAF-driven transitions).
  setTimeout(() => {
    if (getComputedStyle(el).opacity !== "1") {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
    }
  }, 760);
}

function initObservers() {
  // round-2 UX-134: a browser without IntersectionObserver shows everything, and a scroll listener backs it up
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { revealEl(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }) : { observe() {}, unobserve() {} };
  if (!("IntersectionObserver" in window)) document.querySelectorAll(".reveal").forEach(el => revealEl(el));
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  // Reveal anything already in the viewport right away (covers fold + IO quirks)
  const showInView = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    document.querySelectorAll(".reveal:not(.show)").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { revealEl(el); io.unobserve(el); }
    });
  };
  showInView();
  window.addEventListener("load", showInView);
  let scrollT = 0;
  window.addEventListener("scroll", () => { if (scrollT) return; scrollT = setTimeout(() => { scrollT = 0; showInView(); }, 120); }, { passive: true });
  // Failsafe: never leave content hidden
  setTimeout(() => document.querySelectorAll(".reveal:not(.show)").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 800)) revealEl(el);
  }), 800);

  // staged demo rows
  const demo = document.querySelector(".boq-demo");
  if (demo) {
    const rows = demo.querySelectorAll(".demo-row");
    const playRows = () => rows.forEach((r, i) => {
      r.style.animationDelay = (i * 0.18) + "s";
      r.classList.add("in");
      setTimeout(() => { if (getComputedStyle(r).opacity !== "1") { r.style.opacity = "1"; r.style.transform = "none"; } }, 700 + i * 180);
    });
    const dio = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { playRows(); dio.unobserve(demo); } });
    }, { threshold: 0.3 });
    dio.observe(demo);
    // also play if already in view on load
    const dr = demo.getBoundingClientRect();
    if (dr.top < (window.innerHeight || 800)) playRows();
  }
}

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  var saved = "ar"; try { saved = localStorage.getItem("taseerak_locale") || localStorage.getItem("taseerak_lang") || "ar"; } catch (e) {}
  setLang(saved);

  document.querySelectorAll(".lang button, .foot-bottom .langs button").forEach(b => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });

  // nav scroll
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // mobile menu
  const mt = document.querySelector(".menu-toggle");
  const setMenu = (open) => { nav.classList.toggle("mobile-open", open); mt?.setAttribute("aria-expanded", open ? "true" : "false"); };
  mt?.addEventListener("click", (e) => { e.stopPropagation(); setMenu(!nav.classList.contains("mobile-open")); });
  document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", (e) => { if (nav.classList.contains("mobile-open") && !nav.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("mobile-open")) { setMenu(false); mt?.focus(); } });

  initCanvas();
  initObservers();

  // Failsafe for keyframe-animated decorative rows (offers + demo rows)
  // in renderers that pause CSS animations.
  const unstick = (sel) => document.querySelectorAll(sel).forEach(el => {
    if (getComputedStyle(el).opacity !== "1") { el.style.opacity = "1"; el.style.transform = "none"; }
  });
  setTimeout(() => unstick(".offer"), 1100);
});
