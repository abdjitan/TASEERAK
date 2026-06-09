/* ============================================================
   تسعيرك — Auto i18n (AR ⇄ EN ⇄ UR) by text-content matching.
   Translates app + admin chrome without per-element data-i18n.
   Captures Arabic originals from the static HTML, then swaps.
   Skips elements that already use [data-i18n]/[data-i18n-ph]
   (those are handled by shell.js + APP_I18N).
   ============================================================ */
(function () {
  const LS = "taseerak_applang";

  // ---- Dictionary: Arabic → { en, ur } ----
  const D = {
    // sections / nav
    "القائمة": { en: "Menu", ur: "مینیو" },
    "الحساب": { en: "Account", ur: "اکاؤنٹ" },
    "المورّد": { en: "Supplier", ur: "سپلائر" },
    "الإدارة": { en: "Admin", ur: "انتظامیہ" },
    "الرئيسية": { en: "Home", ur: "ہوم" },
    "مشروع BOQ جديد": { en: "New BOQ Project", ur: "نیا BOQ پراجیکٹ" },
    "طلب تسعير جديد": { en: "New RFQ", ur: "نئی درخواست" },
    "طلباتي": { en: "My Requests", ur: "میری درخواستیں" },
    "مؤشر الأسعار": { en: "Price Index", ur: "قیمت انڈیکس" },
    "الإعدادات": { en: "Settings", ur: "ترتیبات" },
    "طلبات واردة": { en: "Incoming Requests", ur: "موصولہ درخواستیں" },
    "الطلبات الواردة": { en: "Incoming Requests", ur: "موصولہ درخواستیں" },
    "عروضي المرسلة": { en: "My Offers", ur: "میری پیشکشیں" },
    "عروضي": { en: "My Offers", ur: "میری پیشکشیں" },
    "أسعاري": { en: "My Prices", ur: "میری قیمتیں" },
    "تخصصاتي": { en: "My Specialties", ur: "میری مہارتیں" },
    "أوامر الشراء": { en: "Purchase Orders", ur: "خریداری آرڈرز" },
    "نظرة عامة": { en: "Overview", ur: "مجموعی جائزہ" },
    "المستخدمون": { en: "Users", ur: "صارفین" },
    "طلبات التوثيق": { en: "Verifications", ur: "تصدیقات" },
    "طلبات التسعير والعروض": { en: "RFQs & Offers", ur: "درخواستیں اور پیشکشیں" },
    "أوامر الشراء والمعاملات": { en: "Orders & Transactions", ur: "آرڈرز اور لین دین" },
    "المواد والقطاعات": { en: "Materials & Sectors", ur: "مواد اور شعبے" },
    "البلاغات والنزاعات": { en: "Reports & Disputes", ur: "رپورٹس اور تنازعات" },
    "سجل التدقيق": { en: "Audit Log", ur: "آڈٹ لاگ" },
    "إدارة المنصة": { en: "Platform Admin", ur: "پلیٹ فارم ایڈمن" },
    "مشرف عام": { en: "Super Admin", ur: "سپر ایڈمن" },

    // topbar titles / subs
    "لوحة التحكم": { en: "Dashboard", ur: "ڈیش بورڈ" },
    "لوحة المورّد": { en: "Supplier Dashboard", ur: "سپلائر ڈیش بورڈ" },
    "نظرة عامة على طلباتك ومشاريعك": { en: "Overview of your requests and projects", ur: "آپ کی درخواستوں اور منصوبوں کا جائزہ" },
    "الطلبات المتاحة لك وعروضك": { en: "Requests available to you and your offers", ur: "آپ کے لیے دستیاب درخواستیں اور پیشکشیں" },
    "اطلب سعر مادة واحدة بسرعة": { en: "Quickly request a price for one material", ur: "ایک مواد کی قیمت تیزی سے طلب کریں" },
    "قارن العروض الواردة واقبل الأفضل": { en: "Compare incoming offers and accept the best", ur: "موصولہ پیشکشوں کا موازنہ کریں اور بہترین قبول کریں" },
    "قدّم عرضك وتنافس على الطلب": { en: "Submit your offer and compete", ur: "اپنی پیشکش جمع کریں اور مقابلہ کریں" },
    "إدارة حسابك ومنشأتك والتوثيق": { en: "Manage your account, company and verification", ur: "اپنا اکاؤنٹ، کمپنی اور تصدیق سنبھالیں" },
    "إدارة حساب منشأتك ومستنداتك": { en: "Manage your company account and documents", ur: "اپنی کمپنی اکاؤنٹ اور دستاویزات سنبھالیں" },
    "لوحة مؤشرات المنصة الحيّة": { en: "Live platform metrics", ur: "پلیٹ فارم کے زندہ اعداد و شمار" },
    "كل المقاولين والموردين على المنصة": { en: "All contractors and suppliers", ur: "تمام ٹھیکیدار اور سپلائرز" },
    "التفاصيل الكاملة والنشاط": { en: "Full details and activity", ur: "مکمل تفصیلات اور سرگرمی" },
    "مراقبة كل الطلبات والعروض على المنصة": { en: "Monitor all requests and offers", ur: "تمام درخواستوں اور پیشکشوں کی نگرانی" },
    "سجل العمليات بين المقاولين والموردين": { en: "Transactions between contractors and suppliers", ur: "ٹھیکیداروں اور سپلائرز کے درمیان لین دین" },
    "إدارة كتالوج المواد والموافقة على المقترحات": { en: "Manage material catalog and approve suggestions", ur: "مواد کیٹلاگ اور تجاویز کی منظوری" },
    "مراجعة الشكاوى بين المستخدمين": { en: "Review complaints between users", ur: "صارفین کے درمیان شکایات کا جائزہ" },
    "كل الأحداث والإجراءات على المنصة": { en: "All platform events and actions", ur: "پلیٹ فارم کے تمام واقعات" },
    "مراجعة وتوثيق المستخدمين والمواد": { en: "Review and verify users and materials", ur: "صارفین اور مواد کی تصدیق" },
    "ارفع جدول الكميات ووزّعه على الموردين": { en: "Upload your BOQ and route it to suppliers", ur: "اپنا BOQ اپ لوڈ کریں" },
    "للمطابقة حسب القرب وحساب الشحن": { en: "For proximity matching and shipping", ur: "قربت اور شپنگ کے لیے" },
    "أسعار استرشادية تظهر في مؤشر السوق": { en: "Indicative prices shown in the market index", ur: "مارکیٹ انڈیکس میں ظاہر ہونے والی قیمتیں" },
    "اختر ما تورّده لتصلك الطلبات المطابقة فقط": { en: "Pick what you supply to get matching requests only", ur: "صرف متعلقہ درخواستیں حاصل کریں" },

    // common buttons / actions
    "إرسال الطلب": { en: "Send Request", ur: "درخواست بھیجیں" },
    "إرسال العرض": { en: "Send Offer", ur: "پیشکش بھیجیں" },
    "قدّم عرض": { en: "Submit Offer", ur: "پیشکش دیں" },
    "قبول العرض": { en: "Accept Offer", ur: "پیشکش قبول کریں" },
    "اختر": { en: "Choose", ur: "منتخب کریں" },
    "رفض": { en: "Reject", ur: "مسترد کریں" },
    "اعتماد": { en: "Approve", ur: "منظور کریں" },
    "حفظ التغييرات": { en: "Save Changes", ur: "تبدیلیاں محفوظ کریں" },
    "حفظ": { en: "Save", ur: "محفوظ کریں" },
    "رجوع": { en: "Back", ur: "واپس" },
    "عرض": { en: "View", ur: "دیکھیں" },
    "عرض الملف": { en: "View Profile", ur: "پروفائل دیکھیں" },
    "عرض العروض": { en: "View Offers", ur: "پیشکشیں دیکھیں" },
    "تعديل": { en: "Edit", ur: "ترمیم" },
    "تحقّق": { en: "Verify", ur: "تصدیق" },
    "توثيق": { en: "Verify", ur: "تصدیق کریں" },
    "مراسلة": { en: "Message", ur: "پیغام" },
    "إغلاق النزاع": { en: "Close Dispute", ur: "تنازع بند کریں" },
    "مراسلة الطرفين": { en: "Message Both Parties", ur: "دونوں فریقوں کو پیغام" },
    "عرض أمر الشراء": { en: "View Purchase Order", ur: "خریداری آرڈر دیکھیں" },
    "تحديث كلمة المرور": { en: "Update Password", ur: "پاس ورڈ اپ ڈیٹ کریں" },
    "تغيير كلمة المرور": { en: "Change Password", ur: "پاس ورڈ تبدیل کریں" },
    "تسجيل الخروج": { en: "Log out", ur: "لاگ آؤٹ" },
    "حفظ التخصصات": { en: "Save Specialties", ur: "مہارتیں محفوظ کریں" },
    "حفظ القطاعات": { en: "Save Sectors", ur: "شعبے محفوظ کریں" },
    "حفظ التصنيف": { en: "Save Classification", ur: "درجہ بندی محفوظ کریں" },
    "حفظ الموقع": { en: "Save Location", ur: "مقام محفوظ کریں" },
    "حفظ الأسعار": { en: "Save Prices", ur: "قیمتیں محفوظ کریں" },
    "إضافة سعر": { en: "Add Price", ur: "قیمت شامل کریں" },
    "إضافة بند": { en: "Add Item", ur: "آئٹم شامل کریں" },
    "مادة جديدة": { en: "New Material", ur: "نیا مواد" },
    "إضافة": { en: "Add", ur: "شامل کریں" },
    "إرسال للموردين": { en: "Send to Suppliers", ur: "سپلائرز کو بھیجیں" },
    "إصدار أمر الشراء": { en: "Issue Purchase Order", ur: "خریداری آرڈر جاری کریں" },
    "تواصل مع المبيعات": { en: "Contact Sales", ur: "سیلز سے رابطہ" },

    // statuses / pills
    "مفتوح": { en: "Open", ur: "کھلا" },
    "جديد": { en: "New", ur: "نیا" },
    "مكتمل": { en: "Completed", ur: "مکمل" },
    "مقبول": { en: "Accepted", ur: "قبول شدہ" },
    "غير مقبول": { en: "Not Accepted", ur: "نامنظور" },
    "قيد المراجعة": { en: "Under Review", ur: "زیر جائزہ" },
    "قيد التنفيذ": { en: "In Progress", ur: "جاری" },
    "معلّق": { en: "Pending", ur: "زیر التواء" },
    "معتمد": { en: "Approved", ur: "منظور شدہ" },
    "مرفوض": { en: "Rejected", ur: "مسترد" },
    "نزاع": { en: "Dispute", ur: "تنازع" },
    "موثّق": { en: "Verified", ur: "تصدیق شدہ" },
    "موثّق عبر واثق": { en: "Verified via Wathq", ur: "واثق سے تصدیق شدہ" },
    "قيد المراجعة": { en: "Under Review", ur: "زیر جائزہ" },
    "الأوفر": { en: "Cheapest", ur: "سب سے سستا" },
    "أولوية عالية": { en: "High Priority", ur: "اعلیٰ ترجیح" },
    "متوسطة": { en: "Medium", ur: "درمیانی" },

    // table headers / common labels
    "المنشأة": { en: "Company", ur: "کمپنی" },
    "الدور": { en: "Role", ur: "کردار" },
    "التصنيف": { en: "Classification", ur: "درجہ بندی" },
    "التوثيق": { en: "Verification", ur: "تصدیق" },
    "المنطقة": { en: "Region", ur: "علاقہ" },
    "التسجيل": { en: "Registered", ur: "رجسٹرڈ" },
    "المادة": { en: "Material", ur: "مواد" },
    "المقاول": { en: "Contractor", ur: "ٹھیکیدار" },
    "القطاع": { en: "Sector", ur: "شعبہ" },
    "الكمية": { en: "Quantity", ur: "مقدار" },
    "الوحدة": { en: "Unit", ur: "یونٹ" },
    "العروض": { en: "Offers", ur: "پیشکشیں" },
    "الحالة": { en: "Status", ur: "حالت" },
    "التاريخ": { en: "Date", ur: "تاریخ" },
    "المورّد": { en: "Supplier", ur: "سپلائر" },
    "رقم الأمر": { en: "Order No.", ur: "آرڈر نمبر" },
    "القيمة": { en: "Value", ur: "قیمت" },
    "السعر": { en: "Price", ur: "قیمت" },
    "المجموعة": { en: "Group", ur: "گروپ" },
    "الوحدة الافتراضية": { en: "Default Unit", ur: "ڈیفالٹ یونٹ" },
    "طلبات": { en: "Requests", ur: "درخواستیں" },
    "المادة المقترحة": { en: "Suggested Material", ur: "تجویز کردہ مواد" },
    "القطاع المقترح": { en: "Suggested Sector", ur: "تجویز کردہ شعبہ" },

    // sectors
    "مدني": { en: "Civil", ur: "سول" },
    "معماري": { en: "Architectural", ur: "تعمیراتی" },
    "كهرباء": { en: "Electrical", ur: "بجلی" },
    "ميكانيك": { en: "Mechanical", ur: "مکینیکل" },

    // misc common
    "الكل": { en: "All", ur: "تمام" },
    "مقاولون": { en: "Contractors", ur: "ٹھیکیدار" },
    "موردون": { en: "Suppliers", ur: "سپلائرز" },
    "موثّق فقط": { en: "Verified only", ur: "صرف تصدیق شدہ" },
    "مفتوحة": { en: "Open", ur: "کھلی" },
    "مكتملة": { en: "Completed", ur: "مکمل" },
    "كتالوج المواد": { en: "Material Catalog", ur: "مواد کیٹلاگ" },
    "مقترحات بانتظار الموافقة": { en: "Pending Suggestions", ur: "زیر التواء تجاویز" },
    "قيد المراجعة": { en: "Under Review", ur: "زیر جائزہ" },
    "كل المستخدمين": { en: "All Users", ur: "تمام صارفین" },
    "طلبات المواد": { en: "Material Requests", ur: "مواد کی درخواستیں" },
    "المواد المعتمدة": { en: "Approved Materials", ur: "منظور شدہ مواد" },
    "قائمة المستخدمين": { en: "Users List", ur: "صارفین کی فہرست" },
    "الطلبات": { en: "Requests", ur: "درخواستیں" },
    "النشاط الأخير": { en: "Recent Activity", ur: "حالیہ سرگرمی" },
    "مهام بانتظارك": { en: "Tasks awaiting you", ur: "آپ کے منتظر کام" },
    "الأكثر نشاطاً": { en: "Most Active", ur: "سب سے زیادہ فعال" },
    "التوزيع حسب القطاع": { en: "Distribution by Sector", ur: "شعبے کے لحاظ سے تقسیم" },
    "ملخص الطلب": { en: "Request Summary", ur: "درخواست کا خلاصہ" },
    "موقعك التنافسي": { en: "Your Competitive Position", ur: "آپ کی مسابقتی پوزیشن" },
    "بدون عمولة على التسعير": { en: "No commission on quotes", ur: "قیمت پر کوئی کمیشن نہیں" },
    "ابحث في الطلبات…": { en: "Search requests…", ur: "درخواستیں تلاش کریں…" },
    "ابحث عن طلب أو مشروع…": { en: "Search request or project…", ur: "درخواست یا منصوبہ تلاش کریں…" },
    "ابحث بالاسم أو السجل…": { en: "Search by name or CR…", ur: "نام یا CR سے تلاش کریں…" },
    "ابحث في المنصة…": { en: "Search the platform…", ur: "پلیٹ فارم تلاش کریں…" },
    "ابحث في السجل…": { en: "Search log…", ur: "لاگ تلاش کریں…" },
    "ابحث برقم الأمر…": { en: "Search by order no…", ur: "آرڈر نمبر سے تلاش…" },
    "ابحث عن مستخدم…": { en: "Search for a user…", ur: "صارف تلاش کریں…" },
  };

  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, svg: 1, SVG: 1 };
  let store = []; // {node, ar}
  let phStore = []; // {el, ar}
  let captured = false;

  function inSvg(node) { let p = node.parentNode; while (p) { if (p.nodeName === "svg" || p.nodeName === "SVG") return true; p = p.parentNode; } return false; }
  function hasI18n(node) { let p = node.parentElement; while (p) { if (p.hasAttribute && (p.hasAttribute("data-i18n") || p.hasAttribute("data-no-translate"))) return true; p = p.parentElement; } return false; }

  function capture() {
    if (captured) return; captured = true;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const t = n.nodeValue.trim();
        if (!t) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS[n.parentNode && n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        if (inSvg(n) || hasI18n(n)) return NodeFilter.FILTER_REJECT;
        return D[t] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n; while ((n = walker.nextNode())) store.push({ node: n, ar: n.nodeValue.trim(), pre: n.nodeValue.match(/^\s*/)[0], post: n.nodeValue.match(/\s*$/)[0] });
    document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(el => {
      if (el.hasAttribute("data-i18n-ph")) return;
      const t = el.getAttribute("placeholder").trim();
      if (D[t]) phStore.push({ el, ar: t });
    });
  }

  function apply(lang) {
    capture();
    store.forEach(s => {
      const tr = lang === "ar" ? s.ar : (D[s.ar] && D[s.ar][lang]) || s.ar;
      s.node.nodeValue = s.pre + tr + s.post;
    });
    phStore.forEach(s => {
      const tr = lang === "ar" ? s.ar : (D[s.ar] && D[s.ar][lang]) || s.ar;
      s.el.setAttribute("placeholder", tr);
    });
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.documentElement.lang = lang;
    document.querySelectorAll(".mini-lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    localStorage.setItem(LS, lang);
  }

  function init() {
    document.querySelectorAll(".mini-lang button").forEach(b =>
      b.addEventListener("click", () => apply(b.dataset.lang)));
    apply(localStorage.getItem(LS) || "ar");
  }
  window.TaseerakAutoI18n = { apply };
  document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
})();
