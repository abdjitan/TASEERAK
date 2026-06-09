/* ============================================================
   تسعيرك — Taseerak Landing  ·  App logic
   i18n · animated background · interactions
   ============================================================ */

/* ---------- i18n dictionary ---------- */
const I18N = {
  ar: {
    dir: "rtl",
    nav_home: "الرئيسية", nav_how: "كيف يعمل", nav_sectors: "القطاعات", nav_boq: "ميزة BOQ", nav_why: "لماذا نحن",
    login: "تسجيل الدخول", register: "إنشاء حساب",
    hero_eyebrow: "منصة التسعير والتوريد للمقاولين",
    hero_h1a: "اطلب تسعيرة واحدة،", hero_h1b: "تنافس عليها", hero_h1c: "أفضل الموردين",
    hero_lead: "تسعيرك تربط المقاول بكل الموردين الموثوقين المختصين بطلبٍ واحد. أرسل طلب التسعير، استقبل العروض، قارن بالأسعار، واختر الأفضل — بدون عمولة على التسعير.",
    hero_cta1: "ابدأ الآن مجاناً", hero_cta2: "شاهد كيف يعمل",
    trust1: "موردون موثّقون", trust2: "تصنيف ذكي للطلبات", trust3: "ثلاث لغات: عربي · إنجليزي · أردو",
    lc_title: "حديد تسليح Ø16", lc_sub: "طلب تسعير · مدني", lc_live: "عروض مباشرة",
    lc_s1: "مصنع الراجحي للحديد", lc_m1: "مُصنّع · موثّق", 
    lc_s2: "شركة المعادن المتحدة", lc_m2: "موزّع تجاري",
    lc_s3: "مؤسسة البناء الحديثة", lc_m3: "مورّد محلي",
    lc_unit: "ر.س / طن", lc_saved: "توفير مقابل متوسط السوق:",
    chip1: "تطابق فوري", chip2: "أمر شراء جاهز",
    trustbar_lbl: "يخدم كل القطاعات:",
    how_eyebrow: "ثلاث خطوات بسيطة", how_h: "كيف تعمل تسعيرك؟", how_p: "من الطلب إلى أمر الشراء، كل شيء في مكان واحد ومنظّم.",
    step1_t: "أرسل طلب تسعير", step1_p: "اختر المادة أو ارفع جدول كميات كامل، حدّد الكمية والمواصفة والموقع.",
    step2_t: "يتنافس الموردون", step2_p: "يصل طلبك تلقائياً لكل مورد مختص بقطاعك وتصنيفك، فيقدّمون عروضهم.",
    step3_t: "قارن واختر", step3_p: "العروض مرتّبة حسب السعر مع متوسط السوق — تشوف الأوفر بلمحة.",
    step4_t: "أمر شراء", step4_p: "بمجرّد قبول العرض يصدر أمر شراء جاهز للطباعة تلقائياً.",
    sectors_eyebrow: "أربعة قطاعات", sectors_h: "كل مواد مشروعك في مكان واحد", sectors_p: "نوجّه كل طلب للموردين المختصين فيه بالضبط.",
    sec_civil: "مدني", sec_civil_p: "حديد، أسمنت، خرسانة، بلوك، تصريف.",
    sec_arch: "معماري", sec_arch_p: "بلاط، دهانات، أبواب، جبس، أسقف، زجاج.",
    sec_elec: "كهرباء", sec_elec_p: "كابلات، لوحات، إنارة LED، محوّلات.",
    sec_mech: "ميكانيك", sec_mech_p: "مواسير، مضخّات، محابس، تكييف، رشّاشات.",
    boq_eyebrow: "الميزة الأقوى", boq_h: "ارفع جدول الكميات… ونحن نوزّعه على الموردين",
    boq_p: "لا داعي لكتابة كل بند يدوياً. ارفع ملف الـ BOQ بصيغة Excel، ويقوم النظام باستخراج كل مادة تلقائياً وتوجيهها للمورد المختص بقطاعها.",
    boq_l1: "استخراج تلقائي لكل بنود الجدول", boq_l2: "كشف القطاع لكل مادة بذكاء", boq_l3: "كل بند يصبح طلب تسعير مستقل", boq_l4: "أفضل ٣ عروض لكل مادة مع الإجمالي",
    demo_file: "جدول-الكميات.xlsx", demo_extract: "استخراج تلقائي + توجيه",
    demo_m1: "حديد تسليح Ø16", demo_m2: "بلاط بورسلان 60×60", demo_m3: "كابل XLPE 4×16", demo_m4: "مواسير PPR 1\"",
    demo_q1: "٤٢ طن", demo_q2: "٨٥٠ م²", demo_q3: "٣٢٠ م", demo_q4: "١٨٠ م",
    demo_foot_l: "إجمالي البنود المستخرجة", demo_foot_r: "٤ مواد · ٤ قطاعات",
    stats_eyebrow: "بُنيت للمقاولين", stats_h: "منصة واحدة، كل ما تحتاجه", stats_p: "",
    stat1_l: "قطاعات متخصّصة", stat2_l: "لغات بالكامل", stat3_l: "تصنيفات للمقاولين", stat4_l: "عمولة على التسعير",
    why_eyebrow: "لماذا تسعيرك", why_h: "ليست متجراً… بل سوق تسعير حقيقي", why_p: "كل ما يميّزنا مبني لخدمة سوق المقاولات السعودي.",
    f1_t: "تسعير خالص", f1_p: "لا نبيع المواد — نربطك بالموردين ليتنافسوا على سعرك أنت.",
    f2_t: "تصنيف ذكي", f2_p: "المقاول الكبير لا يُطابَق مع محل صغير. كل طلب يصل لمن يناسبه.",
    f3_t: "ثلاث لغات", f3_p: "عربي وإنجليزي وأردو — لأن سوق العمالة جزء أساسي من المعادلة.",
    f4_t: "رفع BOQ", f4_p: "جدول كميات كامل يتحوّل لطلبات تسعير منظّمة في ثوانٍ.",
    f5_t: "موردون موثّقون", f5_p: "كل مورد يُوثَّق عبر فحص الرخصة قبل اعتماده على المنصة.",
    f6_t: "مقاولون من الباطن", f6_p: "نظام يربط المقاول بمقاولين من الباطن لتنفيذ أجزاء المشروع.",
    cta_h: "جاهز تسعّر مشروعك القادم؟", cta_p: "انضم لتسعيرك اليوم وخلّي الموردين يتنافسون على طلبك.",
    cta_b1: "أنشئ حسابك مجاناً", cta_b2: "تواصل مع المبيعات",
    foot_tag: "منصة التسعير والتوريد للمقاولين في السعودية. اطلب، قارن، واختر بثقة.",
    foot_c1: "المنتج", foot_c1_1: "كيف يعمل", foot_c1_2: "القطاعات", foot_c1_3: "ميزة BOQ", foot_c1_4: "مؤشر الأسعار",
    foot_c2: "للموردين", foot_c2_1: "انضم كمورد", foot_c2_2: "التوثيق", foot_c2_3: "التصنيفات", foot_c2_4: "الأسئلة الشائعة",
    foot_c3: "الشركة", foot_c3_1: "من نحن", foot_c3_2: "تواصل معنا", foot_c3_3: "الخصوصية", foot_c3_4: "الشروط",
    foot_copy: "© ٢٠٢٦ تسعيرك. جميع الحقوق محفوظة.",
  },
  en: {
    dir: "ltr",
    nav_home: "Home", nav_how: "How it works", nav_sectors: "Sectors", nav_boq: "BOQ Feature", nav_why: "Why us",
    login: "Log in", register: "Sign up",
    hero_eyebrow: "Procurement platform for contractors",
    hero_h1a: "One request,", hero_h1b: "competed for by", hero_h1c: "the best suppliers",
    hero_lead: "Taseerak connects contractors with every verified, specialized supplier in a single request. Send your RFQ, receive offers, compare prices, and pick the best — with zero commission on quotes.",
    hero_cta1: "Start free", hero_cta2: "See how it works",
    trust1: "Verified suppliers", trust2: "Smart request routing", trust3: "Three languages: AR · EN · UR",
    lc_title: "Rebar Ø16", lc_sub: "RFQ · Civil", lc_live: "Live offers",
    lc_s1: "Al-Rajhi Steel Mill", lc_m1: "Manufacturer · Verified",
    lc_s2: "United Metals Co.", lc_m2: "Commercial distributor",
    lc_s3: "Modern Build Est.", lc_m3: "Local supplier",
    lc_unit: "SAR / ton", lc_saved: "Saved vs. market average:",
    chip1: "Instant match", chip2: "PO ready",
    trustbar_lbl: "Serving every sector:",
    how_eyebrow: "Three simple steps", how_h: "How Taseerak works", how_p: "From request to purchase order, everything in one organized place.",
    step1_t: "Send an RFQ", step1_p: "Pick a material or upload a full BOQ; set quantity, spec and location.",
    step2_t: "Suppliers compete", step2_p: "Your request auto-reaches every supplier matched to your sector and grade.",
    step3_t: "Compare & pick", step3_p: "Offers sorted by price against the market average — spot the best at a glance.",
    step4_t: "Purchase order", step4_p: "Accept an offer and a print-ready purchase order is generated instantly.",
    sectors_eyebrow: "Four sectors", sectors_h: "Every material, one place", sectors_p: "We route each request to exactly the right specialists.",
    sec_civil: "Civil", sec_civil_p: "Rebar, cement, concrete, blocks, drainage.",
    sec_arch: "Architectural", sec_arch_p: "Tiles, paint, doors, gypsum, ceilings, glass.",
    sec_elec: "Electrical", sec_elec_p: "Cables, panels, LED lighting, transformers.",
    sec_mech: "Mechanical", sec_mech_p: "Pipes, pumps, valves, HVAC, sprinklers.",
    boq_eyebrow: "The killer feature", boq_h: "Upload your BOQ… we route it to suppliers",
    boq_p: "No need to type every line. Upload your BOQ as Excel and the system auto-extracts every material and routes it to the supplier specialized in its sector.",
    boq_l1: "Auto-extract every line item", boq_l2: "Smart sector detection per material", boq_l3: "Each item becomes its own RFQ", boq_l4: "Top 3 offers per material with totals",
    demo_file: "bill-of-quantities.xlsx", demo_extract: "Auto-extract + route",
    demo_m1: "Rebar Ø16", demo_m2: "Porcelain tile 60×60", demo_m3: "XLPE cable 4×16", demo_m4: "PPR pipe 1\"",
    demo_q1: "42 ton", demo_q2: "850 m²", demo_q3: "320 m", demo_q4: "180 m",
    demo_foot_l: "Total items extracted", demo_foot_r: "4 materials · 4 sectors",
    stats_eyebrow: "Built for contractors", stats_h: "One platform, everything you need", stats_p: "",
    stat1_l: "Specialized sectors", stat2_l: "Full languages", stat3_l: "Contractor grades", stat4_l: "Commission on quotes",
    why_eyebrow: "Why Taseerak", why_h: "Not a store… a real quoting marketplace", why_p: "Everything that sets us apart is built for the Saudi construction market.",
    f1_t: "Pure quoting", f1_p: "We don't sell materials — we connect you with suppliers who compete on your price.",
    f2_t: "Smart routing", f2_p: "Big contractors aren't matched with tiny shops. Each request reaches the right tier.",
    f3_t: "Three languages", f3_p: "Arabic, English and Urdu — because the labor market is part of the equation.",
    f4_t: "BOQ upload", f4_p: "A full bill of quantities becomes organized RFQs in seconds.",
    f5_t: "Verified suppliers", f5_p: "Every supplier is verified through a license check before going live.",
    f6_t: "Subcontractors", f6_p: "A system linking contractors with subcontractors to deliver project parts.",
    cta_h: "Ready to quote your next project?", cta_p: "Join Taseerak today and let suppliers compete for your request.",
    cta_b1: "Create your free account", cta_b2: "Talk to sales",
    foot_tag: "The procurement & quoting platform for contractors in Saudi Arabia. Request, compare, choose with confidence.",
    foot_c1: "Product", foot_c1_1: "How it works", foot_c1_2: "Sectors", foot_c1_3: "BOQ feature", foot_c1_4: "Price index",
    foot_c2: "For suppliers", foot_c2_1: "Join as supplier", foot_c2_2: "Verification", foot_c2_3: "Tiers", foot_c2_4: "FAQ",
    foot_c3: "Company", foot_c3_1: "About", foot_c3_2: "Contact", foot_c3_3: "Privacy", foot_c3_4: "Terms",
    foot_copy: "© 2026 Taseerak. All rights reserved.",
  },
  ur: {
    dir: "rtl",
    nav_home: "ہوم", nav_how: "کیسے کام کرتا ہے", nav_sectors: "شعبے", nav_boq: "BOQ سہولت", nav_why: "ہمیں کیوں",
    login: "لاگ اِن", register: "اکاؤنٹ بنائیں",
    hero_eyebrow: "ٹھیکیداروں کے لیے قیمت اور سپلائی پلیٹ فارم",
    hero_h1a: "ایک درخواست،", hero_h1b: "مقابلہ کریں", hero_h1c: "بہترین سپلائرز",
    hero_lead: "تسعیرک ایک ہی درخواست میں ٹھیکیدار کو تمام تصدیق شدہ ماہر سپلائرز سے جوڑتا ہے۔ اپنی درخواست بھیجیں، پیشکشیں وصول کریں، قیمتوں کا موازنہ کریں اور بہترین کا انتخاب کریں۔",
    hero_cta1: "مفت شروع کریں", hero_cta2: "دیکھیں کیسے کام کرتا ہے",
    trust1: "تصدیق شدہ سپلائرز", trust2: "ذہین درخواست رہنمائی", trust3: "تین زبانیں: عربی · انگریزی · اردو",
    lc_title: "سریا Ø16", lc_sub: "درخواست · سول", lc_live: "براہ راست پیشکشیں",
    lc_s1: "الراجحی اسٹیل مل", lc_m1: "مینوفیکچرر · تصدیق شدہ",
    lc_s2: "یونائیٹڈ میٹلز", lc_m2: "تجارتی تقسیم کار",
    lc_s3: "ماڈرن بلڈ", lc_m3: "مقامی سپلائر",
    lc_unit: "ریال / ٹن", lc_saved: "مارکیٹ اوسط کے مقابلے بچت:",
    chip1: "فوری میچ", chip2: "پی او تیار",
    trustbar_lbl: "ہر شعبے کی خدمت:",
    how_eyebrow: "تین آسان مراحل", how_h: "تسعیرک کیسے کام کرتا ہے", how_p: "درخواست سے خریداری آرڈر تک، سب کچھ ایک منظم جگہ پر۔",
    step1_t: "درخواست بھیجیں", step1_p: "مواد منتخب کریں یا مکمل BOQ اپ لوڈ کریں؛ مقدار، تفصیل اور مقام طے کریں۔",
    step2_t: "سپلائرز مقابلہ کرتے ہیں", step2_p: "آپ کی درخواست خود بخود ہر متعلقہ سپلائر تک پہنچتی ہے۔",
    step3_t: "موازنہ اور انتخاب", step3_p: "پیشکشیں قیمت کے لحاظ سے ترتیب — بہترین ایک نظر میں۔",
    step4_t: "خریداری آرڈر", step4_p: "پیشکش قبول کرتے ہی پرنٹ کے لیے تیار آرڈر بن جاتا ہے۔",
    sectors_eyebrow: "چار شعبے", sectors_h: "ہر مواد، ایک جگہ", sectors_p: "ہم ہر درخواست کو درست ماہرین تک پہنچاتے ہیں۔",
    sec_civil: "سول", sec_civil_p: "سریا، سیمنٹ، کنکریٹ، بلاک، نکاسی۔",
    sec_arch: "تعمیراتی", sec_arch_p: "ٹائلیں، پینٹ، دروازے، جپسم، چھتیں، شیشہ۔",
    sec_elec: "بجلی", sec_elec_p: "کیبلز، پینلز، LED روشنی، ٹرانسفارمر۔",
    sec_mech: "مکینیکل", sec_mech_p: "پائپ، پمپ، والو، ایئر کنڈیشننگ۔",
    boq_eyebrow: "سب سے طاقتور سہولت", boq_h: "اپنا BOQ اپ لوڈ کریں… ہم اسے سپلائرز تک پہنچاتے ہیں",
    boq_p: "ہر آئٹم لکھنے کی ضرورت نہیں۔ Excel میں BOQ اپ لوڈ کریں اور نظام ہر مواد خود نکال کر متعلقہ سپلائر تک پہنچاتا ہے۔",
    boq_l1: "ہر آئٹم خودکار اخراج", boq_l2: "ہر مواد کے لیے ذہین شعبہ شناخت", boq_l3: "ہر آئٹم الگ درخواست بنتا ہے", boq_l4: "ہر مواد کی بہترین ۳ پیشکشیں",
    demo_file: "bill-of-quantities.xlsx", demo_extract: "خودکار اخراج + رہنمائی",
    demo_m1: "سریا Ø16", demo_m2: "پورسلین ٹائل 60×60", demo_m3: "XLPE کیبل 4×16", demo_m4: "PPR پائپ 1\"",
    demo_q1: "۴۲ ٹن", demo_q2: "۸۵۰ م²", demo_q3: "۳۲۰ م", demo_q4: "۱۸۰ م",
    demo_foot_l: "کل نکالے گئے آئٹم", demo_foot_r: "۴ مواد · ۴ شعبے",
    stats_eyebrow: "ٹھیکیداروں کے لیے", stats_h: "ایک پلیٹ فارم، سب کچھ", stats_p: "",
    stat1_l: "خصوصی شعبے", stat2_l: "مکمل زبانیں", stat3_l: "ٹھیکیدار درجے", stat4_l: "قیمت پر کمیشن",
    why_eyebrow: "تسعیرک کیوں", why_h: "اسٹور نہیں… ایک حقیقی قیمت مارکیٹ", why_p: "ہماری ہر خصوصیت سعودی تعمیراتی مارکیٹ کے لیے بنی ہے۔",
    f1_t: "خالص قیمت کاری", f1_p: "ہم مواد نہیں بیچتے — سپلائرز کو آپ کی قیمت پر مقابلے کے لیے جوڑتے ہیں۔",
    f2_t: "ذہین رہنمائی", f2_p: "بڑے ٹھیکیدار چھوٹی دکانوں سے نہیں ملتے۔ ہر درخواست درست سطح تک۔",
    f3_t: "تین زبانیں", f3_p: "عربی، انگریزی اور اردو — کیونکہ لیبر مارکیٹ بھی اہم ہے۔",
    f4_t: "BOQ اپ لوڈ", f4_p: "مکمل BOQ سیکنڈوں میں منظم درخواستوں میں بدل جاتا ہے۔",
    f5_t: "تصدیق شدہ سپلائرز", f5_p: "ہر سپلائر لائسنس چیک کے ذریعے تصدیق ہوتا ہے۔",
    f6_t: "ذیلی ٹھیکیدار", f6_p: "ٹھیکیدار کو ذیلی ٹھیکیداروں سے جوڑنے کا نظام۔",
    cta_h: "اپنے اگلے منصوبے کی قیمت لگانے کے لیے تیار؟", cta_p: "آج تسعیرک میں شامل ہوں اور سپلائرز کو مقابلہ کرنے دیں۔",
    cta_b1: "مفت اکاؤنٹ بنائیں", cta_b2: "سیلز سے رابطہ",
    foot_tag: "سعودی عرب میں ٹھیکیداروں کے لیے قیمت اور سپلائی پلیٹ فارم۔ درخواست، موازنہ، اعتماد سے انتخاب۔",
    foot_c1: "پروڈکٹ", foot_c1_1: "کیسے کام کرتا ہے", foot_c1_2: "شعبے", foot_c1_3: "BOQ سہولت", foot_c1_4: "قیمت انڈیکس",
    foot_c2: "سپلائرز کے لیے", foot_c2_1: "بطور سپلائر شامل ہوں", foot_c2_2: "تصدیق", foot_c2_3: "درجے", foot_c2_4: "عام سوالات",
    foot_c3: "کمپنی", foot_c3_1: "ہمارے بارے میں", foot_c3_2: "رابطہ", foot_c3_3: "رازداری", foot_c3_4: "شرائط",
    foot_copy: "© ۲۰۲۶ تسعیرک۔ جملہ حقوق محفوظ ہیں۔",
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
  document.querySelectorAll(".lang button, .foot-bottom .langs span").forEach(b => {
    b.classList.toggle("on", b.dataset.lang === lang);
  });
  localStorage.setItem("taseerak_lang", lang);
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

  let ACCENT = window.__bgAccent || "245,131,31";
  let MOTION = window.__bgMotion != null ? window.__bgMotion : 1;
  window.setBgAccent = (rgb) => { ACCENT = rgb; window.__bgAccent = rgb; };
  window.setBgMotion = (m) => { MOTION = m; window.__bgMotion = m; };

  const C = {
    line:  "120,160,235",
    node:  "170,198,250",
    req:   "180,205,255",
    get offer() { return ACCENT; },
    best:  "46,204,134"
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
    dw.addColorStop(0, "rgba(54,104,205,0.20)");
    dw.addColorStop(0.55, "rgba(40,80,170,0.06)");
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

    requestAnimationFrame(frame);
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
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { revealEl(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
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
  setLang(localStorage.getItem("taseerak_lang") || "ar");

  document.querySelectorAll(".lang button, .foot-bottom .langs span").forEach(b => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });

  // nav scroll
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // mobile menu
  const mt = document.querySelector(".menu-toggle");
  mt?.addEventListener("click", () => nav.classList.toggle("mobile-open"));
  document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => nav.classList.remove("mobile-open")));

  initCanvas();
  initObservers();

  // Failsafe for keyframe-animated decorative rows (offers + demo rows)
  // in renderers that pause CSS animations.
  const unstick = (sel) => document.querySelectorAll(sel).forEach(el => {
    if (getComputedStyle(el).opacity !== "1") { el.style.opacity = "1"; el.style.transform = "none"; }
  });
  setTimeout(() => unstick(".offer"), 1100);
});
