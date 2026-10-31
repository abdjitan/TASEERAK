// Product spec fields (sizes, grades, order units…) — the heaviest part of the catalog (~310 KB).
// Loaded on demand by loadCatalogSpecs() (src/types/index.ts) on the pages that show spec fields,
// so the other pages don't download it (review 2026-10-28: the catalog weighed 720 KB on every page).
import type { SpecField } from './index'

export const SPEC_GROUPS: Array<{ products: string[]; spec: SpecField[] }> = [
  // ═══ طبقات الردم والأساس (AASHTO / MOT) ═══
  { products: ['طبقة أساس حصوية (Base Course)', 'طبقة تحت الأساس (Sub-base)', 'ردم إنشائي مصنّف (Structural Fill)', 'ردم عام / إحلال (General Backfill)'], spec: [
    { key: 'classification', ar: 'التصنيف (AASHTO M145)', en: 'AASHTO Classification', options: ['A-1-a (حجر مكسر ممتاز)', 'A-1-b (رمل خشن وحصى)', 'A-2-4 (حصى غريني)', 'A-2-5', 'A-2-6', 'A-3 (رمل ناعم)', 'حسب المواصفات'] },
    { key: 'moc_class', ar: 'الفئة (وزارة النقل MOT)', en: 'MOT Class', options: ['Class A (فئة أ)', 'Class B (فئة ب)', 'Class C (فئة ج)', 'Class D (فئة د)', 'حسب المواصفات'] },
    { key: 'material', ar: 'نوع المادة', en: 'Material Type', options: ['حجر مكسر 100% (Crushed)', 'خليط حصى ورمل', 'حصى وديان (Wadi Gravel)', 'رمل', 'حسب المواصفات'] },
    { key: 'cbr', ar: 'نسبة التحمل CBR', en: 'CBR Value', options: ['≥ 80% (طبقة أساس)', '≥ 50% (Sub-base A)', '≥ 30% (Sub-base B)', '≥ 20% (فئة C/D)', 'حسب التصميم'] },
    { key: 'pi', ar: 'مؤشر اللدونة PI', en: 'Plasticity Index', options: ['غير لدن (NP)', '≤ 6', '≤ 10', 'حسب المواصفات'] },
    { key: 'll', ar: 'حد السيولة LL', en: 'Liquid Limit', options: ['≤ 25', '≤ 40', 'حسب المواصفات'] },
    { key: 'passing200', ar: 'المار من منخل #200', en: 'Passing #200 Sieve', options: ['≤ 15% (A-1-a)', '≤ 25% (A-1-b)', '≤ 35% (A-2)', 'حسب التدرّج'] },
    { key: 'abrasion', ar: 'تآكل لوس أنجلوس', en: 'LA Abrasion Loss', options: ['≤ 45%', '≤ 50%', 'حسب المواصفات'] },
    { key: 'sulfates', ar: 'الكبريتات (SO3) والأملاح', en: 'Sulfates & Salts', options: ['كبريتات ≤ 5% وأملاح ≤ 10%', 'خالٍ من الأملاح الضارة', 'حسب المواصفات'] },
    { key: 'compaction', ar: 'نسبة الدمك المطلوبة', en: 'Compaction (MDD)', options: ['95% MDD', '98% MDD', '100% MDD (بروكتور معدّل)', 'حسب المواصفات'] },
    { key: 'layer', ar: 'سماكة الطبقة المفروشة', en: 'Layer Thickness', options: ['15 سم', '20 سم', 'حسب التصميم'] },
    { key: 'source', ar: 'المصدر', en: 'Source', options: ['كسارة معتمدة', 'وديان', 'بحري', 'حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³ (متر مكعب)', 'طن', 'م² (مع السماكة)'] },
  ] },

  // ═══ سقالات وشدّات (طلب مع تصميم) ═══
  { products: ['طلب سقالة كاملة (توريد + تصميم)'], spec: [
    { key: 'type', ar: 'نوع السقالة', en: 'Type', options: ['كب لوك (Cuplock)', 'رينج لوك (Ringlock)', 'إطار معدني (Frame)', 'برج تدعيم (Shoring Tower)', 'حسب التصميم / غير محدد (Per Design)'] },
    { key: 'height', ar: 'الارتفاع المطلوب', en: 'Height', options: ['حتى 3 م', '3-6 م', '6-9 م', '9-12 م', '12-18 م', '18-25 م', 'أكثر من 25 م', 'حسب المخطط المرفق'] },
    { key: 'length', ar: 'الطول / المحيط', en: 'Length', options: ['حتى 10 م', '10-25 م', '25-50 م', '50-100 م', 'أكثر من 100 م', 'حسب المخطط المرفق'] },
    { key: 'width', ar: 'العرض / العمق', en: 'Width', options: ['حتى 1 م', '1-2 م', '2-3 م', 'أكثر من 3 م', 'حسب المخطط المرفق'] },
    { key: 'scope', ar: 'نطاق العمل', en: 'Scope', options: ['توريد فقط', 'توريد + تركيب', 'توريد + تصميم + تركيب', 'تأجير'] },
    { key: 'duration', ar: 'مدة الاستخدام', en: 'Duration', options: ['أسبوع', 'أسبوعين', 'شهر', '2-3 أشهر', 'حسب المشروع'] },
    { key: 'docs', ar: 'المخططات والمستندات', en: 'Docs', options: ['سأرفق مخطط/أبعاد (استخدم رفع ملف المواصفات)', 'بحاجة زيارة موقع للقياس', 'التفاصيل بالمواصفات الحرّة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Unit', options: ['مشروع (مقطوعية)', 'م² واجهة', 'طن', 'حسب العرض'] },
  ] },
  { products: ['شدّات وطوبار أسقف (سلابات)'], spec: [
    { key: 'system', ar: 'النظام', en: 'System', options: ['طوبار تقليدي (خشب + قوائم)', 'طوبار ألمنيوم (Aluminum)', 'طاولات طيران (Table Form)', 'دعائم + عوارض (Prop + Beam)', 'حسب التصميم'] },
    { key: 'slab_height', ar: 'ارتفاع السقف', en: 'Slab Height', options: ['حتى 3 م', '3-4 م', '4-5 م', '5-6 م', 'أكثر من 6 م', 'حسب المخطط'] },
    { key: 'slab_thickness', ar: 'سماكة البلاطة', en: 'Slab Thickness', options: ['حتى 20 سم', '20-30 سم', '30-40 سم', 'أكثر من 40 سم', 'حسب المخطط'] },
    { key: 'area', ar: 'المساحة التقريبية', en: 'Area', options: ['حتى 100 م²', '100-300 م²', '300-1000 م²', 'أكثر من 1000 م²', 'حسب المخطط المرفق'] },
    { key: 'scope', ar: 'نطاق العمل', en: 'Scope', options: ['توريد فقط', 'توريد + تركيب', 'تأجير'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Unit', options: ['م² (متر مربع)', 'مشروع (مقطوعية)', 'حسب العرض'] },
  ] },

  // ═══ إضافات Madar (دفعة 3) ═══
  { products: ['شريط عزل كهربائي (تيب لحام)'], spec: [
    { key: 'brand', ar: 'الماركة', en: 'Brand', options: ['ثري إم تمفلكس ١٥٠٠ (3M Temflex 1500)', 'ثري إم سكوتش سوبر ٣٣+ (3M Scotch Super 33+)', 'نيتو (Nitto)', 'تجاري (Generic)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['١٩ مم (19 mm)', '١٨ مم (18 mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['١٠ متر (10 m)', '٢٠ متر (20 m)'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['أسود (Black)', 'أحمر (Red)', 'أزرق (Blue)', 'أصفر (Yellow)', 'أخضر (Green)', 'أبيض (White)', 'بني (Brown)', 'أصفر/أخضر (Yellow/Green)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['بي في سي فينيل (PVC Vinyl)'] },
  ] },
  { products: ['شريط تلوين وترميز الكابلات'], spec: [
    { key: 'brand', ar: 'الماركة', en: 'Brand', options: ['ثري إم سكوتش ٣٥ (3M Scotch 35)', 'تجاري (Generic)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['١٩ مم (19 mm)', '١٢ مم (12 mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['٦ متر (6 m)', '٢٠ متر (20 m)'] },
    { key: 'color_pack', ar: 'الألوان', en: 'Color Pack', options: ['مجموعة ألوان (Color set)', 'لون واحد (Single color)'] },
  ] },
  { products: ['أربطة كابلات نايلون (تايات)'], spec: [
    { key: 'length', ar: 'الطول', en: 'Length', options: ['١٠٠ مم (100 mm)', '١٥٠ مم (150 mm)', '٢٠٠ مم (200 mm)', '٢٥٠ مم (250 mm)', '٣٠٠ مم (300 mm)', '٤٠٠ مم (400 mm)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['٢٫٥ مم (2.5 mm)', '٣٫٦ مم (3.6 mm)', '٤٫٨ مم (4.8 mm)', '٧٫٦ مم (7.6 mm)'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['أبيض (White)', 'أسود مقاوم UV (Black UV)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['نايلون ٦٦ (Nylon 6/6)'] },
  ] },
  { products: ['جلبة كابل (كبس/جلاند)'], spec: [
    { key: 'thread_type', ar: 'نوع القلاووظ', en: 'Thread Type', options: ['بي جي (PG)', 'متري (Metric M)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['PG7', 'PG9', 'PG11', 'PG13.5', 'PG16', 'PG21', 'PG29', 'PG36', 'M20', 'M25', 'M32'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['نايلون/بلاستيك (Nylon/Plastic)', 'نحاس (Brass)'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['أسود (Black)', 'رمادي (Grey)'] },
  ] },
  { products: ['سلك سحب أسلاك (فيش تيب)'], spec: [
    { key: 'length', ar: 'الطول', en: 'Length', options: ['١٥ متر (15 m)', '٢٠ متر (20 m)', '٣٠ متر (30 m)', '٥٠ متر (50 m)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['فايبر جلاس (Fiberglass)', 'ستيل صلب (Steel)', 'نايلون (Nylon)'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['٣ مم (3 mm)', '٤ مم (4 mm)', '٦ مم (6 mm)'] },
  ] },
  { products: ['شمع تزليق سحب الكابلات'], spec: [
    { key: 'brand', ar: 'الماركة', en: 'Brand', options: ['ثري إم WLX (3M WLX)', 'تجاري (Generic)'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['شمع/جل (Wax/Gel)', 'سائل (Liquid)'] },
    { key: 'size', ar: 'الحجم', en: 'Size', options: ['ربع جالون (1 Quart)', 'جالون (1 Gallon)', '٥ جالون (5 Gallon)'] },
  ] },
  { products: ['وصلة توصيل واغو (كلامة)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['رافعة واغو (Wago lever 221)', 'دفع واغو (Wago push-in 773)', 'كلامة سلك (Wire nut)'] },
    { key: 'poles', ar: 'عدد الأطراف', en: 'Poles', options: ['٢ مدخل (2-way)', '٣ مدخل (3-way)', '٥ مدخل (5-way)'] },
    { key: 'wire_range', ar: 'مقطع السلك', en: 'Wire Range', options: ['٠٫٥-٢٫٥ مم² (0.5-2.5 mm²)', '٠٫٢-٤ مم² (0.2-4 mm²)', '٤-٦ مم² (4-6 mm²)'] },
  ] },
  { products: ['علبة توزيع كهرباء (بوكس)'], spec: [
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['بي في سي (PVC)', 'معدن (Metal)'] },
    { key: 'shape', ar: 'الشكل', en: 'Shape', options: ['مربع (Square)', 'دائري (Round)', 'مستطيل (Rectangular)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['٤×٤ (4x4)', '٦×٦ (6x6)', '٨×٨ (8x8)', '١٠٠×١٠٠ مم (100x100 mm)'] },
    { key: 'rating', ar: 'درجة الحماية', en: 'Rating', options: ['داخلي (Indoor)', 'IP55', 'IP65 مقاوم للماء'] },
    { key: 'outlets', ar: 'عدد المخارج', en: 'Outlets', options: ['٤ مخارج (4-way)', '٥ مخارج (5-way)', '٧ مخارج (7-way)'] },
  ] },
  { products: ['كوبلن مواسير كهرباء (وصلة كوندويت)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['كوبلن مستقيم (Coupling)', 'كوع/زاوية (Elbow/Bend)', 'كبسة (Snap-in)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['بي في سي (PVC)', 'معدن جلفنة (GI Metal)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['١٦ مم (16 mm)', '٢٠ مم (20 mm)', '٢٥ مم (25 mm)', '٣٢ مم (32 mm)', '٤٠ مم (40 mm)'] },
  ] },
  { products: ['كم حراري عازل (هيت شرنك)'], spec: [
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['٢ مم (2 mm)', '٣ مم (3 mm)', '٥ مم (5 mm)', '٨ مم (8 mm)', '١٠ مم (10 mm)', '١٦ مم (16 mm)', '٢٥ مم (25 mm)'] },
    { key: 'ratio', ar: 'نسبة الانكماش', en: 'Ratio', options: ['٢:١ (2:1)', '٣:١ (3:1)'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['أسود (Black)', 'أحمر (Red)', 'أزرق (Blue)', 'أصفر/أخضر (Yellow/Green)', 'شفاف (Clear)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['بولي أوليفين (Polyolefin)'] },
  ] },
  { products: ['ديمر (منظّم إضاءة) للحائط'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ديمر لمبات LED (LED Dimmer)', 'ديمر عادي هالوجين/إنكانديسنت (Universal)', 'ديمر لمسي (Touch)', 'ديمر دوّار (Rotary)', 'ديمر واي فاي ذكي (Smart Wi-Fi)'] },
    { key: 'load', ar: 'قدرة التحميل', en: 'Load', options: ['300 واط (300W)', '400 واط (400W)', '600 واط (600W)', '1000 واط (1000W)'] },
    { key: 'modules', ar: 'عدد الموديولات', en: 'Modules', options: ['موديول واحد (1 Module)', 'موديولان (2 Modules)'] },
    { key: 'finish', ar: 'اللون/التشطيب', en: 'Finish', options: ['أبيض (White)', 'ألمنيوم (Aluminium)', 'أسود (Black)'] },
  ] },
  { products: ['بريزة يو إس بي شحن (Type-A/Type-C)'], spec: [
    { key: 'port_type', ar: 'نوع المنفذ', en: 'Port Type', options: ['يو إس بي A مزدوج (Dual Type-A)', 'A + C', 'Type-C مزدوج (Dual Type-C)', 'بريزة كهرباء + يو إس بي (Socket + USB)'] },
    { key: 'output', ar: 'قدرة الشحن', en: 'Output', options: ['2.4 أمبير 12 واط (2.4A/12W)', '3 أمبير 15 واط (3A/15W)', 'شحن سريع 30 واط PD (30W PD)', 'شحن سريع 45 واط PD (45W PD)'] },
    { key: 'modules', ar: 'عدد الموديولات', en: 'Modules', options: ['موديول واحد (1 Module)', 'موديولان (2 Modules)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['أبيض (White)', 'ألمنيوم (Aluminium)', 'أسود (Black)'] },
  ] },
  { products: ['بريزة شبكة/داتا (RJ45)'], spec: [
    { key: 'category', ar: 'الفئة', en: 'Category', options: ['كات 5e (Cat 5e)', 'كات 6 (Cat 6)', 'كات 6a (Cat 6a)'] },
    { key: 'ports', ar: 'عدد المخارج', en: 'Ports', options: ['مخرج واحد (Single/RJ45)', 'مخرجان (Double/2xRJ45)', 'شبكة + تلفون (Data + Phone RJ11)'] },
    { key: 'shielding', ar: 'التدريع', en: 'Shielding', options: ['غير مدرّع (UTP)', 'مدرّع (STP/FTP)'] },
    { key: 'modules', ar: 'عدد الموديولات', en: 'Modules', options: ['موديول واحد (1 Module)', 'موديولان (2 Modules)'] },
  ] },
  { products: ['بريزة تلفزيون/ستلايت (TV Coax)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['تلفزيون فقط (TV)', 'تلفزيون + ستلايت (TV + SAT)', 'تلفزيون + راديو + ستلايت (TV+R+SAT)'] },
    { key: 'connector', ar: 'الوصلة', en: 'Connector', options: ['وصلة F (F-Type)', 'وصلة IEC (IEC 9.5mm)'] },
    { key: 'modules', ar: 'عدد الموديولات', en: 'Modules', options: ['موديول واحد (1 Module)', 'موديولان (2 Modules)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['أبيض (White)', 'ألمنيوم (Aluminium)'] },
  ] },
  { products: ['حساس حركة (سنسور إضاءة تلقائي)'], spec: [
    { key: 'technology', ar: 'التقنية', en: 'Technology', options: ['أشعة تحت الحمراء PIR', 'مايكروويف (Microwave)', 'حضور Presence (سقفي)'] },
    { key: 'mount', ar: 'طريقة التركيب', en: 'Mount', options: ['حائط داخل علبة (Wall/Flush)', 'سقفي (Ceiling)', 'سطحي (Surface)'] },
    { key: 'range', ar: 'زاوية/مدى الكشف', en: 'Range', options: ['180 درجة (180°)', '360 درجة (360°)', 'مدى 8 متر (8m)', 'مدى 12 متر (12m)'] },
    { key: 'load', ar: 'قدرة التحميل', en: 'Load', options: ['مناسب LED (LED)', '1000 واط (1000W)', '2000 واط (2000W)'] },
  ] },
  { products: ['تايمر ديجيتال (مؤقّت زمني)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['تايمر يومي (Daily)', 'تايمر أسبوعي (Weekly)', 'تايمر تناظري (Analogue)', 'تايمر درج/سلالم (Staircase)'] },
    { key: 'mount', ar: 'طريقة التركيب', en: 'Mount', options: ['على ريل DIN (DIN Rail)', 'داخل علبة الحائط (Flush)'] },
    { key: 'rating', ar: 'التحميل', en: 'Rating', options: ['16 أمبير (16A)', 'قناة واحدة (1 Channel)', 'قناتان (2 Channels)'] },
    { key: 'modules', ar: 'عدد الموديولات', en: 'Modules', options: ['موديول واحد (1 Module)', 'موديولان (2 Modules)'] },
  ] },
  { products: ['كونتاكتور مودولار (قاطع تحميل)'], spec: [
    { key: 'poles', ar: 'عدد الأقطاب', en: 'Poles', options: ['قطبان (2P)', 'أربعة أقطاب (4P)'] },
    { key: 'current', ar: 'شدة التيار', en: 'Current', options: ['16 أمبير (16A)', '25 أمبير (25A)', '40 أمبير (40A)', '63 أمبير (63A)'] },
    { key: 'coil', ar: 'جهد الملف', en: 'Coil', options: ['230 فولت AC (230V)', '24 فولت (24V)'] },
    { key: 'contact', ar: 'نوع التلامس', en: 'Contact', options: ['مفتوح NO', 'مغلق NC', 'صامت (Silent)'] },
  ] },
  { products: ['ريليه مودولار (ريلي تبديل/تعشيق)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ريليه تعشيق نبضي (Latching/Impulse)', 'ريليه مراقبة (Monitoring)', 'ريليه توقيت (Time Relay)'] },
    { key: 'current', ar: 'شدة التيار', en: 'Current', options: ['16 أمبير (16A)', '32 أمبير (32A)'] },
    { key: 'coil', ar: 'جهد الملف', en: 'Coil', options: ['230 فولت AC (230V)', '24 فولت (24V)'] },
    { key: 'modules', ar: 'عدد الموديولات', en: 'Modules', options: ['موديول واحد (1 Module)', 'موديولان (2 Modules)'] },
  ] },
  { products: ['ثرموستات (منظّم حرارة تكييف/تدفئة)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ثرموستات تكييف مركزي (HVAC/Fan Coil)', 'ثرموستات تدفئة أرضية (Floor Heating)', 'ثرموستات ذكي واي فاي (Smart Wi-Fi)'] },
    { key: 'display', ar: 'الشاشة', en: 'Display', options: ['دائري تناظري (Dial)', 'رقمية LCD', 'لمسية (Touch)'] },
    { key: 'mount', ar: 'طريقة التركيب', en: 'Mount', options: ['داخل علبة الحائط (Flush)', 'على ريل DIN (DIN)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['أبيض (White)', 'ألمنيوم (Aluminium)'] },
  ] },
  { products: ['جرس باب مع زر ضغط (بيل بوش)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['جرس سلكي (Wired Chime)', 'جرس لاسلكي (Wireless)', 'بازر مودولار (Modular Buzzer)'] },
    { key: 'push_button', ar: 'زر الضغط', en: 'Push Button', options: ['زر مضيء (Illuminated)', 'زر بلوحة اسم (Name Plate)', 'زر بريزة عادي (Standard)'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['8-12 فولت مع محوّل (8-12V/Transformer)', '230 فولت (230V)', 'ببطارية (Battery)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['أبيض (White)', 'ألمنيوم (Aluminium)', 'أسود (Black)'] },
  ] },
  { products: ['شريط ليد مرن (SMD)'], spec: [
    { key: 'نوع الليد (LED Chip)', ar: 'نوع الليد', en: 'نوع الليد (LED Chip)', options: ['2835 (SMD 2835)', '5050 (SMD 5050)', 'كوب (COB)'] },
    { key: 'الجهد (Voltage)', ar: 'الجهد', en: 'الجهد (Voltage)', options: ['12 فولت (12V DC)', '24 فولت (24V DC)'] },
    { key: 'القدرة (Power)', ar: 'القدرة لكل متر', en: 'القدرة (Power)', options: ['7.2 واط/م (7.2W/m)', '9.6 واط/م (9.6W/m)', '14.4 واط/م (14.4W/m)'] },
    { key: 'درجة الحماية (IP Rating)', ar: 'درجة الحماية', en: 'درجة الحماية (IP Rating)', options: ['داخلي (IP20)', 'مقاوم رذاذ (IP65)', 'مقاوم ماء (IP67)'] },
    { key: 'لون الإضاءة (Color)', ar: 'لون الإضاءة', en: 'لون الإضاءة (Color)', options: ['أصفر دافئ (Warm White 3000K)', 'أبيض طبيعي (Natural 4000K)', 'أبيض بارد (Cool White 6500K)', 'متعدد الألوان (RGB)'] },
  ] },
  { products: ['نيون فليكس ليد'], spec: [
    { key: 'المقطع (Profile Size)', ar: 'مقاس المقطع', en: 'المقطع (Profile Size)', options: ['6×12 ملم (6x12mm)', '8×16 ملم (8x16mm)', '10×20 ملم (10x20mm)'] },
    { key: 'الجهد (Voltage)', ar: 'الجهد', en: 'الجهد (Voltage)', options: ['12 فولت (12V DC)', '24 فولت (24V DC)'] },
    { key: 'الخامة (Material)', ar: 'الخامة', en: 'الخامة (Material)', options: ['سيليكون (Silicone)', 'بي في سي (PVC)'] },
    { key: 'درجة الحماية (IP Rating)', ar: 'درجة الحماية', en: 'درجة الحماية (IP Rating)', options: ['مقاوم ماء (IP67)', 'غاطس (IP68)'] },
    { key: 'لون الإضاءة (Color)', ar: 'لون الإضاءة', en: 'لون الإضاءة (Color)', options: ['أصفر دافئ (Warm 3000K)', 'أبيض بارد (Cool 6500K)', 'أزرق (Blue)', 'أحمر (Red)', 'أخضر (Green)', 'متعدد الألوان (RGB)'] },
  ] },
  { products: ['محول (درايفر) ليد'], spec: [
    { key: 'جهد الخرج (Output Voltage)', ar: 'جهد الخرج', en: 'جهد الخرج (Output Voltage)', options: ['12 فولت (12V DC)', '24 فولت (24V DC)'] },
    { key: 'القدرة (Power)', ar: 'القدرة', en: 'القدرة (Power)', options: ['60 واط (60W)', '100 واط (100W)', '150 واط (150W)', '200 واط (200W)', '300 واط (300W)'] },
    { key: 'درجة الحماية (IP Rating)', ar: 'درجة الحماية', en: 'درجة الحماية (IP Rating)', options: ['داخلي (IP20)', 'مقاوم ماء (IP67)'] },
    { key: 'النوع (Type)', ar: 'النوع', en: 'النوع (Type)', options: ['جهد ثابت (Constant Voltage)', 'قابل للتعتيم (Dimmable)'] },
  ] },
  { products: ['بروفايل ألمنيوم للشريط'], spec: [
    { key: 'الشكل (Shape)', ar: 'شكل التركيب', en: 'الشكل (Shape)', options: ['سطحي (Surface)', 'غاطس/مدفون (Recessed)', 'زاوية 45° (Corner 45°)', 'معلق (Suspended)'] },
    { key: 'المقاس (Size)', ar: 'المقاس', en: 'المقاس (Size)', options: ['صغير (17×8mm)', 'وسط (17×15mm)', 'كبير (23×10mm)'] },
    { key: 'لون الغطاء (Diffuser)', ar: 'لون العاكس (الديفيوزر)', en: 'لون الغطاء (Diffuser)', options: ['حليبي (Milky/Opal)', 'شفاف (Clear)', 'دخاني (Frosted)'] },
    { key: 'الخامة (Material)', ar: 'الخامة', en: 'الخامة (Material)', options: ['ألمنيوم مؤكسد (Anodized Aluminium)'] },
  ] },
  { products: ['كنترول RGB لشريط الليد'], spec: [
    { key: 'النوع (Type)', ar: 'نوع التحكم', en: 'النوع (Type)', options: ['ريموت لاسلكي (RF Remote)', 'واي فاي/تطبيق (WiFi App)', 'بلوتوث (Bluetooth)', 'لمس (Touch)'] },
    { key: 'قنوات الألوان (Channels)', ar: 'نظام الألوان', en: 'قنوات الألوان (Channels)', options: ['ثلاثي (RGB)', 'رباعي (RGBW)', 'خماسي (RGBWW/RGBCCT)'] },
    { key: 'الجهد (Voltage)', ar: 'الجهد', en: 'الجهد (Voltage)', options: ['12 فولت (12V DC)', '24 فولت (24V DC)', '12-24 فولت (12-24V)'] },
    { key: 'التيار (Current)', ar: 'أقصى تيار', en: 'التيار (Current)', options: ['6 أمبير (6A)', '12 أمبير (12A)', '24 أمبير (24A)'] },
  ] },
  { products: ['موصلات شريط ليد'], spec: [
    { key: 'النوع (Type)', ar: 'نوع الوصلة', en: 'النوع (Type)', options: ['مستقيم (Strip-to-Strip)', 'بسلك (Strip-to-Wire)', 'زاوية L (L-Corner)', 'زاوية T (T-Shape)'] },
    { key: 'عرض الشريط (Strip Width)', ar: 'عرض الشريط', en: 'عرض الشريط (Strip Width)', options: ['8 ملم (8mm)', '10 ملم (10mm)', '12 ملم (12mm)'] },
    { key: 'عدد الأطراف (Poles)', ar: 'عدد الأطراف', en: 'عدد الأطراف (Poles)', options: ['طرفين (2-Pin)', 'أربعة أطراف RGB (4-Pin RGB)', 'خمسة أطراف RGBW (5-Pin RGBW)'] },
  ] },
  { products: ['شريط ليد رقمي متغير الألوان'], spec: [
    { key: 'الشريحة (IC Type)', ar: 'نوع الشريحة', en: 'الشريحة (IC Type)', options: ['WS2812B', 'WS2811', 'SK6812'] },
    { key: 'الجهد (Voltage)', ar: 'الجهد', en: 'الجهد (Voltage)', options: ['5 فولت (5V DC)', '12 فولت (12V DC)', '24 فولت (24V DC)'] },
    { key: 'كثافة الليدات (Density)', ar: 'عدد الليدات لكل متر', en: 'كثافة الليدات (Density)', options: ['30 ليد/م (30 LED/m)', '60 ليد/م (60 LED/m)', '144 ليد/م (144 LED/m)'] },
    { key: 'درجة الحماية (IP Rating)', ar: 'درجة الحماية', en: 'درجة الحماية (IP Rating)', options: ['داخلي (IP20)', 'مقاوم رذاذ (IP65)', 'مقاوم ماء (IP67)'] },
  ] },
  { products: ['بروفايل ليد مقاوم للماء (نيون بار)'], spec: [
    { key: 'الطول (Length)', ar: 'الطول', en: 'الطول (Length)', options: ['0.5 متر (0.5m)', '1 متر (1m)'] },
    { key: 'الجهد (Voltage)', ar: 'الجهد', en: 'الجهد (Voltage)', options: ['12 فولت (12V DC)', '24 فولت (24V DC)'] },
    { key: 'درجة الحماية (IP Rating)', ar: 'درجة الحماية', en: 'درجة الحماية (IP Rating)', options: ['مقاوم ماء (IP65)', 'غاطس (IP68)'] },
    { key: 'لون الإضاءة (Color)', ar: 'لون الإضاءة', en: 'لون الإضاءة (Color)', options: ['أصفر دافئ (Warm 3000K)', 'أبيض بارد (Cool 6500K)', 'متعدد الألوان (RGB)'] },
  ] },
  { products: ['قرص قص حديد'], spec: [
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['4 بوصة (115 مم)', '4.5 بوصة (125 مم)', '7 بوصة (180 مم)', '9 بوصة (230 مم)'] },
    { key: 'السماكة (Thickness)', ar: 'السماكة', en: 'السماكة (Thickness)', options: ['1 مم', '1.6 مم', '2.5 مم', '3 مم', '3.2 مم'] },
    { key: 'الخامة (Material)', ar: 'خامة القرص', en: 'الخامة (Material)', options: ['أكسيد الألومنيوم (Aluminum Oxide)'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['كيداس (Kedas)', 'صن تايجر (Sun Tiger)', 'سبيدكت (Speedcut)', 'ريسيبون (Resibon)', 'بريميوم فلكس (Premium Flex)', 'هيونداي (Hyundai)'] },
  ] },
  { products: ['قرص قص إنوكس (استيل)'], spec: [
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['4 بوصة (115 مم)', '4.5 بوصة (125 مم)', '7 بوصة (180 مم)', '9 بوصة (230 مم)'] },
    { key: 'السماكة (Thickness)', ar: 'السماكة', en: 'السماكة (Thickness)', options: ['1 مم', '1.2 مم', '1.6 مم', '2 مم'] },
    { key: 'التطبيق (Application)', ar: 'الاستخدام', en: 'التطبيق (Application)', options: ['إنوكس / حديد لا يصدأ (Stainless Steel)'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['كيداس إنوكس (Kedas INOX)', 'بريميوم فلكس (Premium Flex)', 'هيونداي (Hyundai)'] },
  ] },
  { products: ['قرص قص رخام وبلاط'], spec: [
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['4 بوصة (115 مم)', '4.5 بوصة (125 مم)', '7 بوصة (180 مم)', '9 بوصة (230 مم)'] },
    { key: 'النوع (Type)', ar: 'نوع القرص', en: 'النوع (Type)', options: ['راتنجي أبراسيف (Abrasive Resin)', 'ألماظ سيجمنت (Diamond Segmented)', 'ألماظ تر بو (Diamond Turbo)', 'ألماظ محيط متصل (Continuous Rim)'] },
    { key: 'التطبيق (Application)', ar: 'الاستخدام', en: 'التطبيق (Application)', options: ['رخام (Marble)', 'جرانيت (Granite)', 'بورسلان/بلاط (Porcelain/Tile)', 'خرسانة (Concrete)'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['ديوالت ليزر (DeWalt Laser)', 'بريميوم فلكس (Premium Flex)', 'كيداس (Kedas)', 'هيونداي (Hyundai)'] },
  ] },
  { products: ['قرص تجليخ حديد'], spec: [
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['4 بوصة (115 مم)', '4.5 بوصة (125 مم)', '7 بوصة (180 مم)', '9 بوصة (230 مم)'] },
    { key: 'السماكة (Thickness)', ar: 'السماكة', en: 'السماكة (Thickness)', options: ['6 مم', '6.4 مم', '8 مم'] },
    { key: 'التطبيق (Application)', ar: 'الاستخدام', en: 'التطبيق (Application)', options: ['حديد/معدن (Steel/Metal)', 'إنوكس (Stainless)', 'توربو تجليخ (Turbo Grinding)'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['بريميوم فلكس (Premium Flex)', 'هيونداي (Hyundai)', 'ديوالت (DeWalt)'] },
  ] },
  { products: ['قرص فلاب (صنفرة)'], spec: [
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['4 بوصة (115 مم)', '4.5 بوصة (125 مم)', '7 بوصة (180 مم)'] },
    { key: 'درجة الحبيبات (Grit)', ar: 'الحبيبات', en: 'درجة الحبيبات (Grit)', options: ['40', '60', '80', '100', '120'] },
    { key: 'الخامة (Material)', ar: 'نوع الحبيبات', en: 'الخامة (Material)', options: ['زركونيوم (Zirconium)', 'أكسيد الألومنيوم (Aluminum Oxide)'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['بريميوم فلكس (Premium Flex)', 'هيونداي إنوكس (Hyundai Inox)'] },
  ] },
  { products: ['فرشاة سلك (كأس / دائرية)'], spec: [
    { key: 'الشكل (Type)', ar: 'الشكل', en: 'الشكل (Type)', options: ['فرشاة كأس ملوي (Twisted Cup)', 'فرشاة كأس عادي (Crimped Cup)', 'فرشاة دائرية (Wheel)', 'فرشاة قلم (Pencil/End)'] },
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['65 مم', '75 مم', '100 مم', '115 مم', '125 مم'] },
    { key: 'الفتحة (Bore/Thread)', ar: 'سن التركيب', en: 'الفتحة (Bore/Thread)', options: ['M14', 'فتحة 22.2 مم (22.2mm Bore)'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['هيونداي (Hyundai)', 'جرادو (Grado)'] },
  ] },
  { products: ['شفرة منشار حديد (بشر)'], spec: [
    { key: 'الطول (Length)', ar: 'المقاس', en: 'الطول (Length)', options: ['10 بوصة (250 مم)', '12 بوصة (300 مم)'] },
    { key: 'عدد الأسنان (TPI)', ar: 'الأسنان', en: 'عدد الأسنان (TPI)', options: ['18 سن', '24 سن', '32 سن'] },
    { key: 'الخامة (Material)', ar: 'خامة الشفرة', en: 'الخامة (Material)', options: ['فولاذ عالي السرعة HSS (High Speed Steel)', 'ثنائي المعدن (Bi-Metal)'] },
  ] },
  { products: ['شفرة منشار خشب دائري'], spec: [
    { key: 'القطر (Diameter)', ar: 'المقاس', en: 'القطر (Diameter)', options: ['7-1/4 بوصة (185 مم)', '8 بوصة (210 مم)', '9 بوصة (235 مم)', '10 بوصة (254 مم)', '12 بوصة (305 مم)'] },
    { key: 'عدد الأسنان (Teeth)', ar: 'الأسنان', en: 'عدد الأسنان (Teeth)', options: ['24 سن', '40 سن', '48 سن', '60 سن', '80 سن'] },
    { key: 'فتحة المحور (Bore)', ar: 'فتحة المحور', en: 'فتحة المحور (Bore)', options: ['25.4 مم', '30 مم'] },
    { key: 'الماركة (Brand)', ar: 'الماركة', en: 'الماركة (Brand)', options: ['هيونداي (Hyundai)', 'ديوالت (DeWalt)'] },
  ] },
  { products: ['حجر شحذ وسن'], spec: [
    { key: 'النوع (Type)', ar: 'النوع', en: 'النوع (Type)', options: ['حجر سن يدوي مزدوج الوجه (Dual-Grit Bench Stone)', 'حجر جلخ عجلة (Bench Grinder Wheel)', 'حجر شحذ زيتي (Oil Stone)'] },
    { key: 'درجة الحبيبات (Grit)', ar: 'الحبيبات', en: 'درجة الحبيبات (Grit)', options: ['خشن 120 (Coarse)', 'متوسط 400 (Medium)', 'ناعم 1000 (Fine)'] },
    { key: 'المقاس (Size)', ar: 'المقاس', en: 'المقاس (Size)', options: ['6 بوصة (150 مم)', '8 بوصة (200 مم)', 'عجلة 150×20 مم', 'عجلة 200×25 مم'] },
  ] },
  { products: ['زاوية حديد (أنجل) متساوية الأضلاع'], spec: [
    { key: 'المقاس (Leg Size)', ar: 'مقاس الضلع', en: 'المقاس (Leg Size)', options: ['25×25 مم', '30×30 مم', '40×40 مم', '50×50 مم', '60×60 مم', '70×70 مم', '80×80 مم', '100×100 مم', '120×120 مم', '150×150 مم', '200×200 مم'] },
    { key: 'السماكة (Thickness)', ar: 'سماكة الزاوية', en: 'السماكة (Thickness)', options: ['3 مم', '4 مم', '5 مم', '6 مم', '8 مم', '10 مم', '12 مم', '15 مم', '20 مم', '25 مم'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['كربوني (ASTM A36)', '(EN 10056)', '(A500)'] },
    { key: 'الطول (Length)', ar: 'طول السيخ', en: 'الطول (Length)', options: ['6 متر', 'حسب الطلب (Custom)'] },
  ] },
  { products: ['لوح مسطح حديد (فلات بار)'], spec: [
    { key: 'العرض (Width)', ar: 'عرض اللوح', en: 'العرض (Width)', options: ['10 مم', '20 مم', '25 مم', '30 مم', '40 مم', '50 مم', '60 مم', '80 مم', '100 مم', '150 مم', '200 مم', '300 مم'] },
    { key: 'السماكة (Thickness)', ar: 'سماكة اللوح', en: 'السماكة (Thickness)', options: ['1.5 مم', '2 مم', '3 مم', '4 مم', '5 مم', '6 مم', '8 مم', '10 مم', '12 مم', '16 مم', '20 مم', '25 مم', '30 مم'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['كربوني (Carbon Steel)'] },
    { key: 'الطول (Length)', ar: 'طول السيخ', en: 'الطول (Length)', options: ['6 متر', 'حسب الطلب (Custom)'] },
  ] },
  { products: ['ماسورة حديد أسود (مواسير سكجول 40)'], spec: [
    { key: 'القطر (Diameter)', ar: 'قطر الماسورة', en: 'القطر (Diameter)', options: ['1/2 إنش (بوصة)', '3/4 إنش', '1 إنش', '1.1/4 إنش', '1.1/2 إنش', '2 إنش', '2.1/2 إنش', '3 إنش', '4 إنش', '5 إنش', '6 إنش', '8 إنش'] },
    { key: 'السماكة (Schedule)', ar: 'سماكة الجدار', en: 'السماكة (Schedule)', options: ['سكجول 40 (Schedule 40)'] },
    { key: 'التشطيب (Finish)', ar: 'نوع التشطيب', en: 'التشطيب (Finish)', options: ['أسود (Black / Lacquered)', 'مجلفن (Galvanized)'] },
    { key: 'المواصفة (Standard)', ar: 'الخامة والمعيار', en: 'المواصفة (Standard)', options: ['كربوني (ASTM A53)'] },
    { key: 'الطول (Length)', ar: 'طول الماسورة', en: 'الطول (Length)', options: ['6 متر'] },
  ] },
  { products: ['مربع حديد أسود (SHS)'], spec: [
    { key: 'المقاس (Size)', ar: 'مقاس المربع', en: 'المقاس (Size)', options: ['12×12 مم', '20×20 مم', '25×25 مم', '30×30 مم', '40×40 مم', '50×50 مم', '60×60 مم', '80×80 مم', '100×100 مم', '120×120 مم', '150×150 مم', '200×200 مم'] },
    { key: 'السماكة (Wall Thickness)', ar: 'سماكة الجدار', en: 'السماكة (Wall Thickness)', options: ['0.70 مم', '0.90 مم', '1.2 مم', '1.5 مم', '2 مم', '2.5 مم', '3 مم', '4 مم', '5 مم', '6 مم', '8 مم', '10 مم'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['كربوني (JIS G3131)'] },
    { key: 'الطول (Length)', ar: 'طول الماسورة', en: 'الطول (Length)', options: ['6 متر'] },
  ] },
  { products: ['مستطيل حديد أسود (RHS)'], spec: [
    { key: 'المقاس (Size)', ar: 'مقاس المستطيل', en: 'المقاس (Size)', options: ['20×40 مم', '25×50 مم', '30×60 مم', '40×60 مم', '40×80 مم', '50×100 مم', '60×120 مم', '80×160 مم', '100×200 مم'] },
    { key: 'السماكة (Wall Thickness)', ar: 'سماكة الجدار', en: 'السماكة (Wall Thickness)', options: ['1.2 مم', '1.5 مم', '2 مم', '2.5 مم', '3 مم', '4 مم', '5 مم', '6 مم', '8 مم'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['كربوني (JIS G3131)'] },
    { key: 'الطول (Length)', ar: 'طول الماسورة', en: 'الطول (Length)', options: ['6 متر'] },
  ] },
  { products: ['صاج أسود ألواح (صاج حار هوت رولد)'], spec: [
    { key: 'المقاس (Sheet Size)', ar: 'مقاس اللوح', en: 'المقاس (Sheet Size)', options: ['1000×2000 مم', '1220×2440 مم', '1500×3000 مم', '1500×6000 مم'] },
    { key: 'السماكة (Thickness)', ar: 'سماكة الصاج', en: 'السماكة (Thickness)', options: ['1.5 مم', '2 مم', '3 مم', '4 مم', '5 مم', '6 مم', '8 مم', '10 مم', '12 مم', '16 مم', '20 مم', '25 مم'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['كربوني حار (SS400)', '(St37-2)', '(ASTM A36)'] },
  ] },
  { products: ['صاج مضلع (شكمة / تير دروب)'], spec: [
    { key: 'المقاس (Sheet Size)', ar: 'مقاس اللوح', en: 'المقاس (Sheet Size)', options: ['1000×2000 مم', '1220×2440 مم', '1500×6000 مم'] },
    { key: 'السماكة (Thickness)', ar: 'سماكة الصاج', en: 'السماكة (Thickness)', options: ['1.6 مم', '2 مم', '3 مم', '4 مم', '5 مم', '6 مم', '8 مم', '10 مم'] },
    { key: 'النقشة (Pattern)', ar: 'شكل النقشة', en: 'النقشة (Pattern)', options: ['دمعة (Tear Drop)', 'معين (Diamond)'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['كربوني حار (SS400)', '(St37-2)'] },
  ] },
  { products: ['صاج مجلفن (GI جلفنة ساخنة)'], spec: [
    { key: 'المقاس (Sheet Size)', ar: 'مقاس اللوح', en: 'المقاس (Sheet Size)', options: ['1000×2000 مم', '1220×2440 مم'] },
    { key: 'السماكة (Thickness)', ar: 'سماكة الصاج', en: 'السماكة (Thickness)', options: ['0.40 مم', '0.50 مم', '0.60 مم', '0.80 مم', '1.0 مم', '1.2 مم', '1.5 مم', '2.0 مم', '3.0 مم', '4.0 مم'] },
    { key: 'طبقة الزنك (Zinc Coating)', ar: 'وزن طبقة الجلفنة', en: 'طبقة الزنك (Zinc Coating)', options: ['G90 (Z275)', 'G60', 'G20'] },
    { key: 'المواصفة (Standard)', ar: 'الخامة والمعيار', en: 'المواصفة (Standard)', options: ['تجاري (SASO ASTM A653)', '(CS Type A/B)'] },
  ] },
  { products: ['بيم حديد أي بيم (IPE جسور)'], spec: [
    { key: 'المقاس (IPE Size)', ar: 'مقاس البيم / الارتفاع', en: 'المقاس (IPE Size)', options: ['IPE 80', 'IPE 100', 'IPE 120', 'IPE 140', 'IPE 160', 'IPE 180', 'IPE 200', 'IPE 240', 'IPE 300', 'IPE 360', 'IPE 400', 'IPE 450', 'IPE 500', 'IPE 600'] },
    { key: 'الخامة (Grade)', ar: 'نوع الحديد', en: 'الخامة (Grade)', options: ['(S275JR)', '(S355JR)', '(EN 10025-2)'] },
    { key: 'الطول (Length)', ar: 'طول البيم', en: 'الطول (Length)', options: ['6 متر', '12 متر', 'حسب الطلب (Custom)'] },
  ] },

  // ═══ خردوات إضافية (دفعة 2 - تدقيق Madar) ═══
  { products: ['براغي جبس بورد (دراي وول)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['خشن للخشب (Coarse)', 'ناعم للمعدن (Fine)', 'نقطة بريمة (Self-Drill)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['25 مم', '32 مم', '35 مم', '45 مم', '55 مم', '75 مم'] },
    { key: 'pack', ar: 'التعبئة', en: 'Pack', options: ['علبة 1000 حبة', 'كرتون', 'بالكيلو'] },
  ] },
  { products: ['مخرج طوارئ (بار دفع)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['بار ضغط أفقي (Touch Bar)', 'بار دفع (Push Bar)', 'لبابين (Double Door)'] },
    { key: 'size', ar: 'العرض', en: 'Size', options: ['باب 900 مم', 'باب 1000 مم', 'قابل للقص'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['فضي (Silver)', 'أسود (Black)', 'ستانلس (Stainless)'] },
  ] },
  { products: ['قفل مغناطيسي كهربائي (ماغلوك)'], spec: [
    { key: 'force', ar: 'قوة الإمساك', en: 'Force', options: ['180 كجم', '280 كجم', '350 كجم', '500 كجم'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['سطحي (Surface)', 'مدفون (Embedded)', 'لبابين (Double)'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['12 فولت', '24 فولت', '12/24 فولت'] },
  ] },
  { products: ['ضبة كهربائية (إلكتريك سترايك)'], spec: [
    { key: 'mode', ar: 'وضع التشغيل', en: 'Mode', options: ['يفتح بالتيار (Fail-Secure)', 'يقفل بالتيار (Fail-Safe)'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['12 فولت DC', '24 فولت DC', '12/24'] },
  ] },
  { products: ['قفازات لحام جلد'], spec: [
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['جلد بقر مشقوق (Cow Split)', 'جلد كامل (Full Leather)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['قصير (Short)', 'طويل 35 سم (Long)'] },
  ] },
  { products: ['كابح صدمة أدراج/أبواب (سوفت كلوز)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مكبس أدراج (Drawer)', 'مكبس خزائن (Cabinet)', 'محول مفصلة (Hinge Adapter)'] },
  ] },
  { products: ['منظم غاز لحام (ريجيليتر)'], spec: [
    { key: 'gas', ar: 'نوع الغاز', en: 'Gas', options: ['أرجون (Argon)', 'ثاني أكسيد الكربون (CO2)', 'أكسجين (Oxygen)', 'أسيتيلين (Acetylene)', 'أرجون/CO2'] },
    { key: 'stage', ar: 'المراحل', en: 'Stage', options: ['مرحلة واحدة (Single Stage)', 'مرحلتين (Two Stage)'] },
    { key: 'gauge', ar: 'العدّاد', en: 'Gauge', options: ['عداد تدفق (Flowmeter)', 'عداد ضغط (Pressure)'] },
  ] },
  { products: ['عربة أسطوانات غاز'], spec: [
    { key: 'capacity', ar: 'السعة', en: 'Capacity', options: ['أسطوانة واحدة', 'أسطوانتين'] },
  ] },
  { products: ['زاوية ركن معدنية للجبس (كورنر بيد)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['زاوية معدنية (Metal Angle)', 'ورقية بشريط (Paper-Faced)', 'مرنة (Flexible)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['2.5 متر', '3 متر'] },
  ] },
  { products: ['شريط تسليح فواصل الجبس'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['شبك فايبر لاصق (Fiberglass Mesh)', 'ورقي (Paper Tape)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['48 مم', '50 مم'] },
    { key: 'roll', ar: 'طول اللفة', en: 'Roll', options: ['20 متر', '45 متر', '90 متر'] },
  ] },
  { products: ['بوابة سياج جاهزة'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مفصلية (Hinged)', 'منزلقة (Sliding)', 'مشاة (Pedestrian)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['1 متر', '3 متر', '4 متر', '6 متر', 'حسب الطلب'] },
  ] },
  { products: ['سلك ربط وأربطة تثبيت الشبك'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['سلك ربط مجلفن (Galvanized Tie Wire)', 'أربطة ألمنيوم (Aluminum Ties)', 'مشابك تثبيت (Clips)'] },
    { key: 'gauge', ar: 'السماكة', en: 'Gauge', options: ['1.5 مم', '2.0 مم', '2.5 مم'] },
  ] },

  // ═══ خردوات ومواد إضافية (بحث Madar) ═══
  { products: ['مفصلة فراشة'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['2 إنش (2")', '2.5 إنش (2.5")', '3 إنش (3")', '4 إنش (4")', '5 إنش (5")', '6 إنش (6")'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'حديد مطلي (Iron Plated)', 'نحاس (Brass)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ساتان (Satin)', 'لامع/كروم (Polished Chrome)', 'ذهبي (Gold/PVD)', 'أسود (Black)'] },
    { key: 'bearing', ar: 'نوع المحمل', en: 'Bearing', options: ['عادي (Plain)', 'برمبل/رمان بلي (Ball Bearing)'] },
  ] },
  { products: ['مفصلة أوتوماتيك (زنبرك)'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['3 إنش (3")', '4 إنش (4")', '5 إنش (5")', '6 إنش (6")'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'حديد مطلي (Iron Plated)'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['زنبرك مفرد (Single Action)', 'زنبرك مزدوج/بندول (Double Action)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ساتان (Satin)', 'كروم لامع (Polished Chrome)', 'أسود (Black)'] },
  ] },
  { products: ['مفصلة كوباية (مطبخ) كونسيلد'], spec: [
    { key: 'type', ar: 'نوع الفتح', en: 'Type', options: ['كامل الفتح/كلبس (Full Overlay)', 'نص كلبس (Half Overlay)', 'داخلي/إنسيرت (Inset)'] },
    { key: 'angle', ar: 'زاوية الفتح', en: 'Angle', options: ['95 درجة', '110 درجة', '165 درجة'] },
    { key: 'closing', ar: 'آلية الإغلاق', en: 'Closing', options: ['عادي (Standard)', 'هيدروليك/إغلاق ناعم (Soft Close)'] },
    { key: 'cup_size', ar: 'قطر الكوباية', en: 'Cup Size', options: ['26 مم', '35 مم'] },
  ] },
  { products: ['مفصلة أرضية (كباس أرضي)'], spec: [
    { key: 'capacity', ar: 'سعة الحمل (وزن الباب)', en: 'Capacity', options: ['حتى 80 كجم', 'حتى 120 كجم', 'حتى 150 كجم', 'حتى 300 كجم'] },
    { key: 'action', ar: 'نوع الحركة', en: 'Action', options: ['اتجاه واحد (Single Action)', 'بندول/اتجاهين (Double Action)'] },
    { key: 'hold_open', ar: 'وضع التثبيت', en: 'Hold Open', options: ['مع تثبيت 90 درجة (Hold Open)', 'بدون تثبيت (Non Hold Open)'] },
    { key: 'cover', ar: 'غطاء الصينية', en: 'Cover', options: ['ستانلس ستيل (Stainless Steel)', 'مطلي ذهبي (Gold)', 'أسود (Black)'] },
  ] },
  { products: ['مجرى درج تلسكوبي رمان بلي'], spec: [
    { key: 'size', ar: 'الطول', en: 'Size', options: ['25 سم (10")', '30 سم (12")', '35 سم (14")', '40 سم (16")', '45 سم (18")', '50 سم (20")', '55 سم (22")', '60 سم (24")'] },
    { key: 'extension', ar: 'مدى السحب', en: 'Extension', options: ['سحب جزئي (Partial Extension)', 'سحب كامل (Full Extension)'] },
    { key: 'closing', ar: 'آلية الإغلاق', en: 'Closing', options: ['عادي (Standard)', 'إغلاق ناعم (Soft Close)', 'دفع للفتح (Push to Open)'] },
    { key: 'capacity', ar: 'سعة الحمل', en: 'Capacity', options: ['خفيف 35 كجم', 'متوسط 45 كجم', 'ثقيل 100 كجم (Heavy Duty)'] },
  ] },
  { products: ['مجرى درج عادي (بكرة)'], spec: [
    { key: 'size', ar: 'الطول', en: 'Size', options: ['25 سم (10")', '30 سم (12")', '35 سم (14")', '40 سم (16")', '45 سم (18")', '50 سم (20")'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['حديد مطلي أبيض (White Epoxy)', 'حديد مطلي بني (Brown)', 'زنك (Zinc)'] },
    { key: 'thickness', ar: 'سماكة الصاج', en: 'Thickness', options: ['خفيف (Light Duty)', 'متوسط (Medium Duty)'] },
  ] },
  { products: ['مجرى درج مخفي هيدروليك (أندرماونت)'], spec: [
    { key: 'size', ar: 'الطول', en: 'Size', options: ['30 سم (300 مم)', '35 سم (350 مم)', '40 سم (400 مم)', '45 سم (450 مم)', '50 سم (500 مم)'] },
    { key: 'extension', ar: 'مدى السحب', en: 'Extension', options: ['سحب جزئي (3/4 Extension)', 'سحب كامل (Full Extension)'] },
    { key: 'feature', ar: 'الميزة', en: 'Feature', options: ['إغلاق ناعم (Soft Close)', 'دفع للفتح (Push to Open)'] },
  ] },
  { products: ['مفصلة بيانو (شريطية)'], spec: [
    { key: 'width', ar: 'العرض المفتوح', en: 'Width', options: ['25 مم (1")', '32 مم (1.25")', '38 مم (1.5")', '50 مم (2")'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'حديد مطلي (Iron Plated)', 'نحاس (Brass)'] },
    { key: 'length', ar: 'طول القطعة', en: 'Length', options: ['1 متر', '1.8 متر (6 قدم)', '2.4 متر (8 قدم)'] },
  ] },
  { products: ['مفصلة جناح (ركنة مطبخ)'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['3 إنش (3")', '4 إنش (4")', '5 إنش (5")'] },
    { key: 'hand', ar: 'اتجاه الفتح', en: 'Hand', options: ['يمين (Right Hand)', 'يسار (Left Hand)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'حديد مطلي (Iron Plated)'] },
  ] },
  { products: ['مفصلة زاوية (كنار) للأثاث'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مكرنكة (Cranked)', 'مسطحة (Flat)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['1.5 إنش (1.5")', '2 إنش (2")', '2.5 إنش (2.5")'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['نيكل (Nickel)', 'ذهبي (Gold)', 'برونز (Bronze)'] },
  ] },
  { products: ['قلب كالون (سلندر يوروبروفايل)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مزدوج مفتاح (Double Cylinder)', 'مفتاح ومقبض (Key & Turn)', 'نصف سلندر (Half Cylinder)', 'مقاوم للثقب (Anti-Drill)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['60 مم', '62 مم', '65 مم', '70 مم', '80 مم', '90 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['نحاس (Brass)', 'نحاس مطلي نيكل (Nickel Plated Brass)', 'زاماك (Zamak)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['نحاسي (Brass)', 'كروم لامع (Polished Chrome)', 'ساتان نيكل (Satin Nickel)', 'ذهبي (Gold)'] },
  ] },
  { products: ['كالون دفن (قفل مورتيس)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['كالون سحب بمقبض (Sashlock)', 'كالون دفن بمفتاح فقط (Deadlock)', 'كالون حمام (Bathroom)', 'كالون مصفح (Armored Door)'] },
    { key: 'backset', ar: 'عمق الدفن (Backset)', en: 'Backset', options: ['45 مم', '55 مم', '60 مم', '72 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستيل (Steel)', 'ستانلس ستيل (Stainless Steel)', 'حديد مطلي (Coated Iron)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Nickel)', 'ذهبي (Brass)', 'أسود (Black)'] },
  ] },
  { products: ['كباس باب (قفل مقبض دائري)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['كباس مقبض دائري (Knob)', 'كباس مقبض ذراع (Lever)', 'كباس مدخل بمفتاح (Entry)', 'كباس حمام بدون مفتاح (Privacy)', 'كباس داخلي حر (Passage)'] },
    { key: 'size', ar: 'قطر الفتحة', en: 'Size', options: ['54 مم (2-1/8 بوصة)', '60 مم', '70 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'زاماك (Zamak)', 'ألمنيوم (Aluminum)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['كروم لامع (Polished Chrome)', 'ساتان (Satin)', 'ذهبي (Gold)', 'أسود مطفي (Matte Black)'] },
  ] },
  { products: ['قفل ديدبولت (كالون ترباس)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مفتاح واحد (Single Cylinder)', 'مفتاح من الجهتين (Double Cylinder)', 'مفتاح ومقبض (Key & Thumbturn)'] },
    { key: 'backset', ar: 'عمق الدفن (Backset)', en: 'Backset', options: ['60 مم', '70 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستيل مقوى (Hardened Steel)', 'نحاس (Brass)', 'زاماك (Zamak)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['كروم (Chrome)', 'نحاسي (Brass)', 'ساتان نيكل (Satin Nickel)', 'أسود (Black)'] },
  ] },
  { products: ['قفل رقمي / ذكي للباب'], spec: [
    { key: 'type', ar: 'طريقة الفتح', en: 'Type', options: ['بصمة (Fingerprint)', 'رقم سري (PIN Code)', 'بطاقة (RFID Card)', 'بصمة الوجه (Face Recognition)', 'تطبيق جوال (App / Bluetooth)', 'مفتاح احتياطي (Backup Key)'] },
    { key: 'body', ar: 'نوع القفل', en: 'Body', options: ['كالون كامل بمقبض (Handle Set)', 'ديدبولت رقمي (Deadbolt)', 'قفل تركيب (Rim / Mortise)'] },
    { key: 'power', ar: 'التغذية', en: 'Power', options: ['بطاريات AA (Battery)', 'قابل للشحن USB (Rechargeable)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Silver)', 'أسود (Black)', 'ذهبي (Gold)'] },
  ] },
  { products: ['قفل درج / خزانة'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['قفل درج مدفون (Cam Lock)', 'قفل باب خزانة (Cabinet Lock)', 'قفل دفع (Push Lock)', 'قفل مغناطيسي أطفال (Child Safety)'] },
    { key: 'size', ar: 'طول العلبة', en: 'Size', options: ['16 مم', '20 مم', '25 مم', '30 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['زاماك (Zamak)', 'نحاس (Brass)', 'ستيل (Steel)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['كروم (Chrome)', 'نيكل (Nickel)', 'ذهبي (Gold)'] },
  ] },
  { products: ['مزلاج باب (سقاطة / ترباس)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ترباس علوي (Tower Bolt)', 'سقاطة أفقية (Barrel Bolt)', 'سقاطة سبانيش (Espagnolette)', 'مزلاج ضغط (Spring Latch)'] },
    { key: 'size', ar: 'الطول', en: 'Size', options: ['4 بوصة (100 مم)', '6 بوصة (150 مم)', '8 بوصة (200 مم)', '10 بوصة (250 مم)', '12 بوصة (300 مم)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'حديد مطلي (Coated Iron)', 'نحاس (Brass)', 'ألمنيوم (Aluminum)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Satin)', 'ذهبي (Brass)', 'أسود (Black)'] },
  ] },
  { products: ['قفل باب سحاب (ألمنيوم / زجاج)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['قفل باب سحاب ألمنيوم (Aluminum Sliding)', 'قفل باب زجاج (Glass Door Patch Lock)', 'قفل خطاف (Hook Lock)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ألمنيوم (Aluminum)', 'زاماك (Zamak)', 'ستانلس ستيل (Stainless Steel)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Silver)', 'أسود (Black)', 'شمبين (Champagne)'] },
  ] },
  { products: ['قفل بادلوك (كالون معلاق)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مفتاح عادي (Keyed)', 'رقمي بأرقام (Combination)', 'مقاوم للماء (Weatherproof)', 'طويل الرقبة (Long Shackle)'] },
    { key: 'size', ar: 'عرض الجسم', en: 'Size', options: ['20 مم', '30 مم', '40 مم', '50 مم', '60 مم', '70 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['نحاس (Brass)', 'ستيل مقوى (Hardened Steel)', 'ستانلس ستيل (Stainless Steel)', 'زاماك (Zamak)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['نحاسي (Brass)', 'فضي (Steel)', 'أسود (Black)'] },
  ] },
  { products: ['كالون فندقي بالبطاقة'], spec: [
    { key: 'type', ar: 'طريقة الفتح', en: 'Type', options: ['بطاقة RFID (RFID Card)', 'بطاقة مغناطيسية (Magnetic Card)', 'بطاقة + رقم سري (Card & PIN)'] },
    { key: 'backset', ar: 'عمق الدفن (Backset)', en: 'Backset', options: ['60 مم', '72 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'زاماك (Zamak)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Silver)', 'ذهبي (Gold)', 'أسود (Black)'] },
  ] },
  { products: ['كباس باب علوي هيدروليكي'], spec: [
    { key: 'size', ar: 'المقاس (قوة الإغلاق EN)', en: 'Size', options: ['مقاس 2 (EN 2 - باب حتى 40 كجم / 850 مم)', 'مقاس 3 (EN 3 - باب حتى 60 كجم / 950 مم)', 'مقاس 4 (EN 4 - باب حتى 80 كجم / 1100 مم)', 'مقاس 5 (EN 5 - باب حتى 100 كجم / 1250 مم)', 'مقاس قابل للضبط (Adjustable 2-4)', 'مقاس قابل للضبط (Adjustable 2-6)'] },
    { key: 'duty', ar: 'الفئة (التحمل)', en: 'Duty', options: ['خفيف (Light Duty)', 'متوسط (Medium Duty)', 'ثقيل (Heavy Duty)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Silver)', 'أبيض (White)', 'برونزي (Bronze)', 'أسود (Black)'] },
    { key: 'arm', ar: 'نوع الذراع / التركيب', en: 'Arm', options: ['ذراع عادي (Regular Arm)', 'ذراع موازي (Parallel Arm)', 'علوي على الحلق (Top Jamb)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ألمنيوم مصبوب (Aluminium Alloy)'] },
  ] },
  { products: ['كباس باب بذراع منزلق (سلايد)'], spec: [
    { key: 'size', ar: 'المقاس (EN)', en: 'Size', options: ['مقاس 3 (EN 3)', 'مقاس 4 (EN 4)', 'قابل للضبط (Adjustable 2-4)', 'قابل للضبط (Adjustable 3-6)'] },
    { key: 'finish', ar: 'اللون / التشطيب', en: 'Finish', options: ['فضي (Silver)', 'أبيض (White)', 'أسود (Black)'] },
    { key: 'feature', ar: 'الخصائص', en: 'Feature', options: ['تثبيت عند فتحة (Hold Open)', 'بدون تثبيت (Non Hold Open)', 'قفل نهائي قابل للضبط (Backcheck)'] },
  ] },
  { products: ['كباس باب صغير (للأبواب الخفيفة)'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['مقاس 1 (EN 1 - حتى 20 كجم)', 'مقاس 2 (EN 2 - حتى 40 كجم)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['فضي (Silver)', 'أبيض (White)'] },
    { key: 'application', ar: 'الاستخدام', en: 'Application', options: ['أبواب داخلية خفيفة (Interior)', 'أبواب سلك/شبك (Screen Door)'] },
  ] },
  { products: ['كباس باب زجاجي (بتشمنت)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['علوي (Overhead Patch)', 'بذراع (Arm Type)'] },
    { key: 'glass', ar: 'سماكة الزجاج', en: 'Glass', options: ['10 مم', '12 مم', '10-12 مم'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستانلس ستيل لامع (Polished SS)', 'ستانلس مطفي (Satin SS)'] },
  ] },
  { products: ['مغلق باب أرضي (فلور سبرنج)'], spec: [
    { key: 'capacity', ar: 'سعة تحمل الباب', en: 'Capacity', options: ['حتى 80 كجم', 'حتى 120 كجم', 'حتى 150 كجم', 'حتى 200 كجم'] },
    { key: 'holdopen', ar: 'زاوية التثبيت', en: 'Holdopen', options: ['تثبيت 90 درجة (Hold Open 90°)', 'بدون تثبيت (Non Hold Open)'] },
    { key: 'door', ar: 'نوع الباب', en: 'Door', options: ['باب زجاجي (Glass)', 'باب خشبي/معدني (Wood/Metal)'] },
    { key: 'finish', ar: 'تشطيب اللوح العلوي', en: 'Finish', options: ['ستانلس ستيل (Stainless Steel)', 'معدن مطلي (Coated)'] },
  ] },
  { products: ['مشط فلور سبرنج (لوح ستانلس علوي)'], spec: [
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستانلس لامع (Polished)', 'ستانلس مطفي (Satin)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['مقاس صغير (Small)', 'مقاس كبير (Large)'] },
  ] },
  { products: ['حامل باب مغناطيسي (ماسك مغناطيس)'], spec: [
    { key: 'mount', ar: 'طريقة التركيب', en: 'Mount', options: ['أرضي (Floor Mount)', 'جداري (Wall Mount)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'زنك مطلي كروم (Chrome Zinc)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['ستيل (Satin)', 'كروم لامع (Polished Chrome)'] },
  ] },
  { products: ['مصد باب مطاطي (ستوبر)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أرضي (Floor)', 'جداري (Wall)', 'خلف الباب (Behind Door)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل مع مطاط (SS + Rubber)', 'زنك مطلي (Zinc)'] },
  ] },
  { products: ['منظم أولوية إغلاق الأبواب (سيلكتور)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['لبابين (Double Door)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['فضي (Silver)', 'أسود (Black)'] },
  ] },
  { products: ['ذراع/طقم تركيب كباس باب (قطع غيار)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ذراع عادي (Standard Arm)', 'ذراع موازي (Parallel Arm Bracket)', 'قاعدة تركيب (Mounting Plate)'] },
    { key: 'finish', ar: 'اللون', en: 'Finish', options: ['فضي (Silver)', 'أسود (Black)'] },
  ] },
  { products: ['ماسك/مثبت باب علوي (هولد أوبن)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['تثبيت ميكانيكي (Mechanical)', 'احتكاكي قابل للضبط (Friction)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['فضي (Silver)', 'ستانلس (Stainless)'] },
  ] },
  { products: ['مقبض باب اكبح (لوحة)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['اكبح لوحة طويلة (Lever on Plate)', 'اكبح روزيتة (Lever on Rosette)', 'اكبح تجاري (Commercial)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل 304 (Stainless Steel 304)', 'زنك سبيكة (Zinc Alloy)', 'ألمنيوم (Aluminum)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل مصقول (Satin/Brushed)', 'كروم لامع (Polished Chrome)', 'ذهبي (Gold/PVD)', 'أسود مطفي (Matte Black)'] },
  ] },
  { products: ['مقبض كرة باب'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['كرة عادي (Passage)', 'كرة بمفتاح (Entrance/Keyed)', 'كرة حمام (Privacy/Bathroom)', 'كرة بكرة داخلي (Dummy)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'زنك سبيكة (Zinc Alloy)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل ساتان (Satin Steel)', 'كروم لامع (Polished Chrome)', 'نحاسي عتيق (Antique Brass)'] },
  ] },
  { products: ['مقبض باب مع كباس (اكبح كامل بقفل)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['باب داخلي (Interior)', 'باب مدخل خارجي (Entrance)', 'باب حمام (Bathroom/Privacy)'] },
    { key: 'size', ar: 'مقاس الكباس (Backset)', en: 'Size', options: ['45 مم', '60 مم', '70 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل 304 (Stainless Steel 304)', 'زنك سبيكة (Zinc Alloy)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل مصقول (Satin)', 'كروم (Chrome)', 'ذهبي (Gold)', 'أسود (Black)'] },
  ] },
  { products: ['مقبض سحب باب زجاج (H)'], spec: [
    { key: 'size', ar: 'الطول (مسافة المسامير)', en: 'Size', options: ['300 مم', '450 مم', '600 مم', '800 مم', '1000 مم', '1200 مم'] },
    { key: 'type', ar: 'التركيب', en: 'Type', options: ['ظهر لظهر (Back-to-Back)', 'جهة واحدة (Single Side)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل 304 (Stainless Steel 304)', 'ستانلس ستيل 316 (Stainless Steel 316)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل مصقول (Satin/Brushed)', 'ستيل لامع (Polished)', 'أسود (Black)', 'ذهبي (Gold)'] },
  ] },
  { products: ['مقبض دفع وسحب لوح (Push/Pull)'], spec: [
    { key: 'size', ar: 'مقاس اللوح', en: 'Size', options: ['300×75 مم', '400×100 مم', 'قضيب سحب 12 انش (Pull Bar 12")'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'ألمنيوم (Aluminum)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل ساتان (Satin)', 'ستيل لامع (Polished)', 'أسود (Black)'] },
  ] },
  { products: ['مقبض خزائن ومطابخ (يد سحب)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['يد سحب مستقيمة (Bar Pull)', 'يد سحب قوس (Bow Pull)', 'يد غاطسة (Recessed/Flush)'] },
    { key: 'size', ar: 'مسافة المسامير', en: 'Size', options: ['96 مم', '128 مم', '160 مم', '192 مم', '224 مم', '320 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['زنك سبيكة (Zinc Alloy)', 'ألمنيوم (Aluminum)', 'ستانلس ستيل (Stainless Steel)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل مصقول (Satin)', 'كروم (Chrome)', 'أسود مطفي (Matte Black)', 'ذهبي روز (Rose Gold)'] },
  ] },
  { products: ['زر (بزلة) خزانة'], spec: [
    { key: 'type', ar: 'الشكل', en: 'Type', options: ['دائري (Round)', 'مربع (Square)', 'كريستال (Crystal)'] },
    { key: 'size', ar: 'القطر', en: 'Size', options: ['25 مم', '30 مم', '35 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['زنك سبيكة (Zinc Alloy)', 'ستانلس ستيل (Stainless Steel)', 'كريستال (Crystal)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['كروم (Chrome)', 'ستيل ساتان (Satin)', 'أسود (Black)', 'ذهبي (Gold)'] },
  ] },
  { products: ['روزيتة (طقم روزيتات مقبض)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['روزيتة عادية (Passage)', 'روزيتة مفتاح (Keyhole)', 'روزيتة اسطوانة (Cylinder)'] },
    { key: 'shape', ar: 'الشكل', en: 'Shape', options: ['دائري (Round)', 'مربع (Square)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'زنك سبيكة (Zinc Alloy)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل ساتان (Satin)', 'كروم (Chrome)', 'أسود (Black)'] },
  ] },
  { products: ['دفاية باب (لوحة حماية)'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['200×750 مم', '250×900 مم', 'لوح دفع 300×75 مم (Push Plate)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'ألمنيوم (Aluminum)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل مصقول (Satin)', 'ستيل لامع (Polished)'] },
  ] },
  { products: ['مقبض باب رئيسي فخم (شنطة)'], spec: [
    { key: 'size', ar: 'الطول', en: 'Size', options: ['300 مم', '400 مم', '500 مم', '600 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل 304 (Stainless Steel 304)', 'زنك سبيكة (Zinc Alloy)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ذهبي (Gold/PVD)', 'أسود مطفي (Matte Black)', 'ستيل ساتان (Satin)', 'نحاسي (Brass)'] },
  ] },
  { products: ['مسكة باب حديد سحب (كوع)'], spec: [
    { key: 'size', ar: 'الطول', en: 'Size', options: ['150 مم', '200 مم', '250 مم', '300 مم'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['ستانلس ستيل (Stainless Steel)', 'ألمنيوم (Aluminum)', 'حديد مطلي (Coated Steel)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ستيل ساتان (Satin)', 'كروم (Chrome)', 'أسود (Black)'] },
  ] },
  { products: ['ماكينة لحام انفرتر آرك (MMA)'], spec: [
    { key: 'amperage', ar: 'الأمبير (سعة التيار)', en: 'Amperage', options: ['160 أمبير (160A)', '200 أمبير (200A)', '250 أمبير (250A)', '315 أمبير (315A)', '400 أمبير (400A)'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['220 فولت (220V)', '380 فولت (380V)', '220/380 فولت'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['آرك عادي (MMA)', 'آرك + تيج (MMA/TIG)'] },
  ] },
  { products: ['ماكينة لحام ميغ/ماغ (MIG/MAG) بالسلك'], spec: [
    { key: 'amperage', ar: 'الأمبير (سعة التيار)', en: 'Amperage', options: ['200 أمبير (200A)', '250 أمبير (250A)', '350 أمبير (350A)', '500 أمبير (500A)'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ميغ فقط (MIG)', 'ميغ متعدد (MIG/MMA/TIG)', 'بغاز (Gas)', 'بدون غاز - سلك فلكس (Gasless/Flux)'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['220 فولت (220V)', '380 فولت (380V)'] },
  ] },
  { products: ['ماكينة لحام تيج (TIG) أرجون'], spec: [
    { key: 'amperage', ar: 'الأمبير (سعة التيار)', en: 'Amperage', options: ['200 أمبير (200A)', '250 أمبير (250A)', '315 أمبير (315A)'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['تيج DC', 'تيج AC/DC (للألمنيوم)', 'تيج + آرك (TIG/MMA)'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['220 فولت (220V)', '380 فولت (380V)'] },
  ] },
  { products: ['ماكينة قطع بلازما'], spec: [
    { key: 'amperage', ar: 'الأمبير (سعة القطع)', en: 'Amperage', options: ['40 أمبير (40A)', '60 أمبير (60A)', '80 أمبير (80A)', '100 أمبير (100A)'] },
    { key: 'cut_thickness', ar: 'سماكة القطع', en: 'Cut Thickness', options: ['حتى 10 مم', 'حتى 20 مم', 'حتى 30 مم', 'حتى 40 مم'] },
    { key: 'voltage', ar: 'الجهد', en: 'Voltage', options: ['220 فولت (220V)', '380 فولت (380V)'] },
  ] },
  { products: ['إلكترود لحام (بارة لحام)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['E6013 (بيور)', 'E7018 (لو هيدروجين)', 'E6011', 'ستيل انلس (Stainless)', 'كاست ايرون (زهر)'] },
    { key: 'size', ar: 'المقاس (القطر)', en: 'Size', options: ['2.0 مم', '2.5 مم', '3.2 مم', '4.0 مم', '5.0 مم'] },
    { key: 'pack', ar: 'التعبئة', en: 'Pack', options: ['علبة 2.5 كجم', 'علبة 5 كجم', 'كرتون 20 كجم'] },
  ] },
  { products: ['سلك لحام ميغ (بكرة سلك)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['سلك نحاسي ER70S-6', 'سلك فلكس بدون غاز (Flux Cored)', 'ستيل انلس (Stainless ER308)', 'ألمنيوم (Aluminium ER4043)'] },
    { key: 'size', ar: 'المقاس (القطر)', en: 'Size', options: ['0.8 مم', '0.9 مم', '1.0 مم', '1.2 مم', '1.6 مم'] },
    { key: 'spool', ar: 'وزن البكرة', en: 'Spool', options: ['بكرة 1 كجم', 'بكرة 5 كجم', 'بكرة 15 كجم'] },
  ] },
  { products: ['سلك لحام تيج (بارة أرجون)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['حديد ER70S-2', 'ستيل انلس ER308L', 'ألمنيوم ER4043', 'ألمنيوم ER5356'] },
    { key: 'size', ar: 'المقاس (القطر)', en: 'Size', options: ['1.6 مم', '2.0 مم', '2.4 مم', '3.2 مم'] },
    { key: 'pack', ar: 'التعبئة', en: 'Pack', options: ['علبة 1 كجم', 'علبة 5 كجم'] },
  ] },
  { products: ['قناع لحام (خوذة لحام)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أوتوماتيك تعتيم (Auto-Darkening)', 'عادي بزجاج ثابت (Passive)', 'يدوي (Handheld)'] },
    { key: 'shade', ar: 'درجة التعتيم', en: 'Shade', options: ['ثابت DIN 11', 'متغير DIN 9-13'] },
    { key: 'power', ar: 'مصدر الطاقة', en: 'Power', options: ['بطارية + خلية شمسية (Solar)', 'بطارية فقط'] },
  ] },
  { products: ['ماسك (كباس) اللحام - إلكترود هولدر'], spec: [
    { key: 'amperage', ar: 'الأمبير (السعة)', en: 'Amperage', options: ['300 أمبير (300A)', '400 أمبير (400A)', '500 أمبير (500A)', '600 أمبير (600A)'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أمريكي (American Type)', 'بريطاني (British Type)'] },
  ] },
  { products: ['مشبك أرضي لحام (كلامة ماس)'], spec: [
    { key: 'amperage', ar: 'الأمبير (السعة)', en: 'Amperage', options: ['300 أمبير (300A)', '500 أمبير (500A)', '600 أمبير (600A)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['نحاس (Copper)', 'حديد مطلي (Coated Steel)'] },
  ] },
  { products: ['كيبل لحام (نحاس)'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['25 مم² (25mm²)', '35 مم² (35mm²)', '50 مم² (50mm²)', '70 مم² (70mm²)', '95 مم² (95mm²)'] },
    { key: 'conductor', ar: 'الموصل', en: 'Conductor', options: ['نحاس كامل (Full Copper)', 'نحاس مغشوش CCA'] },
  ] },
  { products: ['طقم لحام أكسجين وأسيتيلين (لحام غاز)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['طقم قطع ولحام كامل', 'شعلة لحام فقط (Torch)', 'طقم مع مانومترات (Regulators)'] },
    { key: 'hose', ar: 'الخرطوم', en: 'Hose', options: ['مزدوج 5 متر', 'مزدوج 10 متر', 'مزدوج 20 متر'] },
    { key: 'regulator', ar: 'المنظمات (مانومتر)', en: 'Regulator', options: ['أكسجين + أسيتيلين', 'أكسجين فقط'] },
  ] },
  { products: ['غسالة ضغط عالي كهربائية منزلية'], spec: [
    { key: 'pressure', ar: 'قوة الضغط', en: 'Pressure', options: ['105 بار (105 Bar)', '110 بار (110 Bar)', '120 بار (120 Bar)', '130 بار (130 Bar)', '165 بار (165 Bar)'] },
    { key: 'power', ar: 'قدرة الموتور', en: 'Power', options: ['1400 واط (1400W)', '1600 واط (1600W)', '2100 واط (2100W)'] },
    { key: 'flow', ar: 'معدل التدفق', en: 'Flow', options: ['360 لتر/ساعة (360 L/h)', '5.5 لتر/دقيقة (5.5 L/min)', '6 لتر/دقيقة (6 L/min)'] },
    { key: 'brand', ar: 'الماركة', en: 'Brand', options: ['هيونداي (Hyundai)', 'كارشر (Karcher)', 'بوش (Bosch)', 'أخرى (Other)'] },
  ] },
  { products: ['غسالة ضغط عالي كهربائية صناعية (تجارية)'], spec: [
    { key: 'pressure', ar: 'قوة الضغط', en: 'Pressure', options: ['165 بار (165 Bar)', '200 بار (200 Bar)', '225 بار (225 Bar)', '250 بار (250 Bar)'] },
    { key: 'power', ar: 'قدرة الموتور', en: 'Power', options: ['2500 واط (2500W)', '3000 واط (3000W)', '3 حصان (3 HP)', '4 حصان (4 HP)'] },
    { key: 'flow', ar: 'معدل التدفق', en: 'Flow', options: ['8.5 لتر/دقيقة (8.5 L/min)', '10 لتر/دقيقة (10 L/min)', '12 لتر/دقيقة (12 L/min)'] },
    { key: 'phase', ar: 'نوع التيار', en: 'Phase', options: ['أحادي 220 فولت (Single Phase 220V)', 'ثلاثي 380 فولت (Three Phase 380V)'] },
  ] },
  { products: ['غسالة ضغط عالي بنزين'], spec: [
    { key: 'pressure', ar: 'قوة الضغط', en: 'Pressure', options: ['180 بار (180 Bar)', '200 بار (200 Bar)', '250 بار (250 Bar)', '280 بار (280 Bar)'] },
    { key: 'engine', ar: 'قدرة المكينة', en: 'Engine', options: ['6.5 حصان (6.5 HP)', '7 حصان (7 HP)', '9 حصان (9 HP)', '13 حصان (13 HP)'] },
    { key: 'flow', ar: 'معدل التدفق', en: 'Flow', options: ['10 لتر/دقيقة (10 L/min)', '13 لتر/دقيقة (13 L/min)', '15 لتر/دقيقة (15 L/min)'] },
    { key: 'brand', ar: 'الماركة', en: 'Brand', options: ['هيونداي (Hyundai)', 'هوندا (Honda)', 'أخرى (Other)'] },
  ] },
  { products: ['غسالة ضغط عالي ديزل'], spec: [
    { key: 'pressure', ar: 'قوة الضغط', en: 'Pressure', options: ['200 بار (200 Bar)', '250 بار (250 Bar)', '300 بار (300 Bar)', '350 بار (350 Bar)'] },
    { key: 'engine', ar: 'قدرة المكينة', en: 'Engine', options: ['9 حصان (9 HP)', '10 حصان (10 HP)', '13 حصان (13 HP)'] },
    { key: 'flow', ar: 'معدل التدفق', en: 'Flow', options: ['13 لتر/دقيقة (13 L/min)', '15 لتر/دقيقة (15 L/min)', '18 لتر/دقيقة (18 L/min)'] },
    { key: 'start', ar: 'نظام التشغيل', en: 'Start', options: ['تشغيل يدوي (Recoil Start)', 'تشغيل كهربائي (Electric Start)'] },
  ] },
  { products: ['غسالة ضغط ماء ساخن (بخار)'], spec: [
    { key: 'pressure', ar: 'قوة الضغط', en: 'Pressure', options: ['150 بار (150 Bar)', '180 بار (180 Bar)', '200 بار (200 Bar)'] },
    { key: 'temp', ar: 'درجة حرارة الماء', en: 'Temp', options: ['حتى 80 درجة (Up to 80°C)', 'حتى 155 درجة (Up to 155°C)'] },
    { key: 'power', ar: 'نوع الطاقة', en: 'Power', options: ['كهرباء (Electric)', 'ديزل (Diesel)'] },
  ] },
  { products: ['خرطوم ضغط عالي (وايت) للغسالة'], spec: [
    { key: 'length', ar: 'الطول', en: 'Length', options: ['8 متر (8 m)', '10 متر (10 m)', '15 متر (15 m)', '20 متر (20 m)'] },
    { key: 'rating', ar: 'تحمل الضغط', en: 'Rating', options: ['160 بار (160 Bar)', '250 بار (250 Bar)', '400 بار (400 Bar)'] },
    { key: 'connection', ar: 'نوع الوصلة', en: 'Connection', options: ['وصلة سريعة (Quick Connect)', 'سن M22 (M22 Thread)'] },
  ] },
  { products: ['مسدس رش (طبنجة) للغسالة ضغط عالي'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مسدس عادي (Standard Gun)', 'مسدس دوّار توربو (Turbo Gun)'] },
    { key: 'rating', ar: 'تحمل الضغط', en: 'Rating', options: ['160 بار (160 Bar)', '250 بار (250 Bar)', '310 بار (310 Bar)'] },
    { key: 'compat', ar: 'التوافق', en: 'Compat', options: ['هيونداي (Hyundai AG275)', 'كارشر (Karcher)', 'عام (Universal)'] },
  ] },
  { products: ['لانس (بندقية) رش مع فوهة قابلة للتعديل'], spec: [
    { key: 'type', ar: 'نوع الفوهة', en: 'Type', options: ['فوهة مروحية (Fan Nozzle)', 'فوهة توربو دوّارة (Turbo Rotary)', 'قابلة للتعديل (Adjustable)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['قصير 40 سم (Short 40cm)', 'طويل 90 سم (Long 90cm)'] },
  ] },
  { products: ['فرشاة تنظيف أسطح دوّارة للغسالة'], spec: [
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['30 سم (30cm)', '35 سم (35cm)', '40 سم (40cm)'] },
    { key: 'rating', ar: 'تحمل الضغط', en: 'Rating', options: ['160 بار (160 Bar)', '250 بار (250 Bar)'] },
  ] },
  { products: ['خزان فوم (رغوة) صابون للغسالة ضغط عالي'], spec: [
    { key: 'capacity', ar: 'سعة الخزان', en: 'Capacity', options: ['0.5 لتر (0.5 L)', '1 لتر (1 L)', '1.5 لتر (1.5 L)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['بلاستيك (Plastic)', 'نحاس (Brass)'] },
    { key: 'compat', ar: 'التوافق', en: 'Compat', options: ['كارشر (Karcher)', 'وصلة سريعة عامة (Universal Quick Connect)'] },
  ] },
  { products: ['قائم معدني للجبس بورد (Stud)'], spec: [
    { key: 'width', ar: 'المقاس (العرض)', en: 'Width', options: ['50 مم (50mm)', '70 مم (70mm)', '72 مم (72mm)', '92 مم (92mm)', '100 مم (100mm)'] },
    { key: 'thickness', ar: 'سماكة الصاج (Gauge)', en: 'Thickness', options: ['0.5 مم (0.5mm)', '0.6 مم (0.6mm)', '0.7 مم (0.7mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['3 متر (3m)', 'حسب الطلب (Custom)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['صاج مجلفن (Galvanized Steel)'] },
  ] },
  { products: ['مسار معدني (Track / U-Channel)'], spec: [
    { key: 'width', ar: 'المقاس (العرض)', en: 'Width', options: ['50 مم (50mm)', '70 مم (70mm)', '72 مم (72mm)', '92 مم (92mm)', '100 مم (100mm)'] },
    { key: 'thickness', ar: 'سماكة الصاج (Gauge)', en: 'Thickness', options: ['0.5 مم (0.5mm)', '0.6 مم (0.6mm)', '0.7 مم (0.7mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['3 متر (3m)', 'حسب الطلب (Custom)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['صاج مجلفن (Galvanized Steel)'] },
  ] },
  { products: ['أوميغا سقف معلق (Furring Channel)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أوميغا 60 (Omega 60)', 'أوميغا 45 (Omega 45)', 'فيرنق مقطع C (C Furring)'] },
    { key: 'thickness', ar: 'سماكة الصاج (Gauge)', en: 'Thickness', options: ['0.5 مم (0.5mm)', '0.6 مم (0.6mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['3 متر (3m)', '4 متر (4m)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['صاج مجلفن (Galvanized Steel)'] },
  ] },
  { products: ['زاوية جدار (Wall Angle) للسقف المعلق'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['22×22 مم (22x22mm)', '25×25 مم (25x25mm)', '24×24 مم (24x24mm)'] },
    { key: 'thickness', ar: 'سماكة الصاج (Gauge)', en: 'Thickness', options: ['0.4 مم (0.4mm)', '0.5 مم (0.5mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['3 متر (3m)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['صاج مجلفن (Galvanized Steel)'] },
  ] },
  { products: ['زاوية حماية أركان (Corner Bead)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['معدني مجلفن (Galvanized Metal)', 'بي في سي (PVC)', 'بشريط ورقي (Paper-Faced)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['25×25 مم (25x25mm)', '31×31 مم (31x31mm)', '32×32 مم (32x32mm)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['2.5 متر (2.5m)', '3 متر (3m)'] },
  ] },
  { products: ['معجون جبس تلييس الفواصل (Joint Compound)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['جاهز (Ready-Mix)', 'بودرة (Powder / Setting)', 'طبقة نهائية (Topping / Finish)'] },
    { key: 'size', ar: 'العبوة', en: 'Size', options: ['20 كجم (20kg)', '25 كجم (25kg)', 'دلو 20 لتر (20L Bucket)'] },
    { key: 'brand', ar: 'الماركة', en: 'Brand', options: ['مدار جبسم (Madar Gypsum)', 'جيبروك (Gyproc)', 'نوف (Knauf)'] },
  ] },
  { products: ['شريط تسليح الفواصل (Jointing Tape)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ورقي (Paper Tape)', 'شبك فايبر لاصق (Fiberglass Mesh)', 'بزاوية معدنية (Metal Corner Tape)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['50 مم (50mm)', '52 مم (52mm)'] },
    { key: 'length', ar: 'طول اللفة', en: 'Length', options: ['45 متر (45m)', '75 متر (75m)', '90 متر (90m)', '150 متر (150m)'] },
  ] },
  { products: ['معلاق سقف قابل للضبط (Ceiling Hanger)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ياي زنبرك (Spring Clip / Rondo)', 'قضيب معلاق (Threaded Rod)', 'معلاق سلك (Wire Hanger)', 'قطعة توصيل (Soffit Cleat)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['أوميغا 60 (For Omega 60)', 'أوميغا 45 (For Omega 45)', 'قضيب 6 مم (6mm Rod)', 'قضيب 8 مم (8mm Rod)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['حديد مجلفن (Galvanized Steel)'] },
  ] },
  { products: ['وصلة تعشيق قوائم (Stud Connector / Splice)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['وصلة مسار (Track Splice)', 'زاوية تثبيت (Fixing Angle)', 'مشبك تقاطع (Cross Clip)'] },
    { key: 'width', ar: 'المقاس المناسب', en: 'Width', options: ['50 مم (50mm)', '70 مم (70mm)', '100 مم (100mm)'] },
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['صاج مجلفن (Galvanized Steel)'] },
  ] },
  { products: ['شريط عازل تحت القوائم (Acoustic Isolation Strip)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['فوم لاصق (Self-Adhesive Foam)', 'مطاطي (Rubber)', 'لبادة صوتية (Acoustic Felt)'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['50 مم (50mm)', '70 مم (70mm)', '100 مم (100mm)'] },
    { key: 'length', ar: 'طول اللفة', en: 'Length', options: ['10 متر (10m)', '30 متر (30m)'] },
  ] },
  { products: ['شبك تسييج تشيلنك (نسيج ماسي)'], spec: [
    { key: 'coating', ar: 'الطلاء/الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'مطلي PVC (PVC Coated)'] },
    { key: 'wireDiameter', ar: 'قطر السلك', en: 'WireDiameter', options: ['1.9 ملم', '2.0 ملم', '2.5 ملم', '2.7 ملم', '3.0 ملم'] },
    { key: 'meshOpening', ar: 'فتحة العين (المربع)', en: 'MeshOpening', options: ['50×50 ملم', '60×60 ملم', '70×70 ملم'] },
    { key: 'height', ar: 'الارتفاع', en: 'Height', options: ['1.0 متر', '1.5 متر', '2.0 متر', '2.5 متر', '3.0 متر'] },
    { key: 'rollLength', ar: 'طول اللفة', en: 'RollLength', options: ['10 متر', '15 متر'] },
  ] },
  { products: ['شبك مربعات ملحوم (لفة/بانل)'], spec: [
    { key: 'form', ar: 'الشكل', en: 'Form', options: ['لفة (Roll)', 'بانل/لوح (Panel)'] },
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'مطلي PVC (PVC Coated)', 'أسود/غير مجلفن (Black)'] },
    { key: 'wireDiameter', ar: 'قطر السلك', en: 'WireDiameter', options: ['2.0 ملم', '2.5 ملم', '3.0 ملم', '4.0 ملم', '5.0 ملم'] },
    { key: 'meshOpening', ar: 'فتحة العين', en: 'MeshOpening', options: ['25×25 ملم', '50×50 ملم', '75×75 ملم', '100×100 ملم', '50×100 ملم'] },
    { key: 'panelSize', ar: 'مقاس اللوح', en: 'PanelSize', options: ['2.0×1.0 متر', '2.4×1.2 متر', '3.0×1.5 متر'] },
  ] },
  { products: ['سياج حديد ملحوم مطلي بودرة (بانل جاهز)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مسطح 2D', 'منحني 3D (V-Bend)', 'بانل تعرجات (Curvy)'] },
    { key: 'height', ar: 'الارتفاع', en: 'Height', options: ['1.2 متر', '1.5 متر', '1.8 متر', '2.0 متر', '2.4 متر'] },
    { key: 'width', ar: 'العرض', en: 'Width', options: ['2.5 متر', '3.0 متر'] },
    { key: 'wireDiameter', ar: 'قطر السلك', en: 'WireDiameter', options: ['4.0 ملم', '5.0 ملم', '6.0 ملم'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['أخضر (Green)', 'أسود (Black)', 'رمادي (Grey)', 'أبيض (White)'] },
  ] },
  { products: ['أعمدة تسييج (قوائم شبك)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ماسورة دائرية (Round Post)', 'زاوية حديد (Angle Iron)', 'عمود مربع (Square Post)'] },
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'مطلي بودرة (Powder Coated)'] },
    { key: 'diameter', ar: 'القطر/المقطع', en: 'Diameter', options: ['48 ملم (1.5 بوصة)', '60 ملم (2 بوصة)', '76 ملم (3 بوصة)'] },
    { key: 'height', ar: 'الطول', en: 'Height', options: ['1.5 متر', '2.0 متر', '2.5 متر', '3.0 متر'] },
    { key: 'role', ar: 'الاستخدام', en: 'Role', options: ['عمود وسط (Line Post)', 'عمود ركن (Corner Post)', 'عمود شد (Terminal/End Post)'] },
  ] },
  { products: ['شبك جبيونات (قفص جباينة حجري)'], spec: [
    { key: 'weave', ar: 'طريقة التصنيع', en: 'Weave', options: ['سداسي مجدول (Woven Hexagonal)', 'ملحوم (Welded)'] },
    { key: 'coating', ar: 'الطلاء', en: 'Coating', options: ['مجلفن (Galvanized)', 'جلفانايز ثقيل + PVC (Galfan/PVC)'] },
    { key: 'boxSize', ar: 'مقاس الصندوق', en: 'BoxSize', options: ['1×1×1 متر', '2×1×1 متر', '2×1×0.5 متر', '3×1×1 متر', '4×1×1 متر'] },
    { key: 'meshOpening', ar: 'فتحة العين', en: 'MeshOpening', options: ['60×80 ملم', '80×100 ملم', '100×120 ملم'] },
    { key: 'wireDiameter', ar: 'قطر السلك', en: 'WireDiameter', options: ['2.7 ملم', '3.0 ملم', '3.4 ملم'] },
  ] },
  { products: ['شبك تمدد إكسباندد (حديد ممدد)'], spec: [
    { key: 'material', ar: 'الخامة', en: 'Material', options: ['حديد (Steel)', 'مجلفن (Galvanized)', 'ألمنيوم (Aluminum)', 'ستانلس (Stainless)'] },
    { key: 'sheetSize', ar: 'مقاس اللوح', en: 'SheetSize', options: ['2.0×1.0 متر', '2.4×1.2 متر', '3.0×1.25 متر'] },
    { key: 'thickness', ar: 'سماكة اللوح', en: 'Thickness', options: ['1.0 ملم', '1.5 ملم', '2.0 ملم', '3.0 ملم'] },
    { key: 'meshType', ar: 'نوع العين', en: 'MeshType', options: ['معينات ناعمة (Micro)', 'معينات وسط (Standard)', 'معينات كبيرة (Heavy)'] },
  ] },
  { products: ['سياج موقع مؤقت (حواجز موقع متنقلة)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['بانل شبك متنقل (Mesh Panel)', 'حاجز هرقل (Heras Type)', 'سياج مموه شينكو (Corrugated Hoarding)'] },
    { key: 'panelSize', ar: 'مقاس اللوح', en: 'PanelSize', options: ['2.0×2.1 متر', '3.5×2.0 متر', '2.4×2.1 متر'] },
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'مطلي (Coated)'] },
    { key: 'base', ar: 'القاعدة', en: 'Base', options: ['قاعدة بلاستيك (Plastic Foot)', 'قاعدة خرسانية (Concrete Block)'] },
    { key: 'accessory', ar: 'الملحقات', en: 'Accessory', options: ['كلبس ربط (Coupler Clamp)', 'بدون ملحقات'] },
  ] },
  { products: ['سلك شائك (شبوك)'], spec: [
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'مطلي PVC (PVC Coated)'] },
    { key: 'wireGauge', ar: 'قطر السلك', en: 'WireGauge', options: ['1.6 ملم', '2.0 ملم', '2.5 ملم'] },
    { key: 'twist', ar: 'عدد الجدائل', en: 'Twist', options: ['مزدوج (2 سلك)', 'مفرد (1 سلك)'] },
    { key: 'coilWeight', ar: 'وزن اللفة', en: 'CoilWeight', options: ['10 كجم', '20 كجم', '25 كجم'] },
  ] },
  { products: ['أسلاك كونسيرتينا (شائكة حلاقية)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['حلزوني كونسيرتينا (Concertina)', 'مسطح شفرات (Flat Wrap)', 'مزدوج ضفيرة (Double Coil)'] },
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'ستانلس (Stainless)'] },
    { key: 'coilDiameter', ar: 'قطر اللفة', en: 'CoilDiameter', options: ['450 ملم', '600 ملم', '700 ملم', '980 ملم'] },
    { key: 'bladeType', ar: 'نوع الشفرة', en: 'BladeType', options: ['BTO-22', 'BTO-30', 'CBT-65'] },
  ] },
  { products: ['شبك سداسي (شبك دجاج/تربة)'], spec: [
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن (Galvanized)', 'مطلي PVC (PVC Coated)'] },
    { key: 'meshOpening', ar: 'فتحة العين', en: 'MeshOpening', options: ['13 ملم (1/2 بوصة)', '25 ملم (1 بوصة)', '50 ملم (2 بوصة)'] },
    { key: 'wireGauge', ar: 'قطر السلك', en: 'WireGauge', options: ['0.7 ملم', '0.9 ملم', '1.0 ملم'] },
    { key: 'rollSize', ar: 'مقاس اللفة', en: 'RollSize', options: ['1×25 متر', '1.5×25 متر', '1×50 متر'] },
  ] },
  { products: ['مشبك أرضي (جريتنج) ملحوم'], spec: [
    { key: 'coating', ar: 'الخامة', en: 'Coating', options: ['مجلفن غمس ساخن (Hot-Dip Galvanized)', 'أسود مدهون (Painted Black)'] },
    { key: 'barSpacing', ar: 'تباعد الأسياخ', en: 'BarSpacing', options: ['30×100 ملم', '40×100 ملم', '30×50 ملم'] },
    { key: 'barSize', ar: 'مقاس السيخ الحامل', en: 'BarSize', options: ['25×3 ملم', '25×5 ملم', '40×5 ملم', '50×5 ملم'] },
    { key: 'panelSize', ar: 'مقاس اللوح', en: 'PanelSize', options: ['1×2 متر', '1×6 متر'] },
  ] },
  { products: ['كباس باب سياج ومفصلات'], spec: [
    { key: 'component', ar: 'المكوّن', en: 'Component', options: ['كباس باب (Gate Latch)', 'مفصلة فراشة (Butt Hinge)', 'مفصلة أوتوماتيك (Spring Hinge)', 'عجلة باب سحاب (Gate Wheel)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مجلفن (Galvanized)', 'مطلي بودرة (Powder Coated)', 'ستانلس (Stainless)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['صغير (Small)', 'وسط (Medium)', 'كبير هيفي (Heavy Duty)'] },
  ] },

  // البلاط والبورسلين والسيراميك (الوحدة م²)
  { products: ['بلاط بورسلين حجري','بلاط بورسلين رمادي','بلاط بورسلين رخامي','بلاط بورسلين خشبي','بلاط بورسلين خرساني','بلاط سيراميك','بلاط سيراميك جدار','بلاط بورسلين جدار'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['60×60','80×80','120×60','30×60','30×30','100×100','120×120','حسب الطلب'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مطفي Matt','لامع Polished','نصف لامع','محبب Anti-slip','مزخرف'] },
    { key: 'grade', ar: 'الدرجة', en: 'Grade', options: ['أولى','ممتازة','تجارية'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['8 مم','9 مم','10 مم','12 مم','20 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','كرتون'] },
  ] },
  // الرخام والجرانيت والحجر (الوحدة م²)
  { products: ['بلاط رخام طبيعي','جرانيت','حجر بازلت','حجر صناعي'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['2 سم','3 سم','حسب الطلب'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مصقول Polished','مطفي Honed','مفجّر Flamed','مضلّع'] },
    { key: 'origin', ar: 'المصدر', en: 'Origin', options: ['سعودي','مصري','تركي','إيطالي','صيني','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','حسب القطعة'] },
  ] },
  // الأرضيات الخشبية (باركيه/فينيل/SPC)
  { products: ['باركيه خشبي','فينيل'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['HDF','SPC','WPC','فينيل لاصق','باركيه طبيعي'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['4 مم','6 مم','8 مم','12 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','كرتون'] },
  ] },
  // الدهانات (الوحدة جالون/لتر)
  { products: ['دهان أكريليك','دهان زيتي','دهان مضاد للرطوبة'], spec: [
    { key: 'usage', ar: 'الاستخدام', en: 'Usage', options: ['داخلي','خارجي','معدن','خشب','أساس Primer'] },
    { key: 'sheen', ar: 'اللمعان', en: 'Sheen', options: ['مطفي Matt','نصف لامع','لامع','حريري Silk'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 18 لتر','بستلة','لتر'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة','جوتن Jotun','الجزيرة','ناشيونال','سايبس'] },
  ] },
  // الجبس بورد
  { products: ['جبس بورد حوائط','جبس بورد مقاوم رطوبة MR','جبس بورد مقاوم حريق FR','جبس بورد مزدوج'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['9 مم','12.5 مم','15 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح','م² (متر مربع)'] },
  ] },
  // العزل (صوف/فوم/XPS)
  { products: ['عازل XPS للأسطح','صوف صخري Rock Wool','فوم عازل حراري'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['25 مم','40 مم','50 مم','75 مم','100 مم'] },
    { key: 'density', ar: 'الكثافة', en: 'Density', options: ['حسب المواصفة','40 kg/m³','60 kg/m³','80 kg/m³','100 kg/m³'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','م³ (متر مكعب)','لفة'] },
  ] },
  // أنابيب السباكة (القطر + الوحدة)
  { products: ['أنابيب PPR PN20','أنابيب PPR PN25','أنابيب نحاس مياه باردة','أنابيب نحاس مياه حارة','أنابيب CPVC مياه حارة','أنابيب PEX'], spec: [
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['20 مم','25 مم','32 مم','40 مم','50 مم','63 مم','75 مم','90 مم','110 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','ماسورة 4م','ماسورة 6م'] },
  ] },
  // إنارة LED (القدرة + اللون)
  { products: ['كشاف LED Downlight','كشاف LED سطحي','كشاف LED متدلي','كشاف LED فلود خارجي','كشاف LED صناعي High Bay','كشاف LED بانل 600×600','كشاف LED بانل 300×1200'], spec: [
    { key: 'power', ar: 'القدرة', en: 'Power', options: ['3W','5W','7W','9W','12W','18W','24W','36W','50W','100W','150W','200W'] },
    { key: 'color', ar: 'لون الإضاءة', en: 'Color temp', options: ['أبيض بارد 6500K','أبيض طبيعي 4000K','أصفر دافئ 3000K'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','كرتون'] },
  ] },
  // قواطع كهربائية
  { products: ['قاطع MCB 1P','قاطع MCB 3P','قاطع MCCB'], spec: [
    { key: 'amp', ar: 'الأمبير', en: 'Rating (A)', options: ['6A','10A','16A','20A','25A','32A','40A','63A','80A','100A','125A'] },
    { key: 'poles', ar: 'عدد الأقطاب', en: 'Poles', options: ['1P','2P','3P','4P'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  // ═══ الأبواب والشبابيك والواجهات ═══
  // الأبواب الخشبية
  { products: ['أبواب خشب داخلية','أبواب خشب مع إطار معدني'], spec: [
    { key: 'core', ar: 'المادة/النوع', en: 'Material', options: ['خشب صلب (Solid wood)','HDF','MDF','معبّأ (Solid core)','مفرّغ (Hollow core)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['قشرة طبيعية (Veneer)','ميلامين','CPL/HPL','لاكيه','دهان','PVC'] },
    { key: 'fire_rating', ar: 'مقاومة الحريق', en: 'Fire rating', options: ['غير مقاوم (N/A)','20 دقيقة','30 دقيقة','45 دقيقة','60 دقيقة','90 دقيقة'] },
    { key: 'size', ar: 'مقاس الباب (عرض×ارتفاع)', en: 'Door size', options: ['90×210 سم','80×210 سم','100×210 سم','70×210 سم','حسب الطلب'] },
    { key: 'opening', ar: 'مقاس الفتحة الإنشائي (للإطار)', en: 'Structural opening', options: ['910×2110 مم','810×2110 مم','1010×2110 مم','710×2110 مم','حسب المخطط'] },
    { key: 'frame', ar: 'الإطار', en: 'Frame', options: ['إطار خشب','إطار معدني (حلق صاج)','بدون إطار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد (باب كامل)','الورقة فقط'] },
  ] },
  // أبواب الحريد المقاومة للحريق
  { products: ['أبواب حديد مقاومة حريق 45 دقيقة','أبواب حديد مقاومة حريق 90 دقيقة'], spec: [
    { key: 'leaf', ar: 'عدد الدرف', en: 'Leaves', options: ['مفرد (Single)','مزدوج (Double)'] },
    { key: 'size', ar: 'مقاس الباب', en: 'Door size', options: ['90×210 سم','100×210 سم','120×210 سم (مزدوج)','حسب الطلب'] },
    { key: 'opening', ar: 'مقاس الفتحة الإنشائي (للإطار)', en: 'Structural opening', options: ['1010×2110 مم','910×2110 مم','2200×1010 مم','حسب المخطط'] },
    { key: 'accessories', ar: 'الملحقات', en: 'Accessories', options: ['بدون','ذراع إغلاق (Door closer)','مقبض ذعر (Panic bar)','نافذة رؤية (Vision panel)','الكل'] },
    { key: 'cert', ar: 'الشهادة', en: 'Certification', options: ['معتمد الدفاع المدني','UL/BS مطابق','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // أبواب ونوافذ الألمنيوم والـUPVC
  { products: ['أبواب ألمنيوم','نوافذ ألمنيوم زجاج مزدوج','نوافذ UPVC'], spec: [
    { key: 'thermal', ar: 'كسر حراري', en: 'Thermal break', options: ['بدون','بكسر حراري (Thermal break)'] },
    { key: 'opening', ar: 'طريقة الفتح', en: 'Opening', options: ['منزلق (Sliding)','مفصلي (Hinged)','شباك (Casement)','مطوي (Folding)','ثابت (Fixed)','نطّاط (Tilt & Turn)'] },
    { key: 'glazing', ar: 'الزجاج', en: 'Glazing', options: ['مفرد','مزدوج (Double glazed)','مزدوج بأرجون','سيكوريت مزدوج'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الفنار','تكنال (Technal)','شنايدر ألمنيوم','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','عدد'] },
  ] },
  // أبواب الستانلس
  { products: ['أبواب ستانلس'], spec: [
    { key: 'grade', ar: 'درجة الستانلس', en: 'SS Grade', options: ['304','316','316L'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مصقول (Mirror)','مطفي (Satin)','مفروش (Brushed)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['90×210 سم','100×210 سم','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','م² (متر مربع)'] },
  ] },
  // الأبواب الدوّارة/اللفّافة
  { products: ['باب دوار Rolling Shutter'], spec: [
    { key: 'operation', ar: 'التشغيل', en: 'Operation', options: ['يدوي','كهربائي (موتور)','كهربائي + يدوي طوارئ'] },
    { key: 'material', ar: 'المادة', en: 'Material', options: ['ألمنيوم','حديد مجلفن','شبري (Perforated)','بولي كربونات شفاف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','عدد'] },
  ] },
  // الكلادينج (ACM)
  { products: ['كلادينج ألمنيوم كومبوزيت ACM'], spec: [
    { key: 'core', ar: 'نوع القلب', en: 'Core type', options: ['PE (عادي)','FR (مقاوم حريق)','A2 (غير قابل للاشتعال)'] },
    { key: 'thickness', ar: 'السماكة الكلية', en: 'Panel thickness', options: ['3 مم','4 مم','6 مم'] },
    { key: 'coating', ar: 'سماكة الألمنيوم', en: 'Aluminium skin', options: ['0.21 مم','0.30 مم','0.40 مم','0.50 مم'] },
    { key: 'finish', ar: 'الطلاء', en: 'Coating', options: ['PVDF','PE','معدني (Metallic)','خشبي','حجري'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','ألوبوند (Alubond)','رينوبوند (Reynobond)','ألوكوبوند (Alucobond)','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','لوح'] },
  ] },
  // الزجاج (الواجهات)
  // نوع الزجاج محدّد باسم المنتج — فنكتفي بالسماكة والتظليل (بلا حقل «نوع» مكرّر)
  { products: ['زجاج عادي','زجاج رفلكتيف'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['4 مم','5 مم','6 مم','8 مم','10 مم','12 مم','حسب الطلب'] },
    { key: 'tint', ar: 'اللون/التظليل', en: 'Tint', options: ['شفاف','برونزي','أزرق','رمادي (دخاني)','أخضر','عاكس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)'] },
  ] },
  { products: ['زجاج سيكوريت Tempered'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['6 مم','8 مم','10 مم','12 مم','15 مم','19 مم','حسب الطلب'] },
    { key: 'tint', ar: 'اللون/التظليل', en: 'Tint', options: ['شفاف','برونزي','أزرق','رمادي (دخاني)','أخضر','عاكس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)'] },
  ] },
  { products: ['زجاج عازل مزدوج'], spec: [
    { key: 'makeup', ar: 'التركيب', en: 'Make-up', options: ['6+12+6','8+12+8','6+16+6','حسب الطلب'] },
    { key: 'glass_type', ar: 'نوع الألواح', en: 'Glass type', options: ['شفاف عادي','سيكوريت','لو-إي (Low-E)','رفلكتيف','لامينيت'] },
    { key: 'tint', ar: 'اللون/التظليل', en: 'Tint', options: ['شفاف','برونزي','أزرق','رمادي (دخاني)','أخضر','عاكس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)'] },
  ] },
  // الواجهات الزجاجية (Curtain Wall)
  { products: ['واجهات زجاجية Curtain Wall'], spec: [
    { key: 'system', ar: 'النظام', en: 'System', options: ['Stick (تجميع بالموقع)','Unitized (وحدات جاهزة)','Semi-unitized','Spider (شبكي)','Structural Glazing'] },
    { key: 'glazing', ar: 'الزجاج', en: 'Glazing', options: ['مزدوج عازل (IGU)','لامينيت مقسّى','لو-إي (Low-E)','رفلكتيف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)'] },
  ] },
  // كسوة الواجهات الحجرية
  { products: ['واجهات حجر'], spec: [
    { key: 'stone', ar: 'نوع الحجر', en: 'Stone', options: ['جرانيت','رخام','حجر رملي (Sandstone)','حجر جيري (Limestone)','بازلت','ترافنتين','حسب الطلب'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['2 سم','3 سم','4 سم','حسب التصميم'] },
    { key: 'fixing', ar: 'طريقة التثبيت', en: 'Fixing', options: ['تثبيت ميكانيكي (نظام كلادينج)','مدادات ومسامير ستانلس','لاصق (Adhesive)','حسب التصميم'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مصقول (Polished)','مطفي (Honed)','مفجّر (Flamed)','طبيعي خام'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)'] },
  ] },
  // الدرابزين الزجاجي
  { products: ['درابزين زجاجي بحواجز'], spec: [
    { key: 'glass', ar: 'الزجاج', en: 'Glass', options: ['لامينيت مقسّى 10+10','لامينيت مقسّى 12+12','سيكوريت 12 مم','حسب الطلب'] },
    { key: 'fixing', ar: 'طريقة التثبيت', en: 'Fixing', options: ['قاعدة ألمنيوم (U-channel)','سبايدر (Standoff)','قوائم معدنية (Posts)','مشابك ستانلس'] },
    { key: 'handrail', ar: 'اليد (Handrail)', en: 'Handrail', options: ['بدون','ستانلس','ألمنيوم','خشب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','م² (متر مربع)'] },
  ] },
  // ═══ مواد مدنية إضافية (مقترحات مراجَعة من الذكاء — القطاع المدني) ═══
  { products: ['جير'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['جير مطفأ (Hydrated)','جير حي (Quicklime)','جير زراعي'] },
    { key: 'packaging', ar: 'التعبئة', en: 'Packaging', options: ['كيس 20 كجم','كيس 25 كجم','سائب (Bulk)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','مصنع الجير العربي','مصانع محلية أخرى'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس','طن'] },
  ] },
  { products: ['جبصين'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['جبس تشكيل (عادي/مغربي)','جبس زراعي','جبس بورد (بودرة)'] },
    { key: 'setting_time', ar: 'سرعة الشك', en: 'Setting Time', options: ['عادي','سريع الشك','بطيء الشك'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الجبس الأهلية','مدى (Mada)','مصنع محلي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم','كيس 30 كجم','طن'] },
  ] },
  { products: ['طوب فارغ'], spec: [
    { key: 'material', ar: 'المادة', en: 'Material', options: ['أسمنتي مفرغ','بركاني مفرغ (عازل)','أحمر مفرغ'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['20x20x40 سم','15x20x40 سم','10x20x40 سم'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الخياط','العمودي','مصانع البلوك المحلية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['ألف حبة','حبة','طبلية'] },
  ] },
  { products: ['بلوك AAC خفيف'], spec: [
    { key: 'density', ar: 'الكثافة', en: 'Density', options: ['400 كجم/م³','500 كجم/م³','600 كجم/م³'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['20x20x60 سم','25x20x60 سم','15x20x60 سم','10x20x60 سم'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','سيبوريكس (Siporex)','مباني (Mabani)','خفيفة (Khafeefah)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر مكعب','ألف حبة','طبلية'] },
  ] },
  { products: ['حديد تسليح سلك'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['سلك رباط أسود ملدن','سلك مجلفن'] },
    { key: 'gauge', ar: 'المقاس (Gauge)', en: 'Gauge', options: ['16 SWG','18 SWG','20 SWG'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','مصانع محلية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة','كجم','طن'] },
  ] },
  { products: ['شبكة حديد جاهزة'], spec: [
    { key: 'thickness', ar: 'سماكة السلك', en: 'Wire Thickness', options: ['5 مم','6 مم','7 مم','8 مم'] },
    { key: 'mesh_size', ar: 'مقاس الفتحات', en: 'Mesh Size', options: ['15x15 سم','20x20 سم'] },
    { key: 'sheet_size', ar: 'مقاس الشبكة', en: 'Sheet Size', options: ['2x5 متر','2.4x6 متر'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','سابك','الراجحي','مصنع محلي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (شبكة)','طن'] },
  ] },
  { products: ['صلب هيكلي IPE'], spec: [
    { key: 'size', ar: 'المقاس (Profile)', en: 'Profile Size', options: ['IPE 80','IPE 100','IPE 120','IPE 140','IPE 160','IPE 180','IPE 200','IPE 220','IPE 240','IPE 270','IPE 300','IPE 330','IPE 360','IPE 400','IPE 450','IPE 500','IPE 550','IPE 600'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر'] },
    { key: 'grade', ar: 'درجة الحديد', en: 'Grade', options: ['S275JR','S355JR'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','حديد سابك','الراجحي','مستورد (كوري/صيني)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','حبة (كمرة)'] },
  ] },
  { products: ['رمل بناء'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['رمل أبيض (مغسول)','رمل أحمر','رمل سافي'] },
    { key: 'usage', ar: 'الاستخدام', en: 'Usage', options: ['للياسة','للبناء','للدفان','للخرسانة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر مكعب (م³)','رد (تريلا 24م³)','رد (قلاب 12م³)'] },
  ] },
  { products: ['كسارة'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['بحص 3/4 بوصة','بحص 3/8 بوصة','بودرة كسارة (زيرو)','بحص مخلوط'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['حجر جيري','بازلت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر مكعب (م³)','رد (تريلا 24م³)'] },
  ] },
  { products: ['عازل مائي للأساسات Liquid Applied'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أساس مائي (Water Based)','أساس زيتي (Solvent Based)','مطاطي (Rubberized)'] },
    { key: 'packaging', ar: 'التعبئة', en: 'Packaging', options: ['برميل 20 لتر','برميل 200 لتر'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','بيتومات (Bitumat)','ديرمابيت (Dermabit)','فوسروك (Fosroc)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل','لتر'] },
  ] },
  // ═══ مواسير الميكانيك — منتج لكل نوع + خيار المقاس ═══
  { products: ['أنابيب PPR تغذية'], spec: [
    { key: 'diameter', ar: 'القطر (mm)', en: 'Diameter (mm)', options: ['20','25','32','40','50','63','75','90','110','125','160','حسب المخطط'] },
    { key: 'pn', ar: 'الفئة (PN)', en: 'Class (PN)', options: ['PN16','PN20','PN25','حسب المواصفة'] },
    { key: 'use', ar: 'الاستخدام', en: 'Use', options: ['مياه باردة Cold','مياه حارة Hot','مقوّى بالألياف Fiber'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','عدد (ماسورة 4م)'] },
  ] },
  { products: ['أنابيب uPVC صرف صحي'], spec: [
    { key: 'diameter', ar: 'القطر (mm)', en: 'Diameter (mm)', options: ['50','75','110','160','200','250','315','حسب المخطط'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['صرف صحي Soil','تهوية Vent','مطر Rain'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','عدد (ماسورة 6م)'] },
  ] },
  { products: ['أنابيب CPVC'], spec: [
    { key: 'diameter', ar: 'القطر (mm)', en: 'Diameter (mm)', options: ['20','25','32','40','50','65','80','100','110','150','حسب المخطط'] },
    { key: 'use', ar: 'الاستخدام', en: 'Use', options: ['مياه حارة Hot','مياه باردة Cold','حريق Fire'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','عدد (ماسورة)'] },
  ] },
  { products: ['أنابيب فولاذية لمكافحة الحريق Sprinkler'], spec: [
    { key: 'diameter', ar: 'القطر (mm)', en: 'Diameter (mm)', options: ['25','32','40','50','65','80','100','125','150','200','حسب المخطط'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أسود Black','مجلفن GI'] },
    { key: 'schedule', ar: 'السماكة (Schedule)', en: 'Schedule', options: ['Sch10','Sch40','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','عدد (ماسورة 6م)','طن'] },
  ] },
  { products: ['أنابيب مياه مبردة فولاذية Sch40'], spec: [
    { key: 'diameter', ar: 'القطر (DN)', en: 'Diameter (DN)', options: ['DN65','DN80','DN100','DN125','DN150','DN200','DN250','DN300','حسب المخطط'] },
    { key: 'schedule', ar: 'السماكة (Schedule)', en: 'Schedule', options: ['Sch40','Sch80','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','عدد (ماسورة 6م)','طن'] },
  ] },
  // ═══ أنابيب HDPE صرف الأمطار — منتج واحد + خيار المقاس ═══
  { products: ['أنابيب HDPE صرف أمطار (SDR11)'], spec: [
    { key: 'diameter', ar: 'القطر (mm)', en: 'Diameter (mm)', options: ['100','150','200','250','300','400','500','600','حسب المخطط'] },
    { key: 'sdr', ar: 'الفئة (SDR/PN)', en: 'Class (SDR/PN)', options: ['SDR11 (PN16)','SDR17 (PN10)','SDR26 (PN6)','حسب المواصفة'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','لفة Coil','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','عدد (ماسورة)','لفة'] },
  ] },
  { products: ['أنابيب خرسانية صرف خارجي'], spec: [
    { key: 'diameter', ar: 'القطر الداخلي', en: 'Inner Diameter', options: ['300 مم','400 مم','600 مم','800 مم','1000 مم'] },
    { key: 'class', ar: 'الدرجة (Class)', en: 'Class', options: ['Class 2','Class 3','Class 4'] },
    { key: 'lining', ar: 'التبطين', en: 'Lining', options: ['مبطنة (HDPE/PVC)','غير مبطنة','مطلية إيبوكسي'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الأنابيب السعودية','مصنع محلي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','حبة (أنبوب)'] },
  ] },
  // ═══ خشب البناء (Construction Timber) — مواصفات من مدار ═══
  { products: ['خشب بناء (Construction Timber)'], spec: [
    { key: 'origin', ar: 'المنشأ', en: 'Origin', options: ['سويدي Swedish','نمساوي/تزانة Spruce','ألماني German','روماني Romanian','كندي Canadian','شيلي Chilean','حسب الطلب'] },
    { key: 'thickness', ar: 'السماكة (مم)', en: 'Thickness (mm)', options: ['18','22','25','32','35','38','40','45','48','68','72','92','95','145'] },
    { key: 'length', ar: 'الطول (م)', en: 'Length (m)', options: ['3.0','3.3','3.6','3.9','4.2','4.5','4.8','5.1','5.4','حسب القص'] },
    { key: 'drying', ar: 'التجفيف', en: 'Drying', options: ['مجفّف فرن K/D','مجفّف هواء A/D'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³','عود','حبة','بندل'] },
  ] },
  { products: ['ألواح بليود (طوبار) Plywood'], spec: [
    { key: 'origin', ar: 'المنشأ', en: 'Origin', options: ['إندونيسي','ماليزي','صيني','روسي Russian','أوروبي','حسب الطلب'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['9 مم','12 مم','15 مم','18 مم','21 مم'] },
    { key: 'sheet', ar: 'مقاس اللوح', en: 'Sheet size', options: ['1220×2440 مم','حسب الطلب'] },
    { key: 'film_face', ar: 'الطبقة الخارجية', en: 'Film Face', options: ['فيلم أسود (Black Film)','فيلم بني (Brown Film)','بدون فيلم (عادي)'] },
    { key: 'brand', ar: 'الماركة (اختياري)', en: 'Brand (optional)', options: ['أي ماركة معتمدة','Madarplex','Tigercore','SVEZA','Korindo','Marineplex','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح','بندل (حزمة)'] },
  ] },
  { products: ['مرابيع خشب (طوبار)'], spec: [
    { key: 'type', ar: 'نوع الخشب', en: 'Wood Type', options: ['خشب أبيض (تزانة/روماني)','خشب سويدي'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['10x10 سم (4x4 بوصة)','5x10 سم (2x4 بوصة)'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['3 متر','4 متر','6 متر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','متر مكعب (م³)'] },
  ] },
  { products: ['زيت فك الطوبار Shutter Oil'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['أساس مائي','أساس معدني (زيتي)'] },
    { key: 'packaging', ar: 'التعبئة', en: 'Packaging', options: ['برميل 20 لتر','برميل 200 لتر'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','سيكا (Sika)','فوسروك (Fosroc)','بايونير'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل','لتر'] },
  ] },
  { products: ['حجر كيرب'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مائل (Mountable)','قائم (Barrier)','نصف دائري'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['15x30x50 سم','15x25x50 سم','حسب المواصفات (البلدية)'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['رمادي (عادي)','أصفر','أحمر'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','مصانع محلية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','حبة'] },
  ] },
  // ═══ مواد معمارية/كهربائية مضافة (مراجعة الذكاء) ═══
  { products: ['غراء وترويبة بلاط'], spec: [
    { key: 'item', ar: 'الصنف', en: 'Item', options: ['غراء بلاط عادي (C1)','غراء بورسلان عالي الالتصاق (C2)','ترويبة بلاط بورسلان','ترويبة إيبوكسية'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','سافيتو (Saveto)','الجزيرة (Jazeera)','فيتونيت (Vetonit)','مابي (Mapei)','لاتيكريت (Laticrete)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم','كيس 25 كجم','جالون (للترويبة)'] },
  ] },
  { products: ['حديد أسقف مستعارة'], spec: [
    { key: 'item', ar: 'القطاع', en: 'Profile Type', options: ['أوميجا (Omega Channel)','سي شانيل (C-Channel)','زاوية جدار (Wall Angle)','قضيب تعليق (Threaded Rod)'] },
    { key: 'thickness', ar: 'السماكة (مم)', en: 'Thickness (mm)', options: ['0.4 مم','0.5 مم','0.6 مم','0.7 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (لوح/قضيب)'] },
  ] },
  { products: ['خلطة لياسة جاهزة'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['لياسة إسمنتية تقليدية','لياسة معالجة بالألياف','لياسة مقاومة للرطوبة'] },
    { key: 'packaging', ar: 'التعبئة', en: 'Packaging', options: ['كيس 50 كجم','سائب (Bulk / صومعة)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','فوسروك','سيكا','مصانع محلية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس','طن'] },
  ] },
  { products: ['إكسسوارات لياسة'], spec: [
    { key: 'item', ar: 'الصنف', en: 'Item', options: ['شبك لياسة حديد (ممدد)','شبك لياسة فايبر','زاوية لياسة حديد مجلفن','زاوية لياسة PVC'] },
    { key: 'size', ar: 'المقاس/السماكة', en: 'Size/Thickness', options: ['شبك 4.5 بوصة','شبك 6 بوصة','زاوية 2.4 متر','زاوية 3.0 متر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','شدة (باقة)','لفة'] },
  ] },
  { products: ['مواسير كهرباء EMT/PVC'], spec: [
    { key: 'material', ar: 'المادة', en: 'Material', options: ['PVC (بلاستيك)','EMT (معدن)','RGS (معدن ثقيل)'] },
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['20 مم','25 مم','32 مم','50 مم'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','نيبرو (Nepro)','الأضواء','بلاستيك الوطني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3 متر)'] },
  ] },
  // ── مواصفات مطبّقة على مواد عامة موجودة (مراجعة الذكاء) ──
  { products: ['غشاء عازل للأسطح'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['4 مم','3 مم'] },
    { key: 'reinforcement', ar: 'نوع التدعيم', en: 'Reinforcement', options: ['بوليستر 180 جم','بوليستر 200 جم','فايبر جلاس'] },
    { key: 'finish', ar: 'السطح الخارجي', en: 'Surface Finish', options: ['فيلم بولي إيثيلين (ناعم)','مبحص/حصى (Granule) للحماية من الشمس'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','بيتومات (Bitumat)','عوازل (Awan)','ديرمابيت (Dermabit)','إنسومات'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['محبس عمومي'], spec: [
    { key: 'material', ar: 'المادة', en: 'Material', options: ['نحاس ثقيل (Brass)','برونز مصبوب','PPR خضراء مدمجة للشبكات'] },
    { key: 'size', ar: 'مقاس التوصيل', en: 'Size', options: ['1/2 بوصة','3/4 بوصة','1 بوصة','1.5 بوصة','2 بوصة'] },
    { key: 'connection', ar: 'طريقة الربط', en: 'Connection', options: ['قلاووظ داخلي (Threaded F-F)','لحام حراري (لأنابيب الـ PPR)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','بجلر (Pegler)','سيم (Cim)','جياكوميني (Giacomini)','التحويل (API)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['علب توزيع Junction Box'], spec: [
    { key: 'material', ar: 'المادة والتركيب', en: 'Material', options: ['بلاستيك حديد مغلف (مقاوم للحريق)','بلاستيك PVC عادي برتقالي','حديد مجلفن ثقيل (لأنظمة الـ EMT)'] },
    { key: 'size', ar: 'المقاس الدارج', en: 'Size', options: ['7x7 سم (مفرد)','7x14 سم (مزدوج)','10x10 سم (علبة سحب)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الفنار','إم كي (MK)','نيبرو (Nepro)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','كرتون (100 حبة)'] },
  ] },
  // ═══ القطاع الميكانيكي — مواصفات مشتركة بالعناقيد ═══
  // الأنابيب العامة (غير محددة المقاس بالاسم)
  { products: ['أنابيب HDPE PN16 مياه شرب','أنابيب HDPE PN10 مياه شرب','أنابيب فولاذية مياه مبردة Schedule 40','أنابيب مياه مبردة Chilled Water','أنابيب حديد مجلفن GI','أنابيب معزولة مسبقاً Pre-Insulated (تبريد منطقي)','أنابيب GRP فايبرجلاس','أنابيب uPVC صرف صحي داخلي','أنابيب HDPE صرف صحي داخلي','أنابيب حديد زهر Cast Iron صرف صامت'], spec: [
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['DN20','DN25','DN32','DN40','DN50','DN65','DN80','DN100','DN125','DN150','DN200','DN250','DN300','حسب التصميم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','حبة 6 متر','حسب القص'] },
  ] },
  // الصمامات (النوع في الاسم — نضيف المقاس والربط والعلامة)
  { products: ['صمامات كرة نحاس','صمامات كرة ستانلس','صمامات بوابة','صمامات فراشة flanged','صمامات فحص','صمامات تخفيض ضغط PRV','صمامات تصريف','صمام تحكم منطقة Zone Control Valve'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['1/2 بوصة','3/4 بوصة','1 بوصة','1.5 بوصة','2 بوصة','2.5 بوصة','3 بوصة','4 بوصة','6 بوصة','حسب التصميم'] },
    { key: 'connection', ar: 'طريقة الربط', en: 'Connection', options: ['قلاووظ (Threaded)','فلنجة (Flanged)','لحام (Welded)','PPR'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','بجلر (Pegler)','سيم (Cim)','كيتز (Kitz)','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // المضخات (النوع في الاسم — نضيف القدرة والعلامة)
  { products: ['مضخة ضغط Booster Pump','مضخة إطفاء حريق Fire Pump','مضخة jockey حريق','مضخة sump صرف','مضخة تداول مياه ساخنة','مضخة مياه ري','مضخات مياه مركزية'], spec: [
    { key: 'power', ar: 'القدرة', en: 'Power', options: ['0.5 حصان','1 حصان','1.5 حصان','2 حصان','3 حصان','5 حصان','7.5 حصان','10 حصان','حسب التصميم'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','جراندفوس (Grundfos)','بيدرولو (Pedrollo)','ويلو (Wilo)','KSB','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // الأطقم الصحية
  { products: ['مرحاض WC مع خزان','مرحاض WC ذوي احتياجات خاصة','مغسلة Wash Basin','حوض مطبخ','مجلى Kitchen Sink','حوض استحمام','مبولة Urinal'], spec: [
    { key: 'mounting', ar: 'التركيب', en: 'Mounting', options: ['أرضي (Floor-mounted)','معلّق (Wall-hung)','مدمج (Counter)','حسب الطلب'] },
    { key: 'material', ar: 'المادة', en: 'Material', options: ['سيراميك/بورسلان','ستانلس ستيل','أكريليك','حسب الطلب'] },
    { key: 'color', ar: 'اللون', en: 'Color', options: ['أبيض','بيج','رمادي','أسود مطفي','حسب الطلب'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الحمراني (HSC)','سعودي سيراميك','RAK','Geberit','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','طقم كامل'] },
  ] },
  // الخلاطات والصنابير ورؤوس الدش
  { products: ['صنبور مياه','خلاط مياه Mixer','خلاط مغسلة','خلاط مطبخ','خلاط دش','صنبور حديقة','رأس دش','دش مطري'], spec: [
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['كروم (Chrome)','أبيض','ذهبي','أسود مطفي','نحاسي'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','جروهي (Grohe)','هانزجروهي (Hansgrohe)','الحمراني','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // وحدات التكييف الكبيرة
  { products: ['وحدة مناولة هواء AHU','وحدة مناولة هواء AHU مع عجلة حرارية','وحدة FCU سقفية','وحدة FCU كاسيت','مبرد مياه Chiller','برج تبريد Cooling Tower','وحدات مكيف VRF خارجية','وحدات مكيف VRF داخلية'], spec: [
    { key: 'capacity', ar: 'السعة', en: 'Capacity', options: ['حسب التصميم','1.5 طن','2 طن','3 طن','5 طن','10 طن','20 طن','50 طن','100 طن فأكثر'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','كاريير (Carrier)','يورك (York)','تراين (Trane)','دايكن (Daikin)','زامل','SKM','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // المراوح
  { products: ['مراوح هواء محورية Axial Fan','مراوح هواء طرد مركزي','مراوح استخلاص هواء WC'], spec: [
    { key: 'airflow', ar: 'التدفّق', en: 'Airflow', options: ['حسب التصميم','منخفض','متوسط','عالي'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // مخارج وموزعات الهواء
  { products: ['فتحات هواء','موزعات هواء','ستائر هواء'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['شبك هواء (Grille)','موزع هواء (Diffuser)','فتحة خطية (Linear)','شفط (Return/Exhaust)','ستارة هواء (Air Curtain)'] },
    { key: 'material', ar: 'المادة', en: 'Material', options: ['ألمنيوم','حديد مدهون','ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','م² (متر مربع)'] },
  ] },
  // سخانات المياه
  { products: ['سخانات مياه كهربائية','سخانات مياه مركزية'], spec: [
    { key: 'capacity', ar: 'السعة', en: 'Capacity', options: ['30 لتر','50 لتر','80 لتر','100 لتر','مركزي (حسب التصميم)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','أريستون (Ariston)','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // ═══ القطاع الكهربائي — مواصفات مشتركة بالعناقيد ═══
  // لوحات التوزيع
  { products: ['لوحة رئيسية MDB','لوحة فرعية SMDB','لوحة إضاءة LDB','لوحة طاقة PP','لوحة تحكم محركات MCC'], spec: [
    { key: 'enclosure', ar: 'التركيب', en: 'Enclosure', options: ['داخلي (Flush)','خارجي (Surface)','قائمة حرة (Free-standing)'] },
    { key: 'rating', ar: 'السعة (أمبير)', en: 'Rating', options: ['حسب التصميم','100A','250A','400A','630A','800A','1250A','1600A','2500A'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','شنايدر (Schneider)','ABB','سيمنس (Siemens)','الفنار','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوحة'] },
  ] },
  // القواطع الكبيرة
  { products: ['قاطع تفاضلي RCCB','قاطع هوائي ACB'], spec: [
    { key: 'ampere', ar: 'شدة التيار', en: 'Ampere', options: ['حسب التصميم','25A','40A','63A','100A','250A','400A','630A','800A','1600A','2500A','4000A'] },
    { key: 'poles', ar: 'عدد الأقطاب', en: 'Poles', options: ['1P','2P','3P','4P'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','شنايدر (Schneider)','ABB','سيمنس (Siemens)','الفنار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  // المواسير الكهربائية
  { products: ['أنابيب كهربائية PVC','أنابيب كهربائية معدنية'], spec: [
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['20 مم','25 مم','32 مم','40 مم','50 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3 متر)','لفة'] },
  ] },
  // المولدات والمحولات والـUPS
  { products: ['مولد كهرباء ديزل','محول كهربائي HV/LV','محول كهربائي 11kV/400V','UPS بلا انقطاع','لوحة UPS'], spec: [
    { key: 'capacity', ar: 'السعة', en: 'Capacity', options: ['حسب التصميم','10 kVA','30 kVA','100 kVA','250 kVA','500 kVA','1000 kVA','1500 kVA','2000 kVA'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','كاتربيلر (CAT)','بيركنز (Perkins)','كمنز (Cummins)','شنايدر','ABB','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // التأريض
  { products: ['سلك تأريض','شريط نحاس تأريض','أقطاب تأريض Earth Rod'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['16 مم²','25 مم²','35 مم²','50 مم²','70 مم²','25×3 مم (شريط)','قطب 1.2 متر','قطب 1.5 متر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','حبة'] },
  ] },
  // ═══ مكافحة الحريق ═══
  { products: ['رؤوس رش مياه Sprinkler'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['متدلي (Pendent)','قائم (Upright)','جانبي (Sidewall)','مخفي (Concealed)'] },
    { key: 'temp', ar: 'درجة التفعيل', en: 'Temp Rating', options: ['57°C (برتقالي)','68°C (أحمر)','93°C (أخضر)'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['كروم','أبيض','نحاسي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  { products: ['بكرة خرطوم حريق Hose Reel'], spec: [
    { key: 'length', ar: 'طول الخرطوم', en: 'Hose Length', options: ['20 متر','30 متر','حسب الطلب'] },
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['3/4 بوصة','1 بوصة'] },
    { key: 'type', ar: 'النوع', en: 'Type', options: ['ثابتة (Fixed)','متأرجحة (Swinging)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  { products: ['هيدرنت حريق Fire Hydrant'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['عمودي (Pillar)','تحت أرضي (Underground)'] },
    { key: 'outlets', ar: 'عدد المخارج', en: 'Outlets', options: ['مخرج واحد','مخرجان','ثلاثة مخارج'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  { products: ['لوحة تحكم حريق'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['تقليدي (Conventional)','معنون (Addressable)'] },
    { key: 'zones', ar: 'عدد الزونات', en: 'Zones', options: ['حسب التصميم','4 زون','8 زون','16 زون','عنونة كاملة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  { products: ['خزانات إطفاء حريق'], spec: [
    { key: 'material', ar: 'المادة', en: 'Material', options: ['GRP فايبرجلاس','حديد ملحوم','خرساني'] },
    { key: 'capacity', ar: 'السعة', en: 'Capacity', options: ['حسب التصميم','حسب NFPA','50 م³','100 م³','200 م³'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  // ═══ قطاع المعدات (إيجار) — مواصفات مشتركة ═══
  { products: ['حفارة (بوكلين)','شيول لودر','بلدوزر','جريدر','رافعة برجية','كرين متحرك','رافعة شوكية','ونش رفع','شاحنة قلاب','صهريج مياه','مقطورة نقل','لوري نقل','منصة رفع مقصية','رافعة بوم'], spec: [
    { key: 'capacity', ar: 'الحجم/الحمولة', en: 'Capacity', options: ['حسب الحاجة','صغير','متوسط','كبير','ثقيل'] },
    { key: 'operator', ar: 'التشغيل', en: 'Operator', options: ['بسائق/مشغّل','بدون مشغّل (إيجار فقط)'] },
    { key: 'unit', ar: 'مدة الإيجار', en: 'Rental period', options: ['يوم','أسبوع','شهر','بالساعة'] },
  ] },
  { products: ['خلاطة خرسانة','مضخة خرسانة','هزاز خرسانة','محطة خلط'], spec: [
    { key: 'capacity', ar: 'السعة', en: 'Capacity', options: ['حسب الحاجة','صغير','متوسط','كبير'] },
    { key: 'operator', ar: 'التشغيل', en: 'Operator', options: ['بمشغّل','بدون مشغّل'] },
    { key: 'unit', ar: 'مدة الإيجار', en: 'Rental period', options: ['يوم','أسبوع','شهر'] },
  ] },
  { products: ['دكاكة (كومباكتور)','رصاصة دك','هراس أسطواني','كمبروسر هواء','ضاغط هواء','طرمبة غطاسة','مضخة نزح مياه'], spec: [
    { key: 'size', ar: 'الحجم', en: 'Size', options: ['صغير','متوسط','كبير','حسب الحاجة'] },
    { key: 'unit', ar: 'مدة الإيجار', en: 'Rental period', options: ['يوم','أسبوع','شهر'] },
  ] },
  { products: ['سقالات معدنية','سلالم ألمنيوم','جاكات تدعيم'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['سقالة إطار (Frame)','سقالة H','سلم ألمنيوم','جاك تدعيم (Prop)','برج متحرك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','طن','م² (متر مربع)','يوم (إيجار)'] },
  ] },
  // ═══ محل التوريد — عُدد ومثبتات ═══
  { products: ['دريل كهربائي','دريل شحن','صاروخ تجليخ'], spec: [
    { key: 'power', ar: 'القدرة', en: 'Power', options: ['18 فولت','21 فولت','750 واط','1200 واط','حسب الموديل'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','بوش (Bosch)','ماكيتا (Makita)','ديوالت (DeWalt)','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد'] },
  ] },
  { products: ['مسامير حديد','براغي','صواميل','رول بلت','خوابير تثبيت','مسامير صاج'], spec: [
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['1 بوصة','2 بوصة','3 بوصة','4 بوصة','M6','M8','M10','M12','حسب الطلب'] },
    { key: 'material', ar: 'المادة', en: 'Material', options: ['حديد عادي','مجلفن','ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيلو','علبة','حبة'] },
  ] },
  // ═══ مدني — مسبقات وقطاعات وركام وطوبار وسقالات ═══
  { products: ['خرسانة مسبقة الصب','سلالم رياضية Raker Beams'], spec: [
    { key: 'element', ar: 'العنصر', en: 'Element', options: ['عتبات','أعمدة','بلاطات (Hollow Core)','كمرات/جسور','مدرجات','جدران (Panels)','درج','مقاطع خاصة'] },
    { key: 'strength', ar: 'قوة الخرسانة', en: 'Strength', options: ['C30','C35','C40','C45','C50','حسب التصميم'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['سادة (Smooth)','مكشوف الواجهة (Fair-face)','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','م³ (متر مكعب)','متر طولي'] },
  ] },
  // ═══ سقالات كب لوك (Cuplock) — منتج واحد: النوع ثم المقاس، يُضاف بنداً بنداً ═══
  // ═══ العزل المائي (Waterproofing) — منتجات منظّمة بأنواعها ═══
  { products: ['عزل مائي سائل (Liquid Membrane)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['بولي يوريثان PU','إيبوكسي Epoxy','بولي يوريا Polyurea','أكريليك Acrylic','سيماني مرن Cementitious','بيتوميني سائل Liquid Bitumen'] },
    { key: 'components', ar: 'المكوّنات', en: 'Components', options: ['أحادي 1-Component','ثنائي 2-Component','هجين Hybrid'] },
    { key: 'application', ar: 'مكان التطبيق', en: 'Application', options: ['أسطح Roof','أساسات Foundation','مناطق رطبة Wet area','خزانات Tank','بلكونات Balcony','حسب الموقع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كجم','لتر','م²','صفيحة'] },
  ] },
  { products: ['عزل مائي سيماني (Cementitious)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['بوليمر معدّل 2-مكوّن Polymer-Modified','صلب 1-مكوّن Rigid','كرستالي Crystalline','مقوّى بالألياف Fiber-Reinforced','سيماني-إيبوكسي Cementitious-Epoxy'] },
    { key: 'application', ar: 'مكان التطبيق', en: 'Application', options: ['أساسات Foundation','بدروم Basement','خزانات/مسابح Tank/Pool','مناطق رطبة Wet area','حسب الموقع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كجم','كيس','م²'] },
  ] },
  { products: ['غشاء بيتوميني لفائف (Bituminous Membrane)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['APP','SBS'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['3 مم','4 مم','5 مم'] },
    { key: 'reinforcement', ar: 'التسليح', en: 'Reinforcement', options: ['بوليستر 180غ Polyester','فايبرجلاس Fiberglass'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['ناعم Plain','مبحص معدني Mineral'] },
    { key: 'brand', ar: 'الماركة (اختياري)', en: 'Brand (optional)', options: ['أي ماركة معتمدة','عوازل Awazel','Sika','Bauder','Index','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م²','لفة Roll'] },
  ] },
  { products: ['بطانة خزانات سائلة (Tank Lining)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['إيبوكسي Epoxy','بولي يوريثان PU','بولي يوريا Polyurea','فينيل إستر Vinyl Ester'] },
    { key: 'use', ar: 'الاستخدام', en: 'Use', options: ['مياه شرب Potable','مياه عادية','كيميائي Chemical','صرف Wastewater'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كجم','لتر','م²'] },
  ] },
  { products: ['بيتومين أولي (Primer)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مذيب Solvent-based','مائي Water-based'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لتر','جالون','برميل'] },
  ] },
  // ═══ 2026-10-19 research: order specs ═══
  { products: ['انكر وتد (Wedge Anchor / Through Bolt)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['M6', 'M8', 'M10', 'M12', 'M16', 'M20', 'M24'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'مجلفن غمس ساخن', 'ستانلس A4'] },
    { key: 's3', ar: 'الاعتماد', en: 'الاعتماد', options: ['للخرسانة المشروخة (ETA)', 'عادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['انكر دروب إن (Drop-in Anchor)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['M6', 'M8', 'M10', 'M12', 'M16', 'M20'] },
    { key: 's2', ar: 'الشفة', en: 'الشفة', options: ['بدون', 'بشفة'] },
    { key: 's3', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['انكر كُم (Sleeve Anchor)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['6.5', '8', '10', '12', '16 مم'] },
    { key: 's2', ar: 'الرأس', en: 'الرأس', options: ['صامولة', 'برغي سداسي', 'رأس غاطس', 'خطاف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['برغي خرسانة (Concrete Screw / Screw Anchor)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['6', '8', '10', '12', '14 مم'] },
    { key: 's2', ar: 'الرأس', en: 'الرأس', options: ['سداسي', 'غاطس', 'بوردة', 'ملولب داخلي'] },
    { key: 's3', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['انكر ثقيل للأحمال (Heavy-duty Anchor)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['بجلبة تمدد', 'أندركت (Undercut)'] },
    { key: 's2', ar: 'الرأس', en: 'الرأس', options: ['برغي', 'صامولة'] },
    { key: 's3', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['انكر سقف بمسمار للتعليق (Ceiling Nail Anchor)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['M6', 'M8'] },
    { key: 's2', ar: 'الطرف', en: 'الطرف', options: ['ملولب داخلي', 'حلقة', 'خطاف'] },
    { key: 's3', ar: 'للتعليق', en: 'للتعليق', options: ['قضبان ملولبة', 'سلك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مونة حقن كيميائية إيبوكسي (Injection Epoxy Mortar)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['330', '385', '500', '585 مل'] },
    { key: 's2', ar: 'الاعتماد', en: 'الاعتماد', options: ['خرسانة مشروخة', 'زلازل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['خرطوش'] },
  ] },
  { products: ['مونة حقن هايبرد/فينيل إستر سريعة (Hybrid / Vinylester Injection Mortar)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['300', '330', '410', '500 مل'] },
    { key: 's2', ar: 'القاعدة', en: 'القاعدة', options: ['فينيل إستر', 'هايبرد', 'بوليستر'] },
    { key: 's3', ar: 'الاستخدام', en: 'الاستخدام', options: ['خرسانة', 'طوب مصمت', 'طوب مفرغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['خرطوش'] },
  ] },
  { products: ['انكر كيميائي كبسولة (Chemical Capsule Anchor)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['M8', 'M10', 'M12', 'M16', 'M20', 'M24', 'M30'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['دوّار (Spin-in)', 'مطرقي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['قضيب انكر كيميائي مع صامولة ووردة (Chemical Anchor Rod / Stud)'], spec: [
    { key: 's1', ar: 'الدرجة', en: 'الدرجة', options: ['5.8', '8.8'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'غمس ساخن', 'ستانلس A4'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['جلبة شبكية للانكر الكيميائي في الطوب المفرغ (Mesh / Sieve Sleeve)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['12', '16', '20 مم'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['بلاستيك', 'معدن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مسدس حقن الانكر الكيميائي (Injection Dispenser)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['300–410', '500–585 مل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['يدوي', 'هوائي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['فوهة خلط للانكر الكيميائي (Static Mixer Nozzle)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['فرشاة ومنفاخ تنظيف ثقوب الانكر (Hole Cleaning Brush & Blow-out Pump)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['منفاخ يدوي', 'فرشاة فولاذية', 'طقم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['وردة تعبئة للانكرات (Filling / Dynamic Washer)'], spec: [
    { key: 's1', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['خابور إطار للأبواب والشبابيك (Frame Fixing)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['8', '10', '14 مم'] },
    { key: 's2', ar: 'الرأس', en: 'الرأس', options: ['غاطس', 'سداسي'] },
    { key: 's3', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['خابور معدني للجدران المفرغة والجبس بورد (Metal Cavity Anchor / Molly)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['M4', 'M5', 'M6', 'M8'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['خابور فراشة/توجل للأسقف المفرغة (Spring / Tilt Toggle)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['فراشة زنبركية', 'قلّابة بلاستيك ومعدن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['خابور جبس بورد بلاستيك/زماك ذاتي الثقب (Self-drill Plasterboard Plug)'], spec: [
    { key: 's1', ar: 'المادة', en: 'المادة', options: ['نايلون', 'زماك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['خابور الخرسانة الخلوية (الطوب الخفيف/سيبوريكس) (Aerated Concrete Plug)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['8', '10', '14 مم'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['بلاستيك حلزوني', 'معدني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مسمار عزل حراري بقرص (Insulation Fixing)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['دقّ', 'برغي'] },
    { key: 's2', ar: 'القرص', en: 'القرص', options: ['60', '90 مم'] },
    { key: 's3', ar: 'المسمار', en: 'المسمار', options: ['بلاستيك', 'فولاذ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['طقم تثبيت مغسلة ومرحاض (Sanitary Fixing Set)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['مغسلة', 'مرحاض', 'مبولة', 'سخان'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['M8', 'M10', 'M12'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مسامير بارود للخرسانة والحديد (Powder-actuated Nails)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['خرسانة', 'حديد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['طلقات بارود (Powder Cartridges / Boosters)'], spec: [
    { key: 's1', ar: 'العيار', en: 'العيار', options: ['6.8', '11 مم و 6.8', '18 مم و .27 كال'] },
    { key: 's2', ar: 'القوة (اللون)', en: 'القوة (اللون)', options: ['أخضر', 'أصفر', 'أحمر', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مسامير مسدس الغاز للخرسانة (Gas Nails)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['خرسانة', 'حديد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مسمار بارود مع مشبك سقف/كابل (Ceiling & Conduit Clip Nail)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['حلقة سلك تعليق', 'مشبك ماسورة 16–25 مم', 'مشبك ربطة كابلات', 'ملولب M6–M8'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['برغي ذاتي الحفر مع وردة مطاط للساندوتش بانل (Self-drilling Screw + EPDM Washer)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['4.8', '5.5', '6.3 مم'] },
    { key: 's2', ar: 'سعة الحفر', en: 'سعة الحفر', options: ['3', '5', '12 مم'] },
    { key: 's3', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['برغي خشب وتشبورد (Chipboard / Wood Screw)'], spec: [
    { key: 's1', ar: 'الرأس', en: 'الرأس', options: ['صليبة', 'توركس'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['مجلفن أصفر', 'أبيض', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['صامولة وصل طويلة للقضبان الملولبة (Coupling Nut)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['M6', 'M8', 'M10', 'M12', 'M16'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['مجلفن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['قناة تثبيت يونيسترت (Strut Channel)'], spec: [
    { key: 's1', ar: 'المقطع', en: 'المقطع', options: ['41×21', '41×41', '41×62', '41×82'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['3', '6 م'] },
    { key: 's3', ar: 'التشطيب', en: 'التشطيب', options: ['مجلفن مسبق', 'غمس ساخن', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['قطعة'] },
  ] },
  { products: ['صامولة زنبركية للقناة (Channel Spring Nut)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['M6', 'M8', 'M10', 'M12'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['زوايا ووصلات قناة التثبيت (Channel Brackets & Connectors)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['زاوية 90°', 'T', 'مستوية', 'قابلة للضبط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ذراع حامل كابولي (Cantilever Bracket)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['قاعدة تثبيت قناة/قضيب (Channel Base Plate / Rod Hanger)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['قاعدة أرضية', 'سقفية', 'قاعدة قضيب ملولب M8–M12'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['علاقة مواسير مبطنة بالمطاط (Rubber-lined Pipe Clamp)'], spec: [
    { key: 's1', ar: 'قطر الماسورة', en: 'قطر الماسورة', options: ['15–160 مم (1', '2"–6")'] },
    { key: 's2', ar: 'الوصلة', en: 'الوصلة', options: ['M8', 'M10', 'M8+M10'] },
    { key: 's3', ar: 'القفل', en: 'القفل', options: ['سريع', 'برغيين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['كلامب مواسير ثقيل للأحمال (Heavy-duty Pipe Clamp)'], spec: [
    { key: 's1', ar: 'الوصلة', en: 'الوصلة', options: ['M10', 'M12', 'M16'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['علاقة كلفيس/حلقة لمواسير الحريق والرشاشات (Clevis / Ring Hanger)'], spec: [
    { key: 's1', ar: 'قطر الماسورة', en: 'قطر الماسورة', options: ['3', '4"–8"'] },
    { key: 's2', ar: 'الوصلة', en: 'الوصلة', options: ['M8', 'M10', '3', '8"'] },
    { key: 's3', ar: 'الاعتماد', en: 'الاعتماد', options: ['UL', 'FM'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['كلامب كمرة (Beam Clamp)'], spec: [
    { key: 's1', ar: 'الوصلة', en: 'الوصلة', options: ['M8', 'M10', 'M12'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['مسمار تثبيت', 'مزدوج للقناة'] },
    { key: 's3', ar: 'الاعتماد', en: 'الاعتماد', options: ['UL', 'FM'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['حامل انزلاقي/أسطواني للمواسير الساخنة (Pipe Slide / Roller Support)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['انزلاقي', 'أسطواني', 'ثابت (Fixed point)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['كلبس ماسورة وسرج تثبيت (Pipe / Conduit Saddle Clip)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['16', '20', '25', '32', '40 مم'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['سرج معدني', 'كلبس بلاستيك بمسمار', 'كلبس طقطقة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['قناة انكر مصبوبة في الخرسانة (Cast-in Anchor Channel)'], spec: [
    { key: 's1', ar: 'المقطع', en: 'المقطع', options: ['28', '15 – 72', '48'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر'] },
  ] },
  { products: ['طوق حريق للمواسير البلاستيكية (Firestop Collar)'], spec: [
    { key: 's1', ar: 'مقاومة الحريق', en: 'مقاومة الحريق', options: ['120', '240 دقيقة'] },
    { key: 's2', ar: 'التركيب', en: 'التركيب', options: ['سطحي', 'مدمج (Endless)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['شريط حريق منتفخ للمواسير (Intumescent Wrap Strip)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['45', '50 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['لوح حريق مغطى للفتحات (Coated Firestop Board / Batt)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['50', '60 مم'] },
    { key: 's2', ar: 'مقاومة', en: 'مقاومة', options: ['60', '120', '240 دقيقة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['مونة حريق للفتحات الكبيرة (Firestop Mortar)'], spec: [
    { key: 's1', ar: 'الوزن', en: 'الوزن', options: ['20', '25 كغ'] },
    { key: 's2', ar: 'مقاومة', en: 'مقاومة', options: ['120', '240 دقيقة'] },
    { key: 's3', ar: 'النوع', en: 'النوع', options: ['جبسي', 'أسمنتي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['وسائد حريق (Firestop Pillows)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['صغير', 'وسط', 'كبير'] },
    { key: 's2', ar: 'مقاومة', en: 'مقاومة', options: ['120', '240 دقيقة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['كتل/سدادات حريق للكابلات (Firestop Blocks / Plugs)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['كتلة', 'سدادة'] },
    { key: 's2', ar: 'مقاومة', en: 'مقاومة', options: ['120', '240 دقيقة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['جلبة حريق لعبور الكابلات (Cable Transit Firestop Sleeve)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['رذاذ حريق مرن للفواصل وأعلى الجدران (Firestop Joint Spray)'], spec: [
    { key: 's1', ar: 'مقاومة', en: 'مقاومة', options: ['120', '240 دقيقة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['طلاء حريق للكابلات (Ablative Cable Coating)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['12.5', '25 كغ'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['كابلات', 'فتحات لوح'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['جلبة حريق تُصب في البلاطة (Cast-in Firestop Device)'], spec: [
    { key: 's1', ar: 'قطر الماسورة', en: 'قطر الماسورة', options: ['50', '75', '100', '150 مم'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['بلاستيك', 'معدن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['وسادات معجون حريق لعلب الكهرباء (Firestop Putty Pads)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['180×180', '250×250 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['ملصق تعريف أنظمة الحريق (Firestop Identification Label)'], spec: [
    { key: 's1', ar: 'اللغة', en: 'اللغة', options: ['عربي', 'إنجليزي'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['بلاستيك', 'معدن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['فوم مسدس احترافي (Gun-grade PU Foam)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['750', '850 مل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['عادي', 'منخفض التمدد', 'لكل المواسم', 'مقاوم للحريق B1'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['منظف الفوم (PU Foam Cleaner)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['لاصق تركيب بديل المسامير (Construction / Mounting Adhesive)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['290', '310 مل'] },
    { key: 's2', ar: 'القاعدة', en: 'القاعدة', options: ['MS بوليمر', 'أكريليك', 'مذيبات'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['خرطوش'] },
  ] },
  { products: ['معجون إيبوكسي ثنائي للتصليح والتثبيت (2K Epoxy Putty / Adhesive)'], spec: [
    { key: 's1', ar: 'زمن التصلب', en: 'زمن التصلب', options: ['5 دقائق', '24 ساعة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['بخاخ جلفنة باردة (زنك) (Zinc Spray / Cold Galvanizing)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['400', '500 مل'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي فاتح', 'فضي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['بخاخ مزيل صدأ ومُفكّك براغي (Penetrating Oil / Rust Remover)'], spec: [
    { key: 's1', ar: 'الحجم', en: 'الحجم', options: ['300', '400', '500 مل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['متعدد الاستخدام', 'مزيل صدأ قوي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مثبت براغي سائل (Threadlocker)'], spec: [
    { key: 's1', ar: 'القوة', en: 'القوة', options: ['متوسطة (أزرق)', 'عالية (أحمر)'] },
    { key: 's2', ar: 'الحجم', en: 'الحجم', options: ['10', '50 مل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة همر SDS-max للخرسانة (SDS-max Hammer Drill Bit)'], spec: [
    { key: 's1', ar: 'الرؤوس', en: 'الرؤوس', options: ['2', '4 قواطع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة همر مجوفة بشفط الغبار (Hollow Dust-extraction Drill Bit)'], spec: [
    { key: 's1', ar: 'الوصلة', en: 'الوصلة', options: ['SDS-plus', 'SDS-max'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة كور ماسية للخرسانة (Diamond Core Bit)'], spec: [
    { key: 's1', ar: 'الوصلة', en: 'الوصلة', options: ['1 1', '4" UNC', 'BI'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['منشار كأس (Hole Saw)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['باي ميتال', 'كربايد', 'ماسي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة بلاط وبورسلان ماسية (Diamond Tile Drill Bit)'], spec: [
    { key: 's1', ar: 'الوصلة', en: 'الوصلة', options: ['M14', 'مستقيمة', 'هكس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة دريل خرسانة وطوب عادية (Masonry Drill Bit)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة خشب (Wood Drill Bit: Brad-point / Spade / Auger)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['مدببة', 'مسطحة (Spade)', 'حلزونية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ريشة حديد مدرّجة (Step Drill Bit)'], spec: [
    { key: 's1', ar: 'المدى', en: 'المدى', options: ['4–12', '4–20', '4–32 مم'] },
    { key: 's2', ar: 'المادة', en: 'المادة', options: ['HSS', 'HSS-Co'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['أزميل همر (مدبب/مسطح) (Hammer Chisel)'], spec: [
    { key: 's1', ar: 'الوصلة', en: 'الوصلة', options: ['SDS-plus', 'SDS-max', 'هكس 28', '30'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['مدبب', 'مسطح', 'عريض', 'مجوف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['قرص ماسي لقص الخرسانة والحجر (Diamond Cutting Blade)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['115', '125', '230', '300', '350 مم'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['خرسانة', 'خرسانة مسلحة', 'أسفلت', 'جرانيت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['قرص كوب ماسي للتجليخ (Diamond Cup Wheel)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['100', '125', '180 مم'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['خرسانة', 'لياسة', 'حجر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['شفرة منشار ترددي (سيف) (Reciprocating Saw Blade)'], spec: [
    { key: 's1', ar: 'الطول', en: 'الطول', options: ['150', '200', '300 مم'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['خشب', 'حديد', 'خشب بمسامير', 'عام'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['شفرة منشار أركت (Jigsaw Blade)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['خشب', 'حديد', 'لامينيت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['لقم مفك وبوكسات تثبيت (Screwdriver Bits & Nut Setters)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['صليبة PH', 'PZ', 'توركس', 'سداسي', 'بوكس مغناطيسي 8', '10', '13 مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['25', '50 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['ملدن خرسانة عالي الأداء (Superplasticizer PCE)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['PCE', 'SNF'] },
    { key: 's2', ar: 'الاحتفاظ بالهبوط', en: 'الاحتفاظ بالهبوط', options: ['عادي', 'ممتد (حار)'] },
    { key: 's3', ar: 'العبوة', en: 'العبوة', options: ['جالون 20 لتر', 'برميل 210 لتر', 'خزان IBC 1000 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['ملدن عادي مخفض للمياه (Plasticizer / Water Reducer)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['ملدن', 'ملدن مؤخر (Type D)'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210', 'IBC'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مؤخر شك الخرسانة (Retarder)'], spec: [
    { key: 's1', ar: 'الفئة', en: 'الفئة', options: ['صيفي', 'شديد التأخير'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مسرع شك الخرسانة خالٍ من الكلوريد (Accelerator)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['مسرع شك', 'مسرع مقاومة مبكرة'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مسرع خرسانة مرشوشة (Shotcrete Accelerator)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['خالٍ من القلويات', 'قلوي'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['برميل 210', 'IBC 1000'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['خزان IBC 1000 لتر'] },
  ] },
  { products: ['مضاف عزل مائي للخرسانة (Waterproofing Admixture)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['سائل مانع نفاذية', 'بودرة'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210', 'كيس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مضاف بلوري للخرسانة (Crystalline Admixture)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['كيس 18', '25 كجم', 'عبوات ذوّابة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['مثبط تآكل حديد التسليح (Corrosion Inhibitor)'], spec: [
    { key: 's1', ar: 'طريقة الاستخدام', en: 'طريقة الاستخدام', options: ['يضاف للخلطة', 'يُرش على السطح'] },
    { key: 's2', ar: 'الأساس', en: 'الأساس', options: ['نتريت الكالسيوم', 'أمينات'] },
    { key: 's3', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مضاف سحب الهواء (Air Entraining Agent)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['مضاف تقليل الانكماش (Shrinkage Reducing Admixture)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مضاف لزوجة للخرسانة ذاتية الدمك (VMA)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['ذاتية الدمك', 'صب تحت الماء'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['ميكروسيليكا (Silica Fume)'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['بودرة مكثفة', 'سائل (Slurry)'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['كيس 25 كجم', 'جامبو 1 طن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['ألياف بولي بروبيلين للخرسانة (PP Micro Fibres)'], spec: [
    { key: 's1', ar: 'الطول', en: 'الطول', options: ['6', '12', '18 مم'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['كيس 600 جم', '900 جم', 'كرتون'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 0.9 كجم'] },
  ] },
  { products: ['ألياف ماكرو إنشائية (Macro Synthetic / Steel Fibres)'], spec: [
    { key: 's1', ar: 'المادة', en: 'المادة', options: ['بوليمر ماكرو', 'حديد مخطّف'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['35', '50', '60 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['مضاف جراوت حقن الكابلات (Grout Admixture / Expanding)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['كيس 1 كجم', 'كرتون'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 1 كجم'] },
  ] },
  { products: ['مادة معالجة خرسانة شمعية (Wax-based Curing Compound)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['أبيض', 'شفاف', 'بأثر لوني مؤقت'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مادة معالجة راتنجية/أكريليك (Resin / Acrylic Curing Compound)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['راتنج هيدروكربوني', 'أكريليك (Cure & Seal)', 'مطاط مكلور'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مانع تبخر للخرسانة الطرية (Evaporation Retarder)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['جالون 5', '20 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['مادة فك قوالب كيميائية (Chemical Release Agent)'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['مستحلب مائي', 'مذيب'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['خشب', 'حديد', 'خرسانة ظاهرة'] },
    { key: 's3', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 210 لتر'] },
  ] },
  { products: ['مؤخر سطحي لكشف الركام (Surface Retarder)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['بوندنج SBR لاتكس (SBR Bonding Agent)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['جالون 5', '20 لتر', 'برميل 210'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['بوندنج أكريليك (Acrylic Bonding Agent)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['جالون 5', '20 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['بوندنج إيبوكسي لربط الخرسانة القديمة بالجديدة (Epoxy Bonding Agent)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['طقم 1', '4', '15 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['دهان حماية حديد التسليح قبل الإصلاح (Rebar Anti-corrosion Primer)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['أسمنتي بوليمري', 'إيبوكسي', 'غني بالزنك'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['طقم 1', '4 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['جراوت أسمنتي انسيابي عالي المقاومة (Cementitious Precision Grout)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['جراوت إيبوكسي لقواعد المعدات (Epoxy Grout)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['طقم 10', '15', '25 كجم'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['انسيابي', 'ثقيل الأحمال (Pour depth)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['جراوت سريع الشك لأغطية المناهل والإصلاح السريع (Rapid-set Grout)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['جراوت حقن كابلات الشد اللاحق (Post-tension Duct Grout)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['مثبت كيميائي إيبوكسي إنشائي (Epoxy Anchoring Resin)'], spec: [
    { key: 's1', ar: 'الاعتماد', en: 'الاعتماد', options: ['ETA تحميل إنشائي', 'عادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['خرطوشة'] },
  ] },
  { products: ['مثبت كيميائي بوليستر/فينيل إستر (Polyester / Vinylester Anchor)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['بوليستر', 'فينيل إستر', 'هايبرد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['خرطوشة'] },
  ] },
  { products: ['كبسولات تثبيت كيميائية (Resin Capsule Anchors)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['M10', 'M12', 'M16', 'M20', 'M24'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة 10 حبات'] },
  ] },
  { products: ['مونة إصلاح إنشائية عالية المقاومة R4 (Structural Repair Mortar)'], spec: [
    { key: 's1', ar: 'الفئة', en: 'الفئة', options: ['R3', 'R4 (EN 1504-3)'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['أفقي', 'رأسي وسقفي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['مونة إصلاح خفيفة للأسقف والجدران (Lightweight Repair Mortar)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['خرسانة دقيقة قابلة للصب (Micro-concrete)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['مونة إصلاح إيبوكسي (Epoxy Repair Mortar)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['طقم 5', '15 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['معجون تسوية وتشطيب الخرسانة (Fairing / Skim Coat)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['لاصق إيبوكسي إنشائي (Structural Epoxy Adhesive)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['طقم 1', '6 كجم'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['لصق صفائح', 'تثبيت', 'سد شقوق'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['ألياف كربون لتقوية المنشآت (CFRP Strengthening)'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['صفائح (م.ط)', 'قماش ملفوف (م²)'] },
    { key: 's2', ar: 'الدرجة', en: 'الدرجة', options: ['230', '300 جم', 'م²'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م²'] },
  ] },
  { products: ['راتنج حقن شقوق إيبوكسي (Epoxy Crack Injection)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['طقم 1', '5 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['راتنج حقن بولي يوريثان لإيقاف التسرب (PU Injection Resin)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['رغوي سريع', 'مرن'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['طقم 5', '20 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['جل حقن أكريليك للستائر المائية (Acrylic Injection Gel)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['حشوات حقن (Injection Packers)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['حديد للتثقيب', 'بلاستيك سطحي'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['10', '13 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة 100 حبة'] },
  ] },
  { products: ['عزل سيماني مرن ثنائي المكون (Flexible Cementitious Waterproofing)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['خزانات', 'حمامات', 'أسطح تحت البلاط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['عزل سيماني صلب (Rigid Cementitious Slurry)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['عزل بلوري متغلغل (Crystalline Waterproofing Coating)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['سطح موجب', 'سالب'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['كيس 20', '25 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['عزل بولي يوريثان سائل للأسطح المكشوفة (PU Liquid Membrane)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض عاكس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل 25 كجم'] },
  ] },
  { products: ['عزل أكريليك مائي مرن للأسطح (Acrylic Elastomeric Membrane)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['أبيض عاكس (Cool roof)', 'رمادي'] },
    { key: 's2', ar: 'الألياف', en: 'الألياف', options: ['مسلح بألياف', 'عادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل 20 كجم'] },
  ] },
  { products: ['عزل بيتوميني مطاطي سائل (Bitumen-Rubber Emulsion)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['مستحلب مائي', 'مذيب'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 20', 'برميل 200'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل 200 لتر'] },
  ] },
  { products: ['عزل بولي يوريا بالرش (Polyurea Spray Membrane)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['بولي يوريا نقي', 'هايبرد'] },
    { key: 's2', ar: 'السماكة', en: 'السماكة', options: ['1.5', '2', '3 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (توريد وتنفيذ) / برميل طقم'] },
  ] },
  { products: ['غشاء عزل ذاتي اللصق (Self-adhesive Membrane)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['1.5', '2 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['غشاء HDPE مسبق التركيب للأساسات (Pre-applied HDPE Membrane)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['1.2', '1.5 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['غشاء PVC للعزل (PVC Membrane)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['1.2', '1.5', '2 مم'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['أسطح مكشوفة', 'أساسات وأنفاق'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['غشاء TPO للأسطح (TPO Membrane)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['1.2', '1.5', '1.8 مم'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أبيض', 'رمادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['لباد / غشاء بنتونايت (Bentonite Membrane)'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['لباد', 'ألواح'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['ووتر ستوب PVC للفواصل (PVC Waterstop)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['150', '200', '230', '250', '320 مم'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['داخلي مركزي', 'خارجي سطحي'] },
    { key: 's3', ar: 'الفاصل', en: 'الفاصل', options: ['إنشائي', 'تمدد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول 15 م'] },
  ] },
  { products: ['شريط منتفخ هيدروفيلي (Hydrophilic Swelling Strip)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20×10', '25×20 مم'] },
    { key: 's2', ar: 'الرول', en: 'الرول', options: ['5', '10', '20 م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['خرطوم حقن فواصل الصب (Injection Hose)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['قابل لإعادة الحقن', 'حقن مرة واحدة'] },
    { key: 's2', ar: 'الرول', en: 'الرول', options: ['50', '100 م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['شريط عزل فواصل مرن TPE/هايبالون (Joint Sealing Tape)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['150', '200', '250 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['شريط وزوايا عزل للحمامات والأسطح (Waterproofing Corner Tape)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['شريط', 'زاوية داخلية', 'زاوية خارجية', 'طوق ماسورة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول 50 م'] },
  ] },
  { products: ['شبك/قماش تسليح للعزل السائل (Reinforcement Fleece)'], spec: [
    { key: 's1', ar: 'المادة', en: 'المادة', options: ['بوليستر', 'ألياف زجاج'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['أكريليك جاهز', 'سيماني مرن'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أزرق', 'رمادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل 15 كجم'] },
  ] },
  { products: ['طارد ماء سيلاني شفاف (Silane / Siloxane Water Repellent)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['سيلان 40%', 'سيلان-سيلوكسان', 'مائي'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 5', '20', 'برميل 200'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['دهان حماية خرسانة مضاد للكربنة (Anti-carbonation Coating)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['مرن (جسر شقوق)', 'صلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل 20 لتر'] },
  ] },
  { products: ['دهان إيبوكسي معتمد لخزانات مياه الشرب (Potable Water Epoxy Coating)'], spec: [
    { key: 's1', ar: 'الاعتماد', en: 'الاعتماد', options: ['WRAS', 'NSF', 'SASO'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أزرق', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['دهان إيبوكسي قطراني (Coal-tar / Bitumen Epoxy)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['قطراني', 'خالٍ من القطران'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['طقم 5', '20 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['بطانة مقاومة للكيماويات لغرف الصرف والمحطات (Chemical-resistant Lining)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['إيبوكسي', 'نوفولاك', 'بولي يوريا'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['دهان بولي يوريثان أليفاتي نهائي (PU Topcoat)'], spec: [
    { key: 's1', ar: 'التشطيب', en: 'التشطيب', options: ['لامع', 'نصف لامع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['دهان منتفخ مقاوم للحريق للحديد (Intumescent Paint, Cellulosic)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['مائي', 'مذيب'] },
    { key: 's2', ar: 'التصنيف', en: 'التصنيف', options: ['30', '60', '90', '120 دقيقة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل 20 كجم'] },
  ] },
  { products: ['دهان منتفخ إيبوكسي (Epoxy Intumescent, Hydrocarbon)'], spec: [
    { key: 's1', ar: 'التصنيف', en: 'التصنيف', options: ['حريق هيدروكربوني H', 'سليولوزي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مونة رش أسمنتية مقاومة للحريق (Cementitious Fireproofing Spray)'], spec: [
    { key: 's1', ar: 'الكثافة', en: 'الكثافة', options: ['منخفضة', 'متوسطة', 'عالية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['مقسي سطح خرسانة بودرة (Dry-shake Floor Hardener)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أحمر', 'أخضر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['مقسي ومانع غبار سائل للخرسانة (Liquid Densifier / Lithium Silicate)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['سيليكات ليثيوم', 'صوديوم', 'فلوروسيليكات'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 20 لتر'] },
  ] },
  { products: ['برايمر إيبوكسي للأرضيات (Epoxy Floor Primer)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['عادي', 'مانع رطوبة (DPM)', 'مائي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['أرضية بولي يوريثان أسمنتية (PU Cement / Urethane Cement Floor)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['4', '6', '9 مم'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['ذاتي التسوية', 'مونة مسطرين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['أرضية بولي يوريثان مرنة (Elastic PU Floor)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['أرضية إيبوكسي مضادة للكهرباء الساكنة (ESD / Antistatic Epoxy)'], spec: [
    { key: 's1', ar: 'الفئة', en: 'الفئة', options: ['ESD', 'موصل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مونة إيبوكسي للأرضيات الثقيلة (Epoxy Screed)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مايكروسمنت للأرضيات والجدران (Microcement)'], spec: [
    { key: 's1', ar: 'التشطيب', en: 'التشطيب', options: ['ناعم', 'نصف خشن'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض', 'لوني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['رابط سكريد سريع الجفاف (Rapid-drying Screed Binder)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['رابط فقط', 'مونة جاهزة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['معجون تسوية جدران وأرضيات قبل البلاط (Levelling Mortar)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['جدار', 'أرضية'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['غراء بلاط محسن C2TE للبورسلين (Improved Tile Adhesive C2TE)'], spec: [
    { key: 's1', ar: 'الفئة', en: 'الفئة', options: ['C2T', 'C2TE'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['غراء بلاط مرن S1/S2 للواجهات والمسابح (Deformable Tile Adhesive S1/S2)'], spec: [
    { key: 's1', ar: 'الفئة', en: 'الفئة', options: ['S1', 'S2'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 20 كجم'] },
  ] },
  { products: ['لاصق بلاط إيبوكسي (Epoxy Tile Adhesive)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['طقم 5', '10 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['لاصق رخام وحجر طبيعي أبيض سريع (White Rapid Stone Adhesive)'], spec: [
    { key: 's1', ar: 'الفئة', en: 'الفئة', options: ['C2F', 'C2FT'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 25 كجم'] },
  ] },
  { products: ['ترويبة أسمنتية محسنة CG2 (Polymer-modified Tile Grout)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 5 كجم'] },
  ] },
  { products: ['برايمر قبل الغراء والسكريد (Primer for Adhesives / Screeds)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['ماص', 'غير ماص (بلاط على بلاط)'] },
    { key: 's2', ar: 'العبوة', en: 'العبوة', options: ['جالون 5', '10', '20'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 10 لتر'] },
  ] },
  { products: ['مادة حماية وتلميع حجر وترويبة (Stone & Grout Sealer)'], spec: [
    { key: 's1', ar: 'التشطيب', en: 'التشطيب', options: ['غير مرئي', 'مُبرز للون'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون 5 لتر'] },
  ] },
  { products: ['حبل فوم خلفي للفواصل (Backer Rod)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['6', '10', '15', '20', '25', '30', '40', '50 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['رول'] },
  ] },
  { products: ['حشوة فواصل شبه صلبة للأرضيات الصناعية (Semi-rigid Joint Filler)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['إيبوكسي', 'بولي يوريا'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مانع تسرب فواصل مقاوم للوقود (Fuel-resistant Joint Sealant)'], spec: [
    { key: 's1', ar: 'الأساس', en: 'الأساس', options: ['بولي سلفايد', 'بولي يوريثان قطراني', 'صب ساخن'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['برايمر مانع التسرب للفواصل (Sealant Primer)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة 1 لتر'] },
  ] },
  { products: ['غطاء فواصل تمدد مرن (Expansion Joint System, elastomeric)'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['أرضيات', 'جدران وأسقف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م.ط'] },
  ] },
  { products: ['مونة تثبيت وتعشيق سريعة (Rapid Anchoring Mortar / Hydraulic Cement)'], spec: [
    { key: 's1', ar: 'العبوة', en: 'العبوة', options: ['سطل 5', 'كيس 25 كجم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 5 كجم'] },
  ] },
  { products: ['غراء تماس (كونتاكت)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['250مل', '1ل', '3ل', '15ل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['سائل', 'جل (ثكسوتروبي)'] },
    { key: 's3', ar: 'الأساس', en: 'الأساس', options: ['سولفنت', 'خالٍ من التولوين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['غراء تماس مائي (بدون رائحة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1ل', '4ل', '20ل'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['خشب وفورمايكا', 'فوم', 'مطاط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['لاصق أرضيات فينيل وسجاد'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5كغ', '15كغ', '20كغ'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['أكريليك مائي', 'تثبيت مؤقت (Tackifier)', 'بولي يوريثان'] },
    { key: 's3', ar: 'الاستخدام', en: 'الاستخدام', options: ['فينيل', 'LVT', 'سجاد', 'مطاط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['غراء خشب أبيض (PVA)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['250غ', '1كغ', '5كغ', '30كغ'] },
    { key: 's2', ar: 'الفئة', en: 'الفئة', options: ['D2', 'D3 مقاوم للماء'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['غراء خشب بولي يوريثان (D4 مقاوم للماء)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['250غ', '750غ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['غراء مواسير CPVC (مياه حارة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['118مل', '237مل', '473مل', '946مل'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['برتقالي', 'أصفر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['منظف وبرايمر مواسير PVC قبل اللحام'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['125مل', '250مل', '1ل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['شفاف', 'بنفسجي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['لاصق إيبوكسي مكونين (أنبوبين/سرنجة)'], spec: [
    { key: 's1', ar: 'التشطيب', en: 'التشطيب', options: ['شفاف', 'معدني (رمادي)'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['24مل', '50مل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['معجون إيبوكسي للإصلاح (عصا)'], spec: [
    { key: 's1', ar: 'الاستخدام', en: 'الاستخدام', options: ['متعدد', 'معادن', 'سباكة (تحت الماء)', 'خشب'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['48غ', '64غ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['غراء فوري (سوبر جلو)'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['سائل', 'جل'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['3غ', '20غ', '50غ'] },
    { key: 's3', ar: 'العبوة', en: 'العبوة', options: ['حبة', 'كرتون 12', '24'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['لاصق مونتاج (تثبيت بدون مسامير)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['290مل', '310مل', '450غ'] },
    { key: 's2', ar: 'الأساس', en: 'الأساس', options: ['مائي أكريليك', 'مطاطي سولفنت'] },
    { key: 's3', ar: 'الاستخدام', en: 'الاستخدام', options: ['داخلي', 'داخلي وخارجي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['لاصق هايبرد عالي الالتصاق (High Tack)'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['أبيض', 'أسود', 'شفاف (Crystal)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['لاصق بولي يوريثان إنشائي للألواح والكلادينج'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['290مل', '600مل (سجق)'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['ألواح', 'خشب', 'حجر', 'معادن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['فوم لاصق للألواح العازلة (XPS/EPS)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['لاصق ألواح الجبس والكرانيش (بودرة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5كغ', '20كغ', '25كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق ستايروفوم وكرانيش بوليسترين'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['290مل', '1كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['أصابع شمع غراء حراري (هوت ميلت)'], spec: [
    { key: 's1', ar: 'القطر', en: 'القطر', options: ['7مم', '11مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['10سم', '30سم'] },
    { key: 's3', ar: 'اللون', en: 'اللون', options: ['شفاف', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حزمة'] },
  ] },
  { products: ['لاصق رخام وحجر (بوليستر/إيبوكسي)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1ل', '4ل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['بوليستر', 'إيبوكسي'] },
    { key: 's3', ar: 'اللون', en: 'اللون', options: ['شفاف', 'بيج', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['غراء عزل الدكت (لاصق الصوف والفوم)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['3.5ل', '18ل'] },
    { key: 's2', ar: 'الأساس', en: 'الأساس', options: ['سولفنت', 'مائي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['لاصق عزل الأنابيب المطاطي (أرمافلكس)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['0.5ل', '1ل', '2.5ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مادة ربط SBR (لاتكس للمونة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5ل', '20ل', '200ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['مادة ربط PVA للياسة (بوندنج أبيض)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5ل', '20ل', '30كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['مادة ربط إيبوكسي (خرسانة قديمة بجديدة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1كغ', '5كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['شريط ماسكنج ورقي (للدهان)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['18', '24', '36', '48مم'] },
    { key: 's2', ar: 'الدرجة', en: 'الدرجة', options: ['عادي', 'حراري', 'خارجي مقاوم UV (أزرق)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['شريط لاصق شفاف للتغليف (كرتون)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['48', '72مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['50', '100م'] },
    { key: 's3', ar: 'اللون', en: 'اللون', options: ['شفاف', 'بني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['شريط قماشي (داكت تيب)'], spec: [
    { key: 's1', ar: 'الطول', en: 'الطول', options: ['10', '25', '50م'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['فضي', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط لاصق وجهين رقيق (ورقي/شفاف)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['12', '19', '24', '48مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['10', '50م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط لاصق وجهين فوم (للمرايا واللوحات)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['12', '19', '25مم'] },
    { key: 's2', ar: 'السماكة', en: 'السماكة', options: ['1', '2مم'] },
    { key: 's3', ar: 'الاستخدام', en: 'الاستخدام', options: ['داخلي', 'خارجي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط VHB إنشائي للألواح والواجهات'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['6', '9', '12', '19', '25مم'] },
    { key: 's2', ar: 'السماكة', en: 'السماكة', options: ['0.6', '1.1', '2.3مم'] },
    { key: 's3', ar: 'اللون', en: 'اللون', options: ['أسود', 'رمادي', 'شفاف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط ألمنيوم (فويل تيب)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['48', '50', '75', '100مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['10', '45', '50م'] },
    { key: 's3', ar: 'الدرجة', en: 'الدرجة', options: ['عادي', 'حراري'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط ألمنيوم مقوى FSK لعزل الدكت'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['48', '72', '100مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['45', '50م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['شريط بيوتيل لاصق للتسربات (وجه ألمنيوم)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['5', '7.5', '10', '15', '30سم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['3', '10م'] },
    { key: 's3', ar: 'الوجه', en: 'الوجه', options: ['ألمنيوم', 'رمادي', 'طيني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط بيوتيل وجهين (للصاج والزجاج)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['10', '15', '20مم'] },
    { key: 's2', ar: 'السماكة', en: 'السماكة', options: ['1', '2', '3مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط بيتوميني ذاتي اللصق (فلاشينج)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['10', '15', '22.5', '30سم'] },
    { key: 's2', ar: 'الوجه', en: 'الوجه', options: ['ألمنيوم', 'رصاصي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط عازل للحريق والمياه للفواصل (FWBT)'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['3"', '4"', '6"', '9"', '12"'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط مانع انزلاق للدرج'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['25', '50مم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['5', '18م'] },
    { key: 's3', ar: 'اللون', en: 'اللون', options: ['أسود', 'أصفر-أسود', 'شفاف', 'فوسفوري'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط فوم عازل للأبواب والنوافذ'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['9', '12', '19مم'] },
    { key: 's2', ar: 'السماكة', en: 'السماكة', options: ['3', '6', '9مم'] },
    { key: 's3', ar: 'النوع', en: 'النوع', options: ['EPDM', 'PU', 'PE'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط تمدد لعزل فواصل النوافذ (Expanding Tape)'], spec: [
    { key: 's1', ar: 'الفاصل', en: 'الفاصل', options: ['2–6', '5–12', '10–20مم'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['برايمر بيتوميني مائي (WB)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20ل', '200ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل'] },
  ] },
  { products: ['برايمر بيتوميني سولفنت (كت باك MC/RC)'], spec: [
    { key: 's1', ar: 'الدرجة', en: 'الدرجة', options: ['MC-30', 'MC-70', 'RC-2', 'D41'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['20ل', '200ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل'] },
  ] },
  { products: ['دهان بيتوميني مستحلب (إيمولشن)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20ل', '200ل'] },
    { key: 's2', ar: 'الأساس', en: 'الأساس', options: ['مائي', 'خالٍ من المذيبات'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل'] },
  ] },
  { products: ['مستحلب بيتوميني معدّل بالمطاط (RBE)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20ل', '200ل'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['أساسات', 'كيورنج للخرسانة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل'] },
  ] },
  { products: ['دهان بيتوميني مقوى بالألياف (للأسطح)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20ل', '200ل'] },
    { key: 's2', ar: 'طريقة الاستخدام', en: 'طريقة الاستخدام', options: ['فرشاة', 'مالج'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل'] },
  ] },
  { products: ['دهان بيتوميني سولفنت (للأساسات)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20ل', '200ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['برميل'] },
  ] },
  { products: ['طلاء عزل أسطح أكريليك مرن عاكس للحرارة'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['4ل', '18ل', '20كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أبيض', 'رمادي', 'أخضر'] },
    { key: 's3', ar: 'الألياف', en: 'الألياف', options: ['مقوى بالألياف', 'عادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['عزل بولي يوريثان سائل للأسطح'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['6كغ', '25كغ'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['مكون واحد', 'مكونين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['عزل سيماني مرن مكونين (2K)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['عزل مائي للحمامات تحت البلاط (جاهز)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['7كغ', '15كغ', '20كغ'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['مكون واحد جاهز', 'مكونين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['شريط زوايا مطاطي لعزل الحمامات'], spec: [
    { key: 's1', ar: 'العرض', en: 'العرض', options: ['10', '12سم'] },
    { key: 's2', ar: 'الطول', en: 'الطول', options: ['10', '50م'] },
    { key: 's3', ar: 'النوع', en: 'النوع', options: ['شريط', 'زاوية داخلية', 'زاوية خارجية', 'طوق ماسورة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['غشاء بيتوميني APP لفة (4مم)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['3', '4', '5مم'] },
    { key: 's2', ar: 'التشطيب', en: 'التشطيب', options: ['رمل', 'فيلم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['غشاء بيتوميني SBS (مرن للبرودة)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['3', '4', '5مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['غشاء بيتوميني مكسو بالحبيبات (للأسطح المكشوفة)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['4', '4.5', '5مم'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أخضر', 'أحمر', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['غشاء بيتوميني ذاتي اللصق (بدون لهب)'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['1.5', '2', '3مم'] },
    { key: 's2', ar: 'الوجه', en: 'الوجه', options: ['HDPE', 'ألمنيوم', 'حبيبات'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['لفائف عزل PVC/TPO للأسطح'], spec: [
    { key: 's1', ar: 'السماكة', en: 'السماكة', options: ['1.2', '1.5', '2مم'] },
    { key: 's2', ar: 'العرض', en: 'العرض', options: ['1.5', '2م'] },
    { key: 's3', ar: 'النوع', en: 'النوع', options: ['مقوى', 'غير مقوى'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['قماش بوليستر تسليح للعزل السائل'], spec: [
    { key: 's1', ar: 'الوزن', en: 'الوزن', options: ['50', '80', '110غ', 'م²'] },
    { key: 's2', ar: 'العرض', en: 'العرض', options: ['10سم', '1م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['عزل كريستالي للخرسانة (Crystalline)'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['طلاء', 'إضافة للخلطة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['راتنج حقن بولي يوريثان للتسريبات'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['مرن', 'صلب', 'رغوي'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['5ل', '20ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['عازل مائي شفاف للواجهات والحجر (سيلان/سيلوكسان)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5ل', '20ل'] },
    { key: 's2', ar: 'الأساس', en: 'الأساس', options: ['مائي', 'سولفنت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['لاصق بلاط أسمنتي عادي C1 (سيراميك)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق بلاط محسّن C2T (بورسلان)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق بلاط C2TE (بورسلان ومناطق رطبة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق بلاط مرن C2TE S1 (فورمات كبير وخارجي)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['رمادي', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق بلاط سريع التصلب C2F'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'الفئة', en: 'الفئة', options: ['C2F', 'C2FT', 'C2FTS1'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق رخام وحجر أبيض (أسمنتي)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'الفئة', en: 'الفئة', options: ['C2TE', 'C2TE S1'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق بلاط المسابح'], spec: [
    { key: 's1', ar: 'اللون', en: 'اللون', options: ['أبيض', 'رمادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['لاصق بلاط جاهز (معجون سطل)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5كغ', '15كغ', '25كغ'] },
    { key: 's2', ar: 'الفئة', en: 'الفئة', options: ['D1', 'D2', 'D2TE'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['ترويبة أسمنتية عادية CG1'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1كغ', '5كغ', '20كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أبيض', 'رمادي', 'بيج', 'أسود', 'ألوان'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['ترويبة محسّنة CG2WA (مقاومة للماء والاحتكاك)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['2كغ', '5كغ', '20كغ'] },
    { key: 's2', ar: 'الفاصل', en: 'الفاصل', options: ['1–8مم', '2–15مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['ترويبة المسابح'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['أسمنتي محسّن', 'إيبوكسي'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['5كغ', '20كغ'] },
    { key: 's3', ar: 'اللون', en: 'اللون', options: ['أبيض', 'أزرق', 'رمادي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['عازل ترويبة شفاف (Grout Sealer)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['0.5ل', '1ل', '5ل'] },
    { key: 's2', ar: 'الأساس', en: 'الأساس', options: ['مائي', 'سولفنت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['معجون جدران جاهز (أكريليك – سطل)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5كغ', '15كغ', '25كغ'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['داخلي', 'خارجي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل'] },
  ] },
  { products: ['معجون أسمنتي بودرة للواجهات (سكيم كوت)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أبيض', 'رمادي'] },
    { key: 's3', ar: 'الاستخدام', en: 'الاستخدام', options: ['داخلي', 'خارجي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['جبس تلبيس بودرة (بلاستر)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['20كغ', '25كغ', '40كغ'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['تلبيس', 'جبس تشكيل (بلدي)', 'سريع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['معجون حشو شقوق جاهز (أنبوب/علبة)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['330غ', '1كغ'] },
    { key: 's2', ar: 'الاستخدام', en: 'الاستخدام', options: ['داخلي', 'خارجي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['معجون خشب (حشوة خشب)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['250غ', '1كغ'] },
    { key: 's2', ar: 'اللون', en: 'اللون', options: ['أبيض', 'بيج', 'بني', 'ماهوجني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['معجون بوليستر (معجون حديد/سيارات)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1كغ', '3كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['برايمر قبل اللاصق للأسطح الملساء (بلاط فوق بلاط)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['5ل', '10ل', '20ل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['أكريليك', 'كوارتز (رملي)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['برايمر مانع التسرب للأسطح المسامية'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['250مل', '500مل', '1ل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['للمسامي', 'لغير المسامي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['فوم منخفض التمدد للأبواب والنوافذ'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['500مل', '750مل'] },
    { key: 's2', ar: 'طريقة الاستخدام', en: 'طريقة الاستخدام', options: ['مسدس', 'يدوي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['مسدس فوم معدني'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['اقتصادي', 'احترافي (تفلون)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['منظف الفوم والمسدس (أسيتون بخاخ)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['150مل', '500مل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مزيل السيليكون والمواد اللاصقة'], spec: [
    { key: 's1', ar: 'الشكل', en: 'الشكل', options: ['جل', 'بخاخ'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['100مل', '400مل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['منظف أسطح قبل السيليكون (زجاج/ألمنيوم)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1ل', '4ل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['كحول أيزوبروبيل', 'مذيب خاص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مزيل بقايا الأسمنت والمونة عن البلاط'], spec: [
    { key: 's1', ar: 'النوع', en: 'النوع', options: ['حمض مخفف (موريتك)', 'مزيل عضوي آمن للرخام'] },
    { key: 's2', ar: 'المقاس', en: 'المقاس', options: ['1ل', '4ل', '20ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['منظف بقايا الترويبة الإيبوكسية'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1ل', '5ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['أسيتون صناعي'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1ل', '4ل', '20ل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['مزيل دهانات (Paint Stripper)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['1ل', '4ل'] },
    { key: 's2', ar: 'الشكل', en: 'الشكل', options: ['جل', 'سائل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['بخاخ متعدد الأغراض (مزيل صدأ ومزلّق)'], spec: [
    { key: 's1', ar: 'المقاس', en: 'المقاس', options: ['200مل', '400مل'] },
    { key: 's2', ar: 'النوع', en: 'النوع', options: ['مزلّق', 'سيليكون', 'مزيل صدأ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['صاج مدرفل على البارد (CR Sheet)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['0.5', '0.7', '0.9', '1.0', '1.2', '1.5', '2.0مم'] },
    { key: 's2', ar: 'مقاس', en: 'مقاس', options: ['1×2م', '1.22×2.44م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['صاج ملوّن مسبق الدهان (PPGI / PPGL)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['0.3', '0.4', '0.5', '0.7مم'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أبيض', 'بيج', 'أحمر', 'أخضر'] },
    { key: 's3', ar: 'نوع', en: 'نوع', options: ['PPGI', 'PPGL'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['صاج مموّج ملوّن للأسقف والسواتر (Corrugated Sheet)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['0.3', '0.4', '0.5مم'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أبيض', 'أحمر', 'بيج'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي'] },
  ] },
  { products: ['لفائف صاج أسود حار (HR Coil)'], spec: [
    { key: 's1', ar: 'عرض', en: 'عرض', options: ['1000', '1250', '1500مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن'] },
  ] },
  { products: ['لفائف صاج مجلفن (GI Coil G90)'], spec: [
    { key: 's1', ar: 'طبقة زنك', en: 'طبقة زنك', options: ['Z120', 'Z275 (G90)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن'] },
  ] },
  { products: ['لوح حديد سميك (Heavy Steel Plate ASTM A36 / Gr.50)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['4', '5', '6', '8', '10', '12', '16', '20'] },
    { key: 's2', ar: 'مقاس', en: 'مقاس', options: ['1.5×6م', '2×12م', '4×8 قدم'] },
    { key: 's3', ar: 'درجة', en: 'درجة', options: ['A36', 'Gr50'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['حديد مربع مصمت (Square Bar)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['10', '12', '14', '16', '20', '25مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طول (6م)'] },
  ] },
  { products: ['حديد مدوّر مصمت / شافت (Round Bar)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['أسود', 'CD مسحوب على البارد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طول (6م)'] },
  ] },
  { products: ['ماسورة حديد بيضاوية (Oval Tube)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['15×30', '20×40', '25×50مم'] },
    { key: 's2', ar: 'سماكة', en: 'سماكة', options: ['1.0', '1.2', '1.5مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طول (6م)'] },
  ] },
  { products: ['جسور حديد يابانية JIS (H / I Beam)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['H', 'I'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['6', '12م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن'] },
  ] },
  { products: ['حديد تسليح مقصوص ومثني حسب المخطط (Cut & Bend)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن'] },
  ] },
  { products: ['حديد تسليح مطلي إيبوكسي (Epoxy-coated Rebar)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن'] },
  ] },
  { products: ['حديد تسليح أملس (Plain Round Rebar)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['6', '8', '10', '12مم'] },
    { key: 's2', ar: 'شكل', en: 'شكل', options: ['أطوال', 'لفائف'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن'] },
  ] },
  { products: ['سلك رباط حديد التسليح (Binding Wire)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['أسود مخمّر', 'مجلفن'] },
    { key: 's2', ar: 'وزن اللفة', en: 'وزن اللفة', options: ['20', '25كغ'] },
    { key: 's3', ar: 'قطر', en: 'قطر', options: ['1.2', '1.5مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['كرسي حمل حديد التسليح (Bar Chair)'], spec: [
    { key: 's1', ar: 'مادة', en: 'مادة', options: ['بلاستيك', 'حديد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['فاصل عجلة بلاستيكي للأعمدة والجدران (Wheel Spacer)'], spec: [
    { key: 's1', ar: 'غطاء خرساني', en: 'غطاء خرساني', options: ['20', '25', '30', '40', '50مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['عتبة خرسانية مسبقة الصب للفتحات (Precast Lintel)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['1.2', '1.5', '2.0', '2.5م'] },
    { key: 's2', ar: 'عرض', en: 'عرض', options: ['10', '15', '20سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['عتبة بلوك خفيف (AAC Lintel)'], spec: [
    { key: 's1', ar: 'عرض', en: 'عرض', options: ['10', '15', '20سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['عتبة حديد مجلفنة للفتحات (Steel Lintel)'], spec: [
    { key: 's1', ar: 'عرض الجدار', en: 'عرض الجدار', options: ['10', '15', '20سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['بلوك خرساني خلوي خفيف (AAC Block / سيبوريكس)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['10', '15', '20', '25سم'] },
    { key: 's2', ar: 'كثافة', en: 'كثافة', options: ['450', '550', '650كغ', 'م³'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³'] },
  ] },
  { products: ['بلوك أسمنتي مصمت (Solid Concrete Block)'], spec: [
    { key: 's1', ar: 'عرض', en: 'عرض', options: ['10', '15', '20سم'] },
    { key: 's2', ar: 'وجه', en: 'وجه', options: ['عادي', 'فير فيس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['طوب أحمر حامل للأحمال (Load-bearing Clay Brick)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['عادي', 'معزول ثقيل'] },
    { key: 's2', ar: 'عرض', en: 'عرض', options: ['10', '15', '20سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['طوب أحمر لحماية المواسير (Pipe-protector Brick)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['هوردي بوليسترين للأسقف (EPS Hourdi Block)'], spec: [
    { key: 's1', ar: 'ارتفاع', en: 'ارتفاع', options: ['20', '25', '30سم'] },
    { key: 's2', ar: 'كثافة', en: 'كثافة', options: ['12', '15كغ', 'م³'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['أسمنت مقاوم للكبريتات (SRC)'], spec: [
    { key: 's1', ar: 'شكل', en: 'شكل', options: ['كيس', 'سائب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['أسمنت أبيض (White Portland Cement)'], spec: [
    { key: 's1', ar: 'وزن', en: 'وزن', options: ['25', '40', '50كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['أسمنت بوزولاني (PPC)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['أسمنت لياسة وتشطيب (Masonry / Finishing Cement)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['شبك سلّمي لتسليح البلوك (Block Ladder Mesh)'], spec: [
    { key: 's1', ar: 'عرض', en: 'عرض', options: ['10', '15', '20سم'] },
    { key: 's2', ar: 'نوع', en: 'نوع', options: ['مجلفن عادي', 'ثقيل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3م)'] },
  ] },
  { products: ['رباط جدار معدني مموّج (Wall Tie)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['مموّج', 'رباط حركة بجلبة'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['150', '200مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['صامولة جناح للطوبار (Formwork Wing Nut)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['15', '17مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['صحن تثبيت قضيب الشد (Tie-rod Waler Plate)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['100×100', '120×120مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ماسورة ومخروط PVC لقضيب الشد (Tie-rod Sleeve & Cone)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['22', '26مم'] },
    { key: 's2', ar: 'طول الماسورة', en: 'طول الماسورة', options: ['2', '3م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['ربطة'] },
  ] },
  { products: ['مانع تسرب لقضيب الشد للخزانات (Tie-rod Water Stopper)'], spec: [
    { key: 's1', ar: 'قطر القضيب', en: 'قطر القضيب', options: ['15', '17مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['قمطة طوبار سريعة (Rapid Clamp)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['قياسي', 'مع شدّاد'] },
    { key: 's2', ar: 'تشطيب', en: 'تشطيب', options: ['مجلفن', 'مدهون'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['شطفة زوايا PVC للخرسانة (PVC Chamfer Strip)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['15', '20', '25مم'] },
    { key: 's2', ar: 'نوع', en: 'نوع', options: ['عادي', 'بجناح'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3م)'] },
  ] },
  { products: ['لوح سقالة خشبي (Scaffold Plank)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['3', '4', '4.8م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['خشب أبيض لين للبناء والنجارة (White Wood / Spruce)'], spec: [
    { key: 's1', ar: 'منشأ', en: 'منشأ', options: ['فنلندي', 'سويدي', 'روماني', 'روسي'] },
    { key: 's2', ar: 'تجفيف', en: 'تجفيف', options: ['هوائي', 'فرن'] },
    { key: 's3', ar: 'تشطيب', en: 'تشطيب', options: ['خام', 'مسحوج S4S'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³'] },
  ] },
  { products: ['خشب أحمر سويدي (Redwood / Pine)'], spec: [
    { key: 's1', ar: 'درجة', en: 'درجة', options: ['IV', 'V', 'VI'] },
    { key: 's2', ar: 'تجفيف', en: 'تجفيف', options: ['هوائي', 'فرن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³'] },
  ] },
  { products: ['بليود مغطّى بالفيلم للطوبار (Film-faced Plywood)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['12', '15', '18', '21مم'] },
    { key: 's2', ar: 'منشأ', en: 'منشأ', options: ['صيني', 'إندونيسي', 'روسي', 'برازيلي'] },
    { key: 's3', ar: 'وجه', en: 'وجه', options: ['بني', 'أسود', 'بلاستيك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['بليود مقشّر خشب طبيعي (Veneer Plywood)'], spec: [
    { key: 's1', ar: 'قشرة', en: 'قشرة', options: ['بلوط', 'ماهوجني', 'تيك', 'جوز'] },
    { key: 's2', ar: 'سماكة', en: 'سماكة', options: ['3', '6', '9', '12', '18مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['بليود مطلي بوليستر (Polyester Plywood)'], spec: [
    { key: 's1', ar: 'لون', en: 'لون', options: ['أبيض', 'ألوان خشبية'] },
    { key: 's2', ar: 'سماكة', en: 'سماكة', options: ['3', '6', '18مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['ألواح بلوك بورد (Blockboard)'], spec: [
    { key: 's1', ar: 'وجه', en: 'وجه', options: ['عادي', 'قشرة بلوط', 'ماهوجني', 'بوليستر'] },
    { key: 's2', ar: 'سماكة', en: 'سماكة', options: ['18', '25مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['MDF مقاوم للرطوبة (MR MDF – أخضر)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['3', '6', '9', '12', '16', '18', '25مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['MDF مقاوم للحريق (FR MDF – أحمر)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['9', '12', '18مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['MDF مقشّر خشب طبيعي (Veneered MDF)'], spec: [
    { key: 's1', ar: 'قشرة', en: 'قشرة', options: ['بلوط', 'ماهوجني', 'جوز'] },
    { key: 's2', ar: 'سماكة', en: 'سماكة', options: ['3', '6', '18مم'] },
    { key: 's3', ar: 'وجه', en: 'وجه', options: ['واحد', 'وجهين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['لوح ميلامين خشب مضغوط (MFC / Melamine Chipboard)'], spec: [
    { key: 's1', ar: 'لون', en: 'لون', options: ['سادة', 'خشبي'] },
    { key: 's2', ar: 'سماكة', en: 'سماكة', options: ['8', '16', '18', '25مم'] },
    { key: 's3', ar: 'مقاس', en: 'مقاس', options: ['1.83×3.66', '2.07×2.8م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['خشب مضغوط عادي (Chipboard / فونتكس)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['9', '12', '16', '18مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['ألواح OSB (Oriented Strand Board)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['9', '12', '15', '18مم'] },
    { key: 's2', ar: 'درجة', en: 'درجة', options: ['OSB', '3 مقاوم للرطوبة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['MDF مخدّد ميلامين للعرض (Slatwall / Grooved MDF)'], spec: [
    { key: 's1', ar: 'لون', en: 'لون', options: ['أبيض', 'أسود', 'خشبي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['زاوية لياسة مجلفنة بشبك (Angle Bead)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['مجلفن', 'ميكرو', 'PVC'] },
    { key: 's2', ar: 'جناح', en: 'جناح', options: ['شبك', 'مثقّب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3م)'] },
  ] },
  { products: ['زاوية إيقاف اللياسة (Plaster Stop Bead)'], spec: [
    { key: 's1', ar: 'سماكة اللياسة', en: 'سماكة اللياسة', options: ['10', '13', '16', '20مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3م)'] },
  ] },
  { products: ['زاوية فاصل حركة للياسة (Control Joint Bead)'], spec: [
    { key: 's1', ar: 'مادة', en: 'مادة', options: ['مجلفن', 'PVC'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3م)'] },
  ] },
  { products: ['زاوية بروز (أركيتريف) للياسة حول الفتحات (Architrave Bead)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['بجناح شبك', 'بدون'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة (3م)'] },
  ] },
  { products: ['شبك فايبر جلاس لتسليح اللياسة (Fibreglass Plaster Mesh)'], spec: [
    { key: 's1', ar: 'وزن', en: 'وزن', options: ['75', '110', '145غ', 'م²'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شبك زاوية مجلفن لتقاطع البلوك والخرسانة (Corner / Strip Mesh)'], spec: [
    { key: 's1', ar: 'عرض', en: 'عرض', options: ['10', '15', '20سم'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['2.5', '3م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['شعر سيزال لأعمال الجبس (Sisal Fibre)'], spec: [
    { key: 's1', ar: 'حزمة', en: 'حزمة', options: ['1', '5كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كغ'] },
  ] },
  { products: ['طبقة رشّ أولية قبل اللياسة (Spatter Dash / Scratch Coat)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس'] },
  ] },
  { products: ['فتحة صيانة للسقف المستعار (Ceiling Access Panel)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['30×30', '40×40', '60×60سم'] },
    { key: 's2', ar: 'قفل', en: 'قفل', options: ['يدوي', 'ضغط'] },
    { key: 's3', ar: 'لوح', en: 'لوح', options: ['عادي', 'مقاوم رطوبة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ألواح بوليسترين EPS (ستايروفوم أبيض)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['2', '3', '5', '7', '10سم'] },
    { key: 's2', ar: 'كثافة', en: 'كثافة', options: ['12', '15', '20كغ', 'م³'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['شرائح بوليسترين لحشو البلوك المعزول (Block Insulation Filler)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['حسب عرض البلوك 15', '20سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['لفائف فوم بولي إيثيلين عازل (PE Foam Roll)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['3', '5', '10مم'] },
    { key: 's2', ar: 'وجه', en: 'وجه', options: ['سادة', 'فويل ألمنيوم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['مزراب صاج للهناجر (Steel Gutter)'], spec: [
    { key: 's1', ar: 'مادة', en: 'مادة', options: ['مجلفن', 'ملوّن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي'] },
  ] },
  { products: ['غطاء قمة السقف للهناجر (Ridge Capping)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['0.4', '0.5مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي'] },
  ] },
  { products: ['صاج مقوّس للمظلات والهناجر (Curved Sheet)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['0.4', '0.5مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['إكسسوارات أبواب الهناجر المنزلقة (Hangar Door Track & Rollers)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['صاج ألمنيوم مضلّع/منقوش (Aluminium Chequered Plate)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['1.5', '2', '3', '5مم'] },
    { key: 's2', ar: 'نقشة', en: 'نقشة', options: ['5 أصابع', 'ماسي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['صاج ألمنيوم مزخرف ستوكو (Stucco Embossed Sheet)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['0.5', '0.6', '0.7مم'] },
    { key: 's2', ar: 'شكل', en: 'شكل', options: ['سادة', 'مموّج'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح'] },
  ] },
  { products: ['مواسير صرف PP صامتة بحلقة مطاطية (PP Silent Push-fit)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['50', '75', '110', '125', '160مم'] },
    { key: 's2', ar: 'نوع', en: 'نوع', options: ['صامت', 'معزول'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طول'] },
  ] },
  { products: ['مصيدة صرف P (P-Trap) uPVC'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['50', '75', '110مم'] },
    { key: 's2', ar: 'وصلة', en: 'وصلة', options: ['لحام', 'مطاط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['محبس أرضي مجمّع (Collector Floor Gully)'], spec: [
    { key: 's1', ar: 'مداخل', en: 'مداخل', options: ['3', '4', '5'] },
    { key: 's2', ar: 'مخرج', en: 'مخرج', options: ['75', '110مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['سدادة/كوع تفتيش وتنظيف (Cleanout / Access Fitting)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['75', '110', '160مم'] },
    { key: 's2', ar: 'نوع', en: 'نوع', options: ['سدادة', 'كوع', 'تي بغطاء'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['غطاء تهوية للسطح (Roof Vent Cap)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['50', '75', '110مم'] },
    { key: 's2', ar: 'مادة', en: 'مادة', options: ['uPVC', 'ألمنيوم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['وصلات صرف uPVC (واي/مخفّض/تي صحي/وصلة إصلاح)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['Y', 'Y مزدوج', 'مخفّض', 'تي صحي', 'وصلة إصلاح'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مواسير uPVC ضغط سكجول 80 (Sch 80)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['1', '2–4 إنش'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طول (6م)'] },
  ] },
  { products: ['محبس دفن PPR (Concealed Stop Valve)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['20', '25', '32مم'] },
    { key: 's2', ar: 'مقبض', en: 'مقبض', options: ['كروم', 'ممدد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['خلاط دفن (Concealed Mixer Valve)'], spec: [
    { key: 's1', ar: 'مخارج', en: 'مخارج', options: ['1', '2', '3'] },
    { key: 's2', ar: 'نوع', en: 'نوع', options: ['PPR', 'نحاس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['وصلات PPR بسن نحاسي داخلي/خارجي (PPR Brass Adaptor)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['ذكر', 'أنثى', 'كوع', 'تي', 'يونيون'] },
    { key: 's2', ar: 'مقاس', en: 'مقاس', options: ['20×1', '2 إلى 63×2'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['قوس تعدية PPR (Crossover)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['20', '25', '32مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['سدادة اختبار ضغط PPR (Test Plug)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['1', '2', '3', '4 إنش'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['قصير', 'طويل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['20', '25مم'] },
    { key: 's2', ar: 'نوع', en: 'نوع', options: ['مزدوج', 'مفرد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مصفاة Y نحاس (Y-Strainer)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['1', '2–2 إنش'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['صمام قدم للمضخة (Foot Valve)'], spec: [
    { key: 's1', ar: 'مادة', en: 'مادة', options: ['نحاس', 'بلاستيك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['محبس زاوية مزدوج (Double Angle Valve)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['1', '2×1', '2'] },
    { key: 's2', ar: 'مقبض', en: 'مقبض', options: ['دائري', 'زماك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['صمام أمان السخان (Water Heater Safety Valve)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['1', '2', '3', '4 إنش'] },
    { key: 's2', ar: 'ضغط', en: 'ضغط', options: ['6', '8 بار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['قطع غيار السخان (عنصر تسخين/ثرموستات/جلدة)'], spec: [
    { key: 's1', ar: 'قطعة', en: 'قطعة', options: ['عنصر', 'ثرموستات', 'جلدة', 'حامل'] },
    { key: 's2', ar: 'قدرة', en: 'قدرة', options: ['1.5', '2', '3 كيلوواط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['سخان مياه كهربائي فوري (Instant Electric Heater)'], spec: [
    { key: 's1', ar: 'قدرة', en: 'قدرة', options: ['3.5', '4.5', '6.5 كيلوواط'] },
    { key: 's2', ar: 'نقاط', en: 'نقاط', options: ['مفرد', 'متعدد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مروحة تبريد خزان بالطاقة الشمسية (Solar Tank Cooler)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['غطاء خزان أرضي/منهل ألمنيوم أو فايبر (Tank & Manhole Cover)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['60×60', '70×70', '80×80سم'] },
    { key: 's2', ar: 'مادة', en: 'مادة', options: ['ألمنيوم', 'فايبر جلاس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['زر طرد للخزان المخفي (Flush Plate)'], spec: [
    { key: 's1', ar: 'لون', en: 'لون', options: ['أبيض', 'كروم', 'أسود'] },
    { key: 's2', ar: 'شكل', en: 'شكل', options: ['مستطيل', 'دائري'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['خزان طرد ظاهر (Exposed Cistern)'], spec: [
    { key: 's1', ar: 'تركيب', en: 'تركيب', options: ['عالٍ', 'منخفض'] },
    { key: 's2', ar: 'سعة', en: 'سعة', options: ['6', '9 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['غطاء مقعد مرحاض (Toilet Seat Cover)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['عادي', 'سوفت كلوز'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['حلقة شمع/مطاط لتركيب المرحاض (Wax / Rubber Ring)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['شمع', 'مطاط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مصرف مغسلة أوتوماتيكي (Pop-up / Click-clack Waste)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['1 1', '4 إنش'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مصافي ألمنيوم (أرضية/ركنية/دش/سطح)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['أرضية', 'ركنية', 'دش', 'سطح', 'عزل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مزلّق تركيب مواسير الصرف (Pipe Lubricant)'], spec: [
    { key: 's1', ar: 'وزن', en: 'وزن', options: ['250', '500غ', '1كغ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['ساعة ضغط ماء ومضخة اختبار ضغط (Pressure Gauge / Test Pump)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['ساعة', 'مضخة يدوية'] },
    { key: 's2', ar: 'مدى', en: 'مدى', options: ['0–16', '0–60 بار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['خرطوم حديقة مع بكرة (Garden Hose & Reel)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['1', '2', '3', '4 إنش'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['15', '25', '50م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['مسدس رشّ ماء للخرطوم (Hose Nozzle Gun)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['نحاس', 'بلاستيك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['خرطوم هواء وغاز ضغط عالٍ (Air & Gas Hose)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['1', '4–1', '2 إنش'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['50', '100م'] },
    { key: 's3', ar: 'ضغط', en: 'ضغط', options: ['20', '40 بار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['خرطوم مسطّح للنزح (Lay-flat Hose)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['2', '3', '4 إنش'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['50', '100م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['سلك مفرد نحاسي معزول (THHN / NYA)'], spec: [
    { key: 's1', ar: 'مقطع', en: 'مقطع', options: ['1.5', '2.5', '4', '6', '10مم² أو AWG 14', '12', '10'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أحمر', 'أسود', 'أصفر', 'أزرق', 'أخضر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['كابل مرن متعدد الأقطاب (Flexible Cord)'], spec: [
    { key: 's1', ar: 'أقطاب', en: 'أقطاب', options: ['2', '3', '4'] },
    { key: 's2', ar: 'مقطع', en: 'مقطع', options: ['0.75', '1.5', '2.5مم²'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['كابل ستلايت محوري (RG6 Coaxial)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['100', '305م'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أسود', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['سلك هاتف (Telephone Wire)'], spec: [
    { key: 's1', ar: 'أزواج', en: 'أزواج', options: ['2', '4'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['ماسورة كهرباء مرنة مموّجة (Corrugated Flexible Conduit)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['20', '25', '32مم'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أسود', 'برتقالي', 'رمادي'] },
    { key: 's3', ar: 'طول', en: 'طول', options: ['25', '50م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['ماسورة EMT مرنة ووصلاتها (Flexible Metal Conduit & EMT Connectors)'], spec: [
    { key: 's1', ar: 'قطر', en: 'قطر', options: ['1', '2–2 إنش'] },
    { key: 's2', ar: 'قطعة', en: 'قطعة', options: ['ماسورة مرنة', 'كونكتر', 'كوبلنج', 'كوع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر'] },
  ] },
  { products: ['قاطع تفاضلي مع حماية زيادة الحمل (RCBO)'], spec: [
    { key: 's1', ar: 'حساسية', en: 'حساسية', options: ['30', '100mA'] },
    { key: 's2', ar: 'أقطاب', en: 'أقطاب', options: ['1P+N', '2P'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['صندوق عداد وقاطع رئيسي خارجي (Outdoor Meter / Busbar Chamber)'], spec: [
    { key: 's1', ar: 'حماية', en: 'حماية', options: ['IP54', 'IP65'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مفتاح فندقي بالبطاقة (Key-card Switch)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['ميكانيكي', 'إلكتروني'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أبيض', 'فضي', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مفتاح ستارة كهربائية (Curtain / Blind Switch)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['ميكانيكي', 'لمس'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أبيض', 'أسود'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['وحدة تحكم الطبّاخ 45A (Cooker Control Unit)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مخرج موصول بفيوز (Fused Connection Unit / Spur)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)'], spec: [
    { key: 's1', ar: 'تيار', en: 'تيار', options: ['20', '32', '45A'] },
    { key: 's2', ar: 'مفتاح', en: 'مفتاح', options: ['عادي', 'عريض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['غطاء مقاوم للماء للأفياش (Weatherproof Cover IP55)'], spec: [
    { key: 's1', ar: 'فتحة', en: 'فتحة', options: ['1', '2 وحدة'] },
    { key: 's2', ar: 'حماية', en: 'حماية', options: ['IP44', 'IP55'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['بكرة كيبل تمديد معدنية (Cable Reel)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['25', '50م'] },
    { key: 's2', ar: 'مقطع', en: 'مقطع', options: ['1.5', '2.5مم²'] },
    { key: 's3', ar: 'منافذ', en: 'منافذ', options: ['2', '4'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ترمنال بلوك وفيوز (Terminal Block & Fuses)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['ترمنال شريطي', 'فيوز خرطوشة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['محوّل جهد 110/220 (Auto Transformer)'], spec: [
    { key: 's1', ar: 'قدرة', en: 'قدرة', options: ['500', '1000', '2000', '3000 واط'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['غرفة تفتيش تأريض (Earth Pit) وكلامب'], spec: [
    { key: 's1', ar: 'مادة', en: 'مادة', options: ['خرسانة', 'بلاستيك'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['لمبة أنبوبية ليد T8 (LED Tube)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['60', '120', '150سم'] },
    { key: 's2', ar: 'قدرة', en: 'قدرة', options: ['9', '18', '24 واط'] },
    { key: 's3', ar: 'لون', en: 'لون', options: ['أبيض', 'دافئ'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['كشاف ليد مقاوم للماء والغبار (Vapour-proof / Batten)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['60', '120', '150سم'] },
    { key: 's2', ar: 'حماية', en: 'حماية', options: ['IP20', 'IP65'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ماكينة ثني حديد التسليح (Rebar Bender)'], spec: [
    { key: 's1', ar: 'قطر أقصى', en: 'قطر أقصى', options: ['32', '42', '52مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ماكينة قص حديد التسليح (Rebar Cutter)'], spec: [
    { key: 's1', ar: 'قطر أقصى', en: 'قطر أقصى', options: ['32', '42', '52مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['منفاخ هواء كهربائي (Air Blower)'], spec: [
    { key: 's1', ar: 'تشغيل', en: 'تشغيل', options: ['كهرباء', 'شحن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مسدس هواء ساخن (Heat Gun)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مسحج ورواتر خشب كهربائي (Planer / Router)'], spec: [
    { key: 's1', ar: 'أداة', en: 'أداة', options: ['مسحج', 'راوتر', 'تريمر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['منشار زاوية ألمنيوم وخشب (Mitre Saw)'], spec: [
    { key: 's1', ar: 'قطر الشفرة', en: 'قطر الشفرة', options: ['210', '254', '305مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['صنفرة كهربائية مدارية (Orbital Sander)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['مداري', 'لوح'] },
    { key: 's2', ar: 'تشغيل', en: 'تشغيل', options: ['كهرباء', 'شحن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مفتاح صدمة شحن (Cordless Impact Wrench)'], spec: [
    { key: 's1', ar: 'جهد', en: 'جهد', options: ['12', '18', '20 فولت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['ماكينة قص حديد سنسية (Cut-off Machine / Chop Saw)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['منشار رخام كهربائي (Marble Cutter)'], spec: [
    { key: 's1', ar: 'قطر القرص', en: 'قطر القرص', options: ['110', '125مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['متر قياس ليزر (Laser Distance Meter)'], spec: [
    { key: 's1', ar: 'مدى', en: 'مدى', options: ['30', '50', '100م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مسدس برشام يدوي ومسامير برشام (Hand Riveter & Rivets)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['يدوي', 'ثقيل', 'مقص'] },
    { key: 's2', ar: 'مقاس البرشام', en: 'مقاس البرشام', options: ['3.2', '4', '4.8مم'] },
    { key: 's3', ar: 'مادة', en: 'مادة', options: ['ألمنيوم', 'ستانلس'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مقص صاج (Aviation Snips)'], spec: [
    { key: 's1', ar: 'اتجاه', en: 'اتجاه', options: ['مستقيم', 'يمين', 'يسار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مفتاح مواسير وقطّاعة مواسير (Pipe Wrench & Cutter)'], spec: [
    { key: 's1', ar: 'أداة', en: 'أداة', options: ['مفتاح مستقيم', 'زاوية', 'قطّاعة PPR', 'قطّاعة حديد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['دايز تسنين المواسير (Pipe Threading Die)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['1', '2–2 إنش'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['مفاتيح ربط (بلدي/شق/ألن) (Spanners & Allen Keys)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['مركّب', 'سقّاطة', 'إنجليزي', 'ألن'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['كماشة حدّاد تسليح (Concretor\'s Nippers)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['250', '280', '300مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['عتلة نجّار (Claw / Wrecking Bar)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['45', '60', '90سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['كريك (مجرفة) ومكنسة شارع (Shovel & Street Broom)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['كريك مربع', 'مدوّر'] },
    { key: 's2', ar: 'مكنسة', en: 'مكنسة', options: ['مع', 'بدون عصا'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['سطل مطاطي للمونة (Rubber Mortar Bucket)'], spec: [
    { key: 's1', ar: 'سعة', en: 'سعة', options: ['10', '12', '15 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['منشار يدوي خشب وقوس منشار حديد (Hand Saw & Hacksaw)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['خشب ياباني', 'قوس حديد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['زاوية نجار وقدمة قياس (Square & Caliper)'], spec: [
    { key: 's1', ar: 'أداة', en: 'أداة', options: ['زاوية مركبة', 'قائمة', 'قدمة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['كتر وشفرات (Utility Knife & Blades)'], spec: [
    { key: 's1', ar: 'عرض الشفرة', en: 'عرض الشفرة', options: ['9', '18', '25مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['طقم أدوات معزولة للكهربائي 1000V (Insulated Tool Set)'], spec: [
    { key: 's1', ar: 'عدد القطع', en: 'عدد القطع', options: ['7', '11', '16'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طقم'] },
  ] },
  { products: ['قلم قص بلاط ومسطرة قص رخام (Tile Scribe & Cutting Rule)'], spec: [
    { key: 's1', ar: 'أداة', en: 'أداة', options: ['قلم', 'مسطرة'] },
    { key: 's2', ar: 'طول', en: 'طول', options: ['60', '120سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['مشمّع (طربال) بولي إيثيلين (PE Tarpaulin)'], spec: [
    { key: 's1', ar: 'وزن', en: 'وزن', options: ['90–200غ', 'م²'] },
    { key: 's2', ar: 'لون', en: 'لون', options: ['أزرق', 'أبيض'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['خيش لمعالجة الخرسانة (Hessian Cloth)'], spec: [
    { key: 's1', ar: 'وزن اللفة', en: 'وزن اللفة', options: ['25', '30', '37كغ'] },
    { key: 's2', ar: 'عرض', en: 'عرض', options: ['1', '1.5م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['فيلم تغليف مطاطي (Stretch Film)'], spec: [
    { key: 's1', ar: 'سماكة', en: 'سماكة', options: ['17', '20', '23 ميكرون'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['شريط ربط بلاستيكي/حديدي وكلبسات (Strapping Band)'], spec: [
    { key: 's1', ar: 'مادة', en: 'مادة', options: ['PP', 'حديد'] },
    { key: 's2', ar: 'عرض', en: 'عرض', options: ['12', '16', '19مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['ألواح حماية الأرضيات أثناء التشطيب (Floor Protection Board)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['كرتون مقوى', 'ورق بناء', 'فيلم لاصق'] },
    { key: 's2', ar: 'عرض', en: 'عرض', options: ['0.9', '1.0م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة'] },
  ] },
  { products: ['حامي إطار الباب وزوايا الدرج المؤقت (Door Jamb & Stair Protector)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['حلق باب', 'درجة سلم'] },
    { key: 's2', ar: 'مقاس', en: 'مقاس', options: ['صغير', 'كبير'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['برميل وسلسلة وحاجز بلاستيكي مروري (Traffic Drum, Chain & Barrier Mesh)'], spec: [
    { key: 's1', ar: 'نوع', en: 'نوع', options: ['برميل عاكس', 'سلسلة أحمر-أبيض', 'شبك برتقالي'] },
    { key: 's2', ar: 'طول السلسلة/الشبك', en: 'طول السلسلة/الشبك', options: ['25', '50م'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة'] },
  ] },
  { products: ['جنزير (سلسلة) حديد مجلفن (Galvanized Chain)'], spec: [
    { key: 's1', ar: 'قطر الحلقة', en: 'قطر الحلقة', options: ['4', '6', '8', '10مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر'] },
  ] },
  { products: ['برغي سداسي مجلفن DIN 933 (Hex Bolt)'], spec: [
    { key: 's1', ar: 'درجة', en: 'درجة', options: ['4.6', '8.8'] },
    { key: 's2', ar: 'تشطيب', en: 'تشطيب', options: ['زنك', 'جلفنة ساخنة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['برغي ذاتي التسنين برأس مسطّح مع خابور (Self-tapping Screw + Plug)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['6', '8', '10'] },
    { key: 's2', ar: 'رأس', en: 'رأس', options: ['مسطح', 'مدوّر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['مسامير فولاذ للخرسانة (Hardened Concrete Nails)'], spec: [
    { key: 's1', ar: 'طول', en: 'طول', options: ['1', '1.5', '2', '2.5', '3 إنش'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كرتون'] },
  ] },
  { products: ['خابور مسمار بلاستيك سريع (Nail-in / Hammer-drive Plug)'], spec: [
    { key: 's1', ar: 'مقاس', en: 'مقاس', options: ['5×30', '6×40', '8×60مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  { products: ['برايمر زنك فوسفات للحديد (Zinc Phosphate Primer)'], spec: [
    { key: 's1', ar: 'لون', en: 'لون', options: ['رمادي', 'أحمر'] },
    { key: 's2', ar: 'عبوة', en: 'عبوة', options: ['1 جالون', 'سطل 18 لتر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['جالون'] },
  ] },
  { products: ['بخاخ دهان تخطيط وتعليم المواقع (Marking Spray Paint)'], spec: [
    { key: 's1', ar: 'لون', en: 'لون', options: ['أحمر', 'أصفر', 'أبيض', 'فلوري'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة'] },
  ] },
  // ═══ السيليكون ومانعات التسرب (2026-10-17) ═══
  { products: ['ماستك بيتوميني للفواصل والأسطح', 'مانع تسرب مائي للأسطح والشقوق', 'مانع تسرب المياه الفوري (Water Plug)', 'معجون حريق لفتحات الكابلات والمواسير (Fire Putty)', 'مانع تسرب مائي للأسطح (سطل)'], spec: [
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['سطل', 'كيس', 'علبة', 'كرتون'] },
  ] },
  { products: ['سيليكون محايد (Neutral)', 'سيليكون حمضي (Acetic)', 'سيليكون صحي مضاد للفطريات (حمامات ومطابخ)', 'سيليكون إنشائي للواجهات الزجاجية (Structural)', 'سيليكون عزل الطقس للزجاج والألمنيوم (Weather Seal)', 'سيليكون حراري لدرجات الحرارة العالية', 'سيليكون مقاوم للحريق (Fire Rated)', 'أكريليك مقاوم للحريق (Intumescent)', 'مانع تسرب بولي يوريثان (PU Sealant)', 'مانع تسرب أكريليك قابل للدهان', 'مانع تسرب MS بوليمر (هايبرد)', 'مانع تسرب بولي سلفايد للفواصل', 'سيليكون شفاف (أنبوب)', 'سيليكون صحي للحمامات (أنبوب)', 'سيليكون حراري (أنبوب)'], spec: [
    { key: 'color', ar: 'اللون', en: 'Colour', options: ['شفاف (Clear)', 'أبيض (White)', 'رمادي (Grey)', 'أسود (Black)', 'بيج (Beige)'] },
    { key: 'brand', ar: 'الماركة (اختياري)', en: 'Brand (optional)', options: ['أي ماركة معتمدة', 'Sika', 'Bostik', 'Dow (DOWSIL)', 'Soudal', 'Saveto', 'حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['أنبوب (خرطوش 280–300 مل)', 'كيس سجق (600 مل)', 'كرتون'] },
  ] },
  { products: ['فوم مقاوم للحريق (PU Fire Foam)', 'فوم بولي يوريثان لملء الفراغات', 'فوم بخاخ (علبة)'], spec: [
    { key: 'type', ar: 'طريقة الاستخدام', en: 'Application', options: ['بمسدس (Gun foam)', 'بخاخ يدوي (Straw foam)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['علبة (750 مل)', 'كرتون (12 علبة)'] },
  ] },
  // ═══ المواد اللاصقة والكيماويات (Adhesives & Sealants) — من مدار ═══
  { products: ['مواد لاصقة وكيماويات (Adhesives & Sealants)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['سيليكون Silicone','بولي يوريثان PU','أكريليك Acrylic','لاصق تماس Contact','غراء خشب Wood Glue','فوم تمدد Expanding Foam','إيبوكسي Epoxy','مادة ربط Bonding Agent','جراوت إنشائي Grout'] },
    { key: 'brand', ar: 'الماركة (اختياري)', en: 'Brand (optional)', options: ['أي ماركة معتمدة','Dunlop','Asmaco','Saveto','Bostik','Sika','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['أنبوب (خرطوش)','علبة','كيلو','لتر'] },
  ] },
  { products: ['لوح حماية بيتوميني (Protection Board)'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['3 مم','4 مم','6 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م²','لوح'] },
  ] },
  // ═══ سقالات رينج لوك (Ringlock / Doka) — مكوّنات من كتالوج Doka ═══
  { products: ['سقالة رينج لوك (Ringlock)'], spec: [
    { key: 'component', ar: 'النوع / البند', en: 'Component', options: ['قائم Standard','عارضة Ledger','عارضة جملونية Truss Ledger','دعامة قطرية Diagonal Brace','جاك قاعدة Base Jack','جاك قاعدة دوّار Swivel Base Jack','طوق قاعدة Base Collar','جاك رأس U-Head','رأس تدعيم رباعي Four-Way Head','لوح فولاذي Steel Deck','لوح وصول Access Deck','سلّم Stairway','درجات سلّم فولاذية Stair Treads','وحدة درج ألمنيوم Aluminium Stair Unit','كمر شبكي Lattice Girder','كرسي/كونسول Console Bracket','درابزين/حاجز Guardrail','لوح حماية Toeboard','بوابة أمان Swing Gate','ماسورة تثبيت Anchor Tube','كرسي ربط جداري Wall Tie','حذاء تثبيت Anchoring Shoe','مثبّت سريع Express Anchor','برغي عين Eye Bolt','مسمار قفل Toggle Pin','منصة زاوية 45° Corner Platform','قائم معلّق Hanging Standard','عروة رفع Lifting Lug'] },
    { key: 'size', ar: 'المقاس / الطول', en: 'Size / Length', options: ['قائم 0.5م','قائم 1.0م','قائم 1.5م','قائم 2.0م','قائم 2.5م','قائم 3.0م','قائم 4.0م','عارضة 0.39م','عارضة 0.73م','عارضة 1.04م','عارضة 1.09م','عارضة 1.40م','عارضة 1.57م','عارضة 2.07م','عارضة 2.57م','عارضة 3.07م','عرض لوح 0.19م','عرض لوح 0.32م','حسب الطلب'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مجلفن غمس ساخن Hot-dip','مدهون Painted'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','طن','متر طولي'] },
  ] },
  { products: ['سقالة كب لوك (Cuplock)'], spec: [
    { key: 'component', ar: 'النوع / البند', en: 'Component', options: ['قائم Standard','عارضة طولية Ledger','عارضة عرضية Transom','دعامة قطرية Face Brace','وصلة قائم Spigot Pin','جاك قاعدة Base Jack','جاك قاعدة دوّار Swivel Base','جاك رأس U-Head','جاك شوكة Fork U-Head','جاك يونيفرسال Universal','قاعدة Base Plate','كمر ألمنيوم Single Web','كمر ألمنيوم Double Web','كمر شبكي Lattice','كمر سلّم Ladder Beam','كمر H20','كوبلر مفرد Single','كوبلر مزدوج Double','كوبلر دوّار Swivel','كوبلر جسر Girder','كوبلر ضغط Pressed','مشبك يونيفرسال Clamp','مشبك لوح Toe-Board','ألواح فولاذية Steel Planks','ألواح خشبية Wooden Planks','هيكل H-Frame','إطار كابولي Cantilever','وحدة درج Staircase','سلّم فولاذي Steel Ladder','عجلات Castor','دعامة دفع Push-Pull Prop','ماسورة مجلفنة Galvanized Pipe','قضيب شد Tie Rod','صامولة جناح Wing Nut','لوح Waller Plate'] },
    { key: 'size', ar: 'المقاس / الطول', en: 'Size / Length', options: ['0.5 م','1.0 م','1.5 م','2.0 م','2.5 م','3.0 م','0.6 م','0.9 م','1.2 م','1.8 م','2.4 م','حسب الطلب'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مجلفن Galvanized','مدهون Painted'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','طن','متر طولي'] },
  ] },
  // HEB/HEA: المقاس بالتسمية القياسية (HEA 200…)
  // ═══ القنوات الفولاذية (Channels: UPN / UPE / U-Channel) ═══
  { products: ['قطاعات قنوات U/UPN/UPE (Channels)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['UPN (جناح مدبّب Taper)','UPE (جناح متوازي Parallel)','U-Channel (JIS)'] },
    { key: 'size', ar: 'المقاس (مم)', en: 'Size (mm)', options: ['80','100','120','140','160','180','200','220','240','260','280','300','320','350','380','400'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR','حسب المواصفة'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود (قضيب)','حبة','متر طولي'] },
  ] },
  { products: ['صلب هيكلي HEB','صلب هيكلي HEA'], spec: [
    { key: 'section', ar: 'المقاس (المقطع)', en: 'Section', options: ['100','120','140','160','180','200','220','240','260','280','300','320','340','360','400','450','500','550','600','650','700','800','900','1000'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR','حسب المواصفة'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود (قضيب)','حبة','متر طولي'] },
  ] },
  { products: ['قطاعات مستطيلة RHS'], spec: [
    { key: 'size', ar: 'المقاس (مم)', en: 'Size', options: ['40×40','50×50','60×40','80×40','80×80','100×50','100×100','120×60','150×100','200×100','حسب المخطط'] },
    { key: 'thickness', ar: 'سماكة الجدار', en: 'Wall thickness', options: ['2 مم','2.5 مم','3 مم','4 مم','5 مم','6 مم'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود (قضيب)','حبة','متر طولي'] },
  ] },
  { products: ['زوايا وقطاعات حديد'], spec: [
    { key: 'size', ar: 'مقاس الزاوية (مم)', en: 'Angle Size', options: ['30×30','40×40','50×50','60×60','70×70','75×75','80×80','100×100','حسب المخطط'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['3 مم','4 مم','5 مم','6 مم','8 مم','10 مم'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود (قضيب)','حبة','متر طولي'] },
  ] },
  // القطاعات الدائرية CHS (القطر بالاسم — نضيف سماكة الجدار)
  // ═══ CHS — قطاعات دائرية مجوّفة (الجدول الكامل: قطر خارجي + سماكة) ═══
  { products: ['قطاعات دائرية CHS (Circular Hollow Section)'], spec: [
    { key: 'od', ar: 'القطر الخارجي (مم)', en: 'Outside Diameter (mm)', options: ['21.3','26.9','33.7','42.4','48.3','60.3','76.1','88.9','114.3','139.7','168.3','193.7','219.1','244.5','273.0','323.9','355.6','406.4','457.0','508.0'] },
    { key: 'thickness', ar: 'السماكة (مم)', en: 'Thickness (mm)', options: ['2.0','2.5','3.0','3.2','3.6','4.0','5.0','6.0','6.3','8.0','10.0','12.5','16.0','20.0','25.0','32.0','40.0'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR','حسب المواصفة'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود (قضيب)','حبة','متر طولي'] },
  ] },
  // ═══ SHS — أنبوب/قطاع فولاذي مربع (مقاس + سماكة) ═══
  { products: ['قطاع مربع SHS (Steel Square Tube)'], spec: [
    { key: 'size', ar: 'المقاس (مربع، مم)', en: 'Size (square, mm)', options: ['12×12','16×16','19×19','20×20','25×25','30×30','38×38','40×40','50×50','60×60','70×70','80×80','100×100','120×120'] },
    { key: 'thickness', ar: 'السماكة (مم)', en: 'Thickness (mm)', options: ['1.0','1.1','1.15','1.2','1.4','1.45','1.5','1.8','2.0','2.8','3.0','4.0','5.0'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR','حسب المواصفة'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر (6000مم)','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود (قضيب)','حبة','متر طولي'] },
  ] },
  // شبك الرابيتز (اللياسة)
  { products: ['شبك رابيتز'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['رابيتز مضلّع','رابيتز مسطّح','شبك ممدّد (Expanded)','شبك لحام'] },
    { key: 'weight', ar: 'الوزن', en: 'Weight', options: ['حسب المواصفة','رقيق','متوسط','ثقيل'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة','م² (متر مربع)','عدد'] },
  ] },
  { products: ['صفائح فولاذية'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['3 مم','5 مم','6 مم','8 مم','10 مم','12 مم','15 مم','20 مم','حسب الطلب'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235','S275','S355'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','لوح','م² (متر مربع)'] },
  ] },
  { products: ['رمل ناعم','حصى','زلط','ركام مدمج','حصى مرشحة Sub-base'], spec: [
    { key: 'grade', ar: 'التدرّج/المقاس', en: 'Grade/Size', options: ['ناعم','خشن','مقاس 3/4','مقاس 3/8','مخلوط','حسب المواصفة'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³ (متر مكعب)','رد (لوري 24م³)','رد (قلاب 12م³)','طن'] },
  ] },
  // حجر الردم/الدبش للموقع (ليس حجر الواجهات — حجر الواجهات بالمعماري: رخام/جرانيت/بازلت)
  { products: ['حجر خام للردم والحواجز'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['دبش (ردم)','حجر قابيون Gabion','حجر حواجز','خام للأساسات','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³ (متر مكعب)','طن','رد (لوري)'] },
  ] },
  { products: ['خشب بناء للشدّات','عوارض خشبية H20','طوبار معدني جاهز','قمط شدّة أعمدة Column Clamp','قضبان شد الطوبار Tie Rods'], spec: [
    { key: 'material', ar: 'النوع', en: 'Type', options: ['خشب','معدني','بلاستيك','إكسسوار تثبيت'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','م² (متر مربع)','طن','حسب الطلب'] },
  ] },
  { products: ['قائم سقالة Standard','عارضة أفقية سقالة Ledger','دعامة قطرية سقالة Brace','ماسورة سقالة Tube','إطار سقالة معدنية Frame','قاعدة ثابتة Base Plate','بيس جاك قابل للتعديل','يو جاك U-Head','سكرو جاك تعديل','منصة وقوف معدنية Steel Deck','سلم سقالة','كوبلر مشبك سقالة Coupler','جاكات تدعيم Acrow Prop','برج تدعيم Shoring Tower','درابزين أمان سقالة Guard Rail'], spec: [
    { key: 'condition', ar: 'الحالة', en: 'Condition', options: ['جديد','مستعمل (نظيف)'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','طن','يوم (إيجار)'] },
  ] },
  // ═══ معماري — أرضيات وأسقف ومعادن ونجارة وصوتيات ═══
  { products: ['أرضية إيبوكسي','أرضية راتنج إيبوكسي مع قرنيص','سجاد Carpet Tile','سجاد رول لاصق','مطاط Entrance Matting','أرضية راتنج إيبوكسي High Build','أرضية تيرازو Terrazzo','أرضية مطاطية Rubber Flooring','أرضية مطاطية رياضية Sports Floor','أرضية أكسس فلور Raised Access Floor','فرشة مسطحة Screed Heavy Duty','فرشة مسطحة Self-Levelling','فينيل ورقي Vinyl Sheet','فينيل مضاد للانزلاق','قرنيوص فينيل Vinyl Skirting'], spec: [
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['2 مم','3 مم','4 مم','6 مم','حسب التصميم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','متر طولي (للقرنيص)'] },
  ] },
  { products: ['أسقف مستعارة جبس','أسقف مستعارة معدنية','أسقف كالسيوم سيليكات','بلاطات أسقف صوتية 600×600','أسقف صوتية مبطنة','أسقف مكشوفة مطلية','لواح صوتية PET Panels'], spec: [
    { key: 'tile_size', ar: 'مقاس البلاطة', en: 'Tile Size', options: ['60×60 سم','60×120 سم','شرائح','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)'] },
  ] },
  { products: ['درابزين ستانلس','سلالم حديد','مشربيات'], spec: [
    { key: 'material', ar: 'المادة', en: 'Material', options: ['ستانلس 304','ستانلس 316','حديد مدهون','حديد مجلفن','ألمنيوم'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['مصقول','مطفي','دهان إلكتروستاتيك','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','م² (متر مربع)','عدد'] },
  ] },
  // ═══ ألواح MDF / خشب مضغوط / OSB (من مدار) ═══
  { products: ['ألواح MDF وخشب مضغوط (Wood Boards)'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['MDF عادي','MDF مقاوم رطوبة MR','MDF مقاوم حريق FR','MDF مقشّر Veneered','خشب مضغوط Chipboard','OSB','بلوك بورد Blockboard'] },
    { key: 'thickness', ar: 'السماكة (مم)', en: 'Thickness (mm)', options: ['3','6','9','12','16','18','25'] },
    { key: 'sheet', ar: 'مقاس اللوح', en: 'Sheet size', options: ['1220×2440 مم','2100×2800 مم','4×8 قدم','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لوح','م²'] },
  ] },
  { products: ['كاونتر استقبال خشبي','خزائن حائط ثابتة','أثاث ثابت خشبي Built-in','كبائن دورات مياه Toilet Cubicles','قواطع حمامات HPL','أرفف خشبية'], spec: [
    { key: 'material', ar: 'المادة', en: 'Material', options: ['MDF','خشب طبيعي','HPL','كوريان (Solid Surface)','قشرة','حسب الطلب'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['دهان','قشرة','لاكيه','ميلامين'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','م² (متر مربع)','عدد'] },
  ] },
  { products: ['لواح خشب صوتية Acoustic','مواد عازلة صوتية Acoustic','لواح خشبية صوتية Acoustic Timber','أسقف صوتية Acoustic Baffle'], spec: [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['لواح خشبية مثقبة','صوف صخري صوتي','رغوة صوتية','بافل معلّق'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['9 مم','12 مم','18 مم','25 مم','50 مم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م² (متر مربع)','عدد'] },
  ] },
]
