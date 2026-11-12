// =============================================
// TASEERAK — TypeScript Types
// =============================================

import { normalizeText } from '@/lib/normalize'

export type UserRole = 'contractor' | 'supplier' | 'admin'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type SubscriptionPlan = 'free' | 'professional'
export type Sector = 'civil' | 'architectural' | 'electrical' | 'mechanical' | 'equipment' | 'supply_store'
export type RFQStatus = 'open' | 'closed' | 'expired' | 'cancelled'
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type MessageType = 'text' | 'offer' | 'file' | 'system'
export type NotificationType =
  | 'rfq_offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'new_message'
  | 'rfq_expiring'
  | 'account_verified'
  | 'subscription'

// =============================================
// SECTOR LABELS (Arabic)
// =============================================
export const SECTOR_LABELS: Record<Sector, string> = {
  civil: 'مدني',
  architectural: 'معماري',
  electrical: 'كهرباء',
  mechanical: 'ميكانيك',
  equipment: 'آليات ومعدات',
  supply_store: 'محل توريد',
}

// =============================================
// SUB-CATEGORIES (التخصصات الفرعية) — 3-level taxonomy
// القطاع → المجموعة (group) → التخصص الدقيق (sub-category)
// Each sub-category: labels in 3 languages + group + keywords
// =============================================
export interface SubCategory {
  ar: string
  en: string
  ur: string
  icon: string
  group: string // المجموعة الوسيطة للتنظيم البصري (Cascading)
  keywords: string[] // for auto-matching product names → sub-category
}

// أسماء المجموعات الوسيطة (المستوى الثاني)
export const GROUP_LABELS: Record<string, { ar: string; en: string; ur: string; icon: string }> = {
  // مدني
  concrete: { ar: 'الخرسانة والإسمنت', en: 'Concrete & Cement', ur: 'کنکریٹ اور سیمنٹ', icon: '🏭' },
  masonry: { ar: 'الطوب والبلوك', en: 'Blocks & Bricks', ur: 'بلاک اور اینٹیں', icon: '🧱' },
  steel: { ar: 'الحديد والإنشاءات المعدنية', en: 'Steel & Metalwork', ur: 'اسٹیل', icon: '🔩' },
  rawmaterials: { ar: 'مواد الردم والركام', en: 'Fill & Aggregate', ur: 'بھرائی اور ایگریگیٹ', icon: '⛰' },
  infrastructure: { ar: 'العزل والأساسات والمعالجات', en: 'Insulation, Foundations & Treatments', ur: 'انسولیشن اور بنیادیں', icon: '🛡' },
  drainage_grp: { ar: 'الصرف والأنابيب الخارجية', en: 'Drainage & External Pipes', ur: 'نکاسی اور پائپ', icon: '🚧' },
  formwork: { ar: 'الطوبار والشدّات الخشبية والمعدنية', en: 'Formwork & Shuttering (Timber & Steel)', ur: 'فارم ورک (لکڑی اور اسٹیل)', icon: '🪵' },
  scaffolding: { ar: 'السقالات والدعامات', en: 'Scaffolding & Shoring', ur: 'سکیفولڈنگ', icon: '🏗' },
  landscape: { ar: 'التنسيق والأعمال الخارجية', en: 'Landscape & Hardscape', ur: 'لینڈ اسکیپ', icon: '🌳' },
  // معماري
  floors_walls: { ar: 'الأرضيات والحوائط', en: 'Floors & Walls', ur: 'فرش اور دیواریں', icon: '🔲' },
  paint_facade: { ar: 'الدهانات والديكورات الخارجية', en: 'Paints & Facades', ur: 'پینٹ', icon: '🎨' },
  ceiling_decor: { ar: 'الأسقف والديكورات الداخلية', en: 'Ceilings & Interior Decor', ur: 'چھتیں', icon: '⬜' },
  doors_windows: { ar: 'الأبواب والشبابيك والواجهات', en: 'Doors, Windows & Facades', ur: 'دروازے', icon: '🚪' },
  facade_systems: { ar: 'الواجهات', en: 'Facades', ur: 'فیسڈ', icon: '🏢' },
  joinery: { ar: 'النجارة والأثاث الثابت', en: 'Joinery & Millwork', ur: 'جوائنری', icon: '🪑' },
  acoustic: { ar: 'العزل الصوتي', en: 'Acoustic Systems', ur: 'صوتی نظام', icon: '🔊' },
  building_insulation: { ar: 'العزل الحراري', en: 'Thermal Insulation', ur: 'حرارتی انسولیشن', icon: '🧊' },
  arch_metalwork: { ar: 'الأعمال المعدنية والمصاعد', en: 'Metalwork & Elevators', ur: 'دھاتی کام', icon: '🛗' },
  sanitary_finish: { ar: 'الأدوات الصحية والتشطيبات', en: 'Sanitary Ware & Finishes', ur: 'سینیٹری', icon: '🛁' },
  // ميكانيك
  hvac: { ar: 'التكييف والتهوية', en: 'HVAC & Ventilation', ur: 'ایئر کنڈیشنگ', icon: '❄️' },
  plumbing: { ar: 'السباكة والتغذية والصرف', en: 'Plumbing & Drainage', ur: 'پلمبنگ', icon: '🚰' },
  plumbing_supplies: { ar: 'لوازم وإكسسوارات السباكة', en: 'Plumbing Supplies & Fittings', ur: 'پلمبنگ سامان', icon: '🔧' },
  firefighting: { ar: 'مكافحة الحريق', en: 'Fire Fighting', ur: 'فائر فائٹنگ', icon: '🧯' },
  mech_insulation: { ar: 'عزل الأنابيب ومجاري الهواء', en: 'Pipe & Duct Insulation', ur: 'پائپ اور ڈکٹ انسولیشن', icon: '♨️' },
  // كهرباء
  cabling: { ar: 'التمديدات والكابلات', en: 'Cabling & Wiring', ur: 'کیبلنگ', icon: '🔌' },
  panels_switches: { ar: 'اللوحات والمفاتيح', en: 'Panels & Switches', ur: 'پینل', icon: '🎛' },
  lighting: { ar: 'أنظمة الإنارة', en: 'Lighting Systems', ur: 'روشنی', icon: '💡' },
  low_current: { ar: 'أنظمة التيار الخفيف', en: 'Low Current Systems', ur: 'لو کرنٹ', icon: '📹' },
  solar: { ar: 'الطاقة الشمسية', en: 'Solar Energy', ur: 'شمسی توانائی', icon: '☀' },
  earthing_grp: { ar: 'التأريض والحماية من الصواعق', en: 'Earthing & Lightning Protection', ur: 'ارتھنگ اور آسمانی بجلی سے تحفظ', icon: '⚡' },
  // آليات ومعدات (قطاع مستقل — تأجير/بيع)
  heavy_equipment: { ar: 'آليات ثقيلة (حفر/رفع/نقل)', en: 'Heavy Machinery', ur: 'بھاری مشینری', icon: '🚜' },
  light_equipment: { ar: 'معدات خفيفة (مولدات/دكاكات)', en: 'Light Equipment', ur: 'ہلکی مشینری', icon: '⚙️' },
  concrete_machinery: { ar: 'معدات خرسانة وصب', en: 'Concrete Equipment', ur: 'کنکریٹ مشین', icon: '🏭' },
  access_equipment: { ar: 'سقالات ومنصات رفع', en: 'Scaffolding & Access', ur: 'سکیفولڈنگ', icon: '🪜' },
  workshop_equip: { ar: 'معدات ورشة ولحام', en: 'Workshop & Welding', ur: 'ورکشاپ اور ویلڈنگ', icon: '🔥' },
  // محل توريد (Supply Store — متعدد للمحلات الصغيرة)
  store_plumbing: { ar: 'أدوات سباكة بسيطة', en: 'Plumbing Supplies', ur: 'پلمبنگ', icon: '🚿' },
  store_electrical: { ar: 'أدوات كهرباء بسيطة', en: 'Electrical Supplies', ur: 'الیکٹریکل', icon: '💡' },
  store_tools: { ar: 'عُدد يدوية وكهربائية', en: 'Hand & Power Tools', ur: 'اوزار', icon: '🔧' },
  store_fasteners: { ar: 'مسامير وبراغي ومثبتات', en: 'Fasteners & Fixings', ur: 'پیچ', icon: '🔩' },
  store_safety: { ar: 'سلامة ومستهلكات', en: 'Safety & Consumables', ur: 'حفاظتی سامان', icon: '🦺' },
  store_paint: { ar: 'دهانات ولواصق', en: 'Paint & Adhesives', ur: 'پینٹ', icon: '🎨' },
  store_hardware: { ar: 'خردوات: مفصلات وأقفال ومقابض', en: 'Hardware: Hinges, Locks & Handles', ur: 'ہارڈ ویئر', icon: '🔐' },
}

export const SUB_CATEGORIES: Record<Sector, Record<string, SubCategory>> = {
  civil: {
    // ═══ الخرسانة والمنتجات الإسمنتية ═══
    readymix: { ar: 'خرسانة جاهزة (Ready-Mix)', en: 'Ready-Mix Concrete', ur: 'ریڈی مکس', icon: '🏭', group: 'concrete',
      keywords: ['خرسانة جاهزة','ready mix','readymix','concrete','C25','C30','C35','C40','blinding','ready mixed','خرسانة مسلحة','خرسانة عادية'] },
    blocks: { ar: 'بلوك وآجر (أسود/معزول/سيبوريكس)', en: 'Blocks & Bricks', ur: 'بلاک', icon: '🧱', group: 'masonry',
      keywords: ['طوب','بلوك','بلك','بلكة','بلوكات','block','brick','aac','سيبوريكس','معزول','مدماك','خفيف','siporex','قرميد أسقف','concrete block','hollow block','blockwork'] },
    precast: { ar: 'خرسانة مسبقة الصنع (Precast)', en: 'Precast Concrete', ur: 'پری کاسٹ', icon: '🏗', group: 'concrete',
      keywords: ['مسبق الصنع','precast','مسبقة','بلاطات مسبقة','أعمدة مسبقة','عتبات مسبقة','مدرجات','مقاعد','seating','bleacher','kerb','curb','بردورة'] },
    cement: { ar: 'أسمنت ومواد رابطة', en: 'Cement & Binders', ur: 'سیمنٹ', icon: '🪨', group: 'concrete',
      keywords: ['أسمنت','اسمنت','cement','جير','lime','جبص','جبصين','gypsum'] },
    // ═══ الحديد والإنشاءات المعدنية ═══
    rebar: { ar: 'حديد تسليح', en: 'Rebar / Reinforcement', ur: 'سریا', icon: '🔩', group: 'steel',
      keywords: ['حديد تسليح','تسليح','rebar','reinforc','سابك','الراجحي','بسكويت','سلك تربيط','reinforcement','deformed bar','steel bar'] },
    structural_steel: { ar: 'جسور وقطاعات إنشائية ثقيلة (HEA/HEB/IPE/UPN)', en: 'Heavy Structural Beams & Sections (HEA/HEB/IPE/UPN)', ur: 'ساختی اسٹیل', icon: '🏗', group: 'steel',
      keywords: ['هيكلي','صلب','HEB','HEA','IPE','قطاع','structural steel','section','hollow','channel','صفائح','beam','تجاري'] },
    steel_sections: { ar: 'قطاعات وصاج حديد (زوايا/مواسير/صاج)', en: 'Steel Sections, Tubes & Sheets', ur: 'اسٹیل سیکشن', icon: '🔩', group: 'steel',
      keywords: ['زاوية حديد','أنجل','angle','فلات بار','flat bar','ماسورة حديد','مربع حديد','مستطيل حديد','صاج','مضلع','شكمة','chequered','صاج مجلفن','GI sheet','hollow section','صلب مجوف','مدادات حديد مجلفنة'] },
    steel_mesh: { ar: 'شبك حديد وإكسسوارات', en: 'Steel Mesh & Accessories', ur: 'میش', icon: '🕸', group: 'steel',
      keywords: ['شبكة حديد','mesh','fabric','رابيتز','شبك لياسة','زوايا حماية'] },
    // ═══ البنية التحتية والتدعيم ═══
    waterproofing: { ar: 'العزل المائي', en: 'Waterproofing', ur: 'واٹر پروفنگ', icon: '🛡', group: 'infrastructure',
      keywords: ['عازل','عزل','عزل مائي','waterproof','bitumen','بيتومين','بيتوميني','membrane','غشاء','رطوبة','أساسات','tanking','tank','بطانة','سيماني','سائل','primer','protection','خيش','فيلم','بولي','polyethylene','dpm','مانع تسرب الفواصل','شريط مانع تسرب','قماش جيوتكستايل'] },
    piling: { ar: 'أوتاد وخوازيق الأساسات', en: 'Piling & Foundations', ur: 'پائلنگ', icon: '🛠', group: 'infrastructure',
      keywords: ['أوتاد','اوتاد','pile','piling','خازوق','وتد خرساني'] },
    construction_chemicals: { ar: 'مواد كيميائية للبناء', en: 'Construction Chemicals', ur: 'کیمیکل', icon: '🧪', group: 'infrastructure',
      keywords: ['جراوت','grout','إضافات','additive','سيليكون إنشائي','epoxy','معالجة خرسانة','curing','كيماوي','مبيد النمل الأبيض','مادة معالجة الخرسانة','مادة ربط الخرسانة','مثبت كيميائي','حشوة فواصل التمدد','لاصق بلوك','مونة رقيقة','مونة إصلاح الخرسانة','سيليكون','silicone','مانع تسرب','sealant','ماستك','فوم بولي','مقاوم للحريق','معجون حريق','fire putty','water plug','بوليمر','بولي سلفايد','بولي يوريثان','لملء الفراغات','weather seal','chemical anchor','anchor bolt resin','curing compound','admixture'] },
    drainage: { ar: 'صرف خارجي وبنية تحتية', en: 'External Drainage', ur: 'نکاسی', icon: '🚧', group: 'drainage_grp',
      keywords: ['صرف أمطار','storm','drainage','منهول','manhole','تفتيش','ductile','دكتايل','حديد مرن','RCP','خرسانية مسلحة','صرف','مصارف','مصرف','بيارة','خزان صرف صحي','septic'] },
    // ═══ الكسارات والمواد الأولية وأعمال الموقع ═══
    aggregates: { ar: 'رمل وحصى وبودرة', en: 'Sand, Gravel & Powder', ur: 'ریت اور بجری', icon: '⛰', group: 'rawmaterials',
      keywords: ['رمل','بطحاء','حصى','بحص','زلط','ركام','كسارة','sand','gravel','aggregate','بودرة','crusher','حجر طبيعي خام','حجر خام'] },
    roadbase: { ar: 'طبقات الأساس والإحلال (Sub-base/Base)', en: 'Road Base & Fill Layers', ur: 'روڈ بیس', icon: '🛣', group: 'rawmaterials',
      keywords: ['طبقة أساس','base course','تحت الأساس','sub-base','subbase','إحلال','ردم إنشائي','مصنّف','A-1-a','A-1-b','CBR','حصى مرشحة','ركام مدمج'] },
    earthworks: { ar: 'أعمال موقع وحفر وردم', en: 'Earthworks & Site Prep', ur: 'مٹی کا کام', icon: '🚧', group: 'rawmaterials',
      keywords: ['حفر','ردم','تسوية','تمهيد','ترابية','أعمال موقع','excavation','backfill','grading','earthwork'] },
    // ═══ الطوبار والشدّات الخشبية (Formwork) ═══
    formwork_ply: { ar: 'ألواح بليود وأخشاب الشدّات', en: 'Plywood & Formwork Boards', ur: 'پلائی وڈ', icon: '🪵', group: 'formwork',
      keywords: ['بليود','plywood','ألواح بليود','لوح بليود','خشب بناء','أخشاب طوبار','شدة خشبية','plywood shuttering','كونتر بلاكيه'] },
    formwork_timber: { ar: 'مرابيع وعوارض خشبية (H20)', en: 'Battens & H20 Beams', ur: 'لکڑی بیم', icon: '🪚', group: 'formwork',
      keywords: ['مرابيع','مربوع خشب','عارضة خشب','عوارض خشب','H20','كمر خشب','runner','bearer','طوبار'] },
    formwork_steel: { ar: 'طوبار معدني وقمط وزيوت فك', en: 'Steel Formwork, Clamps & Release Oil', ur: 'اسٹیل فارم', icon: '🛠', group: 'formwork',
      keywords: ['طوبار معدني','steel formwork','aluminum formwork','قمط','column clamp','شدة عمود','قضبان شد','tie rod','form tie','زيت فك','release oil','shutter oil','سبيسر خرسانة','spacer','طوبار'] },
    // ═══ السقالات والدعامات (Scaffolding & Shoring) ═══
    scaffold_structure: { ar: 'قوائم وعوارض ومواسير السقالات', en: 'Standards, Ledgers & Tubes', ur: 'اسٹینڈرڈ', icon: '🏗', group: 'scaffolding',
      keywords: ['قائم سقالة','standard','عمود سقالة','vertical scaffold','عارضة أفقية','ledger','دعامة قطرية','قطرية','brace','ماسورة سقالة','scaffold tube','إطار سقالة','سقالة معدنية','سقالات معدنية','frame scaffold','كب لوك','cuplock','رينج لوك','ringlock'] },
    scaffold_jacks: { ar: 'قواعد وجاكات السقالات (بيس/يو جاك)', en: 'Base Plates & Jacks', ur: 'جیک', icon: '🔩', group: 'scaffolding',
      keywords: ['قاعدة ثابتة','base plate','بيس بليت','بيس جاك','base jack','يو جاك','يو هيد','u-head','u jack','سكرو جاك','screw jack','جوة سقالة','spigot','جاك سقالة','قاعدة قابلة للتعديل'] },
    shoring_props: { ar: 'دعامات وأبراج التدعيم ومنصات الوقوف', en: 'Props, Shoring Towers & Platforms', ur: 'پراپس', icon: '🪜', group: 'scaffolding',
      keywords: ['جاكات تدعيم','جاك تدعيم','acrow','prop','عكر','دعامة','دعامات','شور','shoring','برج تدعيم','shoring tower','كوبلر','coupler','مشبك سقالة','منصة وقوف','steel deck','catwalk','لوح وقوف','plank','سلم سقالة','درابزين أمان','guard rail','toe board','لوح حماية','حاجز سقالة'] },
    // ═══ التنسيق والأعمال الخارجية (Landscape) ═══
    prefab_buildings: { ar: 'المباني الجاهزة والهناجر والساندوتش بانل', en: 'Prefab Buildings, Hangars & Sandwich Panels', ur: 'تیار عمارتیں اور ہینگر', icon: '🏚', group: 'steel',
      keywords: ['ساندوتش','ساندويتش','sandwich','كرفان','كرفانات','بورتا كابين','غرف جاهزة','غرفة جاهزة','هناجر','هنجر','مستودعات حديدية','مباني جاهزة','prefab','hangar'] },
    shades_screens: { ar: 'المظلات والسواتر', en: 'Shades & Privacy Screens', ur: 'سائبان اور اسکرین', icon: '⛱', group: 'landscape',
      keywords: ['مظلات','مظلة','سواتر','ساتر','برجولة','برجولات','شراع','بيوت شعر','خيام','خيمة','بولي كربونات','لكسان','pergola','shade','tent','polycarbonate','ألواح بولي كربونات'] },
    pools: { ar: 'المسابح ومستلزماتها', en: 'Swimming Pools & Equipment', ur: 'سوئمنگ پول', icon: '🏊', group: 'landscape',
      keywords: ['مسبح','مسابح','المسابح','كلور','سكيمر','pool'] },
    turf: { ar: 'عشب (طبيعي/صناعي/هجين)', en: 'Turf (Natural/Artificial/Hybrid)', ur: 'گھاس', icon: '🌱', group: 'landscape',
      keywords: ['عشب','turf','grass','نجيل','صناعي','artificial','hybrid','هجين','طبيعي','lawn','ملعب عشب'] },
    irrigation: { ar: 'شبكات ري ورشاشات', en: 'Irrigation Systems', ur: 'آبپاشی', icon: '💧', group: 'landscape',
      keywords: ['ري','irrigation','رشاش','sprinkler','rain bird','rainbird','تنقيط','drip','بخاخ','شبكة ري'] },
    fountains: { ar: 'نوافير وبرك مائية', en: 'Fountains & Water Features', ur: 'فوارے', icon: '⛲', group: 'landscape',
      keywords: ['نافورة','fountain','بركة','pool','water feature','شلال','waterfall','مسطح مائي'] },
    hardscape: { ar: 'إنترلوك وبردورات وتبليط خارجي', en: 'Interlock, Kerbs & Paving', ur: 'پیونگ', icon: '🧱', group: 'landscape',
      keywords: ['إنترلوك','interlock','بردورة','كيرب','kerb','curb','تبليط','paving','بلاط خارجي','حجر صناعي','رصف','tactile','إسفلت','asphalt','أسفلتية','طبقة أسفلتية','حصى زينة وأحجار ديكور','حصى زينة','مطبات صناعية','مطبات','أرضيات خشب خارجية'] },
    planters: { ar: 'أحواض زراعة وعناصر تنسيق', en: 'Planters & Landscape Elements', ur: 'پلانٹر', icon: '🪴', group: 'landscape',
      keywords: ['حوض زراعة','planter','تربة','soil','مشتل','plant','شجر','tree','نباتات','pergola','مظلة حديقة','تشجير','زراعة','زرع'] },
    fencing: { ar: 'تسييج وشِباك وبوابات', en: 'Fencing, Mesh & Gates', ur: 'باڑ', icon: '🚧', group: 'landscape',
      keywords: ['تسييج','سياج','شبك تسييج','شبك مربعات','جبيونات','بوابة سياج','سلك ربط','أعمدة تسييج','شبك تمدد','تشيلنك','تشين لينك','جابيون','fence','fencing','gabion', 'سلك شائك', 'شبوك', 'شائك', 'كونسيرتينا', 'حلاقي', 'razor', 'barbed'] },
    // 2026-11-02 review: playground equipment is its own trade (not interlock / planters)
    playground: { ar: 'ألعاب الأطفال والملاعب الخارجية', en: 'Playground Equipment', ur: 'کھیل کے میدان کا سامان', icon: '🛝', group: 'landscape',
      keywords: ['ألعاب أطفال','العاب اطفال','ألعاب حدائق','مراجيح','أرجوحة','زحليقة','playground','swing set'] },
  },
  architectural: {
    // ═══ الأرضيات والحوائط ═══
    tiles: { ar: 'بلاط وبورسلين وسيراميك وتيرازو', en: 'Tiles, Porcelain & Terrazzo', ur: 'ٹائلز اور ٹیرازو', icon: '🔲', group: 'floors_walls',
      keywords: ['بلاط','سيراميك','بورسلين','بورسلان','tile','ceramic','porcelain','موزاييك','mosaic','تيرازو','terrazzo'] },
    marble: { ar: 'رخام وجرانيت وحجر', en: 'Marble, Granite & Stone', ur: 'سنگ مرمر', icon: '💎', group: 'floors_walls',
      keywords: ['رخام','جرانيت','marble','granite','حجر طبيعي','natural stone','حجر صناعي','engineered stone','بازلت','basalt'] },
    wood_floor: { ar: 'باركيه وفينيل وSPC', en: 'Parquet, Vinyl & SPC', ur: 'پارکے', icon: '🟫', group: 'floors_walls',
      keywords: ['باركيه','parquet','فينيل','vinyl','SPC','خشبية','أرضية خشب','laminate','ألواح جدارية بديل الخشب'] },
    tile_adhesive: { ar: 'مواد تركيب البلاط (غراء/ترويبة)', en: 'Tile Adhesive & Grout', ur: 'ٹائل گلو', icon: '🪣', group: 'floors_walls',
      keywords: ['غراء','ترويبة','grout','adhesive','لاصق بلاط','tile glue','صلبان وكلبسات تسوية البلاط','صلبان'] },
    special_floor: { ar: 'أرضيات أكسس فلور وسكريد وسجاد', en: 'Raised Access, Screed & Carpet', ur: 'ایکسیس فلور، اسکریڈ اور قالین', icon: '🟪', group: 'floors_walls',
      keywords: ['سجاد','موكيت','زولية','carpet','raised access','أكسس فلور','access floor','رايزد أكسس','screed','سكريد','فرشة','مطاطية','مطاط','matting','rubber'] },
    // ═══ الدهانات والديكورات الخارجية ═══
    paint: { ar: 'دهانات ودهان أرضيات إيبوكسي', en: 'Paints & Epoxy Floor Coatings', ur: 'پینٹ اور ایپوکسی فرش کوٹنگ', icon: '🎨', group: 'paint_facade',
      keywords: ['دهان','دهانات','paint','جوتن','jotun','الجزيرة','أكريليك','acrylic','زيتي','ورق جدران','wallpaper','إيبوكسي','epoxy','دهان أرضيات','دهان إيبوكسي','floor coating','ورنيش وصبغة خشب'] },
    grc_facade: { ar: 'GRC وكسوة الواجهات', en: 'GRC & Facade Cladding', ur: 'جی آر سی', icon: '🏛', group: 'facade_systems',
      keywords: ['GRC','GRG','جي آر سي','بروفايل واجهات','رشات خارجية','كسوة','facade','render'] },
    plaster: { ar: 'لياسة وبياض ومواد التحضير', en: 'Plaster & Render', ur: 'پلستر', icon: '🧱', group: 'paint_facade',
      keywords: ['لياسة','بياض','plaster','شبك لياسة','زاوية لياسة','مونة','طرطشة','تخشين','بطانة'] },
    // ═══ الأسقف والديكورات الداخلية ═══
    gypsum: { ar: 'جبس بورد وقواطع', en: 'Gypsum Board & Partitions', ur: 'جپسم بورڈ', icon: '⬜', group: 'ceiling_decor',
      keywords: ['جبس بورد','gypsum','بورد','board','partition','قواطع','أوميجا','معجون','جبسوم','كرانيش جبس وبولي يوريثان'] },
    false_ceiling: { ar: 'أسقف مستعارة (ألومنيوم/بلاطات)', en: 'False Ceilings', ur: 'جھوٹی چھت', icon: '🔳', group: 'ceiling_decor',
      keywords: ['أسقف مستعارة','false ceiling','ألومنيوم','شرائح','بلاطات','ممرات','ceiling tile','صوتية','كالسيوم','calcium silicate','أسقف مكشوفة','مكشوفة'] },
    drywall_metal: { ar: 'قوائم ومسارات وإكسسوارات جبس', en: 'Drywall Studs & Accessories', ur: 'ڈرائی وال', icon: '📏', group: 'ceiling_decor',
      keywords: ['قائم معدني','مسار معدني','قوائم','ستود','stud','track','U-Channel','كورنر بيد','زاوية ركن','شريط تسليح','عازل تحت القوائم','وصلة تعشيق', 'أوميغا', 'furring', 'سقف معلق', 'زاوية جدار', 'معلاق سقف', 'ceiling hanger', 'زاوية حماية', 'هانجر','ألواح أسمنت بورد','فايبر سمنت'] },
    // ═══ الأبواب والشبابيك والواجهات ═══
    aluminum: { ar: 'ألمنيوم وشبابيك', en: 'Aluminum & Windows', ur: 'ایلومینیم', icon: '🪟', group: 'doors_windows',
      keywords: ['ألمنيوم','aluminum','aluminium','شبابيك','نوافذ','window','glazed door','sliding door','UPVC'] },
    wood_doors: { ar: 'أبواب خشبية', en: 'Wooden Doors', ur: 'لکڑی دروازے', icon: '🚪', group: 'doors_windows',
      keywords: ['أبواب خشب','wooden door','wood door','timber door','timber','internal door','interior door','flush door','door leaf','كبس','حشو','سنديان','خشبية','أبواب WPC وPVC للحمامات'] },
    fire_doors: { ar: 'أبواب حديد وحريق', en: 'Steel & Fire-Rated Doors', ur: 'فائر دروازے', icon: '🔥', group: 'doors_windows',
      keywords: ['أبواب حديد','fire door','fire-rated','fire rated','external door','metal door','steel door','exit door','مقاومة حريق','طوارئ','حديدية','أبواب ستانلس','stainless door','باب حديد'] },
    auto_doors: { ar: 'أبواب أوتوماتيكية وكراجات', en: 'Automatic & Garage Doors', ur: 'آٹومیٹک دروازے', icon: '🚗', group: 'doors_windows',
      keywords: ['أوتوماتيك','automatic','كراج','garage','rolling shutter','roller shutter','overhead door','sectional door','rolling','شتر','أتوماتيكية'] },
    // ═══ الواجهات المتطورة (Facade) ═══
    curtain_wall: { ar: 'واجهات ستائرية وزجاجية (Curtain Wall)', en: 'Curtain Wall & Glazing', ur: 'کرٹن وال', icon: '🏢', group: 'facade_systems',
      keywords: ['curtain wall','واجهة ستائرية','واجهة زجاجية','structural glazing','spider','مشدات زجاج','زجاج','glass','سيكوريت','tempered','glazed facade','قواطع زجاجية للمكاتب','سكاي لايت'] },
    rainscreen: { ar: 'كسوة واجهات (Rainscreen/ألمنيوم)', en: 'Aluminium Cladding & Rainscreen', ur: 'رین اسکرین', icon: '🔲', group: 'facade_systems',
      keywords: ['rainscreen','cladding','كسوة','ألمنيوم واجهات','aluminium panel','كومبوزيت','ACP','معدن مثقب'] },
    stone_facade: { ar: 'كسوة واجهات حجرية', en: 'Stone Cladding', ur: 'پتھر کلیڈنگ', icon: '🪨', group: 'facade_systems',
      keywords: ['واجهات حجر','واجهة حجر','كسوة حجر','حجر واجهات','حجر للواجهات','stone cladding','stone facade'] },
    louvers: { ar: 'مظلات وكاسرات شمس', en: 'Louvers & Shading', ur: 'لوور', icon: '🪟', group: 'facade_systems',
      keywords: ['louver','مظلة','كاسر شمس','shading','بريز سوليه','brise soleil','مشربية معدنية'] },
    // ═══ النجارة والأثاث الثابت (Joinery) ═══
    millwork: { ar: 'نجارة وكاونترات', en: 'Joinery & Counters', ur: 'جوائنری', icon: '🪵', group: 'joinery',
      keywords: ['نجارة','joinery','millwork','كاونتر','counter','reception','مكتب استقبال','بار','bar counter','خشب مفصل','MDF','mdf','خشب مضغوط','OSB','بلوك بورد','chipboard','blockboard','لوح خشبي','ألواح فورمايكا HPL وأكريليك','فورمايكا','شريط حواف PVC','قشرة خشب طبيعي'] },
    fitted_furniture: { ar: 'أثاث ثابت وخزائن', en: 'Fitted Furniture & Wardrobes', ur: 'فکسڈ فرنیچر', icon: '🪑', group: 'joinery',
      keywords: ['خزائن','wardrobe','أثاث ثابت','fitted','بانكيت','banquette','vanity','solid surface','corian','وحدة مغسلة'] },
    kitchen_appliances: { ar: 'أجهزة ومستلزمات المطبخ', en: 'Kitchen Appliances & Fittings', ur: 'کچن آلات', icon: '🍳', group: 'joinery',
      keywords: ['أجهزة مطبخ','فرن','بلت إن','موقد','شفاط مطبخ','هود','سلال جرارة','خزائن المطبخ','built-in','oven','hob'] },
    office_furniture: { ar: 'الأثاث المكتبي والرفوف', en: 'Office Furniture & Shelving', ur: 'دفتری فرنیچر اور ریک', icon: '🗄', group: 'joinery',
      keywords: ['أثاث مكتبي','مكتبي','كرسي مكتب','خزائن ملفات','رفوف معدنية','رفوف','أرفف','racking','office furniture'] },
    custom_furniture: { ar: 'أثاث حسب الطلب', en: 'Custom-Made Furniture', ur: 'آرڈر پر فرنیچر', icon: '🛋', group: 'joinery',
      keywords: ['أثاث','موبيليا','طاولة','طاولات','ترابيزة','سفرة','كنب','كنبة','أريكة','صوفا','كراسي','كرسي طعام','كرسي مكتب','سرير','تسريحة','مكتب خشب','مكتبة','دولاب','خزانة ملابس','جلسة','مجلس','حسب الطلب','furniture','table','sofa','bed','wardrobe','custom','سجاد وزوالي','سجاد','مشب نار','موقد حطب','لوحات وتحف ديكور','خزانة أحذية','بوفيه وسايدبورد حسب الطلب','رفوف حائط ديكور','رفوف حائط','قواطع ديكور خشبية','بارتيشن'] },
    curtains: { ar: 'ستائر وبرادي', en: 'Curtains & Blinds', ur: 'پردے', icon: '🪟', group: 'joinery',
      keywords: ['ستائر','ستارة','برادي','بلاك أوت','blackout','blinds','curtain','ستائر رول','ستائر شرائح','ستائر قماش'] },
    cubicles: { ar: 'قواطع حمامات وكبائن', en: 'Toilet Cubicles & Partitions', ur: 'کیوبیکل', icon: '🚪', group: 'joinery',
      keywords: ['قواطع حمام','cubicle','toilet partition','كبائن','HPL partition','لوكرات','locker'] },
    // ═══ العزل الصوتي (Acoustic) ═══
    acoustic_panels: { ar: 'ألواح وأسقف صوتية', en: 'Acoustic Panels & Ceilings', ur: 'صوتی پینل', icon: '🔊', group: 'acoustic',
      keywords: ['صوتي','acoustic','عزل صوت','baffle','sound absorb','بافل','صوف صخري صوتي','بوليستر صوتي'] },
    acoustic_timber: { ar: 'خشب صوتي مشقوق', en: 'Acoustic Timber Slats', ur: 'صوتی لکڑی', icon: '🪵', group: 'acoustic',
      keywords: ['خشب صوتي','acoustic timber','slat','مشقوق','veneer acoustic','شرائح خشب'] },
    // ═══ الأدوات الصحية والتشطيبات ═══
    sanitary_ware: { ar: 'مغاسل ومراحيض وأطقم حمامات', en: 'Basins, WCs & bathroom sets', ur: 'سینیٹری ویئر', icon: '🚽', group: 'sanitary_finish',
      keywords: ['أدوات صحية','مرحاض','مغسلة','حوض','خلاط','بانيو','كرسي','sanitary ware','WC','basin','mixer'] },
    bath_accessories: { ar: 'إكسسوارات حمامات ومطابخ', en: 'Bath & Kitchen Accessories', ur: 'لوازمات', icon: '🛁', group: 'sanitary_finish',
      keywords: ['إكسسوارات حمام','accessories','مطبخ','kitchen','مرايا','حوامل','مرآة','مراية','كابينة شاور زجاج','كابينة شاور'] },
    // ═══ العزل الحراري والمائي ═══
    thermal_insulation: { ar: 'العزل الحراري', en: 'Thermal Insulation', ur: 'انسولیشن', icon: '🧊', group: 'building_insulation',
      keywords: ['عازل حراري','XPS','EPS عازل','صوف صخري','rock wool','rockwool','فوم عازل','عازل رطوبة','عازل مائي','waterproofing membrane','polystyrene','بولي ستايرين','عزل أسطح','رش فوم بولي يوريثان للأسطح','صوف زجاجي','لفائف عزل'] },
    // ═══ الأعمال المعدنية والمصاعد ═══
    metal_features: { ar: 'درابزين وسلالم ومشربيات', en: 'Balustrades, Stairs & Screens', ur: 'دھاتی کام', icon: '🛗', group: 'arch_metalwork',
      keywords: ['درابزين','handrail','balustrade','سلالم حديد','سلالم ستانلس','درج معدني','staircase','مشربية','مشربيات','screen معماري','railing','بلكونة','سلم حلزوني', 'لوحات إرشادية', 'signage', 'لافتة', 'إرشادية','حماية حديد للنوافذ','حماية','درج داخلي خشب ورخام ودرابزين'] },
    vertical_transport: { ar: 'مصاعد وسلالم كهربائية', en: 'Elevators & Escalators', ur: 'لفٹ', icon: '🛗', group: 'arch_metalwork',
      keywords: ['مصعد','مصاعد','elevator','lift','سلالم كهربائية','سلم كهربائي','escalator','dumbwaiter','ممشى متحرك','travelator','مصعد طعام وأغراض صغير'] },
  },
  electrical: {
    // ═══ التمديدات والكابلات ═══
    lv_cables: { ar: 'كابلات وأسلاك (الفنار/بحرة)', en: 'Cables & Wires', ur: 'کیبل', icon: '🔌', group: 'cabling',
      keywords: ['كابل','cable','NYY','XLPE','SWA','LSZH','سلك','wire','CU/','mm²','نحاس','الفنار','بحرة','الرياض'] },
    mv_cables: { ar: 'كابلات جهد متوسط MV', en: 'MV Cables', ur: 'MV کیبل', icon: '⚡', group: 'cabling',
      keywords: ['متوسط جهد','medium voltage','MV cable','11kV','33kV'] },
    conduits: { ar: 'مواسير وحوامل كابلات', en: 'Conduits & Trays', ur: 'کنڈوٹ', icon: '🪛', group: 'cabling',
      keywords: ['أنبوب كهرب','أنابيب كهرب','مواسير كهرب','conduit','كوندويت','EMT','RGS','مواسير تمديد','flexible','مرنة','سكة كابل','tray','ladder','حوامل'] },
    // ═══ اللوحات والمفاتيح ═══
    panels: { ar: 'لوحات توزيع (DB)', en: 'Distribution Boards', ur: 'پینل', icon: '🎛', group: 'panels_switches',
      keywords: ['لوحة','لوحات','panel','MDB','SMDB','SDB','DB','distribution board','busbar','bus bar','هارمونيك','harmonic','عداد كهرباء فرعي'] },
    breakers: { ar: 'قواطع كهربائية', en: 'Circuit Breakers', ur: 'بریکر', icon: '🔘', group: 'panels_switches',
      keywords: ['قاطع','قواطع','breaker','MCB','MCCB','RCCB','ACB','فيوز'] },
    switches: { ar: 'مفاتيح ومقابس وعلب', en: 'Switches & Sockets', ur: 'سوئچ', icon: '🔲', group: 'panels_switches',
      keywords: ['مفاتيح','أفياش','switch','socket','علب','أبراز','outlet','مقابس','مقبس','floor box','مقبس طابق','مفتاح فصل'] },
    wiring_devices: { ar: 'أجهزة توصيل وتحكم (ديمر/USB/داتا)', en: 'Wiring Devices & Controls', ur: 'وائرنگ ڈیوائسز', icon: '🎚', group: 'panels_switches',
      keywords: ['ديمر','dimmer','بريزة','USB','RJ45','بريزة شبكة','بريزة تلفزيون','coax','حساس حركة','PIR','presence','تايمر','timer','جرس باب','doorbell','ثرموستات','thermostat','كونتاكتور','ريليه','حامي جهد كهربائي','شاحن سيارات كهربائية'] },
    transformers: { ar: 'محولات ومولدات', en: 'Transformers & Generators', ur: 'ٹرانسفارمر', icon: '🔋', group: 'panels_switches',
      keywords: ['محول','مولد','transformer','generator','UPS','ATS','مكثفات','محطة تحويل','substation'] },
    // ═══ أنظمة الإنارة ═══
    indoor_lighting: { ar: 'إنارة داخلية (داون لايت/ليد)', en: 'Indoor Lighting', ur: 'اندرونی روشنی', icon: '💡', group: 'lighting',
      keywords: ['إضاءة داخلية','داون لايت','downlight','سبوت','spot','لوحات ليد','LED panel','لمبة','مصباح','طوارئ','emergency','exit','مخرج','شريطية','strip','DALI','إنارة تراك','إنارة مخفية خطية','إنارة تحت خزائن المطبخ'] },
    led_strips: { ar: 'شرائط LED ونيون وإكسسواراتها', en: 'LED Strips, Neon & Accessories', ur: 'ایل ای ڈی سٹرپ', icon: '🌈', group: 'lighting',
      keywords: ['شريط LED','شريط ليد','نيون','neon','led strip','درايفر','driver','بروفايل ألمنيوم','RGB','كنترول شريط','موصل شريط'] },
    outdoor_lighting: { ar: 'إنارة خارجية وأعمدة', en: 'Outdoor & Landscape Lighting', ur: 'بیرونی روشنی', icon: '🏮', group: 'lighting',
      keywords: ['إنارة خارجية','حدائق','كشاف','floodlight','أعمدة إنارة','واجهات','جمالية','landscape','كشافات وإنارة بالطاقة الشمسية','إنارة جدارية خارجية','إنارة درج وأرضيات'] },
    solar_pv: { ar: 'الطاقة الشمسية', en: 'Solar Energy', ur: 'شمسی توانائی', icon: '☀', group: 'solar',
      keywords: ['طاقة شمسية','الطاقة الشمسية','ألواح شمسية','الألواح الشمسية','شمسي','شمسية','سولار','انفرتر طاقة','إنفرتر','انفرتر','مايكرو إنفرتر','ليثيوم','بطاريات جل','منظم شحن','صافي القياس','عداد ثنائي','Combiner','MC4','TOPCon','Bifacial','Mono PERC','On-Grid','Off-Grid','Hybrid','solar','pv','carport'] },
    decor_lighting: { ar: 'إنارة ديكور وثريات', en: 'Decorative Lighting & Chandeliers', ur: 'سجاوٹی روشنی', icon: '✨', group: 'lighting',
      keywords: ['ثريا','ثريات','نجفة','نجف','أباجورة','أبليك','إنارة ديكور','إنارة معلقة','معلقة ديكور','إنارة أرضية','chandelier','pendant','lamp','wall light','floor lamp','إنارة سقف مودرن','إنارة مرآة وحمّام','مصباح طاولة ومكتب LED','مصباح طاولة','لمبات ديكور فيلامنت'] },
    earthing: { ar: 'التأريض والحماية من الصواعق', en: 'Earthing & Lightning Protection', ur: 'ارتھنگ', icon: '🛡', group: 'earthing_grp',
      keywords: ['تأريض','earthing','earth','حماية برق','lightning','أقطاب','rod'] },
    // ═══ أنظمة التيار الخفيف ═══
    smart_home: { ar: 'المنزل الذكي', en: 'Smart Home', ur: 'اسمارٹ ہوم', icon: '📱', group: 'low_current',
      keywords: ['ذكي','ذكية','منزل ذكي','المنزل الذكي','سمارت','smart','موتور بوابة','محرك بوابة','زيجبي','حساس حركة للإنارة','حساس حركة'] },
    cctv: { ar: 'كاميرات مراقبة CCTV', en: 'CCTV Systems', ur: 'سی سی ٹی وی', icon: '📹', group: 'low_current',
      keywords: ['كاميرات','كاميرا','مراقبة','CCTV','PTZ','شاشات','surveillance'] },
    fire_alarm: { ar: 'إنذار حريق', en: 'Fire Alarm', ur: 'فائر الارم', icon: '🚨', group: 'low_current',
      keywords: ['إنذار حريق','fire alarm','كاشف دخان','smoke detector'] },
    data_network: { ar: 'شبكات بيانات وسنترالات', en: 'Data, Telecom & Intercom', ur: 'ڈیٹا نیٹ ورک', icon: '🌐', group: 'low_current',
      keywords: ['بيانات','data','شبكات','network','telecom','سنترال','intercom','CAT6','ألياف','إنتركم','انتركم','جرس باب'] },
    sound_systems: { ar: 'أنظمة صوتيات', en: 'Sound Systems', ur: 'ساؤنڈ سسٹم', icon: '🔊', group: 'low_current',
      keywords: ['صوتيات','sound','PA','speaker','مكبرات','إعلام'] },
    led_screens: { ar: 'شاشات LED ولوحات نتائج', en: 'LED Screens & Scoreboards', ur: 'ایل ای ڈی اسکرین', icon: '📺', group: 'low_current',
      keywords: ['شاشة','شاشات','LED screen','scoreboard','لوحة نتائج','perimeter','محيطية','display','عرض','360'] },
    access_control: { ar: 'أنظمة دخول وتحكم بالمبنى', en: 'Access Control & BMS', ur: 'ایکسیس کنٹرول', icon: '🚪', group: 'low_current',
      keywords: ['تحكم بالدخول','تحكم دخول','access control','ACS','بوابة','turnstile','gate','بصمة','بطاقة','card reader','تذاكر','BMS','تحكم مبنى','حساس حركة','PIR','حاجز','barrier'] },
  },
  mechanical: {
    // ═══ التكييف والتهوية ═══
    ac_units: { ar: 'مكيفات (سبليت/مركزي/تشيلر)', en: 'AC Units (Split/Central/Chiller)', ur: 'ایئر کنڈیشنر', icon: '❄️', group: 'hvac',
      keywords: ['مكيف','سبليت','split','دكت','package','مركزي','تشيلر','chiller','VRF','VRV','AHU','FCU','برج تبريد','cooling tower','مبادل حراري','heat exchanger','مكثف','condenser','مجمد حرارة','مواسير نحاس تكييف','غاز تبريد'] },
    ductwork: { ar: 'مجاري هواء ومخارج', en: 'Ductwork & Grilles', ur: 'ڈکٹ', icon: '🌬', group: 'hvac',
      keywords: ['مجاري هواء','duct','دكت','مخارج هواء','فتحات هواء','موزعات هواء','موزعات','ستائر هواء','air curtain','grille','ديفيوزر','diffuser'] },
    duct_insulation: { ar: 'عزل مجاري الهواء (دكت)', en: 'Duct Insulation', ur: 'ڈکٹ انسولیشن', icon: '🧥', group: 'mech_insulation',
      keywords: ['عزل دكت','عزل مجاري','صوف صخري','rockwool','صوف زجاجي','fiberglass','عزل فوم','rubber insulation','armaflex','nitrile','كانفس','canvas','mastic','foster','ماستيك'] },
    hvac_dampers: { ar: 'خانقات هواء (حريق/دخان/VCD)', en: 'Dampers (Fire/Smoke/VCD)', ur: 'ڈیمپرز', icon: '🛡', group: 'hvac',
      keywords: ['خانق','damper','fire damper','خانق حريق','smoke damper','خانق دخان','VCD','volume control','خانق حجم','motorized damper'] },
    ventilation_fans: { ar: 'مراوح تهوية وشفط', en: 'Ventilation & Exhaust Fans', ur: 'وینٹیلیشن فین', icon: '🌀', group: 'hvac',
      keywords: ['مروحة شفط','exhaust fan','مراوح','ventilation','تهوية','سحب دخان','smoke extract','jet fan','inline fan','مروحة سقف','مروحة جدارية','axial','centrifugal','شفاط مطبخ تجاري'] },
    flexible_ducts: { ar: 'دكت مرن ووصلات', en: 'Flexible Ducts & Connectors', ur: 'لچکدار ڈکٹ', icon: '🪈', group: 'hvac',
      keywords: ['دكت مرن','flexible duct','flexible connector','وصلة مرنة','flexible','spiral duct','دكت لولبي'] },
    // ═══ السباكة والتغذية والصرف ═══
    central_gas: { ar: 'الغاز المركزي', en: 'Central Gas Systems', ur: 'سینٹرل گیس', icon: '🔥', group: 'plumbing',
      keywords: ['غاز مركزي','الغاز المركزي','مواسير غاز','تمديدات غاز','خزان غاز','منظم غاز','كاشف تسرب','lpg'] },
    water_supply: { ar: 'أنابيب تغذية (PPR)', en: 'Water Supply Pipes (PPR)', ur: 'پانی سپلائی', icon: '🚰', group: 'plumbing',
      keywords: ['PPR','تغذية','مياه باردة','مياه حارة','مياه شرب'] },
    drainage_pipes: { ar: 'مواسير صرف (PVC/UPVC)', en: 'Drainage Pipes (PVC)', ur: 'نکاسی پائپ', icon: '🚽', group: 'plumbing',
      keywords: ['صرف صحي','uPVC','PVC','sanitary','soil','waste','قسامات','أكواع','مصرف','حديد زهر','cast iron','زهر','فصال دهون','grease','interceptor','صرف خارجي','صرف أمطار','أمطار','stormwater','RCP','خرساني','ductile','حديد مرن','مياه رئيسية','منهول','manhole','غرف تفتيش','مصارف خطية'] },
    silent_drainage: { ar: 'صرف صامت (أكوستيك)', en: 'Silent / Acoustic Drainage', ur: 'سائلنٹ ڈرینج', icon: '🔇', group: 'plumbing',
      keywords: ['صرف صامت','silent','acoustic drainage','أكوستيك','db20','geberit silent','poloplast','صرف هادئ'] },
    storm_drainage: { ar: 'صرف مياه الأمطار', en: 'Storm Water Drainage', ur: 'بارش نکاسی', icon: '🌧', group: 'plumbing',
      keywords: ['صرف أمطار','storm','rain water','مياه أمطار','roof drain','جالية سطح','مصفاة سطح','trench drain','قناة تصريف','linear drain','channel drain','قناة أرضية'] },
    water_treatment: { ar: 'معالجة وتنقية المياه', en: 'Water Treatment & Filtration', ur: 'واٹر ٹریٹمنٹ', icon: '💧', group: 'plumbing',
      keywords: ['معالجة مياه','تنقية','فلتر','filter','filtration','فلتر رملي','sand filter','فلتر قطني','RO','تحلية','water treatment','softener','تليين','ضخ ضغط عالي'] },
    pumps: { ar: 'مضخات مياه', en: 'Water Pumps', ur: 'پمپ', icon: '⚙️', group: 'plumbing',
      keywords: ['مضخة','pump','رفع','تدوير','ضغط','booster','صمام','valve','وعاء تمدد','expansion vessel'] },
    tanks_heaters: { ar: 'خزانات وسخانات مياه', en: 'Tanks & Water Heaters', ur: 'ٹینک', icon: '🪣', group: 'plumbing',
      keywords: ['خزان','tank','GRP','فايبرجلاس','بولي','سخان','heater','RO','تحلية','مرشح'] },
    // ═══ لوازم وإكسسوارات السباكة (محلات صغيرة) ═══
    faucets_mixers: { ar: 'خلاطات وأدوات صحية', en: 'Faucets & Sanitary Fixtures', ur: 'نل', icon: '🚿', group: 'plumbing_supplies',
      keywords: ['خلاط','صنبور','حنفية','مخلط','faucet','mixer','tap','بطارية مغسلة','خلاط مطبخ','مغسلة','حوض','مجلى','مبولة','wash basin','sink','urinal','كرسي حمام','مرحاض','WC'] },
    valves_fittings: { ar: 'محابس ووصلات وحوامل', en: 'Valves, Fittings & Supports', ur: 'والو', icon: '🔩', group: 'plumbing_supplies',
      keywords: ['محبس','صمام زاوية','angle valve','gate valve','محبس زاوية','وصلة','وصلات','كوع','تي','fitting','elbow','tee','كوبلن','نبل','فلانش','فلنشة','flange','عازل اهتزاز','اهتزاز','مواسير تمدد','expansion joint','تمدد','حوامل','تعليقات','pipe support','hanger','مجمع توزيع مياه'] },
    copper_fittings: { ar: 'لوازم نحاسية', en: 'Copper Fittings', ur: 'تانبے', icon: '🟠', group: 'plumbing_supplies',
      keywords: ['نحاس','copper','لوازم نحاسية','وصلة نحاس','كوع نحاس'] },
    traps_drains: { ar: 'سيفونات ومصافي', en: 'Traps & Drains', ur: 'سائفن', icon: '🚽', group: 'plumbing_supplies',
      keywords: ['سيفون','trap','مصفاة','مصرف أرضي','floor drain','نفbreeze','بلف','شبكة صرف','صفاية'] },
    flex_hoses: { ar: 'خراطيم مرنة ووصلات', en: 'Flexible Hoses & Connectors', ur: 'لچکدار نلی', icon: '🪢', group: 'plumbing_supplies',
      keywords: ['خرطوم','hose','مرن','flexible','وصلة مرنة','شطاف','خرطوم سخان','flexi','وصلة شطاف'] },
    plumbing_consumables: { ar: 'تفلون وعوازل وحشوات', en: 'Teflon, Seals & Sealants', ur: 'ٹیفلون', icon: '🧵', group: 'plumbing_supplies',
      keywords: ['تفلون','teflon','شريط','عازل','حشوة','جلدة','seal','gasket','معجون','سيليكون سباكة','خيط سباكة','غراء مواسير PVC','غراء مواسير'] },
    shower_accessories: { ar: 'دشات وإكسسوارات حمام', en: 'Shower Heads & Bath Accessories', ur: 'شاور', icon: '🚿', group: 'plumbing_supplies',
      keywords: ['دش','shower','رأس دش','shower head','إكسسوار حمام','حامل','صابونة','مناديل','معلاق'] },
    floats_tanks: { ar: 'عوامات وطفايات سيفون', en: 'Float Valves & Cistern Parts', ur: 'فلوٹ', icon: '🎈', group: 'plumbing_supplies',
      keywords: ['عوامة','float','طفاية','سيفون كرسي','cistern','بكرة','عوامة خزان','محبس عوامة'] },
    // ═══ مكافحة الحريق ═══
    fire_fighting: { ar: 'مواسير ورشاشات حريق', en: 'Fire Pipes & Sprinklers', ur: 'فائر فائٹنگ', icon: '🧯', group: 'firefighting',
      keywords: ['إطفاء','حريق','sprinkler','رشاش','مواسير حريق','سكيدول','schedule 40','اسبركلر','طفاية حريق'] },
    fire_pumps: { ar: 'مضخات حريق (UL/FM)', en: 'Fire Pumps (UL/FM)', ur: 'فائر پمپ', icon: '🚒', group: 'firefighting',
      keywords: ['مضخة حريق','fire pump','jockey','جوكي','ديزل','diesel','UL','FM','fire pump set','مضخة ديزل','مضخة كهرباء حريق','booster حريق'] },
    fire_cabinets: { ar: 'صناديق حريق وخراطيم', en: 'Fire Hose Cabinets', ur: 'فائر کیبنٹ', icon: '🧰', group: 'firefighting',
      keywords: ['صندوق حريق','fire hose cabinet','كابينة حريق','خرطوم حريق','hose reel','بكرة خرطوم','landing valve','محبس إطفاء','طفاية','extinguisher','fire cabinet','بطانية حريق وصندوق طفاية'] },
    fire_valves: { ar: 'محابس وصمامات حريق', en: 'Fire Valves & Controls', ur: 'فائر والو', icon: '🎚', group: 'firefighting',
      keywords: ['OS&Y','gate valve','محبس بوابي','inspector test','محبس اختبار','flow switch','مفتاح تدفق','check valve','butterfly','zone control','tamper switch','محبس منطقة','صمام حريق'] },
    fire_connections: { ar: 'وصلات دفاع مدني وهيدرنت', en: 'Siamese & Hydrants', ur: 'سیامیز کنکشن', icon: '🚰', group: 'firefighting',
      keywords: ['siamese','وصلة دفاع مدني','fire department connection','FDC','breeching','هيدرنت','hydrant','landing','وصلة سيامي','مأخذ حريق'] },
    // ═══ العزل الحراري الميكانيكي ═══
    chilled_water_insulation: { ar: 'عزل أنابيب المياه المثلجة', en: 'Chilled Water Pipe Insulation', ur: 'چلڈ واٹر انسولیشن', icon: '🧊', group: 'mech_insulation',
      keywords: ['عزل مياه مثلجة','chilled water insulation','عزل أنابيب','عازل أنابيب','عازل أنابيب مياه مبردة','fibreglass','fiberglass عزل','pipe insulation','armaflex','nitrile','elastomeric','صوف صخري أنابيب','عزل حراري أنابيب','عازل حراري أنابيب','عازل مطاطي للأنابيب','أرمافلكس'] },
    cladding_jacketing: { ar: 'تغليف وكلادينج ألمنيوم', en: 'Aluminum Cladding / Jacketing', ur: 'کلیڈنگ', icon: '🛢', group: 'mech_insulation',
      keywords: ['cladding','كلادينج','جاكيت','jacketing','ألمنيوم أنابيب','aluminum jacket','تغليف أنابيب','foil','رقائق ألمنيوم'] },
    // 2026-11-02 review: pressure/mains pipes split from PPR; chilled-water pipes go with HVAC; fuel systems
    pressure_pipes: { ar: 'مواسير ضغط ومياه رئيسية (نحاس/CPVC/PEX/HDPE/حديد)', en: 'Pressure & Mains Pipes (Copper/CPVC/PEX/HDPE/Steel)', ur: 'پریشر اور مین پائپ', icon: '🚰', group: 'plumbing',
      keywords: ['CPVC','PEX','نحاس مياه','أنابيب نحاس','HDPE','مياه رئيسية','عداد مياه','water meter','حديد مجلفن','galvanized','أنابيب GRP','uPVC ضغط','سكجول 80','pressure pipe'] },
    chilled_water_pipes: { ar: 'أنابيب المياه المثلجة (تكييف مركزي)', en: 'Chilled Water Piping', ur: 'چلڈ واٹر پائپ', icon: '❄️', group: 'hvac',
      keywords: ['مياه مبردة','مياه مثلجة','chilled water','معزولة مسبقا','pre-insulated','pre insulated','تبريد المناطق','district cooling'] },
    fuel_systems: { ar: 'خزانات وتمديدات الوقود (ديزل)', en: 'Fuel Tanks & Lines (Diesel)', ur: 'فیول ٹینک اور لائنیں', icon: '⛽', group: 'plumbing',
      keywords: ['وقود','fuel','خزان وقود','خزان ديزل','day tank','تصفية وقود'] },
  },
  equipment: {
    // ═══ آليات ثقيلة (حفر/رفع/نقل) ═══
    heavy_machinery: { ar: 'حفارات وشيولات وبلدوزرات', en: 'Excavators & Loaders', ur: 'کھدائی مشین', icon: '🚜', group: 'heavy_equipment',
      keywords: ['حفار','حفارة','excavator','شيول','loader','بلدوزر','bulldozer','بوكلين','لودر','جريدر','grader'] },
    cranes: { ar: 'رافعات وكرينات وونشات', en: 'Cranes & Lifting', ur: 'کرین', icon: '🏗', group: 'heavy_equipment',
      keywords: ['رافعة','crane','كرين','ونش','winch','رفع','lifting','برج رفع','tower crane','مناولة','forklift','رافعة شوكية'] },
    trucks: { ar: 'شاحنات ومعدات نقل', en: 'Trucks & Transport', ur: 'ٹرک', icon: '🚛', group: 'heavy_equipment',
      keywords: ['شاحنة','truck','قلاب','dump','نقل','transport','صهريج','tanker','مقطورة','trailer','حاوية مخلفات بناء'] },
    // ═══ معدات خرسانة وصب ═══
    concrete_equip: { ar: 'خلاطات ومضخات خرسانة', en: 'Concrete Mixers & Pumps', ur: 'کنکریٹ مشین', icon: '🏭', group: 'concrete_machinery',
      keywords: ['خلاطة','mixer','مضخة خرسانة','concrete pump','هزاز','vibrator','صب خرسانة','baching','محطة خلط'] },
    // ═══ معدات خفيفة (مولدات/دكاكات) ═══
    compaction: { ar: 'معدات دك ورص', en: 'Compaction Equipment', ur: 'کمپیکشن', icon: '🛞', group: 'light_equipment',
      keywords: ['دكاكة','compactor','رصاصة','plate','هراس','roller','رص','مدماك','دك تربة'] },
    generators_equip: { ar: 'مولدات وكمبروسرات', en: 'Generators & Compressors', ur: 'جنریٹر', icon: '⚙️', group: 'light_equipment',
      keywords: ['مولد','generator','كمبروسر','compressor','ضاغط هواء','مكينة','محرك','engine','دينمو'] },
    pumps_equip: { ar: 'مضخات نزح', en: 'Dewatering Pumps', ur: 'پمپ', icon: '💧', group: 'light_equipment',
      keywords: ['طرمبة','مضخة نزح','dewatering','submersible','غطاسة','شفط مياه'] },
    // ═══ سقالات ومنصات رفع ═══
    scaffolding_equip: { ar: 'سقالات ومنصات', en: 'Scaffolding & Platforms', ur: 'سکیفولڈنگ', icon: '🪜', group: 'access_equipment',
      keywords: ['سقالة','سقالات','scaffold','منصة رفع','platform','سلالم','ladder','رافعة مقصية','scissor lift','بوم','جاكات','تدعيم','props','shoring','دعامات'] },
    // ═══ معدات ورشة ولحام ═══
    welding_cutting: { ar: 'ماكينات ولوازم لحام وقص', en: 'Welding & Cutting Machines', ur: 'ویلڈنگ', icon: '🔥', group: 'workshop_equip',
      keywords: ['لحام','welding','إلكترود','سلك لحام','بلازما','plasma','قناع لحام','منظم غاز','عربة أسطوانات','آرك','تيج','ميغ','MIG','TIG'] },
    pressure_wash: { ar: 'غسالات ضغط عالي', en: 'High-Pressure Washers', ur: 'پریشر واشر', icon: '💦', group: 'workshop_equip',
      keywords: ['غسالة ضغط','ضغط عالي','pressure washer','كارشر','بخاخ ضغط', 'لانس', 'بندقية رش', 'فوهة رش', 'فرشاة تنظيف', 'أسطح دوارة', 'غسالة'] },
    // 2026-11-02 review: rebar/finishing machines are not mixers or pumps; site services (portable toilets)
    concrete_finishing: { ar: 'معدات التسليح وتشطيب الخرسانة', en: 'Rebar & Concrete Finishing Machines', ur: 'سریا اور کنکریٹ فنشنگ مشینیں', icon: '🛠', group: 'concrete_machinery',
      keywords: ['ثني حديد','قص حديد التسليح','rebar bender','rebar cutter','قص الخرسانة','concrete cutter','floor saw','تنعيم الخرسانة','هليكوبتر','power trowel'] },
    site_services: { ar: 'خدمات الموقع (دورات مياه متنقلة)', en: 'Site Services (Portable Toilets)', ur: 'سائٹ سروسز (موبائل ٹوائلٹ)', icon: '🚻', group: 'light_equipment',
      keywords: ['دورات مياه متنقلة','دورة مياه متنقلة','حمامات متنقلة','portable toilet'] },
  },
  supply_store: {
    // ═══ أدوات سباكة بسيطة ═══
    store_faucets: { ar: 'خلاطات وصنابير (محلات السباكة)', en: 'Faucets & mixers (plumbing shops)', ur: 'نل', icon: '🚿', group: 'store_plumbing',
      keywords: ['خلاط','صنبور','حنفية','faucet','mixer','tap','بطارية مغسلة'] },
    store_valves: { ar: 'محابس ووصلات (محلات السباكة)', en: 'Valves & fittings (plumbing shops)', ur: 'والو', icon: '🔩', group: 'store_plumbing',
      keywords: ['محبس','صمام زاوية','angle valve','وصلة','كوع','تي','elbow','tee','سيفون','trap','نحاس','كوبلن','مصفاة','مصفاة أرضية','floor drain'] },
    store_hoses: { ar: 'خراطيم وتفلون ولوازم', en: 'Hoses, Teflon & Supplies', ur: 'نلی', icon: '🪢', group: 'store_plumbing',
      keywords: ['خرطوم','hose','مرن','شطاف','تفلون','teflon','معجون','جلدة','حشوة','seal','دش','shower','عوامة','float'] },
    // ═══ أدوات كهرباء بسيطة ═══
    store_wires: { ar: 'أسلاك وكابلات بسيطة', en: 'Wires & Cables', ur: 'تار', icon: '🔌', group: 'store_electrical',
      keywords: ['سلك','wire','كابل بسيط','أسلاك','تمديد','مدد كهرب'] },
    store_switches: { ar: 'مفاتيح ومقابس (محلات الكهرباء)', en: 'Switches & sockets (electrical shops)', ur: 'سوئچ', icon: '🔲', group: 'store_electrical',
      keywords: ['مفتاح','أفياش','بريزة','socket','switch','علبة كهرب','مقبس','أباجورة','outlet'] },
    store_lighting: { ar: 'لمبات وإنارة بسيطة', en: 'Bulbs & Lighting', ur: 'بلب', icon: '💡', group: 'store_electrical',
      keywords: ['لمبة','بلب','bulb','إنارة','سبوت','spot','led','مصباح','كشاف صغير','نجفة'] },
    store_elec_access: { ar: 'إكسسوارات كهرباء', en: 'Electrical Accessories', ur: 'الیکٹریکل لوازم', icon: '⚡', group: 'store_electrical',
      keywords: ['قاطع صغير','MCB','فيش','plug','شريط لحام','كماشة كهرب','عازل','تيب','محول صغير','شاحن','مشترك كهرباء','موزع أفياش','جهاز قياس كهرباء'] },
    store_elec_consumables: { ar: 'مستهلكات كهرباء (شرائط/تايات/جلاند)', en: 'Electrical Consumables', ur: 'الیکٹریکل سامان', icon: '🔌', group: 'store_electrical',
      keywords: ['شريط عزل','تيب لحام','أربطة كابلات','تايات','cable tie','جلبة كابل','جلاند','gland','واغو','wago','كلامة','هيت شرنك','heat shrink','كم حراري','علبة توزيع','junction box','كوبلن مواسير كهرباء','كوندويت','شمع تزليق', 'شريط تلوين', 'ترميز الكابلات', 'ترميز كابلات'] },
    // ═══ عُدد يدوية وكهربائية ═══
    store_hand_tools: { ar: 'عُدد يدوية (مفكات/زراديات)', en: 'Hand Tools', ur: 'ہاتھ کے اوزار', icon: '🔧', group: 'store_tools',
      keywords: ['مفك','مفكات','زرادية','كماشة','مفتاح','wrench','screwdriver','plier','مطرقة','شاكوش','متر','ميزان','عربة يد','عربانة','مسدس سيليكون','مالج ومسطرين وأدوات لياسة','مقص بلاط','صندوق عدة'] },
    store_power_tools: { ar: 'عُدد كهربائية (دريل/صاروخ)', en: 'Power Tools', ur: 'بجلی اوزار', icon: '🪚', group: 'store_tools',
      keywords: ['دريل','drill','صاروخ','grinder','منشار كهرب','جلاخة','مثقاب','شحن','مطرقة تكسير كهربائية','هيلتي','مسدس دهان','مسدس مسامير ودباسة','مكنسة كهربائية صناعية','خلاط معجون ودهان كهربائي','خلاط معجون'] },
    store_bits: { ar: 'ريش ولقم وأقراص', en: 'Bits & Discs', ur: 'بٹ', icon: '🪛', group: 'store_tools',
      keywords: ['ريشة','ريش','لقمة','drill bit','همر','SDS','قرص قص','قرص','تجليخ','grinding','disc','شفرة','blade','صنفرة', 'حجر شحذ', 'شحذ'] },
    // ═══ مسامير وبراغي ومثبتات ═══
    store_fasteners: { ar: 'مسامير وبراغي وصواميل', en: 'Screws, Bolts & Nuts', ur: 'پیچ', icon: '🔩', group: 'store_fasteners',
      keywords: ['مسمار','مسامير','برغي','screw','bolt','nail','صامولة','صواميل','nut','مثبت','رول بلت','خابور','خوابير','anchor','براغي','فيشر','سيخ مسنن','وردات','أنكر بولت'] },
    // ═══ سلامة ومستهلكات ═══
    store_safety: { ar: 'معدات سلامة وقفازات', en: 'Safety & PPE', ur: 'حفاظتی سامان', icon: '🦺', group: 'store_safety',
      keywords: ['خوذة','قفازات','gloves','نظارة','حذاء سلامة','سترة','كمامة','mask','PPE','وقاية','حزام أمان','لوحات إرشادية للسلامة والإخلاء','أقماع وحواجز مرورية','شريط تحذيري','شبكة أمان للمباني','أفرول عمل','حقيبة إسعافات أولية','سدادات وواقيات الأذن'] },
    store_consumables: { ar: 'مستهلكات ولوازم متنوعة', en: 'Consumables & Misc', ur: 'استعمالی', icon: '📦', group: 'store_safety',
      keywords: ['شريط لاصق','tape','حبل','rope','كيس','بطارية','battery','مصباح يدوي','جلبة','أربطة'] },
    // ═══ دهانات ولواصق ═══
    store_paint: { ar: 'دهانات وفرش ورولات', en: 'Paint, Brushes & Rollers', ur: 'پینٹ', icon: '🎨', group: 'store_paint',
      keywords: ['دهان','paint','فرشاة','brush','رولة','roller','بوية','صبغ','تنر','thinner'] },
    store_adhesives: { ar: 'سيليكون ولواصق وفوم', en: 'Silicone, Glue & Foam', ur: 'سیلیکون', icon: '🧴', group: 'store_paint',
      keywords: ['سيليكون','silicone','فوم','foam','لاصق','adhesive','glue','سيلانت','sealant','صمغ','مانع تسرب'] },
    // ═══ خردوات: مفصلات وأقفال ومقابض ═══
    store_hinges: { ar: 'مفصلات ومجاري أدراج', en: 'Hinges & Drawer Slides', ur: 'قبضے', icon: '🔗', group: 'store_hardware',
      keywords: ['مفصلة','مفصلات','hinge','مجرى درج','مجاري أدراج','كابح صدمة','سوفت كلوز','soft close'] },
    store_locks: { ar: 'أقفال وأسطوانات', en: 'Locks & Cylinders', ur: 'تالے', icon: '🔒', group: 'store_hardware',
      keywords: ['كالون','قفل','أقفال','سلندر','أسطوانة قفل','مزلاج','سقاطة','ترباس','بادلوك','ماغلوك','ضبة كهربائية','مخرج طوارئ','lock','cylinder','padlock'] },
    store_handles: { ar: 'مقابض ويد سحب', en: 'Handles & Knobs', ur: 'ہینڈل', icon: '🚪', group: 'store_hardware',
      keywords: ['مقبض','مقابض','مسكة','اكبح','روزيتة','دفاية باب','يد سحب','بزلة','handle','knob'] },
    store_closers: { ar: 'مغلقات ومثبتات أبواب', en: 'Door Closers & Stops', ur: 'ڈور کلوزر', icon: '🚪', group: 'store_hardware',
      keywords: ['كباس باب','مغلق باب','فلور سبرنج','حامل باب','مصد باب','ستوبر','منظم أولوية','مثبت باب','ماسك','door closer'] },
  },
}

// كشف التخصص الفرعي تلقائياً من اسم المادة
// يستخدم التطبيع ليتسامح مع الأخطاء الإملائية (همزة ناقصة، تاء/هاء، تشكيل، تطويل، أوردو)
// Products added from the 2026-10-19 research have a fixed sub-category (their names are long and
// would need many keywords); keywords still route everything else and free text.
export const PRODUCT_SUB: Record<string, string> = {
  'عازل رطوبة للأسطح والجدران': 'waterproofing',
  'عازل حراري مجاري هواء': 'duct_insulation',
  'انكر وتد (Wedge Anchor / Through Bolt)': 'store_fasteners',
  'انكر دروب إن (Drop-in Anchor)': 'store_fasteners',
  'انكر كُم (Sleeve Anchor)': 'store_fasteners',
  'برغي خرسانة (Concrete Screw / Screw Anchor)': 'store_fasteners',
  'انكر ثقيل للأحمال (Heavy-duty Anchor)': 'store_fasteners',
  'انكر سقف بمسمار للتعليق (Ceiling Nail Anchor)': 'store_fasteners',
  'مونة حقن كيميائية إيبوكسي (Injection Epoxy Mortar)': 'construction_chemicals',
  'مونة حقن هايبرد/فينيل إستر سريعة (Hybrid / Vinylester Injection Mortar)': 'construction_chemicals',
  'انكر كيميائي كبسولة (Chemical Capsule Anchor)': 'construction_chemicals',
  'قضيب انكر كيميائي مع صامولة ووردة (Chemical Anchor Rod / Stud)': 'store_fasteners',
  'جلبة شبكية للانكر الكيميائي في الطوب المفرغ (Mesh / Sieve Sleeve)': 'construction_chemicals',
  'مسدس حقن الانكر الكيميائي (Injection Dispenser)': 'store_hand_tools',
  'فوهة خلط للانكر الكيميائي (Static Mixer Nozzle)': 'store_consumables',
  'فرشاة ومنفاخ تنظيف ثقوب الانكر (Hole Cleaning Brush & Blow-out Pump)': 'store_consumables',
  'وردة تعبئة للانكرات (Filling / Dynamic Washer)': 'store_fasteners',
  'خابور إطار للأبواب والشبابيك (Frame Fixing)': 'store_fasteners',
  'خابور معدني للجدران المفرغة والجبس بورد (Metal Cavity Anchor / Molly)': 'store_fasteners',
  'خابور فراشة/توجل للأسقف المفرغة (Spring / Tilt Toggle)': 'store_fasteners',
  'خابور جبس بورد بلاستيك/زماك ذاتي الثقب (Self-drill Plasterboard Plug)': 'store_fasteners',
  'خابور الخرسانة الخلوية (الطوب الخفيف/سيبوريكس) (Aerated Concrete Plug)': 'store_fasteners',
  'مسمار عزل حراري بقرص (Insulation Fixing)': 'thermal_insulation',
  'طقم تثبيت مغسلة ومرحاض (Sanitary Fixing Set)': 'store_fasteners',
  'مسامير بارود للخرسانة والحديد (Powder-actuated Nails)': 'store_fasteners',
  'طلقات بارود (Powder Cartridges / Boosters)': 'store_fasteners',
  'مسامير مسدس الغاز للخرسانة (Gas Nails)': 'store_fasteners',
  'مسمار بارود مع مشبك سقف/كابل (Ceiling & Conduit Clip Nail)': 'store_fasteners',
  'برغي ذاتي الحفر مع وردة مطاط للساندوتش بانل (Self-drilling Screw + EPDM Washer)': 'store_fasteners',
  'برغي خشب وتشبورد (Chipboard / Wood Screw)': 'store_fasteners',
  'صامولة وصل طويلة للقضبان الملولبة (Coupling Nut)': 'store_fasteners',
  'قناة تثبيت يونيسترت (Strut Channel)': 'valves_fittings',
  'صامولة زنبركية للقناة (Channel Spring Nut)': 'valves_fittings',
  'زوايا ووصلات قناة التثبيت (Channel Brackets & Connectors)': 'valves_fittings',
  'ذراع حامل كابولي (Cantilever Bracket)': 'valves_fittings',
  'قاعدة تثبيت قناة/قضيب (Channel Base Plate / Rod Hanger)': 'valves_fittings',
  'علاقة مواسير مبطنة بالمطاط (Rubber-lined Pipe Clamp)': 'valves_fittings',
  'كلامب مواسير ثقيل للأحمال (Heavy-duty Pipe Clamp)': 'valves_fittings',
  'علاقة كلفيس/حلقة لمواسير الحريق والرشاشات (Clevis / Ring Hanger)': 'valves_fittings',
  'كلامب كمرة (Beam Clamp)': 'valves_fittings',
  'حامل انزلاقي/أسطواني للمواسير الساخنة (Pipe Slide / Roller Support)': 'valves_fittings',
  'كلبس ماسورة وسرج تثبيت (Pipe / Conduit Saddle Clip)': 'store_elec_access',
  'قناة انكر مصبوبة في الخرسانة (Cast-in Anchor Channel)': 'curtain_wall',
  'طوق حريق للمواسير البلاستيكية (Firestop Collar)': 'construction_chemicals',
  'شريط حريق منتفخ للمواسير (Intumescent Wrap Strip)': 'construction_chemicals',
  'لوح حريق مغطى للفتحات (Coated Firestop Board / Batt)': 'construction_chemicals',
  'مونة حريق للفتحات الكبيرة (Firestop Mortar)': 'construction_chemicals',
  'وسائد حريق (Firestop Pillows)': 'construction_chemicals',
  'كتل/سدادات حريق للكابلات (Firestop Blocks / Plugs)': 'construction_chemicals',
  'جلبة حريق لعبور الكابلات (Cable Transit Firestop Sleeve)': 'construction_chemicals',
  'رذاذ حريق مرن للفواصل وأعلى الجدران (Firestop Joint Spray)': 'construction_chemicals',
  'طلاء حريق للكابلات (Ablative Cable Coating)': 'construction_chemicals',
  'جلبة حريق تُصب في البلاطة (Cast-in Firestop Device)': 'construction_chemicals',
  'وسادات معجون حريق لعلب الكهرباء (Firestop Putty Pads)': 'construction_chemicals',
  'ملصق تعريف أنظمة الحريق (Firestop Identification Label)': 'construction_chemicals',
  'فوم مسدس احترافي (Gun-grade PU Foam)': 'store_adhesives',
  'منظف الفوم (PU Foam Cleaner)': 'store_adhesives',
  'لاصق تركيب بديل المسامير (Construction / Mounting Adhesive)': 'store_adhesives',
  'معجون إيبوكسي ثنائي للتصليح والتثبيت (2K Epoxy Putty / Adhesive)': 'store_adhesives',
  'بخاخ جلفنة باردة (زنك) (Zinc Spray / Cold Galvanizing)': 'store_paint',
  'بخاخ مزيل صدأ ومُفكّك براغي (Penetrating Oil / Rust Remover)': 'store_consumables',
  'مثبت براغي سائل (Threadlocker)': 'store_adhesives',
  'ريشة همر SDS-max للخرسانة (SDS-max Hammer Drill Bit)': 'store_bits',
  'ريشة همر مجوفة بشفط الغبار (Hollow Dust-extraction Drill Bit)': 'store_bits',
  'ريشة كور ماسية للخرسانة (Diamond Core Bit)': 'store_bits',
  'منشار كأس (Hole Saw)': 'store_bits',
  'ريشة بلاط وبورسلان ماسية (Diamond Tile Drill Bit)': 'store_bits',
  'ريشة دريل خرسانة وطوب عادية (Masonry Drill Bit)': 'store_bits',
  'ريشة خشب (Wood Drill Bit: Brad-point / Spade / Auger)': 'store_bits',
  'ريشة حديد مدرّجة (Step Drill Bit)': 'store_bits',
  'أزميل همر (مدبب/مسطح) (Hammer Chisel)': 'store_bits',
  'قرص ماسي لقص الخرسانة والحجر (Diamond Cutting Blade)': 'store_bits',
  'قرص كوب ماسي للتجليخ (Diamond Cup Wheel)': 'store_bits',
  'شفرة منشار ترددي (سيف) (Reciprocating Saw Blade)': 'store_bits',
  'شفرة منشار أركت (Jigsaw Blade)': 'store_bits',
  'لقم مفك وبوكسات تثبيت (Screwdriver Bits & Nut Setters)': 'store_bits',
  'ملدن خرسانة عالي الأداء (Superplasticizer PCE)': 'construction_chemicals',
  'ملدن عادي مخفض للمياه (Plasticizer / Water Reducer)': 'construction_chemicals',
  'مؤخر شك الخرسانة (Retarder)': 'construction_chemicals',
  'مسرع شك الخرسانة خالٍ من الكلوريد (Accelerator)': 'construction_chemicals',
  'مسرع خرسانة مرشوشة (Shotcrete Accelerator)': 'construction_chemicals',
  'مضاف عزل مائي للخرسانة (Waterproofing Admixture)': 'construction_chemicals',
  'مضاف بلوري للخرسانة (Crystalline Admixture)': 'construction_chemicals',
  'مثبط تآكل حديد التسليح (Corrosion Inhibitor)': 'construction_chemicals',
  'مضاف سحب الهواء (Air Entraining Agent)': 'construction_chemicals',
  'مضاف تقليل الانكماش (Shrinkage Reducing Admixture)': 'construction_chemicals',
  'مضاف لزوجة للخرسانة ذاتية الدمك (VMA)': 'construction_chemicals',
  'ميكروسيليكا (Silica Fume)': 'construction_chemicals',
  'ألياف بولي بروبيلين للخرسانة (PP Micro Fibres)': 'construction_chemicals',
  'ألياف ماكرو إنشائية (Macro Synthetic / Steel Fibres)': 'construction_chemicals',
  'مضاف جراوت حقن الكابلات (Grout Admixture / Expanding)': 'construction_chemicals',
  'مادة معالجة خرسانة شمعية (Wax-based Curing Compound)': 'construction_chemicals',
  'مادة معالجة راتنجية/أكريليك (Resin / Acrylic Curing Compound)': 'construction_chemicals',
  'مانع تبخر للخرسانة الطرية (Evaporation Retarder)': 'construction_chemicals',
  'مادة فك قوالب كيميائية (Chemical Release Agent)': 'formwork_steel',
  'مؤخر سطحي لكشف الركام (Surface Retarder)': 'construction_chemicals',
  'بوندنج SBR لاتكس (SBR Bonding Agent)': 'construction_chemicals',
  'بوندنج أكريليك (Acrylic Bonding Agent)': 'construction_chemicals',
  'بوندنج إيبوكسي لربط الخرسانة القديمة بالجديدة (Epoxy Bonding Agent)': 'construction_chemicals',
  'دهان حماية حديد التسليح قبل الإصلاح (Rebar Anti-corrosion Primer)': 'construction_chemicals',
  'جراوت أسمنتي انسيابي عالي المقاومة (Cementitious Precision Grout)': 'construction_chemicals',
  'جراوت إيبوكسي لقواعد المعدات (Epoxy Grout)': 'construction_chemicals',
  'جراوت سريع الشك لأغطية المناهل والإصلاح السريع (Rapid-set Grout)': 'construction_chemicals',
  'جراوت حقن كابلات الشد اللاحق (Post-tension Duct Grout)': 'construction_chemicals',
  'مثبت كيميائي إيبوكسي إنشائي (Epoxy Anchoring Resin)': 'construction_chemicals',
  'مثبت كيميائي بوليستر/فينيل إستر (Polyester / Vinylester Anchor)': 'construction_chemicals',
  'كبسولات تثبيت كيميائية (Resin Capsule Anchors)': 'construction_chemicals',
  'مونة إصلاح إنشائية عالية المقاومة R4 (Structural Repair Mortar)': 'construction_chemicals',
  'مونة إصلاح خفيفة للأسقف والجدران (Lightweight Repair Mortar)': 'construction_chemicals',
  'خرسانة دقيقة قابلة للصب (Micro-concrete)': 'construction_chemicals',
  'مونة إصلاح إيبوكسي (Epoxy Repair Mortar)': 'construction_chemicals',
  'معجون تسوية وتشطيب الخرسانة (Fairing / Skim Coat)': 'construction_chemicals',
  'لاصق إيبوكسي إنشائي (Structural Epoxy Adhesive)': 'construction_chemicals',
  'ألياف كربون لتقوية المنشآت (CFRP Strengthening)': 'construction_chemicals',
  'راتنج حقن شقوق إيبوكسي (Epoxy Crack Injection)': 'construction_chemicals',
  'راتنج حقن بولي يوريثان لإيقاف التسرب (PU Injection Resin)': 'construction_chemicals',
  'جل حقن أكريليك للستائر المائية (Acrylic Injection Gel)': 'construction_chemicals',
  'حشوات حقن (Injection Packers)': 'construction_chemicals',
  'عزل سيماني مرن ثنائي المكون (Flexible Cementitious Waterproofing)': 'waterproofing',
  'عزل سيماني صلب (Rigid Cementitious Slurry)': 'waterproofing',
  'عزل بلوري متغلغل (Crystalline Waterproofing Coating)': 'waterproofing',
  'عزل بولي يوريثان سائل للأسطح المكشوفة (PU Liquid Membrane)': 'waterproofing',
  'عزل أكريليك مائي مرن للأسطح (Acrylic Elastomeric Membrane)': 'waterproofing',
  'عزل بيتوميني مطاطي سائل (Bitumen-Rubber Emulsion)': 'waterproofing',
  'عزل بولي يوريا بالرش (Polyurea Spray Membrane)': 'waterproofing',
  'غشاء عزل ذاتي اللصق (Self-adhesive Membrane)': 'waterproofing',
  'غشاء HDPE مسبق التركيب للأساسات (Pre-applied HDPE Membrane)': 'waterproofing',
  'غشاء PVC للعزل (PVC Membrane)': 'waterproofing',
  'غشاء TPO للأسطح (TPO Membrane)': 'waterproofing',
  'لباد / غشاء بنتونايت (Bentonite Membrane)': 'waterproofing',
  'ووتر ستوب PVC للفواصل (PVC Waterstop)': 'waterproofing',
  'شريط منتفخ هيدروفيلي (Hydrophilic Swelling Strip)': 'waterproofing',
  'خرطوم حقن فواصل الصب (Injection Hose)': 'waterproofing',
  'شريط عزل فواصل مرن TPE/هايبالون (Joint Sealing Tape)': 'waterproofing',
  'شريط وزوايا عزل للحمامات والأسطح (Waterproofing Corner Tape)': 'waterproofing',
  'شبك/قماش تسليح للعزل السائل (Reinforcement Fleece)': 'waterproofing',
  'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)': 'tile_adhesive',
  'طارد ماء سيلاني شفاف (Silane / Siloxane Water Repellent)': 'construction_chemicals',
  'دهان حماية خرسانة مضاد للكربنة (Anti-carbonation Coating)': 'construction_chemicals',
  'دهان إيبوكسي معتمد لخزانات مياه الشرب (Potable Water Epoxy Coating)': 'construction_chemicals',
  'دهان إيبوكسي قطراني (Coal-tar / Bitumen Epoxy)': 'construction_chemicals',
  'بطانة مقاومة للكيماويات لغرف الصرف والمحطات (Chemical-resistant Lining)': 'construction_chemicals',
  'دهان بولي يوريثان أليفاتي نهائي (PU Topcoat)': 'construction_chemicals',
  'دهان منتفخ مقاوم للحريق للحديد (Intumescent Paint, Cellulosic)': 'construction_chemicals',
  'دهان منتفخ إيبوكسي (Epoxy Intumescent, Hydrocarbon)': 'construction_chemicals',
  'مونة رش أسمنتية مقاومة للحريق (Cementitious Fireproofing Spray)': 'construction_chemicals',
  'مقسي سطح خرسانة بودرة (Dry-shake Floor Hardener)': 'paint',
  'مقسي ومانع غبار سائل للخرسانة (Liquid Densifier / Lithium Silicate)': 'paint',
  'برايمر إيبوكسي للأرضيات (Epoxy Floor Primer)': 'paint',
  'أرضية بولي يوريثان أسمنتية (PU Cement / Urethane Cement Floor)': 'paint',
  'أرضية بولي يوريثان مرنة (Elastic PU Floor)': 'paint',
  'أرضية إيبوكسي مضادة للكهرباء الساكنة (ESD / Antistatic Epoxy)': 'paint',
  'مونة إيبوكسي للأرضيات الثقيلة (Epoxy Screed)': 'paint',
  'مايكروسمنت للأرضيات والجدران (Microcement)': 'special_floor',
  'رابط سكريد سريع الجفاف (Rapid-drying Screed Binder)': 'special_floor',
  'معجون تسوية جدران وأرضيات قبل البلاط (Levelling Mortar)': 'special_floor',
  'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)': 'tile_adhesive',
  'غراء بلاط محسن C2TE للبورسلين (Improved Tile Adhesive C2TE)': 'tile_adhesive',
  'غراء بلاط مرن S1/S2 للواجهات والمسابح (Deformable Tile Adhesive S1/S2)': 'tile_adhesive',
  'لاصق بلاط إيبوكسي (Epoxy Tile Adhesive)': 'tile_adhesive',
  'لاصق رخام وحجر طبيعي أبيض سريع (White Rapid Stone Adhesive)': 'tile_adhesive',
  'ترويبة أسمنتية محسنة CG2 (Polymer-modified Tile Grout)': 'tile_adhesive',
  'برايمر قبل الغراء والسكريد (Primer for Adhesives / Screeds)': 'tile_adhesive',
  'مادة حماية وتلميع حجر وترويبة (Stone & Grout Sealer)': 'tile_adhesive',
  'حبل فوم خلفي للفواصل (Backer Rod)': 'construction_chemicals',
  'حشوة فواصل شبه صلبة للأرضيات الصناعية (Semi-rigid Joint Filler)': 'construction_chemicals',
  'مانع تسرب فواصل مقاوم للوقود (Fuel-resistant Joint Sealant)': 'construction_chemicals',
  'برايمر مانع التسرب للفواصل (Sealant Primer)': 'construction_chemicals',
  'غطاء فواصل تمدد مرن (Expansion Joint System, elastomeric)': 'construction_chemicals',
  'مونة تثبيت وتعشيق سريعة (Rapid Anchoring Mortar / Hydraulic Cement)': 'construction_chemicals',
  'غراء تماس (كونتاكت)': 'store_adhesives',
  'غراء تماس مائي (بدون رائحة)': 'store_adhesives',
  'لاصق أرضيات فينيل وسجاد': 'special_floor',
  'غراء خشب أبيض (PVA)': 'store_adhesives',
  'غراء خشب بولي يوريثان (D4 مقاوم للماء)': 'store_adhesives',
  'غراء مواسير CPVC (مياه حارة)': 'plumbing_consumables',
  'منظف وبرايمر مواسير PVC قبل اللحام': 'plumbing_consumables',
  'لاصق إيبوكسي مكونين (أنبوبين/سرنجة)': 'store_adhesives',
  'معجون إيبوكسي للإصلاح (عصا)': 'store_adhesives',
  'غراء فوري (سوبر جلو)': 'store_adhesives',
  'لاصق مونتاج (تثبيت بدون مسامير)': 'store_adhesives',
  'لاصق هايبرد عالي الالتصاق (High Tack)': 'store_adhesives',
  'لاصق بولي يوريثان إنشائي للألواح والكلادينج': 'construction_chemicals',
  'فوم لاصق للألواح العازلة (XPS/EPS)': 'thermal_insulation',
  'لاصق ألواح الجبس والكرانيش (بودرة)': 'gypsum',
  'لاصق ستايروفوم وكرانيش بوليسترين': 'store_adhesives',
  'أصابع شمع غراء حراري (هوت ميلت)': 'store_adhesives',
  'لاصق رخام وحجر (بوليستر/إيبوكسي)': 'tile_adhesive',
  'غراء عزل الدكت (لاصق الصوف والفوم)': 'duct_insulation',
  'لاصق عزل الأنابيب المطاطي (أرمافلكس)': 'chilled_water_insulation',
  'مادة ربط SBR (لاتكس للمونة)': 'construction_chemicals',
  'مادة ربط PVA للياسة (بوندنج أبيض)': 'plaster',
  'مادة ربط إيبوكسي (خرسانة قديمة بجديدة)': 'construction_chemicals',
  'شريط ماسكنج ورقي (للدهان)': 'store_consumables',
  'شريط لاصق شفاف للتغليف (كرتون)': 'store_consumables',
  'شريط قماشي (داكت تيب)': 'store_consumables',
  'شريط لاصق وجهين رقيق (ورقي/شفاف)': 'store_consumables',
  'شريط لاصق وجهين فوم (للمرايا واللوحات)': 'store_consumables',
  'شريط VHB إنشائي للألواح والواجهات': 'curtain_wall',
  'شريط ألمنيوم (فويل تيب)': 'store_consumables',
  'شريط ألمنيوم مقوى FSK لعزل الدكت': 'duct_insulation',
  'شريط بيوتيل لاصق للتسربات (وجه ألمنيوم)': 'store_consumables',
  'شريط بيوتيل وجهين (للصاج والزجاج)': 'store_consumables',
  'شريط بيتوميني ذاتي اللصق (فلاشينج)': 'waterproofing',
  'شريط عازل للحريق والمياه للفواصل (FWBT)': 'construction_chemicals',
  'شريط مانع انزلاق للدرج': 'store_safety',
  'شريط فوم عازل للأبواب والنوافذ': 'store_consumables',
  'شريط تمدد لعزل فواصل النوافذ (Expanding Tape)': 'aluminum',
  'برايمر بيتوميني مائي (WB)': 'waterproofing',
  'برايمر بيتوميني سولفنت (كت باك MC/RC)': 'waterproofing',
  'دهان بيتوميني مستحلب (إيمولشن)': 'waterproofing',
  'مستحلب بيتوميني معدّل بالمطاط (RBE)': 'waterproofing',
  'دهان بيتوميني مقوى بالألياف (للأسطح)': 'waterproofing',
  'دهان بيتوميني سولفنت (للأساسات)': 'waterproofing',
  'طلاء عزل أسطح أكريليك مرن عاكس للحرارة': 'waterproofing',
  'عزل بولي يوريثان سائل للأسطح': 'waterproofing',
  'عزل سيماني مرن مكونين (2K)': 'waterproofing',
  'عزل مائي للحمامات تحت البلاط (جاهز)': 'tile_adhesive',
  'شريط زوايا مطاطي لعزل الحمامات': 'tile_adhesive',
  'غشاء بيتوميني APP لفة (4مم)': 'waterproofing',
  'غشاء بيتوميني SBS (مرن للبرودة)': 'waterproofing',
  'غشاء بيتوميني مكسو بالحبيبات (للأسطح المكشوفة)': 'waterproofing',
  'غشاء بيتوميني ذاتي اللصق (بدون لهب)': 'waterproofing',
  'لفائف عزل PVC/TPO للأسطح': 'waterproofing',
  'قماش بوليستر تسليح للعزل السائل': 'waterproofing',
  'عزل كريستالي للخرسانة (Crystalline)': 'waterproofing',
  'راتنج حقن بولي يوريثان للتسريبات': 'construction_chemicals',
  'عازل مائي شفاف للواجهات والحجر (سيلان/سيلوكسان)': 'paint',
  'لاصق بلاط أسمنتي عادي C1 (سيراميك)': 'tile_adhesive',
  'لاصق بلاط محسّن C2T (بورسلان)': 'tile_adhesive',
  'لاصق بلاط C2TE (بورسلان ومناطق رطبة)': 'tile_adhesive',
  'لاصق بلاط مرن C2TE S1 (فورمات كبير وخارجي)': 'tile_adhesive',
  'لاصق بلاط سريع التصلب C2F': 'tile_adhesive',
  'لاصق رخام وحجر أبيض (أسمنتي)': 'tile_adhesive',
  'لاصق بلاط المسابح': 'tile_adhesive',
  'لاصق بلاط جاهز (معجون سطل)': 'tile_adhesive',
  'ترويبة أسمنتية عادية CG1': 'tile_adhesive',
  'ترويبة محسّنة CG2WA (مقاومة للماء والاحتكاك)': 'tile_adhesive',
  'ترويبة المسابح': 'tile_adhesive',
  'عازل ترويبة شفاف (Grout Sealer)': 'tile_adhesive',
  'معجون جدران جاهز (أكريليك – سطل)': 'gypsum',
  'معجون أسمنتي بودرة للواجهات (سكيم كوت)': 'plaster',
  'جبس تلبيس بودرة (بلاستر)': 'plaster',
  'معجون حشو شقوق جاهز (أنبوب/علبة)': 'store_paint',
  'معجون خشب (حشوة خشب)': 'store_paint',
  'معجون بوليستر (معجون حديد/سيارات)': 'store_paint',
  'برايمر قبل اللاصق للأسطح الملساء (بلاط فوق بلاط)': 'tile_adhesive',
  'برايمر مانع التسرب للأسطح المسامية': 'construction_chemicals',
  'فوم منخفض التمدد للأبواب والنوافذ': 'store_adhesives',
  'مسدس فوم معدني': 'store_hand_tools',
  'منظف الفوم والمسدس (أسيتون بخاخ)': 'store_adhesives',
  'مزيل السيليكون والمواد اللاصقة': 'store_adhesives',
  'منظف أسطح قبل السيليكون (زجاج/ألمنيوم)': 'construction_chemicals',
  'مزيل بقايا الأسمنت والمونة عن البلاط': 'store_consumables',
  'منظف بقايا الترويبة الإيبوكسية': 'tile_adhesive',
  'أسيتون صناعي': 'store_paint',
  'مزيل دهانات (Paint Stripper)': 'store_paint',
  'بخاخ متعدد الأغراض (مزيل صدأ ومزلّق)': 'store_consumables',
  'صاج مدرفل على البارد (CR Sheet)': 'steel_sections',
  'صاج ملوّن مسبق الدهان (PPGI / PPGL)': 'steel_sections',
  'صاج مموّج ملوّن للأسقف والسواتر (Corrugated Sheet)': 'prefab_buildings',
  'لفائف صاج أسود حار (HR Coil)': 'steel_sections',
  'لفائف صاج مجلفن (GI Coil G90)': 'steel_sections',
  'لوح حديد سميك (Heavy Steel Plate ASTM A36 / Gr.50)': 'structural_steel',
  'حديد مربع مصمت (Square Bar)': 'steel_sections',
  'حديد مدوّر مصمت / شافت (Round Bar)': 'steel_sections',
  'ماسورة حديد بيضاوية (Oval Tube)': 'steel_sections',
  'جسور حديد يابانية JIS (H / I Beam)': 'structural_steel',
  'حديد تسليح مقصوص ومثني حسب المخطط (Cut & Bend)': 'rebar',
  'حديد تسليح مطلي إيبوكسي (Epoxy-coated Rebar)': 'rebar',
  'حديد تسليح أملس (Plain Round Rebar)': 'rebar',
  'سلك رباط حديد التسليح (Binding Wire)': 'rebar',
  'كرسي حمل حديد التسليح (Bar Chair)': 'rebar',
  'فاصل عجلة بلاستيكي للأعمدة والجدران (Wheel Spacer)': 'rebar',
  'عتبة خرسانية مسبقة الصب للفتحات (Precast Lintel)': 'precast',
  'عتبة بلوك خفيف (AAC Lintel)': 'blocks',
  'عتبة حديد مجلفنة للفتحات (Steel Lintel)': 'steel_sections',
  'بلوك خرساني خلوي خفيف (AAC Block / سيبوريكس)': 'blocks',
  'بلوك أسمنتي مصمت (Solid Concrete Block)': 'blocks',
  'طوب أحمر حامل للأحمال (Load-bearing Clay Brick)': 'blocks',
  'طوب أحمر لحماية المواسير (Pipe-protector Brick)': 'blocks',
  'هوردي بوليسترين للأسقف (EPS Hourdi Block)': 'blocks',
  'أسمنت مقاوم للكبريتات (SRC)': 'cement',
  'أسمنت أبيض (White Portland Cement)': 'cement',
  'أسمنت بوزولاني (PPC)': 'cement',
  'أسمنت لياسة وتشطيب (Masonry / Finishing Cement)': 'cement',
  'شبك سلّمي لتسليح البلوك (Block Ladder Mesh)': 'steel_mesh',
  'رباط جدار معدني مموّج (Wall Tie)': 'steel_mesh',
  'صامولة جناح للطوبار (Formwork Wing Nut)': 'formwork_steel',
  'صحن تثبيت قضيب الشد (Tie-rod Waler Plate)': 'formwork_steel',
  'ماسورة ومخروط PVC لقضيب الشد (Tie-rod Sleeve & Cone)': 'formwork_steel',
  'مانع تسرب لقضيب الشد للخزانات (Tie-rod Water Stopper)': 'formwork_steel',
  'قمطة طوبار سريعة (Rapid Clamp)': 'formwork_steel',
  'شطفة زوايا PVC للخرسانة (PVC Chamfer Strip)': 'formwork_steel',
  'لوح سقالة خشبي (Scaffold Plank)': 'scaffold_structure',
  'خشب أبيض لين للبناء والنجارة (White Wood / Spruce)': 'formwork_timber',
  'خشب أحمر سويدي (Redwood / Pine)': 'millwork',
  'بليود مغطّى بالفيلم للطوبار (Film-faced Plywood)': 'formwork_ply',
  'بليود مقشّر خشب طبيعي (Veneer Plywood)': 'millwork',
  'بليود مطلي بوليستر (Polyester Plywood)': 'millwork',
  'ألواح بلوك بورد (Blockboard)': 'millwork',
  'MDF مقاوم للرطوبة (MR MDF – أخضر)': 'millwork',
  'MDF مقاوم للحريق (FR MDF – أحمر)': 'millwork',
  'MDF مقشّر خشب طبيعي (Veneered MDF)': 'millwork',
  'لوح ميلامين خشب مضغوط (MFC / Melamine Chipboard)': 'millwork',
  'خشب مضغوط عادي (Chipboard / فونتكس)': 'millwork',
  'ألواح OSB (Oriented Strand Board)': 'millwork',
  'MDF مخدّد ميلامين للعرض (Slatwall / Grooved MDF)': 'millwork',
  'زاوية لياسة مجلفنة بشبك (Angle Bead)': 'plaster',
  'زاوية إيقاف اللياسة (Plaster Stop Bead)': 'plaster',
  'زاوية فاصل حركة للياسة (Control Joint Bead)': 'plaster',
  'زاوية بروز (أركيتريف) للياسة حول الفتحات (Architrave Bead)': 'plaster',
  'شبك فايبر جلاس لتسليح اللياسة (Fibreglass Plaster Mesh)': 'plaster',
  'شبك زاوية مجلفن لتقاطع البلوك والخرسانة (Corner / Strip Mesh)': 'plaster',
  'شعر سيزال لأعمال الجبس (Sisal Fibre)': 'gypsum',
  'طبقة رشّ أولية قبل اللياسة (Spatter Dash / Scratch Coat)': 'plaster',
  'فتحة صيانة للسقف المستعار (Ceiling Access Panel)': 'false_ceiling',
  'ألواح بوليسترين EPS (ستايروفوم أبيض)': 'thermal_insulation',
  'شرائح بوليسترين لحشو البلوك المعزول (Block Insulation Filler)': 'thermal_insulation',
  'لفائف فوم بولي إيثيلين عازل (PE Foam Roll)': 'thermal_insulation',
  'مزراب صاج للهناجر (Steel Gutter)': 'prefab_buildings',
  'غطاء قمة السقف للهناجر (Ridge Capping)': 'prefab_buildings',
  'صاج مقوّس للمظلات والهناجر (Curved Sheet)': 'prefab_buildings',
  'إكسسوارات أبواب الهناجر المنزلقة (Hangar Door Track & Rollers)': 'prefab_buildings',
  'صاج ألمنيوم مضلّع/منقوش (Aluminium Chequered Plate)': 'aluminum',
  'صاج ألمنيوم مزخرف ستوكو (Stucco Embossed Sheet)': 'aluminum',
  'مواسير صرف PP صامتة بحلقة مطاطية (PP Silent Push-fit)': 'silent_drainage',
  'مصيدة صرف P (P-Trap) uPVC': 'traps_drains',
  'محبس أرضي مجمّع (Collector Floor Gully)': 'traps_drains',
  'سدادة/كوع تفتيش وتنظيف (Cleanout / Access Fitting)': 'drainage_pipes',
  'غطاء تهوية للسطح (Roof Vent Cap)': 'storm_drainage',
  'وصلات صرف uPVC (واي/مخفّض/تي صحي/وصلة إصلاح)': 'drainage_pipes',
  'مواسير uPVC ضغط سكجول 80 (Sch 80)': 'water_supply',
  'محبس دفن PPR (Concealed Stop Valve)': 'valves_fittings',
  'خلاط دفن (Concealed Mixer Valve)': 'faucets_mixers',
  // 2026-11-12 lighting gaps: pinned so «نيون»/«لمبة» words don't pull them into the wrong specialty
  'جسم نيون ليد متكامل 60/120 سم (LED Batten)': 'indoor_lighting',
  'حامل لمبات نيون مزدوج T8 (بدون لمبات)': 'indoor_lighting',
  'إنارة خطية T5 للكرانيش وتحت الخزائن': 'indoor_lighting',
  'سبوت مغناطيسي على مسار 48 فولت (Magnetic Track)': 'indoor_lighting',
  'سبوت متحرك COB للأسقف الجبسية': 'indoor_lighting',
  'كشاف مستودعات خطي (Linear High Bay)': 'indoor_lighting',
  'بطارية طوارئ للكشاف (Emergency Kit)': 'indoor_lighting',
  'إنارة غرف نظيفة ومستشفيات (Cleanroom Panel)': 'indoor_lighting',
  'كشاف مضاد للانفجار (Explosion-proof)': 'indoor_lighting',
  'سبوت إنارة لوحات وجداريات (Picture Light)': 'decor_lighting',
  'إنارة بولارد للممرات (Bollard)': 'outdoor_lighting',
  'إنارة أرضية غاطسة (In-ground Uplight)': 'outdoor_lighting',
  'سبوت حدائق بوتد (Spike Light)': 'outdoor_lighting',
  'إنارة غسيل جدران وواجهات خطية (Wall Washer)': 'outdoor_lighting',
  'رأس إنارة شوارع LED (Street Light Head)': 'outdoor_lighting',
  'كشاف مظلات ومحطات وقود (Canopy Light)': 'outdoor_lighting',
  'خلية ضوئية لتشغيل الإنارة تلقائياً (Photocell)': 'outdoor_lighting',
  'إنارة زينة رمضان والأعياد (سلاسل وستائر)': 'outdoor_lighting',
  'إنارة عوائق الطيران للأبراج والمباني العالية (Aviation Light)': 'outdoor_lighting',
  'لمبة ليد عادية E27': 'store_lighting',
  'لمبة شمعة E14': 'store_lighting',
  'لمبة سبوت GU10 / MR16': 'store_lighting',
  'محول هالوجين وسبوت 12 فولت': 'store_lighting',
  'لمبة ليد قابلة للشحن (طوارئ)': 'store_lighting',
  'لمبة ليد بحساس حركة': 'store_lighting',
  'لمبة هالوجين R7s للكشافات': 'store_lighting',
  'قاعدة لمبة (دواية) E27 / E14': 'store_lighting',
  'لمبة نيون فلورسنت T8 تقليدية': 'store_lighting',
  'ستارتر وبلاست لمبة النيون': 'store_lighting',
  'نيون ليد 120 سم (جسم مع اللمبة)': 'store_lighting',
  'وصلات PPR بسن نحاسي داخلي/خارجي (PPR Brass Adaptor)': 'valves_fittings',
  'قوس تعدية PPR (Crossover)': 'valves_fittings',
  'سدادة اختبار ضغط PPR (Test Plug)': 'plumbing_consumables',
  'مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)': 'valves_fittings',
  'مصفاة Y نحاس (Y-Strainer)': 'valves_fittings',
  'صمام قدم للمضخة (Foot Valve)': 'pumps',
  'محبس زاوية مزدوج (Double Angle Valve)': 'store_valves',
  'صمام أمان السخان (Water Heater Safety Valve)': 'tanks_heaters',
  'قطع غيار السخان (عنصر تسخين/ثرموستات/جلدة)': 'tanks_heaters',
  'سخان مياه كهربائي فوري (Instant Electric Heater)': 'tanks_heaters',
  'مروحة تبريد خزان بالطاقة الشمسية (Solar Tank Cooler)': 'tanks_heaters',
  'غطاء خزان أرضي/منهل ألمنيوم أو فايبر (Tank & Manhole Cover)': 'tanks_heaters',
  'زر طرد للخزان المخفي (Flush Plate)': 'sanitary_ware',
  'خزان طرد ظاهر (Exposed Cistern)': 'sanitary_ware',
  'غطاء مقعد مرحاض (Toilet Seat Cover)': 'sanitary_ware',
  'حلقة شمع/مطاط لتركيب المرحاض (Wax / Rubber Ring)': 'plumbing_consumables',
  'مصرف مغسلة أوتوماتيكي (Pop-up / Click-clack Waste)': 'traps_drains',
  'مصافي ألمنيوم (أرضية/ركنية/دش/سطح)': 'storm_drainage',
  'مزلّق تركيب مواسير الصرف (Pipe Lubricant)': 'plumbing_consumables',
  'ساعة ضغط ماء ومضخة اختبار ضغط (Pressure Gauge / Test Pump)': 'store_hand_tools',
  'خرطوم حديقة مع بكرة (Garden Hose & Reel)': 'store_hoses',
  'مسدس رشّ ماء للخرطوم (Hose Nozzle Gun)': 'store_hoses',
  'خرطوم هواء وغاز ضغط عالٍ (Air & Gas Hose)': 'store_hoses',
  'خرطوم مسطّح للنزح (Lay-flat Hose)': 'store_hoses',
  'سلك مفرد نحاسي معزول (THHN / NYA)': 'lv_cables',
  'كابل مرن متعدد الأقطاب (Flexible Cord)': 'lv_cables',
  'كابل ستلايت محوري (RG6 Coaxial)': 'data_network',
  'سلك هاتف (Telephone Wire)': 'data_network',
  'ماسورة كهرباء مرنة مموّجة (Corrugated Flexible Conduit)': 'conduits',
  'ماسورة EMT مرنة ووصلاتها (Flexible Metal Conduit & EMT Connectors)': 'conduits',
  'قاطع تفاضلي مع حماية زيادة الحمل (RCBO)': 'breakers',
  'صندوق عداد وقاطع رئيسي خارجي (Outdoor Meter / Busbar Chamber)': 'panels',
  'مفتاح فندقي بالبطاقة (Key-card Switch)': 'wiring_devices',
  'مفتاح ستارة كهربائية (Curtain / Blind Switch)': 'wiring_devices',
  'وحدة تحكم الطبّاخ 45A (Cooker Control Unit)': 'wiring_devices',
  'مخرج موصول بفيوز (Fused Connection Unit / Spur)': 'wiring_devices',
  'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)': 'switches',
  'غطاء مقاوم للماء للأفياش (Weatherproof Cover IP55)': 'switches',
  'بكرة كيبل تمديد معدنية (Cable Reel)': 'store_elec_access',
  'ترمنال بلوك وفيوز (Terminal Block & Fuses)': 'store_elec_consumables',
  'محوّل جهد 110/220 (Auto Transformer)': 'store_elec_access',
  'غرفة تفتيش تأريض (Earth Pit) وكلامب': 'earthing',
  'لمبة أنبوبية ليد T8 (LED Tube)': 'store_lighting',
  'كشاف ليد مقاوم للماء والغبار (Vapour-proof / Batten)': 'indoor_lighting',
  'ماكينة ثني حديد التسليح (Rebar Bender)': 'concrete_equip',
  'ماكينة قص حديد التسليح (Rebar Cutter)': 'concrete_equip',
  'منفاخ هواء كهربائي (Air Blower)': 'store_power_tools',
  'مسدس هواء ساخن (Heat Gun)': 'store_power_tools',
  'مسحج ورواتر خشب كهربائي (Planer / Router)': 'store_power_tools',
  'منشار زاوية ألمنيوم وخشب (Mitre Saw)': 'store_power_tools',
  'صنفرة كهربائية مدارية (Orbital Sander)': 'store_power_tools',
  'مفتاح صدمة شحن (Cordless Impact Wrench)': 'store_power_tools',
  'ماكينة قص حديد سنسية (Cut-off Machine / Chop Saw)': 'store_power_tools',
  'منشار رخام كهربائي (Marble Cutter)': 'store_power_tools',
  'متر قياس ليزر (Laser Distance Meter)': 'store_hand_tools',
  'مسدس برشام يدوي ومسامير برشام (Hand Riveter & Rivets)': 'store_hand_tools',
  'مقص صاج (Aviation Snips)': 'store_hand_tools',
  'مفتاح مواسير وقطّاعة مواسير (Pipe Wrench & Cutter)': 'store_hand_tools',
  'دايز تسنين المواسير (Pipe Threading Die)': 'store_hand_tools',
  'مفاتيح ربط (بلدي/شق/ألن) (Spanners & Allen Keys)': 'store_hand_tools',
  'كماشة حدّاد تسليح (Concretor\'s Nippers)': 'store_hand_tools',
  'عتلة نجّار (Claw / Wrecking Bar)': 'store_hand_tools',
  'كريك (مجرفة) ومكنسة شارع (Shovel & Street Broom)': 'store_hand_tools',
  'سطل مطاطي للمونة (Rubber Mortar Bucket)': 'store_hand_tools',
  'منشار يدوي خشب وقوس منشار حديد (Hand Saw & Hacksaw)': 'store_hand_tools',
  'زاوية نجار وقدمة قياس (Square & Caliper)': 'store_hand_tools',
  'كتر وشفرات (Utility Knife & Blades)': 'store_hand_tools',
  'طقم أدوات معزولة للكهربائي 1000V (Insulated Tool Set)': 'store_hand_tools',
  'قلم قص بلاط ومسطرة قص رخام (Tile Scribe & Cutting Rule)': 'store_hand_tools',
  'مشمّع (طربال) بولي إيثيلين (PE Tarpaulin)': 'store_consumables',
  'خيش لمعالجة الخرسانة (Hessian Cloth)': 'construction_chemicals',
  'فيلم تغليف مطاطي (Stretch Film)': 'store_consumables',
  'شريط ربط بلاستيكي/حديدي وكلبسات (Strapping Band)': 'store_consumables',
  'ألواح حماية الأرضيات أثناء التشطيب (Floor Protection Board)': 'store_consumables',
  'حامي إطار الباب وزوايا الدرج المؤقت (Door Jamb & Stair Protector)': 'store_consumables',
  'برميل وسلسلة وحاجز بلاستيكي مروري (Traffic Drum, Chain & Barrier Mesh)': 'store_safety',
  'جنزير (سلسلة) حديد مجلفن (Galvanized Chain)': 'store_consumables',
  'برغي سداسي مجلفن DIN 933 (Hex Bolt)': 'store_fasteners',
  'برغي ذاتي التسنين برأس مسطّح مع خابور (Self-tapping Screw + Plug)': 'store_fasteners',
  'مسامير فولاذ للخرسانة (Hardened Concrete Nails)': 'store_fasteners',
  'خابور مسمار بلاستيك سريع (Nail-in / Hammer-drive Plug)': 'store_fasteners',
  'برايمر زنك فوسفات للحديد (Zinc Phosphate Primer)': 'paint',
  'بخاخ دهان تخطيط وتعليم المواقع (Marking Spray Paint)': 'store_paint',
}

// Speed (mobile perf report 2026-11-08: ~0.9 ms a call on Hermes, called per row per render, and
// getSectionGroups re-ran it over ~1,200 products): the keywords are normalized once per sector and
// results are cached by sector|name. Both caches are dropped whenever the taxonomy or the product
// list changes (hydrateTaxonomy / hydrateApprovedMaterials bump taxonomyVersion()).
let TAX_VERSION = 0
export function taxonomyVersion(): number { return TAX_VERSION }
export function invalidateTaxonomyCaches(): void { TAX_VERSION++; NORM_KW.clear(); DETECT_CACHE.clear() }
const NORM_KW = new Map<string, [string, string[]][]>()
const DETECT_CACHE = new Map<string, string | null>()
function normalizedKeywords(sector: Sector): [string, string[]][] {
  let list = NORM_KW.get(sector)
  if (!list) {
    // الحارس length>0 ضروري: norm.includes('') يُرجع true دائماً
    list = Object.entries(SUB_CATEGORIES[sector] || {}).map(([key, sub]) =>
      [key, (sub.keywords || []).map(kw => normalizeText(kw)).filter(k => k.length > 0)] as [string, string[]])
    NORM_KW.set(sector, list)
  }
  return list
}

export function detectSubCategory(productName: string, sector: Sector): string | null {
  const subs = SUB_CATEGORIES[sector]
  if (!subs) return null
  const ck = sector + '|' + (productName || '')
  const hit = DETECT_CACHE.get(ck)
  if (hit !== undefined) return hit
  let bestMatch: string | null = null
  const fixed = PRODUCT_SUB[(productName || '').trim()]
  if (fixed && subs[fixed]) bestMatch = fixed
  else {
    const norm = normalizeText(productName)
    let maxScore = 0
    for (const [key, kws] of normalizedKeywords(sector)) {
      let score = 0
      for (const nkw of kws) if (norm.includes(nkw)) score++
      if (score > maxScore) { maxScore = score; bestMatch = key }
    }
  }
  if (DETECT_CACHE.size > 20000) DETECT_CACHE.clear() // free-text names (BOQ, search) must not grow it forever
  DETECT_CACHE.set(ck, bestMatch)
  return bestMatch
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 3: «ترطيب» شجرة التخصصات في الذاكرة من قاعدة البيانات.
// يُحدّث SUB_CATEGORIES (الأسماء/الأيقونة/المجموعة/الكلمات) لكل صف، ويضيف أي
// تخصص جديد أضافه الأدمن — فتظهر تعديلات الأدمن في قوائم الواجهة دون نشر.
// يُستدعى من TaxonomyProvider على المتصفح (يطفّر كائناً مفرداً على مستوى الموديول).
export function hydrateTaxonomy(rows: any[]): void {
  if (!Array.isArray(rows)) return
  invalidateTaxonomyCaches()
  for (const r of rows) {
    if (!r || !r.sector || !r.sub_key) continue
    if (r.is_active === false) continue
    const sec = r.sector as Sector
    if (!SUB_CATEGORIES[sec]) (SUB_CATEGORIES as any)[sec] = {}
    const ex = SUB_CATEGORIES[sec][r.sub_key] || { ar: '', en: '', ur: '', icon: '📦', group: '_other', keywords: [] }
    SUB_CATEGORIES[sec][r.sub_key] = {
      ar: r.name_ar ?? ex.ar,
      en: r.name_en ?? ex.en,
      ur: r.name_ur ?? ex.ur,
      icon: r.icon ?? ex.icon,
      group: r.grp ?? ex.group,
      keywords: Array.isArray(r.keywords) ? r.keywords : ex.keywords,
    }
  }
}

/** Materials the admin approved from «طلب إضافة مادة» (table `materials`): added to the in-memory
 *  catalog with their specialty, so they show in the pickers and the search without a redeploy. */
export function hydrateApprovedMaterials(rows: any[]): number {
  if (!Array.isArray(rows)) return 0
  invalidateTaxonomyCaches()
  let added = 0
  for (const r of rows) {
    const name = String(r?.name || '').trim()
    const sec = r?.sector as Sector
    if (!name || !SECTOR_PRODUCTS[sec]) continue
    if (r.sub_category && SUB_CATEGORIES[sec]?.[r.sub_category] && !PRODUCT_SUB[name]) PRODUCT_SUB[name] = r.sub_category
    if (!SECTOR_PRODUCTS[sec].includes(name)) { SECTOR_PRODUCTS[sec].push(name); added++ }
  }
  return added
}

// وحدة القياس الافتراضية لكل تخصص فرعي — تُملأ تلقائياً عند اختيار المادة
const SUB_UNITS: Record<string, string> = {
  // مدني
  readymix: 'م³', cement: 'كيس', blocks: 'حبة', precast: 'عدد',
  rebar: 'طن', structural_steel: 'طن', steel_mesh: 'عدد',
  waterproofing: 'م²', piling: 'م.ط', construction_chemicals: 'عدد',
  drainage: 'م.ط', aggregates: 'م³', earthworks: 'م³',
  formwork_ply: 'لوح', formwork_timber: 'عدد', formwork_steel: 'عدد',
  scaffold_structure: 'عدد', scaffold_jacks: 'عدد', shoring_props: 'عدد',
  turf: 'م²', irrigation: 'عدد', fountains: 'عدد', hardscape: 'م²', planters: 'عدد',
  // معماري
  tiles: 'م²', marble: 'م²', wood_floor: 'م²', tile_adhesive: 'كيس', special_floor: 'م²',
  paint: 'جالون', grc_facade: 'م²', gypsum: 'م²', false_ceiling: 'م²',
  custom_furniture: 'عدد', curtains: 'م²', decor_lighting: 'عدد',
  prefab_buildings: 'م²', shades_screens: 'م²', pools: 'عدد', kitchen_appliances: 'عدد', office_furniture: 'عدد', solar_pv: 'عدد', smart_home: 'عدد', central_gas: 'عدد',
  aluminum: 'م²', wood_doors: 'عدد', fire_doors: 'عدد', auto_doors: 'عدد',
  curtain_wall: 'م²', rainscreen: 'م²', stone_facade: 'م²', louvers: 'م²',
  millwork: 'م.ط', fitted_furniture: 'عدد', cubicles: 'عدد',
  acoustic_panels: 'م²', acoustic_timber: 'م²', thermal_insulation: 'م²',
  metal_features: 'م.ط', vertical_transport: 'عدد', sanitary_ware: 'عدد', bath_accessories: 'عدد',
  // كهرباء
  lv_cables: 'م.ط', mv_cables: 'م.ط', conduits: 'م.ط',
  panels: 'عدد', breakers: 'عدد', switches: 'عدد', transformers: 'عدد',
  indoor_lighting: 'عدد', outdoor_lighting: 'عدد', earthing: 'عدد',
  cctv: 'عدد', fire_alarm: 'عدد', data_network: 'عدد', sound_systems: 'عدد',
  led_screens: 'م²', access_control: 'عدد',
  // ميكانيك
  ac_units: 'عدد', ductwork: 'م²', duct_insulation: 'م²', hvac_dampers: 'عدد',
  ventilation_fans: 'عدد', flexible_ducts: 'م.ط',
  water_supply: 'م.ط', drainage_pipes: 'م.ط', silent_drainage: 'م.ط', storm_drainage: 'م.ط',
  water_treatment: 'عدد', pumps: 'عدد', tanks_heaters: 'عدد',
  faucets_mixers: 'عدد', valves_fittings: 'عدد', copper_fittings: 'عدد',
  traps_drains: 'عدد', flex_hoses: 'عدد', plumbing_consumables: 'عدد',
  shower_accessories: 'عدد', floats_tanks: 'عدد',
  fire_fighting: 'عدد', fire_pumps: 'عدد', fire_cabinets: 'عدد', fire_valves: 'عدد', fire_connections: 'عدد',
  chilled_water_insulation: 'م.ط', cladding_jacketing: 'م²',
  // آليات ومعدات (تأجير باليوم غالباً)
  heavy_machinery: 'يوم', cranes: 'يوم', trucks: 'يوم', concrete_equip: 'يوم',
  compaction: 'يوم', generators_equip: 'يوم', pumps_equip: 'يوم', scaffolding_equip: 'عدد',
  // محل توريد
  store_faucets: 'عدد', store_valves: 'عدد', store_hoses: 'عدد',
  store_wires: 'م.ط', store_switches: 'عدد', store_lighting: 'عدد', store_elec_access: 'عدد',
  store_hand_tools: 'عدد', store_power_tools: 'عدد', store_bits: 'عدد',
  store_fasteners: 'عدد', store_safety: 'عدد', store_consumables: 'عدد',
  store_paint: 'عدد', store_adhesives: 'عدد',
  // 2026-11-02 review: specialties that had no default unit (126 catalog items showed a blank unit)
  steel_sections: 'طول (6م)', drywall_metal: 'حبة (3م)', wiring_devices: 'عدد', led_strips: 'م.ط',
  store_elec_consumables: 'علبة', welding_cutting: 'عدد', pressure_wash: 'عدد', fencing: 'لفة',
  store_hinges: 'عدد', store_locks: 'عدد', store_closers: 'عدد', store_handles: 'عدد', roadbase: 'م³', plaster: 'كيس',
  playground: 'عدد', pressure_pipes: 'م.ط', chilled_water_pipes: 'م.ط', fuel_systems: 'عدد', concrete_finishing: 'يوم', site_services: 'يوم',
}


// Units that make sense for each specialty (owner 2026-10-19: cement must not offer «طقم/يوم/نقلة»).
// The specialty's default (SUB_UNITS) is always first; a product's own spec units come before these.
const PIPE = ['م.ط', 'عدد'], PIECE = ['عدد', 'طقم'], RENT = ['يوم', 'ساعة', 'شهر']
const SUB_UNIT_OPTIONS: Record<string, string[]> = {
  // civil
  readymix: ['م³', 'نقلة'], cement: ['كيس', 'طن'], blocks: ['حبة', 'طبلية', 'ألف حبة', 'م²', 'م³'], precast: ['عدد', 'م.ط', 'م²'],
  rebar: ['طن', 'سيخ', 'كغ'], structural_steel: ['طن', 'عدد', 'م.ط', 'كغ'], steel_mesh: ['عدد', 'لوح', 'م²', 'لفة'],
  waterproofing: ['م²', 'لفة', 'سطل', 'برميل', 'كيس'], piling: ['م.ط', 'عدد'],
  construction_chemicals: ['عدد', 'كيس', 'سطل', 'لتر', 'جالون', 'برميل', 'كغ', 'كرتون'],
  drainage: PIPE, aggregates: ['م³', 'نقلة', 'طن'], earthworks: ['م³', 'نقلة', 'يوم'],
  formwork_ply: ['لوح', 'عدد'], formwork_timber: ['عدد', 'م.ط', 'م³'], formwork_steel: ['عدد', 'م²', 'يوم', 'شهر'],
  scaffold_structure: ['عدد', 'يوم', 'شهر'], scaffold_jacks: ['عدد', 'يوم', 'شهر'], shoring_props: ['عدد', 'يوم', 'شهر'],
  turf: ['م²', 'لفة'], irrigation: ['عدد', 'م.ط', 'لفة'], fountains: ['عدد'], hardscape: ['م²', 'م.ط', 'عدد'], planters: ['عدد'],
  // architectural
  tiles: ['م²', 'كرتون'], marble: ['م²', 'م.ط', 'لوح'], wood_floor: ['م²', 'كرتون'], tile_adhesive: ['كيس', 'سطل', 'كغ'],
  special_floor: ['م²', 'كيس', 'طقم'], paint: ['جالون', 'سطل', 'لتر', 'طقم'], grc_facade: ['م²', 'عدد'],
  gypsum: ['م²', 'لوح', 'كيس', 'عدد'], false_ceiling: ['م²', 'لوح', 'عدد'], custom_furniture: PIECE,
  curtains: ['م²', 'م.ط', 'عدد'], decor_lighting: PIECE, prefab_buildings: ['م²', 'عدد', 'لوح'], shades_screens: ['م²', 'عدد'],
  pools: ['عدد', 'م²'], kitchen_appliances: PIECE, office_furniture: PIECE, solar_pv: PIECE, smart_home: PIECE,
  central_gas: ['عدد', 'م.ط'], aluminum: ['م²', 'عدد', 'م.ط'], wood_doors: ['عدد'], fire_doors: ['عدد'], auto_doors: ['عدد'],
  curtain_wall: ['م²'], rainscreen: ['م²', 'لوح'], stone_facade: ['م²'], louvers: ['م²', 'عدد'],
  millwork: ['م.ط', 'لوح', 'عدد', 'م²'], fitted_furniture: ['عدد', 'م.ط'], cubicles: PIECE,
  acoustic_panels: ['م²', 'لوح'], acoustic_timber: ['م²', 'لوح'], thermal_insulation: ['م²', 'لوح', 'لفة'],
  metal_features: ['م.ط', 'م²', 'عدد'], vertical_transport: ['عدد'], sanitary_ware: PIECE, bath_accessories: PIECE,
  // electrical
  lv_cables: ['م.ط', 'لفة'], mv_cables: ['م.ط', 'لفة'], conduits: ['م.ط', 'عدد'],
  panels: ['عدد'], breakers: ['عدد'], switches: ['عدد', 'كرتون'], transformers: ['عدد'],
  indoor_lighting: ['عدد', 'كرتون'], outdoor_lighting: ['عدد'], earthing: ['عدد', 'م.ط', 'طقم'],
  cctv: ['عدد', 'طقم', 'م.ط'], fire_alarm: ['عدد', 'طقم', 'م.ط'], data_network: ['عدد', 'م.ط', 'لفة'],
  sound_systems: PIECE, led_screens: ['م²', 'عدد'], access_control: PIECE,
  // mechanical
  ac_units: ['عدد'], ductwork: ['م²', 'م.ط', 'كغ'], duct_insulation: ['م²', 'لفة'], hvac_dampers: ['عدد'],
  ventilation_fans: ['عدد'], flexible_ducts: ['م.ط', 'لفة'],
  water_supply: PIPE, drainage_pipes: PIPE, silent_drainage: PIPE, storm_drainage: PIPE,
  water_treatment: PIECE, pumps: ['عدد'], tanks_heaters: ['عدد'],
  faucets_mixers: PIECE, valves_fittings: PIECE, copper_fittings: ['عدد', 'م.ط'], traps_drains: ['عدد'],
  flex_hoses: ['عدد'], plumbing_consumables: ['عدد', 'لفة', 'علبة'], shower_accessories: PIECE, floats_tanks: ['عدد'],
  fire_fighting: ['عدد', 'م.ط'], fire_pumps: ['عدد'], fire_cabinets: ['عدد'], fire_valves: ['عدد'], fire_connections: ['عدد'],
  chilled_water_insulation: ['م.ط', 'لفة'], cladding_jacketing: ['م²', 'لفة'],
  // equipment (mostly rented)
  heavy_machinery: RENT, cranes: RENT, trucks: ['نقلة', 'يوم', 'ساعة'], concrete_equip: ['يوم', 'ساعة', 'م³'],
  compaction: RENT, generators_equip: RENT, pumps_equip: RENT, scaffolding_equip: ['عدد', 'يوم', 'شهر'],
  // shops
  store_faucets: PIECE, store_valves: PIECE, store_hoses: ['عدد', 'لفة', 'م.ط'],
  store_wires: ['لفة', 'م.ط'], store_switches: ['عدد', 'كرتون'], store_lighting: ['عدد', 'كرتون'], store_elec_access: ['عدد', 'كرتون'],
  store_hand_tools: PIECE, store_power_tools: PIECE, store_bits: PIECE,
  store_fasteners: ['علبة', 'عدد', 'كغ', 'كرتون'], store_safety: ['عدد', 'طقم', 'كرتون'], store_consumables: ['عدد', 'لفة', 'كرتون'],
  store_paint: ['جالون', 'لتر', 'سطل', 'عدد'], store_adhesives: ['عدد', 'علبة', 'كرتون'],
  // 2026-11-02 review
  steel_sections: ['طول (6م)', 'طن'], drywall_metal: ['حبة (3م)', 'حزمة'], wiring_devices: ['عدد', 'كرتون'],
  led_strips: ['م.ط', 'لفة', 'عدد'], store_elec_consumables: ['علبة', 'لفة', 'عدد'], welding_cutting: ['عدد', 'طقم'],
  pressure_wash: ['عدد'], fencing: ['لفة', 'م.ط', 'عدد'], store_hinges: ['عدد', 'زوج', 'طقم'],
  store_locks: PIECE, store_closers: PIECE, store_handles: PIECE, roadbase: ['م³', 'نقلة', 'طن'], plaster: ['كيس', 'سطل', 'م²'],
  playground: PIECE, pressure_pipes: PIPE, chilled_water_pipes: PIPE, fuel_systems: ['عدد', 'م.ط'],
  concrete_finishing: ['يوم', 'شهر', 'عدد'], site_services: ['يوم', 'شهر', 'عدد'],
}

// One spelling per unit (catalog review 2026-11-02): older spec lists spell some units long-hand
// («م² (متر مربع)», «متر طولي», «رول», «أنبوب (خرطوش 280–300 مل)»). Applied wherever a unit is
// offered or pre-filled; units already stored on requests keep their text. Kilograms stay «كغ»,
// the spelling the order-text/BOQ readers (src/lib/ai/units.ts, src/lib/boqParse.ts) produce.
const UNIT_SPELLING: Record<string, string> = {
  'م² (متر مربع)': 'م²', 'متر مربع': 'م²', 'متر مكعب (م³)': 'م³', 'م³ (متر مكعب)': 'م³', 'متر مكعب': 'م³',
  'متر طولي': 'م.ط', 'كيلو': 'كغ', 'كجم': 'كغ', 'كيلوغرام': 'كغ', 'رول': 'لفة', 'خرطوشة': 'خرطوش', 'بالألف حبة': 'ألف حبة',
}
export function normalizeUnitSpelling(unit: string): string {
  const t = (unit || '').trim()
  if (UNIT_SPELLING[t]) return UNIT_SPELLING[t]
  if (/^أنبوب \(خرطوش/.test(t)) return 'خرطوش'
  if (/^رول\s/.test(t)) return t.replace(/^رول/, 'لفة')
  if (/^متر طولي\s/.test(t)) return t.replace(/^متر طولي/, 'م.ط')
  return t
}

// Product-level order units (catalog review 2026-11-02): consulted FIRST by getDefaultUnit,
// unitOptionsFor and unitChoicesFor, for products whose specialty unit (or old spec list) is wrong for
// them. Keyed by the current catalog name; an old (renamed) name is looked up through catalogName().
export const PRODUCT_UNIT: Record<string, string[]> = {
  // building
  'فواصل تسليح (بسكوت خرساني)': ['كيس', 'ألف حبة'],
  'كرسي حمل حديد التسليح (Bar Chair)': ['كيس', 'عدد'],
  'فاصل عجلة بلاستيكي للأعمدة والجدران (Wheel Spacer)': ['كيس', 'عدد'],
  'غرف جاهزة (كرفانات)': ['عدد'],
  'صاج أسود ألواح (صاج حار هوت رولد)': ['لوح', 'طن'],
  'صاج مضلع (شكمة / تير دروب)': ['لوح', 'طن'],
  'صاج مجلفن (GI جلفنة ساخنة)': ['لوح', 'طن'],
  'صاج ستانلس ستيل': ['لوح', 'طن'],
  'مواسير ستانلس ستيل': ['طول (6م)', 'م.ط'],
  'جريتنج حديد ملحوم (شبك أرضيات)': ['م²', 'لوح'],
  'عزل بولي يوريا بالرش (Polyurea Spray Membrane)': ['طقم', 'م²'],
  'بطانة خزانات سائلة (Tank Lining)': ['طقم'],
  'مبيد النمل الأبيض (معالجة التربة)': ['جالون', 'لتر'],
  'لاصق بلوك (مونة رقيقة)': ['كيس'],
  'حشوة فواصل التمدد (فلر بورد)': ['لوح'],
  'ألياف ماكرو صناعية (Macro Synthetic Fibres)': ['كيس', 'كغ'],
  'ألياف حديدية (Steel Fibres)': ['كيس', 'كغ'],
  'برغي تمدد (رول بلت)': ['علبة', 'حبة'],
  'وردات (حلقات معدنية)': ['كغ', 'علبة'],
  'براغي جبس بورد (دراي وول)': ['علبة'],
  'خوابير بلاستيك': ['علبة'],
  // finishing
  'زوايا وبروفايلات البلاط': ['حبة', 'م.ط'],
  'ترويبة إيبوكسي': ['طقم'],
  'معجون جبس تلبيس الفواصل (Joint Compound)': ['سطل', 'كيس'],
  'وزرة فينيل (Vinyl Skirting)': ['م.ط'],
  'كرانيش جبس وبولي يوريثان': ['م.ط'],
  'شريط تسليح الفواصل (Jointing Tape)': ['لفة'],
  'شريط عازل تحت القوائم (Acoustic Isolation Strip)': ['لفة'],
  'معلاق سقف قابل للضبط (Ceiling Hanger)': ['حبة', 'علبة'],
  'وصلة تعشيق قوائم (Stud Connector / Splice)': ['حبة', 'علبة'],
  'معجون جدران بودرة': ['كيس'],
  'دهانات ديكورية (مخمل/رخامي)': ['جالون', 'سطل'],
  'دهان أسقف مكشوفة (للخرسانة والمعدن)': ['جالون'],
  'دهان داخلي أكريليك': ['جالون'],
  'تنر': ['جالون', 'لتر'],
  'غراء فوري (سوبر جلو)': ['علبة', 'حبة'],
  'لاصق هايبرد عالي الالتصاق (High Tack)': ['خرطوش'],
  'لاصق ستايروفوم وكرانيش بوليسترين': ['علبة'],
  'فوم منخفض التمدد للأبواب والنوافذ': ['علبة'],
  'ألواح فورمايكا HPL وأكريليك': ['لوح'],
  'خشب ماسيف للنجارة (زان/بلوط)': ['م³'],
  'قشرة خشب طبيعي': ['م²'],
  'قواطع حمامات HPL': ['عدد'],
  'كبائن دورات مياه Toilet Cubicles': ['عدد'],
  'لوحات إرشادية Signage': ['عدد'],
  'مجاري وحوامل الستائر': ['م.ط'],
  'حماية حديد للنوافذ': ['م²'],
  'مشربيات': ['م²'],
  'قطاعات ألمنيوم خام': ['طول (6م)', 'كغ'],
  'ألواح ألمنيوم خام': ['لوح', 'كغ'],
  // electrical
  'أقطاب تأريض Earth Rod': ['حبة'],
  'كابل بيانات CAT6': ['لفة', 'م.ط'],
  'كابل ألياف بصرية': ['م.ط'],
  'شاشة عرض إعلانية 55 بوصة': ['عدد'],
  'هياكل تثبيت الألواح الشمسية': ['طقم'],
  'كابلات وموصلات طاقة شمسية': ['م.ط', 'لفة'],
  'سلك سحب أسلاك (فيش تيب)': ['حبة'],
  'كابل تمديد': ['عدد'],
  'محول (درايفر) ليد': ['عدد'],
  'كنترول RGB لشريط الليد': ['عدد'],
  'موصلات شريط ليد': ['عدد', 'علبة'],
  'شريط عزل كهربائي PVC': ['لفة', 'علبة'],
  'شريط تلوين وترميز الكابلات': ['لفة'],
  'أربطة كابلات نايلون (تايات)': ['كيس', 'علبة'],
  'جلبة كابل (كبس/جلاند)': ['عدد', 'كيس'],
  // plumbing, HVAC, fuel
  'خطوط تغذية وقود': ['م.ط'],
  'مواسير وتمديدات غاز': ['م.ط'],
  'غرف تفتيش خرسانية': ['عدد'],
  'أغطية منهول حديد': ['عدد'],
  'مصرف سقف Roof Drain 100mm': ['عدد'],
  'فصال دهون Grease Interceptor': ['عدد'],
  'حوض ترسيب مياه أمطار': ['عدد'],
  'عداد مياه 100mm': ['عدد'],
  'خرطوم حديقة مع بكرة (Garden Hose & Reel)': ['طقم'],
  'خرطوم هواء وغاز ضغط عالٍ (Air & Gas Hose)': ['م.ط', 'لفة'],
  'مواسير نحاس تكييف': ['لفة', 'م.ط'],
  'غاز تبريد (فريون)': ['أسطوانة', 'كغ'],
  'دكت مرن': ['م.ط'],
  // tools, welding, safety
  'إلكترود لحام (بارة لحام)': ['كرتون', 'كغ'],
  'سلك لحام ميغ (بكرة سلك)': ['بكرة', 'كغ'],
  'سلك لحام تيج (بارة أرجون)': ['علبة', 'كغ'],
  'كيبل لحام (نحاس)': ['م.ط', 'لفة'],
  'ألواح حماية الأرضيات أثناء التشطيب (Floor Protection Board)': ['لوح', 'م²'],
  'شريط تحذيري': ['لفة'],
  'قفازات عمل': ['زوج', 'كرتون'],
  'حذاء سلامة': ['زوج'],
  'قفازات لحام جلد': ['زوج'],
  'شبكة أمان للمباني': ['م²', 'لفة'],
  'حبل': ['لفة', 'م.ط'],
  'سلسلة بلاستيكية للحواجز (Barrier Chain)': ['م.ط', 'لفة'],
  'شبك حاجز بلاستيكي (Barrier Mesh)': ['لفة'],
  // machinery
  'حاوية مخلفات بناء': ['نقلة', 'عدد'],
  'خزان صرف صحي (بيارة)': ['عدد'],
  'محطة خلط': ['شهر', 'مقطوعية'],
  'مولد كهرباء ديزل متنقل (للإيجار)': ['يوم', 'شهر'],
  // outdoor
  'كيماويات المسابح (كلور)': ['كغ', 'دلو'],
  'بلاط وحواف المسابح': ['م²', 'م.ط'],
  'حصى زينة وأحجار ديكور': ['طن', 'م³', 'كيس'],
  'مطبات صناعية': ['م.ط', 'عدد'],
  'أنابيب ري HDPE خارجية': ['م.ط', 'لفة'],
  'شتلات وأشجار زينة': ['عدد', 'مقطوعية'],
  'تربة زراعية سطحية': ['م³', 'نقلة'],
  'سياج حديد ملحوم مطلي بودرة (بانل جاهز)': ['عدد'],
  'بوابة سياج جاهزة': ['عدد'],
  'أعمدة تسييج (قوائم شبك)': ['عدد'],
  'شبك جبيونات (قفص جابيون حجري)': ['عدد'],
  'سياج موقع مؤقت (حواجز موقع متنقلة)': ['عدد'],
  'شبك تمدد إكسباندد (حديد ممدد)': ['م²', 'لوح'],
  'سلك ربط وأربطة تثبيت الشبك': ['لفة', 'كغ'],
  'كباس باب سياج': ['عدد'],
  'مفصلات باب سياج': ['زوج', 'عدد'],
}
function productUnitOverride(productName: string): string[] | null {
  const n = (productName || '').trim()
  return PRODUCT_UNIT[n] || PRODUCT_UNIT[catalogName(n)] || null
}

// وحدة القياس الافتراضية لمادة: أولوية لوحدة المادة (PRODUCT_UNIT) ثم وحدة المواصفات ثم وحدة التخصص الفرعي
// Order units for pieces vs area (shared by the site and the mobile app, 2026-10-15):
// furniture, decor and light fittings are bought by the piece or set; curtains, rugs, wallpaper,
// parquet and turf by area/length. Everything else keeps PRODUCT_SPECS units then the general list.
const PIECE_SUBS = new Set(['custom_furniture', 'fitted_furniture', 'office_furniture', 'decor_lighting', 'kitchen_appliances', 'cubicles'])
const PIECE_RE = /طاولة|كرسي|كنب|أريكة|خزانة|سرير|دولاب|مكتب|ثري|أباجور|مصباح|مرآة|طقم|غرفة|بوفيه|(^|\s)رف|تسريحة|كومود|مجلس|ديكور|لوحة فنية/
const AREA_RE = /ستار|ستائر|سجاد|موكيت|ورق جدران|باركيه|عشب|زوالي/
// the two name tests only apply where they were meant to (2026-11-02: «مفتاح ستارة», «ستائر هواء»,
// the rebar «Bar Chair» (كرسي) and «حصى زينة وأحجار ديكور» were caught by them)
const AREA_SUBS = new Set(['curtains', 'special_floor', 'wood_floor', 'turf', 'custom_furniture', 'paint'])
const NO_PIECE_RE_SECTORS = new Set<string>(['civil', 'equipment'])
/** Allowed order units for a product, or null when the general list applies. */
export function unitOptionsFor(productName: string, sector: Sector): string[] | null {
  const n = (productName || '').trim()
  if (!n) return null
  const fixed = productUnitOverride(n)
  if (fixed) return [...fixed]
  const sub = detectSubCategory(n, sector)
  if ((!sub || AREA_SUBS.has(sub)) && AREA_RE.test(n)) return ['م²', 'متر', 'عدد']
  if ((sub && PIECE_SUBS.has(sub)) || (!NO_PIECE_RE_SECTORS.has(sector) && PIECE_RE.test(n))) return ['عدد', 'طقم']
  if (sub && SUB_UNIT_OPTIONS[sub]) {
    const def = SUB_UNITS[sub]
    return Array.from(new Set([...(def ? [def] : []), ...SUB_UNIT_OPTIONS[sub]].map(normalizeUnitSpelling)))
  }
  return null
}

// The unit choices shown for a product (web + app): its own spec units when it has several; when it
// has one (or none), that one first, then its specialty's logical units (owner 2026-10-24: a block
// must offer «حبة / طبلية», not only «حبة»).
export function unitChoicesFor(productName: string, sector: Sector): string[] | null {
  const fixed = productUnitOverride(productName)
  if (fixed) return [...fixed]
  // older spec lists spell some units long-hand; show one spelling
  const own = Array.from(new Set(((PRODUCT_SPECS[(productName || '').trim()] || []).find(f => f.key === 'unit')?.options || []).map(normalizeUnitSpelling)))
  const logical = unitOptionsFor(productName, sector)
  if (!logical) return own.length ? own : null
  // a product with its own list keeps it, adding the specialty's units only when the two lists
  // share a unit (same kind of product — guards against a mis-detected specialty, e.g. طوبار ⊃ طوب)
  if (own.length >= 2 && !own.some(u => logical.includes(u))) return own
  return Array.from(new Set([...own, ...logical]))
}

export function getDefaultUnit(productName: string, sector: Sector): string {
  const fixed = productUnitOverride(productName)
  if (fixed) return fixed[0]
  const specs = PRODUCT_SPECS[(productName || '').trim()]
  if (specs) {
    const u = specs.find(f => f.key === 'unit')
    if (u && u.options.length) return normalizeUnitSpelling(u.options[0])
  }
  const only = unitOptionsFor(productName, sector)
  if (only) return only[0]
  const sub = detectSubCategory(productName, sector)
  return normalizeUnitSpelling((sub && SUB_UNITS[sub]) || '')
}

// جلب label التخصص الفرعي بأي لغة
export function getSubCategoryLabel(sector: Sector, subKey: string, locale: string): string {
  const sub = SUB_CATEGORIES[sector]?.[subKey]
  if (!sub) return subKey
  return locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
}

// التصفّح المتدرّج: القطاع → المجموعة → النوع.
// نوزّع منتجات القطاع (SECTOR_PRODUCTS) على المجموعات (GROUP_LABELS) عبر كشف
// التخصص الفرعي لكل منتج ثم أخذ مجموعته. المنتجات التي لا تطابق أي تخصص تقع في
// مجموعة "متنوّع". يحافظ على ترتيب أول ظهور للمجموعة.
export interface ProductGroup { group: string; ar: string; en: string; ur: string; icon: string; items: string[] }

// ترتيب منطقي ثابت للمجموعات في التصفّح المتدرّج (بتسلسل البناء بدل ترتيب أول ظهور).
// أي مجموعة غير مذكورة تأتي بعد المذكورة، و«متنوّع» دائماً في النهاية.
const GROUP_ORDER: Record<string, number> = {}
;[
  // مدني — بتسلسل البناء
  'concrete', 'masonry', 'steel', 'rawmaterials', 'infrastructure', 'drainage_grp', 'formwork', 'scaffolding', 'landscape',
  // معماري — من الإنشاء للتشطيب
  'floors_walls', 'ceiling_decor', 'doors_windows', 'paint_facade', 'facade_systems', 'arch_metalwork', 'joinery', 'sanitary_finish', 'acoustic', 'building_insulation',
  // ميكانيك
  'plumbing', 'plumbing_supplies', 'hvac', 'firefighting', 'mech_insulation',
  // كهرباء
  'cabling', 'panels_switches', 'lighting', 'earthing_grp', 'low_current', 'solar',
  // آليات ومعدات
  'heavy_equipment', 'concrete_machinery', 'light_equipment', 'access_equipment', 'workshop_equip',
  // محل توريد
  'store_plumbing', 'store_electrical', 'store_tools', 'store_fasteners', 'store_hardware', 'store_paint', 'store_safety',
].forEach((g, i) => { GROUP_ORDER[g] = i })
function groupRank(g: string): number { return g === '_other' ? 9999 : (GROUP_ORDER[g] ?? 900) }

// ترتيب مفاتيح المجموعات بالترتيب المنطقي (GROUP_ORDER) — يُستخدم في صفحات اختيار التخصصات
export function sortGroupKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => groupRank(a) - groupRank(b))
}

// extra = مواد معتمدة من قاعدة البيانات (طلبات مقاولين وافق عليها الأدمن) تُدمج مع المضمّنة
export function getGroupedProducts(sector: Sector, extra: { name: string; sub_category?: string }[] = []): ProductGroup[] {
  const subs = SUB_CATEGORIES[sector] || {}
  const products = SECTOR_PRODUCTS[sector] || []
  const order: string[] = []
  const buckets: Record<string, string[]> = {}
  const add = (p: string, hint?: string) => {
    let group: string
    if (hint && GROUP_LABELS[hint]) {
      group = hint // التلميح هو مفتاح مجموعة مباشرة (مواد معتمدة)
    } else {
      const subKey = (hint && subs[hint]) ? hint : detectSubCategory(p, sector)
      group = (subKey && subs[subKey]?.group) || '_other'
    }
    if (!buckets[group]) { buckets[group] = []; order.push(group) }
    if (!buckets[group].includes(p)) buckets[group].push(p)
  }
  for (const p of products) add(p)
  for (const e of (extra || [])) if (e?.name) add(e.name, e.sub_category)
  order.sort((a, b) => groupRank(a) - groupRank(b)) // ترتيب منطقي ثابت
  return order.map(g => {
    const gl = GROUP_LABELS[g]
    return {
      group: g, items: buckets[g],
      ar: gl?.ar || 'متنوّع', en: gl?.en || 'Other', ur: gl?.ur || 'متفرقہ', icon: gl?.icon || '📦',
    }
  })
}

// =============================================
// PRODUCT SPECS — structured attribute choices per product (مثل بركز لكن كمتطلبات)
// Keyed by the EXACT product name in SECTOR_PRODUCTS. Products without an entry
// just use the free-text specification field. Specs are folded into the RFQ's
// `specification` text on submit (no DB change needed).
// =============================================
export interface SpecField { key: string; ar: string; en: string; options: string[] }

export const PRODUCT_SPECS: Record<string, SpecField[]> = {
  // ── solar (2026-11-02) ──
  "نظام طاقة شمسية متكامل للمنازل (حسب القدرة)": [{"key":"kw","ar":"قدرة النظام (كيلوواط)","en":"System size (kW)","options":["3","5","10","15","20","30"]},{"key":"type","ar":"نوع النظام","en":"System type","options":["متصل بالشبكة","هجين مع بطاريات","منفصل عن الشبكة"]},{"key":"battery","ar":"سعة البطاريات (كيلوواط ساعة)","en":"Battery (kWh)","options":["بدون","5","10","15","20"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["نظام"]}],
  "نظام طاقة شمسية للمزارع والآبار": [{"key":"hp","ar":"قدرة المضخة (حصان)","en":"Pump (HP)","options":["3","5","7.5","10","15","20","25"]},{"key":"depth","ar":"عمق البئر (متر)","en":"Well depth (m)","options":["حتى 100","100–200","200–300","أكثر من 300"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["نظام"]}],
  "ألواح شمسية أحادية البلورة (Mono PERC)": [{"key":"watt","ar":"القدرة (واط)","en":"Power (W)","options":["450","550","580","600","620","700"]},{"key":"brand","ar":"الماركة","en":"Brand","options":["أي ماركة معتمدة","Jinko","LONGi","Trina","JA Solar","Canadian Solar"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["لوح","كيلوواط"]}],
  "ألواح شمسية ثنائية الوجه (Bifacial)": [{"key":"watt","ar":"القدرة (واط)","en":"Power (W)","options":["450","550","580","600","620","700"]},{"key":"brand","ar":"الماركة","en":"Brand","options":["أي ماركة معتمدة","Jinko","LONGi","Trina","JA Solar","Canadian Solar"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["لوح","كيلوواط"]}],
  "ألواح شمسية من نوع N (TOPCon)": [{"key":"watt","ar":"القدرة (واط)","en":"Power (W)","options":["450","550","580","600","620","700"]},{"key":"brand","ar":"الماركة","en":"Brand","options":["أي ماركة معتمدة","Jinko","LONGi","Trina","JA Solar","Canadian Solar"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["لوح","كيلوواط"]}],
  "إنفرتر متصل بالشبكة (On-Grid)": [{"key":"kw","ar":"القدرة (كيلوواط)","en":"Power (kW)","options":["3","5","8","10","15","20","30","50"]},{"key":"phase","ar":"الطور","en":"Phase","options":["أحادي الطور","ثلاثي الطور"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "إنفرتر هجين (Hybrid)": [{"key":"kw","ar":"القدرة (كيلوواط)","en":"Power (kW)","options":["3","5","8","10","15","20","30","50"]},{"key":"phase","ar":"الطور","en":"Phase","options":["أحادي الطور","ثلاثي الطور"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "إنفرتر منفصل عن الشبكة (Off-Grid)": [{"key":"kw","ar":"القدرة (كيلوواط)","en":"Power (kW)","options":["3","5","8","10","15","20","30","50"]},{"key":"phase","ar":"الطور","en":"Phase","options":["أحادي الطور","ثلاثي الطور"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "مايكرو إنفرتر (Micro Inverter)": [{"key":"w","ar":"القدرة (واط)","en":"Power (W)","options":["600","800","1000","2000"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "إنفرتر مضخات شمسية (VFD)": [{"key":"kw","ar":"القدرة (كيلوواط)","en":"Power (kW)","options":["2.2","4","5.5","7.5","11","15","22"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "بطاريات جل للطاقة الشمسية (Gel/AGM)": [{"key":"ah","ar":"السعة (أمبير ساعة)","en":"Capacity (Ah)","options":["100","150","200","250"]},{"key":"v","ar":"الجهد (فولت)","en":"Voltage (V)","options":["12","24","48"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "بطاريات تخزين ليثيوم": [{"key":"kwh","ar":"السعة (كيلوواط ساعة)","en":"Capacity (kWh)","options":["5","10","15","20","30"]},{"key":"chem","ar":"النوع","en":"Chemistry","options":["ليثيوم فوسفات الحديد (LiFePO4)","ليثيوم أخرى"]},{"key":"v","ar":"الجهد","en":"Voltage","options":["48 فولت (منخفض)","جهد عالٍ"]},{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["عدد"]}],
  "هياكل تثبيت أرضية للألواح الشمسية": [{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["كيلوواط","طقم"]}],
  "مظلات سيارات بالطاقة الشمسية (Solar Carport)": [{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["موقف","كيلوواط"]}],
  "موصلات MC4 للألواح الشمسية": [{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["زوج","علبة"]}],
  "معدات تنظيف الألواح الشمسية": [{"key":"unit","ar":"وحدة الطلب","en":"Order unit","options":["طقم","عدد"]}],
  'ورق جدران': [{ key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['لفة', 'م²'] }],
  'معجون جدران': [{ key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس', 'سطل'] }],
  'خزائن مطبخ': [{ key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م.ط', 'عدد'] }],
  'سطح مطبخ (رخام/جرانيت)': [{ key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م.ط', 'م²'] }],
  'مظلة سيارات': [{ key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م²', 'عدد'] }],
  'عشب صناعي': [{ key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م²', 'لفة'] }],
  // general furniture: the buyer picks the type (or writes it under «أخرى») and can attach a photo
  'طاولة حسب الطلب (أي نوع)': [{ key: 'type', ar: 'نوع الطاولة', en: 'Table type', options: ['طاولة طعام', 'طاولة قهوة', 'طاولة جانبية', 'طاولة مكتب', 'طاولة تلفزيون', 'طاولة اجتماعات', 'طاولة خارجية', 'طاولة أطفال'] }, { key: 'material', ar: 'الخامة', en: 'Material', options: ['خشب طبيعي', 'MDF / خشب مضغوط', 'رخام أو حجر', 'زجاج', 'معدن', 'خامات مختلطة'] }],
  'كرسي حسب الطلب (أي نوع)': [{ key: 'type', ar: 'نوع الكرسي', en: 'Chair type', options: ['كرسي طعام', 'كرسي مكتب', 'كرسي استرخاء (فوتيه)', 'كرسي بار', 'كرسي خارجي', 'كرسي أطفال'] }, { key: 'material', ar: 'الخامة', en: 'Material', options: ['خشب طبيعي', 'MDF / خشب مضغوط', 'رخام أو حجر', 'زجاج', 'معدن', 'خامات مختلطة'] }],
  'خزانة حسب الطلب (أي نوع)': [{ key: 'type', ar: 'نوع الخزانة', en: 'Cabinet type', options: ['خزانة ملابس', 'خزانة مطبخ', 'خزانة حمّام', 'خزانة أحذية', 'خزانة كتب أو عرض', 'خزانة تلفزيون', 'خزانة تخزين'] }, { key: 'material', ar: 'الخامة', en: 'Material', options: ['خشب طبيعي', 'MDF / خشب مضغوط', 'رخام أو حجر', 'زجاج', 'معدن', 'خامات مختلطة'] }],
  'حديد تسليح': [
    { key: 'diameter', ar: 'القطر', en: 'Diameter', options: ['8 مم','10 مم','12 مم','14 مم','16 مم','18 مم','20 مم','25 مم','32 مم'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['12 متر','6 متر','حسب القص (مقصوص)'] },
    { key: 'grade', ar: 'درجة الحديد', en: 'Grade', options: ['B500B-W','B500C','Grade 60 (جراد 60)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','سابك (SABIC)','الراجحي','اليمامة','حديد عمار','مستورد'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','سيخ'] },
  ],
  // أكياس الأسمنت
  'أسمنت': [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['بورتلاند عادي OPC','مقاوم للكبريت SRC','أسمنت تشطيب Finishing','أسمنت أبيض','أسمنت بوزولاني'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['كيس 50 كجم','طن','سائب (Bulk)'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','أسمنت اليمامة','أسمنت السعودية','أسمنت القصيم','أسمنت الجنوب','أسمنت ينبع','أسمنت العربية'] },
  ],
  // الخرسانة الجاهزة — القوة كخيار + الإضافات (fly ash / microsilica) + الوحدة م³
  'خرسانة جاهزة': [
    { key: 'strength', ar: 'قوة الخرسانة', en: 'Strength', options: ['C-15','C-20','C-25','C-30','C-35','C-40','C-45','C-50','C-60'] },
    { key: 'additive', ar: 'الإضافات', en: 'Additives', options: ['بدون','Fly Ash (رماد متطاير)','Microsilica (سيليكا دقيقة)','Fly Ash + Microsilica','ملدّن (Plasticizer)','مؤخّر شك (Retarder)','ألياف'] },
    { key: 'slump', ar: 'الهبوط (Slump)', en: 'Slump', options: ['10 سم','12 سم','15 سم','18 سم (مضخة)'] },
    { key: 'placing', ar: 'طريقة الصب', en: 'Placing', options: ['بدون مضخة (تفريغ مباشر من الخلاطة)','بمضخة عادية (خط أرضي)','بمضخة ذراع (Boom — مضخة بذراع طويل للأدوار العالية)','حسب الموقع'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³ (متر مكعب)'] },
  ],
  'بلوك': [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['خرساني مجوف Hollow','خرساني مصمت Solid','خفيف AAC','معزول EPS','أسمنتي مفرّغ Cement-Hollow'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['20×20×40 سم','15×20×40 سم','10×20×40 سم','25×20×40 سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','طبلية','ألف حبة','م²','م³'] },
  ],
  'طوب أحمر': [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مفرّغ','مصمت','حراري'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['قياسي 6×12×25','كبير','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['ألف حبة','حبة','طبلية','م²','م³'] },
  ],
}

// ===== مكتبة موسّعة: مواصفات تفصيلية لمزيد من المواد (تُضاف بالحلقات لكفاءة) =====
// SPEC_GROUPS (the product spec fields) live in ./specGroups and load on demand: loadCatalogSpecs().
// ── on-demand catalog parts (specs, translations) ──
let specsLoaded = false
let specsLoading: Promise<void> | null = null
/** Load the product spec fields (order units, sizes, grades…). Pages with spec fields call it via useCatalogSpecs(). */
export function loadCatalogSpecs(): Promise<void> {
  if (specsLoaded) return Promise.resolve()
  return specsLoading ||= import('./specGroups').then(({ SPEC_GROUPS }) => {
    for (const g of SPEC_GROUPS) { for (const p of g.products) PRODUCT_SPECS[p] = g.spec }
    specsLoaded = true
    applyRenamedExtras()
  })
}
export const catalogSpecsLoaded = () => specsLoaded
let trLoaded = false
let trLoading: Promise<void> | null = null
/** Load the English/Urdu product names (for en/ur readers and the search). */
export function loadProductTranslations(): Promise<void> {
  if (trLoaded) return Promise.resolve()
  return trLoading ||= import('./productTranslations').then(({ PRODUCT_TRANSLATIONS_DATA }) => {
    Object.assign(PRODUCT_TRANSLATIONS, PRODUCT_TRANSLATIONS_DATA)
    trLoaded = true
    applyRenamedExtras()
  })
}
export const productTranslationsLoaded = () => trLoaded

export function getProductSpecs(productName: string): SpecField[] {
  return PRODUCT_SPECS[(productName || '').trim()] || []
}

// Materials priced by size / grade / section: the supplier can't quote them without the specs
// (owner 2026-10-27, e.g. a precast lintel without its length and width). For these, every spec
// field of the product is required; a product without spec fields needs a written spec instead.
export const SPEC_REQUIRED_SUBS = new Set<string>([
  'precast', 'readymix', 'rebar', 'steel_mesh', 'steel_sections', 'structural_steel', 'blocks',
  'formwork_ply', 'formwork_timber', 'formwork_steel', 'scaffold_structure', 'shoring_props', 'roadbase', 'aggregates',
  'tiles', 'marble', 'wood_floor', 'gypsum', 'drywall_metal', 'false_ceiling', 'aluminum', 'curtain_wall', 'wood_doors', 'fire_doors',
  'lv_cables', 'mv_cables', 'store_wires', 'conduits', 'breakers', 'panels',
  'drainage_pipes', 'water_supply', 'pressure_pipes', 'chilled_water_pipes', 'fire_fighting', 'ductwork', 'store_fasteners',
])
// «الماركة أو اسم المنتج» (owner 2026-10-31: e.g. grout → «فوسروك رندروك»; optional, but it makes
// pricing easier). Asked for every material except machinery hire and bulk site materials.
const NO_BRAND_SUBS = new Set(['earthworks', 'roadbase', 'aggregates', 'piling'])
export function brandApplies(productName: string, sector: Sector): boolean {
  if (sector === 'equipment') return false
  const sub = detectSubCategory((productName || '').trim(), sector)
  return !(sub && NO_BRAND_SUBS.has(sub))
}
/** «الماركة: X — …» at the head of the specification text, so every screen (and older apps) shows it */
export function withBrand(spec: string | null | undefined, brand: string | null | undefined): string | null {
  const b = (brand || '').trim()
  const s = (spec || '').trim()
  return [b ? `الماركة: ${b}` : '', s].filter(Boolean).join(' — ') || null
}

export function specsRequired(productName: string, sector: Sector): boolean {
  const sub = detectSubCategory((productName || '').trim(), sector)
  return !!sub && SPEC_REQUIRED_SUBS.has(sub)
}
/** What's still missing before this line can be priced: spec field labels, or '*' = a written spec. */
export function missingSpecs(productName: string, sector: Sector, specs: Record<string, string> | undefined, written: string, hasFile = false): string[] {
  if (!specsRequired(productName, sector)) return []
  const fields = getProductSpecs(productName).filter(f => f.key !== 'unit')
  if (!fields.length) return (written || '').trim() || hasFile ? [] : ['*']
  return fields.filter(f => !(specs?.[f.key] || '').trim()).map(f => f.ar)
}

// تجميع التخصصات الفرعية (SUB_CATEGORIES) حسب المجموعة — لصفحة تسعير المورد
// (نفس فكرة getGroupedProducts لكن على تصنيف المورد).
export interface SubCatGroup { group: string; ar: string; en: string; ur: string; icon: string; subs: { key: string; ar: string; en: string; ur: string; icon: string }[] }
export function getGroupedSubCategories(sector: Sector): SubCatGroup[] {
  const subs = SUB_CATEGORIES[sector] || {}
  const order: string[] = []
  const buckets: Record<string, any[]> = {}
  for (const [key, sub] of Object.entries(subs)) {
    const g = (sub as any).group || '_other'
    if (!buckets[g]) { buckets[g] = []; order.push(g) }
    buckets[g].push({ key, ar: sub.ar, en: sub.en, ur: sub.ur, icon: sub.icon })
  }
  order.sort((a, b) => groupRank(a) - groupRank(b)) // نفس الترتيب المنطقي
  return order.map(g => {
    const gl = GROUP_LABELS[g]
    return { group: g, ar: gl?.ar || 'متنوّع', en: gl?.en || 'Other', ur: gl?.ur || 'متفرقہ', icon: gl?.icon || '📦', subs: buckets[g] }
  })
}

export const SECTOR_COLORS: Record<Sector, string> = {
  civil: '#dbeafe',
  architectural: '#fce7f3',
  electrical: '#fef3c7',
  mechanical: '#d1fae5',
  equipment: '#e7e5e4',
  supply_store: '#fae8ff',
}

// Product translations — keys are Arabic (stored in DB), values are EN/UR display names
// The English/Urdu product names live in ./productTranslations and load on demand:
// loadProductTranslations() (LanguageProvider for en/ur readers, and the search). Until then
// getProductLabel() shows the Arabic name.
export const PRODUCT_TRANSLATIONS: Record<string, { en: string; ur: string }> = {}

// Localize a spec-option label: in non-Arabic locales show the English part of a
// bilingual option ('خرساني مجوف Hollow' -> 'Hollow', 'سادة (Smooth)' -> 'Smooth').
// Falls back to the original string when no Latin segment is present.
export function getOptionLabel(opt: string, locale: string): string {
  if (!opt || locale === 'ar') return opt
  const paren = opt.match(/\(([A-Za-z][^)]*)\)/)
  if (paren) return paren[1].trim()
  const trail = opt.match(/[A-Za-z][A-Za-z0-9 .\-\/×"'%]*$/)
  if (trail && trail[0].trim().length >= 2) return trail[0].trim()
  return opt
}

// Helper to get translated product name
export function getProductLabel(arabicName: string, locale: string): string {
  if (locale === 'ar') return arabicName
  const trans = PRODUCT_TRANSLATIONS[arabicName]
  if (!trans) return arabicName
  return locale === 'ur' ? trans.ur : trans.en
}

// Unit translations (طن، سيخ، كيس…) — symbols like م³/م² are kept as-is.
const UNIT_TRANSLATIONS: Record<string, { en: string; ur: string }> = {
  'طن': { en: 'ton', ur: 'ٹن' },
  'سيخ': { en: 'bar', ur: 'سریا' },
  'كيس': { en: 'bag', ur: 'بوری' },
  'شيكارة': { en: 'sack', ur: 'بوری' },
  'قطعة': { en: 'piece', ur: 'عدد' },
  'عدد': { en: 'pcs', ur: 'عدد' },
  'حبة': { en: 'piece', ur: 'عدد' },
  'لتر': { en: 'liter', ur: 'لیٹر' },
  'متر طولي': { en: 'linear m', ur: 'میٹر' },
  'متر': { en: 'm', ur: 'میٹر' },
  'م.ط': { en: 'lin.m', ur: 'میٹر' },
  'لفة': { en: 'roll', ur: 'رول' },
  'رول': { en: 'roll', ur: 'رول' },
  'صندوق': { en: 'box', ur: 'باکس' },
  'كرتون': { en: 'carton', ur: 'کارٹن' },
  'لوح': { en: 'sheet', ur: 'شیٹ' },
  'كيلو': { en: 'kg', ur: 'کلو' },
  'كيلوغرام': { en: 'kg', ur: 'کلو' },
  'جالون': { en: 'gallon', ur: 'گیلن' },
  'برميل': { en: 'barrel', ur: 'بیرل' },
  'باكيت': { en: 'pack', ur: 'پیکٹ' },
  'متر مكعب': { en: 'm³', ur: 'm³' },
  'متر مربع': { en: 'm²', ur: 'm²' },
  // every UNIT_OPTIONS / UNIT_OPTIONS_EXTENDED entry (persona review: Urdu users saw these in Arabic)
  'طن MT': { en: 'ton (MT)', ur: 'ٹن (MT)' },
  'كغ': { en: 'kg', ur: 'کلو' },
  'غرام': { en: 'g', ur: 'گرام' },
  'مم': { en: 'mm', ur: 'ملی میٹر' },
  'قدم': { en: 'ft', ur: 'فٹ' },
  'قدم²': { en: 'ft²', ur: 'مربع فٹ' },
  'م²': { en: 'm²', ur: 'مربع میٹر' },
  'م³': { en: 'm³', ur: 'مکعب میٹر' },
  'لوحة': { en: 'panel', ur: 'پینل' },
  'طقم': { en: 'set', ur: 'سیٹ' },
  'مجموعة': { en: 'set', ur: 'سیٹ' },
  'منظومة': { en: 'system', ur: 'سسٹم' },
  'جهاز': { en: 'unit', ur: 'یونٹ' },
  'وحدة': { en: 'unit', ur: 'یونٹ' },
  'ربطة': { en: 'bundle', ur: 'گٹھا' },
  'براميل': { en: 'barrels', ur: 'بیرل' },
  'بلوكة': { en: 'block', ur: 'بلاک' },
  'يوم': { en: 'day', ur: 'دن' },
  'شهر': { en: 'month', ur: 'مہینہ' },
  'نقطة': { en: 'point', ur: 'پوائنٹ' },
  'دائرة': { en: 'circuit', ur: 'سرکٹ' },
  'موقع': { en: 'site', ur: 'سائٹ' },
  'اتصال': { en: 'connection', ur: 'کنکشن' },
  'بند': { en: 'item', ur: 'آئٹم' },
  'مقطوعية': { en: 'lump sum', ur: 'یکمشت' },
  'إجمالي': { en: 'total', ur: 'کل' },
  'علبة': { en: 'box', ur: 'ڈبہ' },
  'ساعة': { en: 'hour', ur: 'گھنٹہ' },
  'نقلة': { en: 'truckload', ur: 'ٹرک لوڈ' },
  'سطل': { en: 'pail', ur: 'بالٹی' },
  'طبلية': { en: 'pallet', ur: 'پیلیٹ' },
  'ألف حبة': { en: '1,000 pcs', ur: 'ہزار عدد' },
  // 2026-11-02 catalog review units
  'طول (6م)': { en: 'length (6 m)', ur: 'لمبائی (6 میٹر)' },
  'حبة (3م)': { en: 'piece (3 m)', ur: 'عدد (3 میٹر)' },
  'حزمة': { en: 'bundle', ur: 'گٹھا' },
  'بكرة': { en: 'spool', ur: 'اسپول' },
  'زوج': { en: 'pair', ur: 'جوڑا' },
  'خرطوش': { en: 'cartridge', ur: 'کارٹرج' },
  'أسطوانة': { en: 'cylinder', ur: 'سلنڈر' },
  'دلو': { en: 'bucket', ur: 'ڈول' },
  'كجم': { en: 'kg', ur: 'کلو' },
}
export function getUnitLabel(unit: string | null | undefined, locale: string): string {
  if (!unit) return ''
  if (locale === 'ar') return unit
  const t = UNIT_TRANSLATIONS[unit.trim()]
  if (!t) return unit
  return locale === 'ur' ? t.ur : t.en
}

export const SECTOR_PRODUCTS: Record<Sector, string[]> = {
  civil: [
    // ═══ 2026-10-19: brand catalogs (Hilti, fischer, Würth, Fosroc, Sika, MBS, Mapei, Bostik, Henkel, Soudal…) + Masdar ═══
    'مونة حقن كيميائية إيبوكسي (Injection Epoxy Mortar)', 'مونة حقن هايبرد/فينيل إستر سريعة (Hybrid / Vinylester Injection Mortar)', 'انكر كيميائي كبسولة (Chemical Capsule Anchor)', 'جلبة شبكية للانكر الكيميائي في الطوب المفرغ (Mesh / Sieve Sleeve)',
    'طوق حريق للمواسير البلاستيكية (Firestop Collar)', 'شريط حريق منتفخ للمواسير (Intumescent Wrap Strip)', 'لوح حريق مغطى للفتحات (Coated Firestop Board / Batt)', 'مونة حريق للفتحات الكبيرة (Firestop Mortar)',
    'وسائد حريق (Firestop Pillows)', 'كتل/سدادات حريق للكابلات (Firestop Blocks / Plugs)', 'جلبة حريق لعبور الكابلات (Cable Transit Firestop Sleeve)', 'رذاذ حريق مرن للفواصل وأعلى الجدران (Firestop Joint Spray)',
    'طلاء حريق للكابلات (Ablative Cable Coating)', 'جلبة حريق تُصب في البلاطة (Cast-in Firestop Device)', 'وسادات معجون حريق لعلب الكهرباء (Firestop Putty Pads)', 'ملصق تعريف أنظمة الحريق (Firestop Identification Label)',
    'ملدن خرسانة عالي الأداء (Superplasticizer PCE)', 'ملدن عادي مخفض للمياه (Plasticizer / Water Reducer)', 'مؤخر شك الخرسانة (Retarder)', 'مسرع شك الخرسانة خالٍ من الكلوريد (Accelerator)',
    'مسرع خرسانة مرشوشة (Shotcrete Accelerator)', 'مضاف عزل مائي للخرسانة (Waterproofing Admixture)', 'مضاف بلوري للخرسانة (Crystalline Admixture)', 'مثبط تآكل حديد التسليح (Corrosion Inhibitor)',
    'مضاف سحب الهواء (Air Entraining Agent)', 'مضاف تقليل الانكماش (Shrinkage Reducing Admixture)', 'مضاف لزوجة للخرسانة ذاتية الدمك (VMA)', 'ميكروسيليكا (Silica Fume)',
    'ألياف بولي بروبيلين للخرسانة (PP Micro Fibres)', 'ألياف ماكرو إنشائية (Macro Synthetic / Steel Fibres)', 'مضاف جراوت حقن الكابلات (Grout Admixture / Expanding)', 'مادة معالجة خرسانة شمعية (Wax-based Curing Compound)',
    'مادة معالجة راتنجية/أكريليك (Resin / Acrylic Curing Compound)', 'مانع تبخر للخرسانة الطرية (Evaporation Retarder)', 'مادة فك قوالب كيميائية (Chemical Release Agent)', 'مؤخر سطحي لكشف الركام (Surface Retarder)',
    'بوندنج SBR لاتكس (SBR Bonding Agent)', 'بوندنج أكريليك (Acrylic Bonding Agent)', 'بوندنج إيبوكسي لربط الخرسانة القديمة بالجديدة (Epoxy Bonding Agent)', 'دهان حماية حديد التسليح قبل الإصلاح (Rebar Anti-corrosion Primer)',
    'جراوت أسمنتي انسيابي عالي المقاومة (Cementitious Precision Grout)', 'جراوت إيبوكسي لقواعد المعدات (Epoxy Grout)', 'جراوت سريع الشك لأغطية المناهل والإصلاح السريع (Rapid-set Grout)', 'جراوت حقن كابلات الشد اللاحق (Post-tension Duct Grout)',
    'مثبت كيميائي إيبوكسي إنشائي (Epoxy Anchoring Resin)', 'مثبت كيميائي بوليستر/فينيل إستر (Polyester / Vinylester Anchor)', 'كبسولات تثبيت كيميائية (Resin Capsule Anchors)', 'مونة إصلاح إنشائية عالية المقاومة R4 (Structural Repair Mortar)',
    'مونة إصلاح خفيفة للأسقف والجدران (Lightweight Repair Mortar)', 'خرسانة دقيقة قابلة للصب (Micro-concrete)', 'مونة إصلاح إيبوكسي (Epoxy Repair Mortar)', 'معجون تسوية وتشطيب الخرسانة (Fairing / Skim Coat)',
    'لاصق إيبوكسي إنشائي (Structural Epoxy Adhesive)', 'ألياف كربون لتقوية المنشآت (CFRP Strengthening)', 'راتنج حقن شقوق إيبوكسي (Epoxy Crack Injection)', 'راتنج حقن بولي يوريثان لإيقاف التسرب (PU Injection Resin)',
    'جل حقن أكريليك للستائر المائية (Acrylic Injection Gel)', 'حشوات حقن (Injection Packers)', 'عزل سيماني مرن ثنائي المكون (Flexible Cementitious Waterproofing)', 'عزل سيماني صلب (Rigid Cementitious Slurry)',
    'عزل بلوري متغلغل (Crystalline Waterproofing Coating)', 'عزل بولي يوريثان سائل للأسطح المكشوفة (PU Liquid Membrane)', 'عزل أكريليك مائي مرن للأسطح (Acrylic Elastomeric Membrane)', 'عزل بيتوميني مطاطي سائل (Bitumen-Rubber Emulsion)',
    'عزل بولي يوريا بالرش (Polyurea Spray Membrane)', 'غشاء عزل ذاتي اللصق (Self-adhesive Membrane)', 'غشاء HDPE مسبق التركيب للأساسات (Pre-applied HDPE Membrane)', 'غشاء PVC للعزل (PVC Membrane)',
    'غشاء TPO للأسطح (TPO Membrane)', 'لباد / غشاء بنتونايت (Bentonite Membrane)', 'ووتر ستوب PVC للفواصل (PVC Waterstop)', 'شريط منتفخ هيدروفيلي (Hydrophilic Swelling Strip)',
    'خرطوم حقن فواصل الصب (Injection Hose)', 'شريط عزل فواصل مرن TPE/هايبالون (Joint Sealing Tape)', 'شريط وزوايا عزل للحمامات والأسطح (Waterproofing Corner Tape)', 'شبك/قماش تسليح للعزل السائل (Reinforcement Fleece)',
    'طارد ماء سيلاني شفاف (Silane / Siloxane Water Repellent)', 'دهان حماية خرسانة مضاد للكربنة (Anti-carbonation Coating)', 'دهان إيبوكسي معتمد لخزانات مياه الشرب (Potable Water Epoxy Coating)', 'دهان إيبوكسي قطراني (Coal-tar / Bitumen Epoxy)',
    'بطانة مقاومة للكيماويات لغرف الصرف والمحطات (Chemical-resistant Lining)', 'دهان بولي يوريثان أليفاتي نهائي (PU Topcoat)', 'دهان منتفخ مقاوم للحريق للحديد (Intumescent Paint, Cellulosic)', 'دهان منتفخ إيبوكسي (Epoxy Intumescent, Hydrocarbon)',
    'مونة رش أسمنتية مقاومة للحريق (Cementitious Fireproofing Spray)', 'حبل فوم خلفي للفواصل (Backer Rod)', 'حشوة فواصل شبه صلبة للأرضيات الصناعية (Semi-rigid Joint Filler)', 'مانع تسرب فواصل مقاوم للوقود (Fuel-resistant Joint Sealant)',
    'برايمر مانع التسرب للفواصل (Sealant Primer)', 'غطاء فواصل تمدد مرن (Expansion Joint System, elastomeric)', 'مونة تثبيت وتعشيق سريعة (Rapid Anchoring Mortar / Hydraulic Cement)', 'لاصق بولي يوريثان إنشائي للألواح والكلادينج',
    'مادة ربط SBR (لاتكس للمونة)', 'مادة ربط إيبوكسي (خرسانة قديمة بجديدة)', 'شريط بيتوميني ذاتي اللصق (فلاشينج)', 'شريط عازل للحريق والمياه للفواصل (FWBT)',
    'برايمر بيتوميني مائي (WB)', 'برايمر بيتوميني سولفنت (كت باك MC/RC)', 'دهان بيتوميني مستحلب (إيمولشن)', 'مستحلب بيتوميني معدّل بالمطاط (RBE)',
    'دهان بيتوميني مقوى بالألياف (للأسطح)', 'دهان بيتوميني سولفنت (للأساسات)', 'طلاء عزل أسطح أكريليك مرن عاكس للحرارة', 'عزل بولي يوريثان سائل للأسطح',
    'عزل سيماني مرن مكونين (2K)', 'غشاء بيتوميني APP لفة (4مم)', 'غشاء بيتوميني SBS (مرن للبرودة)', 'غشاء بيتوميني مكسو بالحبيبات (للأسطح المكشوفة)',
    'غشاء بيتوميني ذاتي اللصق (بدون لهب)', 'لفائف عزل PVC/TPO للأسطح', 'قماش بوليستر تسليح للعزل السائل', 'عزل كريستالي للخرسانة (Crystalline)',
    'راتنج حقن بولي يوريثان للتسريبات', 'برايمر مانع التسرب للأسطح المسامية', 'منظف أسطح قبل السيليكون (زجاج/ألمنيوم)', 'صاج مدرفل على البارد (CR Sheet)',
    'صاج ملوّن مسبق الدهان (PPGI / PPGL)', 'صاج مموّج ملوّن للأسقف والسواتر (Corrugated Sheet)', 'لفائف صاج أسود حار (HR Coil)', 'لفائف صاج مجلفن (GI Coil G90)',
    'لوح حديد سميك (Heavy Steel Plate ASTM A36 / Gr.50)', 'حديد مربع مصمت (Square Bar)', 'حديد مدوّر مصمت / شافت (Round Bar)', 'ماسورة حديد بيضاوية (Oval Tube)',
    'جسور حديد يابانية JIS (H / I Beam)', 'حديد تسليح مقصوص ومثني حسب المخطط (Cut & Bend)', 'حديد تسليح مطلي إيبوكسي (Epoxy-coated Rebar)', 'حديد تسليح أملس (Plain Round Rebar)',
    'سلك رباط حديد التسليح (Binding Wire)', 'كرسي حمل حديد التسليح (Bar Chair)', 'فاصل عجلة بلاستيكي للأعمدة والجدران (Wheel Spacer)', 'عتبة خرسانية مسبقة الصب للفتحات (Precast Lintel)',
    'عتبة بلوك خفيف (AAC Lintel)', 'عتبة حديد مجلفنة للفتحات (Steel Lintel)', 'بلوك خرساني خلوي خفيف (AAC Block / سيبوريكس)', 'بلوك أسمنتي مصمت (Solid Concrete Block)',
    'طوب أحمر حامل للأحمال (Load-bearing Clay Brick)', 'طوب أحمر لحماية المواسير (Pipe-protector Brick)', 'هوردي بوليسترين للأسقف (EPS Hourdi Block)', 'أسمنت مقاوم للكبريتات (SRC)',
    'أسمنت أبيض (White Portland Cement)', 'أسمنت بوزولاني (PPC)', 'أسمنت لياسة وتشطيب (Masonry / Finishing Cement)', 'شبك سلّمي لتسليح البلوك (Block Ladder Mesh)',
    'رباط جدار معدني مموّج (Wall Tie)', 'صامولة جناح للطوبار (Formwork Wing Nut)', 'صحن تثبيت قضيب الشد (Tie-rod Waler Plate)', 'ماسورة ومخروط PVC لقضيب الشد (Tie-rod Sleeve & Cone)',
    'مانع تسرب لقضيب الشد للخزانات (Tie-rod Water Stopper)', 'قمطة طوبار سريعة (Rapid Clamp)', 'شطفة زوايا PVC للخرسانة (PVC Chamfer Strip)', 'لوح سقالة خشبي (Scaffold Plank)',
    'خشب أبيض لين للبناء والنجارة (White Wood / Spruce)', 'بليود مغطّى بالفيلم للطوبار (Film-faced Plywood)', 'مزراب صاج للهناجر (Steel Gutter)', 'غطاء قمة السقف للهناجر (Ridge Capping)',
    'صاج مقوّس للمظلات والهناجر (Curved Sheet)', 'إكسسوارات أبواب الهناجر المنزلقة (Hangar Door Track & Rollers)', 'خيش لمعالجة الخرسانة (Hessian Cloth)',
    // ═══ 2026-10-13: catalog gap study ═══
    'ألواح ساندوتش بانل', 'قرميد أسقف', 'بلوك هوردي للأسقف', 'بلوك عازل حراري', 'مدادات حديد مجلفنة (Z/C)', 'فواصل تسليح (بسكوت خرساني)',
    'غرف جاهزة (كرفانات)', 'هناجر ومستودعات حديدية', 'صاج وأنابيب ستانلس ستيل', 'ألواح بولي كربونات', 'مبيد النمل الأبيض (معالجة التربة)', 'إضافات الخرسانة (ملدن/مسرع/مؤخر)',
    'مادة معالجة الخرسانة (كيورنج)', 'مادة ربط الخرسانة (بوندنج)', 'جراوت غير قابل للانكماش', 'مثبت كيميائي (كيميكال أنكر)', 'مانع تسرب الفواصل (ماستك)', 'سيليكون محايد (Neutral)', 'سيليكون حمضي (Acetic)', 'سيليكون صحي مضاد للفطريات (حمامات ومطابخ)', 'سيليكون إنشائي للواجهات الزجاجية (Structural)', 'سيليكون عزل الطقس للزجاج والألمنيوم (Weather Seal)', 'سيليكون حراري لدرجات الحرارة العالية', 'سيليكون مقاوم للحريق (Fire Rated)', 'أكريليك مقاوم للحريق (Intumescent)', 'فوم مقاوم للحريق (PU Fire Foam)', 'معجون حريق لفتحات الكابلات والمواسير (Fire Putty)', 'فوم بولي يوريثان لملء الفراغات', 'مانع تسرب بولي يوريثان (PU Sealant)', 'مانع تسرب أكريليك قابل للدهان', 'مانع تسرب MS بوليمر (هايبرد)', 'مانع تسرب بولي سلفايد للفواصل', 'مانع تسرب مائي للأسطح والشقوق', 'مانع تسرب المياه الفوري (Water Plug)', 'ماستك بيتوميني للفواصل والأسطح', 'شريط مانع تسرب (ووتر ستوب)',
    'حشوة فواصل التمدد (فلر بورد)', 'قماش جيوتكستايل', 'لاصق بلوك (مونة رقيقة)', 'مونة إصلاح الخرسانة', 'برجولات ومظلات حدائق', 'سواتر (قماش/حديد/خشب)',
    'مظلات شراع (شد إنشائي)', 'بيوت شعر وخيام', 'مضخة وفلتر المسبح', 'كيماويات المسابح (كلور)', 'إنارة المسابح', 'سلالم المسابح الستانلس',
    'ملحقات المسابح (سكيمر وفوهات)', 'بلاط وحواف المسابح', 'نجيل طبيعي (ثيل)', 'رشاشات وتنقيط الري', 'مؤقت ري وصمامات كهربائية', 'حصى زينة وأحجار ديكور',
    'أحواض زراعة (أصص)', 'نوافير وشلالات', 'ألعاب أطفال خارجية', 'مطبات صناعية', 'أرضيات خشب خارجية (ديكينج WPC)',
    'عشب صناعي', 'إنترلوك رصف',
    // ═══ الخرسانة (BOQ: C2 POURED CONCRETE, C5 PRECAST) ═══
    'حديد تسليح', 'حديد تسليح سلك', 'شبكة حديد جاهزة', 'أسمنت',
    'خرسانة جاهزة',
    'خرسانة مسبقة الصب',
    // ═══ الركام والرمل ═══
    'رمل بناء', 'رمل ناعم', 'حصى', 'زلط', 'كسارة', 'ركام مدمج',
    // ═══ المباني (BOQ: D MASONRY) ═══
    'بلوك', 'طوب أحمر', 'طوب فارغ',
    // ═══ الطوبار والشدّات الخشبية (Formwork) ═══
    'ألواح بليود (طوبار) Plywood', 'خشب بناء للشدّات',
    'خشب بناء (Construction Timber)',
    'مرابيع خشب (طوبار)', 'عوارض خشبية H20',
    'طوبار معدني جاهز', 'قمط شدّة أعمدة Column Clamp',
    'قضبان شد الطوبار Tie Rods', 'زيت فك الطوبار Shutter Oil',
    // ═══ السقالات والدعامات (Scaffolding & Shoring) ═══
    'سقالة كب لوك (Cuplock)',
    'سقالة رينج لوك (Ringlock)',
    'ماسورة سقالة Tube', 'إطار سقالة معدنية Frame',
    'جاكات تدعيم Acrow Prop', 'برج تدعيم Shoring Tower',
    // ═══ الهيكل المعدني (BOQ: E METAL WORK) ═══
    'صلب هيكلي HEB', 'صلب هيكلي HEA', 'صلب هيكلي IPE',
    'قطاعات قنوات U/UPN/UPE (Channels)',
    'صفائح فولاذية', 'أوتاد خرسانية', 'أوتاد حديد مجوف',
    // ═══ الصرف الخارجي - CIVIL فقط (BOQ: Storm Drainage) ═══
    // الصرف الخارجي والأنابيب نُقلت لقسم الميكانيك (السباكة والصرف)
    // ═══ الأعمال الخارجية (BOQ: B SITE WORK) ═══
    'أعمال ترابية وحفر', 'مواد ردم وتسوية', 'إسفلت',
    'حجر كيرب', 'بلاط رصف خارجي',
    'أنابيب ري HDPE خارجية', 'شبكة ري خارجية',
    // ═══ عزل الأساسات والتشطيب الخارجي ═══
    'شبك رابيتز', 'جير', 'جبصين', 'حجر خام للردم والحواجز',
    'عزل مائي سائل (Liquid Membrane)', 'عزل مائي سيماني (Cementitious)',
    'غشاء بيتوميني لفائف (Bituminous Membrane)', 'بطانة خزانات سائلة (Tank Lining)',
    'بيتومين أولي (Primer)', 'لوح حماية بيتوميني (Protection Board)',
    'مواد لاصقة وكيماويات (Adhesives & Sealants)',
    'فيلم بولي ايثيلين', 'عازل رطوبة للأسطح والجدران',
    // ═══ الأعمال الخاصة - BOQ 2 Stadium ═══
    'سلالم رياضية Raker Beams',
    // ═══ الصلب الهيكلي الدائري - BOQ 2 ═══
    'قطاعات دائرية CHS (Circular Hollow Section)',
    'قطاع مربع SHS (Steel Square Tube)',
    'قطاعات مستطيلة RHS', 'زوايا وقطاعات حديد',
    // ═══ أعمال موقع خارجية إضافية ═══
    'تمهيد وتسوية أرض', 'حصى مرشحة Sub-base',
    'طبقة أسفلتية', 'رصف بلاط خارجي', 'رصف حجر طبيعي',
    // ═══ تنسيق موقع Landscaping ═══
    'تشجير وزراعة', 'تربة زراعية Topsoil',
    'نظام ري شبكة خارجية', 'مضخة ري',
    // ═══ خردوات ومواد إضافية (بحث Madar) ═══
    'شبك تسييج تشيلنك (نسيج ماسي)',
    'شبك مربعات ملحوم (لفة/بانل)',
    'سياج حديد ملحوم مطلي بودرة (بانل جاهز)',
    'أعمدة تسييج (قوائم شبك)',
    'شبك جبيونات (قفص جباينة حجري)',
    'شبك تمدد إكسباندد (حديد ممدد)',
    'سياج موقع مؤقت (حواجز موقع متنقلة)',
    'سلك شائك (شبوك)',
    'أسلاك كونسيرتينا (شائكة حلاقية)',
    'شبك سداسي (شبك دجاج/تربة)',
    'مشبك أرضي (جريتنج) ملحوم',
    'كباس باب سياج ومفصلات',
    // ═══ خردوات إضافية (دفعة 2 - تدقيق Madar) ═══
    'بوابة سياج جاهزة',
    'سلك ربط وأربطة تثبيت الشبك',
    // ═══ إضافات Madar (دفعة 3) ═══
    'زاوية حديد (أنجل) متساوية الأضلاع',
    'لوح مسطح حديد (فلات بار)',
    'ماسورة حديد أسود (مواسير سكجول 40)',
    'مربع حديد أسود (SHS)',
    'مستطيل حديد أسود (RHS)',
    'صاج أسود ألواح (صاج حار هوت رولد)',
    'صاج مضلع (شكمة / تير دروب)',
    'صاج مجلفن (GI جلفنة ساخنة)',
    'بيم حديد أي بيم (IPE جسور)',
    // ═══ سقالات وشدّات (طلب مع تصميم) ═══
    'طلب سقالة كاملة (توريد + تصميم)',
    'شدّات وطوبار أسقف (سلابات)',
    // ═══ طبقات الردم والأساس (AASHTO / MOT) ═══
    'طبقة أساس حصوية (Base Course)',
    'طبقة تحت الأساس (Sub-base)',
    'ردم إنشائي مصنّف (Structural Fill)',
    'ردم عام / إحلال (General Backfill)',
  ],
  architectural: [
    // ═══ 2026-10-19: brand catalogs (Hilti, fischer, Würth, Fosroc, Sika, MBS, Mapei, Bostik, Henkel, Soudal…) + Masdar ═══
    'مسمار عزل حراري بقرص (Insulation Fixing)', 'قناة انكر مصبوبة في الخرسانة (Cast-in Anchor Channel)', 'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)', 'مقسي سطح خرسانة بودرة (Dry-shake Floor Hardener)',
    'مقسي ومانع غبار سائل للخرسانة (Liquid Densifier / Lithium Silicate)', 'برايمر إيبوكسي للأرضيات (Epoxy Floor Primer)', 'أرضية بولي يوريثان أسمنتية (PU Cement / Urethane Cement Floor)', 'أرضية بولي يوريثان مرنة (Elastic PU Floor)',
    'أرضية إيبوكسي مضادة للكهرباء الساكنة (ESD / Antistatic Epoxy)', 'مونة إيبوكسي للأرضيات الثقيلة (Epoxy Screed)', 'مايكروسمنت للأرضيات والجدران (Microcement)', 'رابط سكريد سريع الجفاف (Rapid-drying Screed Binder)',
    'معجون تسوية جدران وأرضيات قبل البلاط (Levelling Mortar)', 'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)', 'غراء بلاط محسن C2TE للبورسلين (Improved Tile Adhesive C2TE)', 'غراء بلاط مرن S1/S2 للواجهات والمسابح (Deformable Tile Adhesive S1/S2)',
    'لاصق بلاط إيبوكسي (Epoxy Tile Adhesive)', 'لاصق رخام وحجر طبيعي أبيض سريع (White Rapid Stone Adhesive)', 'ترويبة أسمنتية محسنة CG2 (Polymer-modified Tile Grout)', 'برايمر قبل الغراء والسكريد (Primer for Adhesives / Screeds)',
    'مادة حماية وتلميع حجر وترويبة (Stone & Grout Sealer)', 'لاصق أرضيات فينيل وسجاد', 'فوم لاصق للألواح العازلة (XPS/EPS)', 'لاصق ألواح الجبس والكرانيش (بودرة)',
    'لاصق رخام وحجر (بوليستر/إيبوكسي)', 'مادة ربط PVA للياسة (بوندنج أبيض)', 'شريط VHB إنشائي للألواح والواجهات', 'شريط تمدد لعزل فواصل النوافذ (Expanding Tape)',
    'عزل مائي للحمامات تحت البلاط (جاهز)', 'شريط زوايا مطاطي لعزل الحمامات', 'عازل مائي شفاف للواجهات والحجر (سيلان/سيلوكسان)', 'لاصق بلاط أسمنتي عادي C1 (سيراميك)',
    'لاصق بلاط محسّن C2T (بورسلان)', 'لاصق بلاط C2TE (بورسلان ومناطق رطبة)', 'لاصق بلاط مرن C2TE S1 (فورمات كبير وخارجي)', 'لاصق بلاط سريع التصلب C2F',
    'لاصق رخام وحجر أبيض (أسمنتي)', 'لاصق بلاط المسابح', 'لاصق بلاط جاهز (معجون سطل)', 'ترويبة أسمنتية عادية CG1',
    'ترويبة محسّنة CG2WA (مقاومة للماء والاحتكاك)', 'ترويبة المسابح', 'عازل ترويبة شفاف (Grout Sealer)', 'معجون جدران جاهز (أكريليك – سطل)',
    'معجون أسمنتي بودرة للواجهات (سكيم كوت)', 'جبس تلبيس بودرة (بلاستر)', 'برايمر قبل اللاصق للأسطح الملساء (بلاط فوق بلاط)', 'منظف بقايا الترويبة الإيبوكسية',
    'خشب أحمر سويدي (Redwood / Pine)', 'بليود مقشّر خشب طبيعي (Veneer Plywood)', 'بليود مطلي بوليستر (Polyester Plywood)', 'ألواح بلوك بورد (Blockboard)',
    'MDF مقاوم للرطوبة (MR MDF – أخضر)', 'MDF مقاوم للحريق (FR MDF – أحمر)', 'MDF مقشّر خشب طبيعي (Veneered MDF)', 'لوح ميلامين خشب مضغوط (MFC / Melamine Chipboard)',
    'خشب مضغوط عادي (Chipboard / فونتكس)', 'ألواح OSB (Oriented Strand Board)', 'MDF مخدّد ميلامين للعرض (Slatwall / Grooved MDF)', 'زاوية لياسة مجلفنة بشبك (Angle Bead)',
    'زاوية إيقاف اللياسة (Plaster Stop Bead)', 'زاوية فاصل حركة للياسة (Control Joint Bead)', 'زاوية بروز (أركيتريف) للياسة حول الفتحات (Architrave Bead)', 'شبك فايبر جلاس لتسليح اللياسة (Fibreglass Plaster Mesh)',
    'شبك زاوية مجلفن لتقاطع البلوك والخرسانة (Corner / Strip Mesh)', 'شعر سيزال لأعمال الجبس (Sisal Fibre)', 'طبقة رشّ أولية قبل اللياسة (Spatter Dash / Scratch Coat)', 'فتحة صيانة للسقف المستعار (Ceiling Access Panel)',
    'ألواح بوليسترين EPS (ستايروفوم أبيض)', 'شرائح بوليسترين لحشو البلوك المعزول (Block Insulation Filler)', 'لفائف فوم بولي إيثيلين عازل (PE Foam Roll)', 'صاج ألمنيوم مضلّع/منقوش (Aluminium Chequered Plate)',
    'صاج ألمنيوم مزخرف ستوكو (Stucco Embossed Sheet)', 'زر طرد للخزان المخفي (Flush Plate)', 'خزان طرد ظاهر (Exposed Cistern)', 'غطاء مقعد مرحاض (Toilet Seat Cover)',
    'برايمر زنك فوسفات للحديد (Zinc Phosphate Primer)',
    // ═══ 2026-10-14: generic furniture ═══
    'طاولة حسب الطلب (أي نوع)', 'كرسي حسب الطلب (أي نوع)', 'خزانة حسب الطلب (أي نوع)',
    // ═══ 2026-10-14: furniture by room ═══
    'غرفة نوم كاملة حسب الطلب', 'تسريحة ومرآة حسب الطلب', 'كومودينو (طاولة جانبية للسرير)', 'غرفة أطفال حسب الطلب', 'سرير أطفال وأسرّة دورين', 'كنب زاوية (L) حسب الطلب',
    'طاولات جانبية (سايد تيبل)', 'بوفيه وسايدبورد حسب الطلب', 'جدار تلفزيون وديكور جداري حسب الطلب', 'رفوف حائط ديكور', 'قواطع ديكور خشبية (بارتيشن)',
    // ═══ 2026-10-13: catalog gap study ═══
    'ألواح أسمنت بورد (فايبر سمنت)', 'قطاعات وألواح ألمنيوم خام', 'كرانيش جبس وبولي يوريثان', 'ألواح بديل الرخام', 'ألواح جدارية بديل الخشب (WPC)', 'زوايا وبروفايلات البلاط',
    'بلاط موزاييك', 'صلبان وكلبسات تسوية البلاط', 'ترويبة إيبوكسي', 'دهان خارجي حجري (روشن/جرافياتو)', 'دهان أساس (برايمر)', 'دهان حديد مانع للصدأ (سلاقون)',
    'دهانات ديكورية (مخمل/رخامي)', 'ورنيش وصبغة خشب', 'دهان خطوط الطرق والمواقف', 'أبواب WPC وPVC للحمامات', 'شبك نوافذ ضد الحشرات', 'حماية حديد للنوافذ',
    'كابينة شاور زجاج', 'قواطع زجاجية للمكاتب', 'مرايا ديكور حسب المقاس', 'سكاي لايت (منور سقفي)', 'ألواح فورمايكا HPL وأكريليك', 'خشب ماسيف للنجارة (زان/بلوط)',
    'شريط حواف PVC (إيدج باند)', 'قشرة خشب طبيعي', 'درج داخلي خشب ورخام ودرابزين', 'مصعد منزلي (فيلا)', 'مصعد طعام وأغراض صغير', 'مجلس عربي (جلسة أرضية)',
    'مجاري وحوامل الستائر', 'ستائر كهربائية (موتور)', 'وحدة مغسلة (فانيتي)', 'أجهزة مطبخ مدمجة (فرن/موقد/شفاط)', 'إكسسوارات خزائن المطبخ (سلال جرارة)', 'مراتب (فرشات سرير)',
    'أثاث مكتبي (كراسي ومكاتب وخزائن ملفات)', 'رفوف معدنية للمستودعات والمحلات', 'أثاث خارجي (جلسات حدائق)', 'سجاد وزوالي', 'مشب نار (موقد حطب)', 'وحدة تلفزيون (مكتبة شاشة)',
    'لوحات وتحف ديكور', 'خزانة أحذية (جزامة)', 'خزان دفن للمرحاض المعلق', 'جاكوزي (حوض مساج)', 'رش فوم بولي يوريثان للأسطح', 'صوف زجاجي (لفائف عزل)',
    'عازل حراري عاكس (فويل)',
    'طاولة طعام حسب الطلب', 'طاولة قهوة حسب الطلب', 'كنب حسب الطلب', 'خزانة ملابس (دولاب) حسب الطلب', 'سرير حسب الطلب', 'مكتب خشبي حسب الطلب', 'كراسي طعام', 'مكتبة ورفوف حسب الطلب', 'ستائر قماش', 'ستائر رول (بلاك آوت)', 'ستائر شرائح (Blinds)', 'موكيت',
    'ورق جدران', 'معجون جدران', 'باب حديد خارجي', 'مرآة حمام', 'خزائن مطبخ', 'سطح مطبخ (رخام/جرانيت)', 'مظلة سيارات', 'بوابة كراج (حديد/أوتوماتيك)',
    // ═══ مواد مضافة (مراجعة الذكاء) ═══
    'غراء وترويبة بلاط', 'حديد أسقف مستعارة', 'خلطة لياسة جاهزة', 'إكسسوارات لياسة',
    // ═══ الأرضيات (BOQ: 15 FINISHES, FL Series) ═══
    'بلاط بورسلين حجري', 'بلاط بورسلين رمادي', 'بلاط بورسلين رخامي',
    'بلاط بورسلين خشبي', 'بلاط بورسلين خرساني',
    'بلاط سيراميك', 'بلاط رخام طبيعي', 'جرانيت',
    'أرضية إيبوكسي', 'أرضية راتنج إيبوكسي مع قرنيص',
    'سجاد Carpet Tile', 'سجاد رول لاصق',
    'باركيه خشبي', 'فينيل', 'مطاط Entrance Matting',
    // ═══ الجدران (BOQ: IWS Series, LIN Series) ═══
    'جبس بورد حوائط', 'جبس بورد مقاوم رطوبة MR',
    'جبس بورد مقاوم حريق FR', 'جبس بورد مزدوج',
    'بلاط سيراميك جدار', 'بلاط بورسلين جدار',
    'دهان أكريليك', 'دهان زيتي', 'دهان مضاد للرطوبة',
    'لواح خشب صوتية Acoustic', 'لواح GRC خارجية',
    'كلادينج ألمنيوم كومبوزيت ACM',
    // ═══ الأسقف (BOQ: CLG Series) ═══
    'أسقف مستعارة جبس', 'أسقف مستعارة معدنية',
    'أسقف كالسيوم سيليكات', 'بلاطات أسقف صوتية 600×600',
    'أسقف صوتية مبطنة', 'أسقف مكشوفة مطلية',
    // ═══ العزل (BOQ: 13-THERMAL AND MOISTURE) ═══
    'عازل XPS للأسطح', 'صوف صخري Rock Wool',
    'فوم عازل حراري',
    'مواد عازلة صوتية Acoustic',
    // ═══ الأبواب والنوافذ (BOQ: 14-H DOORS AND WINDOWS) ═══
    'أبواب خشب داخلية', 'أبواب خشب مع إطار معدني',
    'أبواب حديد مقاومة حريق 45 دقيقة',
    'أبواب حديد مقاومة حريق 90 دقيقة',
    'أبواب ألمنيوم', 'أبواب ستانلس', 'باب دوار Rolling Shutter',
    'نوافذ ألمنيوم زجاج مزدوج', 'نوافذ UPVC',
    // ═══ الزجاج والواجهات ═══
    'زجاج عادي', 'زجاج سيكوريت Tempered',
    'زجاج عازل مزدوج', 'زجاج رفلكتيف',
    'واجهات زجاجية Curtain Wall', 'واجهات حجر', 'حجر بازلت', 'حجر صناعي',
    // ═══ الإكسسوارات (BOQ: 16-K ACCESSORIES) ═══
    'درابزين ستانلس', 'درابزين زجاجي بحواجز',
    'سلالم حديد', 'مشربيات',
    'أرفف خشبية', 'لوحات إرشادية Signage',
    // ═══ النجارة والأثاث الثابت (Joinery) ═══
    'كاونتر استقبال خشبي', 'خزائن حائط ثابتة', 'أثاث ثابت خشبي Built-in',
    'ألواح MDF وخشب مضغوط (Wood Boards)',
    'قواطع حمامات HPL', 'كبائن دورات مياه Toilet Cubicles',
    // ═══ أرضيات إضافية من BOQ 2 ═══
    'أرضية راتنج إيبوكسي High Build',
    'أرضية تيرازو Terrazzo',
    'أرضية مطاطية Rubber Flooring',
    'أرضية مطاطية رياضية Sports Floor',
    'أرضية أكسس فلور Raised Access Floor',
    'فرشة مسطحة Screed Heavy Duty',
    'فرشة مسطحة Self-Levelling',
    'فينيل ورقي Vinyl Sheet', 'فينيل مضاد للانزلاق',
    'قرنيوص فينيل Vinyl Skirting',
    // ═══ جدران إضافية من BOQ 2 ═══
    'لواح خشبية صوتية Acoustic Timber',
    'لواح صوتية PET Panels',
    'جبس بورد مقاوم حريق FR', 'جبس بورد مزدوج',
    'عازل مائي سيماني Cementitious Render',
    // ═══ أسقف إضافية من BOQ 2 ═══
    'أسقف صوتية Acoustic Baffle',
    'أسقف جبس مطلي Acoustic Plaster',
    // ═══ معدات خاصة (BOQ: 17-EQUIPMENT, 20-CONVEYING) ═══
    'سلالم كهربائية Escalator', 'مصاعد Elevator/Lift',
    // ═══ خردوات ومواد إضافية (بحث Madar) ═══
    'قائم معدني للجبس بورد (Stud)',
    'مسار معدني (Track / U-Channel)',
    'أوميغا سقف معلق (Furring Channel)',
    'زاوية جدار (Wall Angle) للسقف المعلق',
    'زاوية حماية أركان (Corner Bead)',
    'معجون جبس تلييس الفواصل (Joint Compound)',
    'شريط تسليح الفواصل (Jointing Tape)',
    'معلاق سقف قابل للضبط (Ceiling Hanger)',
    'وصلة تعشيق قوائم (Stud Connector / Splice)',
    'شريط عازل تحت القوائم (Acoustic Isolation Strip)',
    // ═══ خردوات إضافية (دفعة 2 - تدقيق Madar) ═══
    'زاوية ركن معدنية للجبس (كورنر بيد)',
    'شريط تسليح فواصل الجبس',
  ],
  electrical: [
    // ═══ 2026-10-19: brand catalogs (Hilti, fischer, Würth, Fosroc, Sika, MBS, Mapei, Bostik, Henkel, Soudal…) + Masdar ═══
    'سلك مفرد نحاسي معزول (THHN / NYA)', 'كابل مرن متعدد الأقطاب (Flexible Cord)', 'كابل ستلايت محوري (RG6 Coaxial)', 'سلك هاتف (Telephone Wire)',
    'ماسورة كهرباء مرنة مموّجة (Corrugated Flexible Conduit)', 'ماسورة EMT مرنة ووصلاتها (Flexible Metal Conduit & EMT Connectors)', 'قاطع تفاضلي مع حماية زيادة الحمل (RCBO)', 'صندوق عداد وقاطع رئيسي خارجي (Outdoor Meter / Busbar Chamber)',
    'مفتاح فندقي بالبطاقة (Key-card Switch)', 'مفتاح ستارة كهربائية (Curtain / Blind Switch)', 'وحدة تحكم الطبّاخ 45A (Cooker Control Unit)', 'مخرج موصول بفيوز (Fused Connection Unit / Spur)',
    'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)', 'غطاء مقاوم للماء للأفياش (Weatherproof Cover IP55)', 'غرفة تفتيش تأريض (Earth Pit) وكلامب', 'كشاف ليد مقاوم للماء والغبار (Vapour-proof / Batten)',
    // ═══ 2026-10-14: home lighting ═══
    'إنارة سقف مودرن (بلافونيير)', 'ثريا كريستال كبيرة للدرج والصالات', 'إنارة مرآة وحمّام', 'مصباح طاولة ومكتب LED', 'لمبات ديكور فيلامنت (إديسون)', 'إنارة مخفية خطية (لينير)',
    'إنارة تحت خزائن المطبخ', 'إنارة جدارية خارجية', 'إنارة درج وأرضيات (ستيب لايت)', 'لمبة ذكية (واي فاي)', 'حساس حركة للإنارة',
    // ═══ 2026-10-13: catalog gap study ═══
    'إنارة حدائق وممرات', 'أعمدة إنارة شوارع وأحواش', 'كشافات وإنارة بالطاقة الشمسية', 'إنارة تراك (مسار)', 'حامي جهد كهربائي', 'عداد كهرباء فرعي',
    'شاحن سيارات كهربائية', 'مفتاح فصل (آيسوليتر)', 'ألواح طاقة شمسية', 'انفرتر طاقة شمسية', 'بطاريات تخزين ليثيوم', 'منظم شحن شمسي',
    'هياكل تثبيت الألواح الشمسية', 'كابلات وموصلات طاقة شمسية', 'مضخة مياه بالطاقة الشمسية',
    // ═══ 2026-11-02: solar set completed (owner) ═══
    'نظام طاقة شمسية متكامل للمنازل (حسب القدرة)', 'نظام طاقة شمسية للمزارع والآبار', 'ألواح شمسية أحادية البلورة (Mono PERC)', 'ألواح شمسية ثنائية الوجه (Bifacial)', 'ألواح شمسية من نوع N (TOPCon)', 'إنفرتر متصل بالشبكة (On-Grid)', 'إنفرتر هجين (Hybrid)', 'إنفرتر منفصل عن الشبكة (Off-Grid)', 'مايكرو إنفرتر (Micro Inverter)', 'إنفرتر مضخات شمسية (VFD)', 'بطاريات جل للطاقة الشمسية (Gel/AGM)', 'خزانة ورفوف بطاريات', 'صندوق تجميع DC للألواح (Combiner Box)', 'قواطع ومفاتيح فصل DC للطاقة الشمسية', 'حماية من الصواعق والتيار الزائد DC (SPD)', 'موصلات MC4 للألواح الشمسية', 'هياكل تثبيت أرضية للألواح الشمسية', 'مظلات سيارات بالطاقة الشمسية (Solar Carport)', 'عداد كهرباء ثنائي الاتجاه (صافي القياس)', 'نظام مراقبة أداء الطاقة الشمسية (Wi-Fi)', 'معدات تنظيف الألواح الشمسية',
    'مفاتيح إنارة ذكية', 'مقابس ذكية', 'بوابة تحكم المنزل الذكي',
    'حساسات ذكية (باب/تسرب/دخان)', 'محرك بوابة كهربائي', 'كاميرا واي فاي منزلية', 'كاشف دخان مستقل',
    'ثريا (نجفة)', 'إنارة معلقة ديكور', 'أبليك جداري', 'أباجورة', 'إنارة أرضية (ستاند)',
    'إنتركم (جرس باب مرئي)',
    // ═══ مواد مضافة (مراجعة الذكاء) ═══
    'مواسير كهرباء EMT/PVC',
    // ═══ الكابلات (BOQ: 30-R ELECTRICAL) ═══
    // كابلات LV أحادية - LSZH (للتوزيع الداخلي)
    'كابل 1Cx6mm² CU/LSZH', 'كابل 1Cx10mm² CU/LSZH', 'كابل 1Cx16mm² CU/LSZH',
    'كابل 1Cx25mm² CU/LSZH', 'كابل 1Cx35mm² CU/LSZH', 'كابل 1Cx50mm² CU/LSZH',
    'كابل 1Cx70mm² CU/LSZH', 'كابل 1Cx95mm² CU/LSZH', 'كابل 1Cx120mm² CU/LSZH',
    'كابل 1Cx150mm² CU/LSZH', 'كابل 1Cx185mm² CU/LSZH', 'كابل 1Cx240mm² CU/LSZH',
    'كابل 3Cx6mm² CU/XLPE/SWA/LSZH', 'كابل 3Cx10mm² CU/XLPE/SWA/LSZH',
    'كابل 3Cx16mm² CU/XLPE/SWA/LSZH', 'كابل 4Cx10mm² CU/XLPE/SWA/LSZH',
    'كابل 4Cx16mm² CU/XLPE/SWA/LSZH', 'كابل 4Cx25mm² CU/XLPE/SWA/LSZH',
    'كابل 4Cx35mm² CU/XLPE/SWA/LSZH', 'كابل 4Cx50mm² CU/XLPE/SWA/LSZH',
    'كابل 4Cx70mm² CU/XLPE/SWA/LSZH', 'كابل 4Cx95mm² CU/XLPE/SWA/LSZH',
    'كابل 4Cx120mm² CU/XLPE/SWA/LSZH', 'كابل 4Cx185mm² CU/XLPE/SWA/LSZH',
    'كابل 4Cx240mm² CU/XLPE/SWA/LSZH', 'كابل 4Cx300mm² CU/XLPE/SWA/LSZH',
    'كابل MICA مقاوم للحريق 2Cx6mm²', 'كابل MICA مقاوم للحريق 2Cx16mm²',
    'كابل إنذار حريق MICA', 'كابل بيانات CAT6', 'كابل ألياف بصرية',
    // busbar (BOQ: Busbar 1000A / 1600A / 2500A)
    'Bus Bar 1000A 4P', 'Bus Bar 1600A 4P', 'Bus Bar 2500A 4P',
    // ═══ لوحات التوزيع (BOQ: MDB/SDB/LDB) ═══
    'لوحة رئيسية MDB', 'لوحة فرعية SMDB', 'لوحة إضاءة LDB',
    'لوحة طاقة PP', 'لوحة تحكم محركات MCC',
    'لوحة UPS', 'لوحة ATS نقل تلقائي',
    'لوحة متوسط جهد MV Switchgear',
    // ═══ القواطع ═══
    'قاطع MCB 1P', 'قاطع MCB 3P',
    'قاطع تفاضلي RCCB', 'قاطع MCCB', 'قاطع هوائي ACB',
    // ═══ الإضاءة (BOQ: 32-R LIGHTING) ═══
    'كشاف LED بانل 600×600', 'كشاف LED بانل 300×1200',
    'كشاف LED Downlight', 'كشاف LED سطحي',
    'كشاف LED متدلي', 'كشاف LED فلود خارجي',
    'كشاف LED صناعي High Bay',
    'إضاءة طوارئ Emergency', 'إضاءة مخرج طوارئ Exit Sign',
    'إضاءة شريطية LED', 'نظام تحكم إضاءة DALI',
    // ═══ 2026-11-12: lighting gaps (owner) ═══
    'جسم نيون ليد متكامل 60/120 سم (LED Batten)',
    'حامل لمبات نيون مزدوج T8 (بدون لمبات)',
    'إنارة خطية T5 للكرانيش وتحت الخزائن',
    'سبوت مغناطيسي على مسار 48 فولت (Magnetic Track)',
    'سبوت متحرك COB للأسقف الجبسية',
    'كشاف مستودعات خطي (Linear High Bay)',
    'بطارية طوارئ للكشاف (Emergency Kit)',
    'إنارة غرف نظيفة ومستشفيات (Cleanroom Panel)',
    'كشاف مضاد للانفجار (Explosion-proof)',
    'سبوت إنارة لوحات وجداريات (Picture Light)',
    'إنارة بولارد للممرات (Bollard)',
    'إنارة أرضية غاطسة (In-ground Uplight)',
    'سبوت حدائق بوتد (Spike Light)',
    'إنارة غسيل جدران وواجهات خطية (Wall Washer)',
    'رأس إنارة شوارع LED (Street Light Head)',
    'كشاف مظلات ومحطات وقود (Canopy Light)',
    'خلية ضوئية لتشغيل الإنارة تلقائياً (Photocell)',
    'إنارة زينة رمضان والأعياد (سلاسل وستائر)',
    'إنارة عوائق الطيران للأبراج والمباني العالية (Aviation Light)',
    // ═══ الأنظمة الرئيسية (BOQ: 30-R MAIN & SUB MAIN) ═══
    'محول كهربائي HV/LV', 'محول كهربائي 11kV/400V',
    'مولد كهرباء ديزل', 'UPS بلا انقطاع',
    'مكثفات تحسين معامل القدرة',
    'محطة توليد طارئة Generator Hookup Panel',
    // ═══ المواسير والمسارات (BOQ: Containment) ═══
    'أنابيب كهربائية PVC', 'أنابيب كهربائية معدنية',
    'سكة كابل Ladder 100×75', 'سكة كابل Ladder 150×75',
    'سكة كابل Ladder 200×75', 'سكة كابل Ladder 300×75',
    'صينية كابل Tray 100×100', 'صينية كابل Tray 300×75',
    'صينية كابل Tray 600×100', 'علب توزيع Junction Box',
    'مفاتيح وبرازيز Switches & Sockets 13A',
    'مقبس طابق Floor Box',
    // ═══ الأرضي والحماية (BOQ: 35-R EARTHING) ═══
    'سلك تأريض', 'أقطاب تأريض Earth Rod',
    'شريط نحاس تأريض', 'حماية برق Lightning Protection',
    // ═══ الأنظمة الخاصة (BOQ: 34-R COMMUNICATIONS) ═══
    'نظام إنذار حريق FA', 'نظام مراقبة CCTV',
    'نظام تحكم دخول ACS', 'نظام بيانات Data Network CAT6',
    'نظام صوت وإعلام PA System', 'نظام BMS تحكم مبنى',
    'كاميرا CCTV', 'نقطة بيانات Data Outlet',
    'نظام WiFi Wireless Access Point',
    'شاشة إعلانية LED Display',
    // ═══ تحكم إضاءة (BOQ: 33-LIGHTING CONTROL) ═══
    'نظام DALI تحكم إضاءة', 'حساس حركة PIR',
    'تحكم إضاءة واجهات',
    // ═══ محطة طاقة (BOQ: 30-R MAIN) ═══
    'محطة تحويل HV Substation',
    'لوحة محطة 11kV Switchgear',
    'مولد طارئ 400V Hook-up Panel',
    'ATS نقل تلقائي 1000A', 'ATS نقل تلقائي 500A',
    'مرشح هارمونيك Active Harmonic Filter',
    // ═══ إضاءة ملاعب (BOQ 2 Stadium) ═══
    'كشاف ملعب Sports Light S1',
    'كشاف ملعب Sports Light S2',
    'شاشة LED إعلانية LED Screen 55"',
    // ═══ أنظمة متخصصة ═══
    'بوابة تحكم دخول Speed Gate Turnstile',
    'حاجز وقوف سيارات Barrier',
    'كاميرا PTZ متحركة',
    // ═══ إضافات Madar (دفعة 3) ═══
    'ديمر (منظّم إضاءة) للحائط',
    'بريزة يو إس بي شحن (Type-A/Type-C)',
    'بريزة شبكة/داتا (RJ45)',
    'بريزة تلفزيون/ستلايت (TV Coax)',
    'حساس حركة (سنسور إضاءة تلقائي)',
    'تايمر ديجيتال (مؤقّت زمني)',
    'كونتاكتور مودولار (قاطع تحميل)',
    'ريليه مودولار (ريلي تبديل/تعشيق)',
    'ثرموستات (منظّم حرارة تكييف/تدفئة)',
    'جرس باب مع زر ضغط (بيل بوش)',
    'شريط ليد مرن (SMD)',
    'نيون فليكس ليد',
    'محول (درايفر) ليد',
    'بروفايل ألمنيوم للشريط',
    'كنترول RGB لشريط الليد',
    'موصلات شريط ليد',
    'شريط ليد رقمي متغير الألوان',
    'بروفايل ليد مقاوم للماء (نيون بار)',
  ],
  mechanical: [
    // ═══ 2026-10-19: brand catalogs (Hilti, fischer, Würth, Fosroc, Sika, MBS, Mapei, Bostik, Henkel, Soudal…) + Masdar ═══
    'قناة تثبيت يونيسترت (Strut Channel)', 'صامولة زنبركية للقناة (Channel Spring Nut)', 'زوايا ووصلات قناة التثبيت (Channel Brackets & Connectors)', 'ذراع حامل كابولي (Cantilever Bracket)',
    'قاعدة تثبيت قناة/قضيب (Channel Base Plate / Rod Hanger)', 'علاقة مواسير مبطنة بالمطاط (Rubber-lined Pipe Clamp)', 'كلامب مواسير ثقيل للأحمال (Heavy-duty Pipe Clamp)', 'علاقة كلفيس/حلقة لمواسير الحريق والرشاشات (Clevis / Ring Hanger)',
    'كلامب كمرة (Beam Clamp)', 'حامل انزلاقي/أسطواني للمواسير الساخنة (Pipe Slide / Roller Support)', 'غراء مواسير CPVC (مياه حارة)', 'منظف وبرايمر مواسير PVC قبل اللحام',
    'عازل حراري مجاري هواء', 'غراء عزل الدكت (لاصق الصوف والفوم)', 'لاصق عزل الأنابيب المطاطي (أرمافلكس)', 'شريط ألمنيوم مقوى FSK لعزل الدكت', 'مواسير صرف PP صامتة بحلقة مطاطية (PP Silent Push-fit)',
    'مصيدة صرف P (P-Trap) uPVC', 'محبس أرضي مجمّع (Collector Floor Gully)', 'سدادة/كوع تفتيش وتنظيف (Cleanout / Access Fitting)', 'غطاء تهوية للسطح (Roof Vent Cap)',
    'وصلات صرف uPVC (واي/مخفّض/تي صحي/وصلة إصلاح)', 'مواسير uPVC ضغط سكجول 80 (Sch 80)', 'محبس دفن PPR (Concealed Stop Valve)', 'خلاط دفن (Concealed Mixer Valve)',
    'وصلات PPR بسن نحاسي داخلي/خارجي (PPR Brass Adaptor)', 'قوس تعدية PPR (Crossover)', 'سدادة اختبار ضغط PPR (Test Plug)', 'مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)',
    'مصفاة Y نحاس (Y-Strainer)', 'صمام قدم للمضخة (Foot Valve)', 'صمام أمان السخان (Water Heater Safety Valve)', 'قطع غيار السخان (عنصر تسخين/ثرموستات/جلدة)',
    'سخان مياه كهربائي فوري (Instant Electric Heater)', 'مروحة تبريد خزان بالطاقة الشمسية (Solar Tank Cooler)', 'غطاء خزان أرضي/منهل ألمنيوم أو فايبر (Tank & Manhole Cover)', 'حلقة شمع/مطاط لتركيب المرحاض (Wax / Rubber Ring)',
    'مصرف مغسلة أوتوماتيكي (Pop-up / Click-clack Waste)', 'مصافي ألمنيوم (أرضية/ركنية/دش/سطح)', 'مزلّق تركيب مواسير الصرف (Pipe Lubricant)',
    // ═══ 2026-10-13: catalog gap study ═══
    'غراء مواسير PVC', 'عوامة كهربائية (حساس منسوب)', 'مواسير وتمديدات غاز', 'خزان غاز مركزي', 'منظم غاز وكاشف تسرب', 'خزان صرف صحي (بيارة)',
    'مضخة رفع مياه الصرف', 'مجمع توزيع مياه (مانيفولد)', 'سخان غاز فوري', 'مكيف مخفي (دكت سبليت)', 'مواسير نحاس تكييف', 'غاز تبريد (فريون)',
    'عازل مطاطي للأنابيب (أرمافلكس)', 'دكت مرن', 'حامل وقاعدة مكيف', 'مكيف صحراوي', 'شفاط مطبخ تجاري', 'طفاية حريق',
    'نظام إطفاء آلي (FM200/مطابخ)', 'مواد منع انتشار الحريق (فاير ستوب)', 'بطانية حريق وصندوق طفاية',
    'مكيف سبليت', 'مكيف شباك', 'مكيف دولابي', 'مروحة سقف', 'خزان مياه بلاستيك', 'مضخة مياه منزلية (رفع ضغط)', 'فلتر مياه منزلي', 'سخان شمسي',
    // ═══ أنابيب المياه الباردة والساخنة (BOQ: Q WATER INSTALLATIONS) ═══
    // ✅ هادي مواسير المياه الداخلية = ميكانيك
    'أنابيب PPR PN20', 'أنابيب PPR PN25',
    'أنابيب نحاس مياه باردة', 'أنابيب نحاس مياه حارة',
    'أنابيب CPVC مياه حارة', 'أنابيب PEX',
    'أنابيب HDPE PN16 مياه شرب', 'أنابيب HDPE PN10 مياه شرب',
    'أنابيب فولاذية مياه مبردة Schedule 40',
    'أنابيب مياه مبردة Chilled Water',
    'أنابيب حديد مجلفن GI', 'أنابيب معزولة مسبقاً Pre-Insulated (تبريد منطقي)',
    'أنابيب GRP فايبرجلاس',
    // ═══ أنابيب الصرف الصحي الداخلي (BOQ: Q SANITARY) ═══
    // ✅ الصرف الداخلي = ميكانيك (عكس الصرف الخارجي الذي = مدني)
    'أنابيب uPVC صرف صحي',
    'أنابيب PPR تغذية',
    // ═══ الصرف الخارجي والأنابيب (نُقلت من المدني) ═══
    'أنابيب HDPE صرف أمطار (SDR11)',
    'أنابيب خرسانية صرف خارجي', 'أنابيب خرسانية مسلحة RCP',
    'أنابيب حديد مرن Ductile Iron مياه رئيسية',
    'غرف تفتيش خرسانية', 'أغطية منهول حديد', 'مصارف خطية',
    'أنابيب HDPE صرف صحي داخلي',
    'أنابيب حديد زهر Cast Iron صرف صامت',
    // ═══ أنابيب إطفاء الحريق (BOQ: Q FIRE PROTECTION) ═══
    'أنابيب فولاذية لمكافحة الحريق Sprinkler',
    // ═══ الصمامات (BOQ: Valves) ═══
    'صمامات كرة نحاس', 'صمامات كرة ستانلس', 'صمامات بوابة',
    'صمامات فراشة flanged', 'صمامات فحص', 'صمامات تخفيض ضغط PRV',
    'صمامات PICV تحكم ضغط', 'صمامات موتورية 2-Port',
    'صمامات موتورية 3-Port', 'صمامات تصريف',
    // ═══ المضخات (BOQ: Pumps) ═══
    'مضخات مياه مركزية', 'مضخة ضغط Booster Pump',
    'مضخة إطفاء حريق Fire Pump', 'مضخة jockey حريق',
    'مضخة sump صرف', 'مضخة تداول مياه ساخنة',
    'مضخة مياه ري', 'مضخة تغذية كيماوي Dosing',
    // ═══ التبريد والتكييف (BOQ: Q HVAC) ═══
    'وحدة مناولة هواء AHU', 'وحدة مناولة هواء AHU مع عجلة حرارية',
    'وحدة FCU سقفية', 'وحدة FCU كاسيت',
    'مبرد مياه Chiller', 'برج تبريد Cooling Tower',
    'وحدات مكيف VRF خارجية', 'وحدات مكيف VRF داخلية',
    'مجمد حرارة Heat Exchanger', 'مكثف هواء Condenser',
    // ═══ التهوية (BOQ: 25-VENTILATION) ═══
    'مراوح هواء محورية Axial Fan', 'مراوح هواء طرد مركزي',
    'مراوح استخلاص هواء WC',
    // ═══ مجاري الهواء (BOQ: Ductwork) ═══
    'مجاري هواء جلفنايز 0.7mm', 'مجاري هواء جلفنايز 0.8mm',
    'مجاري هواء جلفنايز 1.0mm', 'مجاري هواء جلفنايز 1.2mm',
    'عوازل مجاري هواء فايبر جلاس', 'فتحات هواء', 'موزعات هواء',
    'موازنات هواء Balancing Damper', 'موازنات حريق Fire Damper',
    'ستائر هواء',
    // ═══ خزانات المياه والتمديدات ═══
    'خزان مياه فايبر جلاس', 'خزان ضغط Expansion Vessel',
    'سخانات مياه مركزية', 'سخانات مياه كهربائية',
    'مرشحات مياه', 'أنظمة RO تحلية', 'معالجة مياه كيماوي',
    // ═══ إطفاء الحريق (BOQ: Q FIRE PROTECTION) ═══
    'رؤوس رش مياه Sprinkler',
    'صمام تحكم منطقة Zone Control Valve',
    'خزانات إطفاء حريق', 'بكرة خرطوم حريق Hose Reel',
    'هيدرنت حريق Fire Hydrant', 'لوحة تحكم حريق',
    // ═══ الوصلات والتعليقات ═══
    'فلانشات', 'وصلات أنابيب', 'عوازل اهتزاز Flex',
    'مواسير تمدد Expansion Joint',
    'خراطيم مرنة', 'حوامل وتعليقات أنابيب',
    // ═══ الصحية (BOQ: 21-MECH SANITARY) ═══
    'مرحاض WC مع خزان', 'مرحاض WC ذوي احتياجات خاصة',
    'مغسلة Wash Basin', 'حوض مطبخ',
    'مجلى Kitchen Sink', 'حوض استحمام',
    'دش Shower', 'مبولة Urinal',
    'صنبور مياه', 'خلاط مياه Mixer',
    'مصرف أرضي Floor Drain 100x100',
    'مصرف سقف Roof Drain 100mm',
    // ═══ لوازم سباكة بسيطة (محلات صغيرة) ═══
    'خلاط مغسلة', 'خلاط مطبخ', 'خلاط دش', 'خلاط شطاف', 'صنبور حديقة',
    'محبس زاوية', 'محبس عمومي', 'وصلة كوع PVC', 'وصلة تي PVC',
    'كوبلن نحاس', 'لوازم نحاسية', 'سيفون كرسي', 'سيفون مغسلة',
    'مصفاة أرضية', 'خرطوم سخان مرن', 'خرطوم شطاف', 'وصلة مرنة',
    'شريط تفلون', 'معجون سباكة', 'جلدة محبس', 'حشوة عزل',
    'رأس دش', 'دش مطري', 'عوامة خزان', 'طفاية سيفون كرسي',
    'إكسسوار حمام (حامل مناديل)', 'معلاق منشفة',
    // ═══ معالجة المياه (BOQ: 22-DISPOSAL) ═══
    'فصال دهون Grease Interceptor',
    'حوض ترسيب مياه أمطار',
    // ═══ أنابيب CPVC بأقطار محددة (BOQ: Cold Water) ═══
    'أنابيب CPVC',
    // ═══ عدادات مياه وخزانات ═══
    'عداد مياه 100mm', 'خزان مياه GRP 20م³',
    'خزان مياه GRP 434م³', 'وعاء تمدد Expansion Vessel',
    // ═══ أنابيب مياه مبردة بأقطار محددة (BOQ: 23) ═══
    'أنابيب مياه مبردة فولاذية Sch40',
    'أنابيب مياه مبردة مدفونة Pre-insulated',
    'عازل أنابيب مياه مبردة Fibreglass 1/2"',
    'عازل أنابيب مياه مبردة Fibreglass 1"',
    // ═══ وقود (BOQ: 26-FUEL) ═══
    'خزان وقود ديزل تحت أرضي', 'خزان وقود ديزل يومي',
    'مضخة نقل وقود', 'وحدة تصفية وقود', 'خطوط تغذية وقود',
  ],
  equipment: [
    // ═══ 2026-10-19: brand catalogs (Hilti, fischer, Würth, Fosroc, Sika, MBS, Mapei, Bostik, Henkel, Soudal…) + Masdar ═══
    'ماكينة ثني حديد التسليح (Rebar Bender)', 'ماكينة قص حديد التسليح (Rebar Cutter)',
    // ═══ 2026-10-13: catalog gap study ═══
    'بوب كات (لودر صغير)', 'حاوية مخلفات بناء', 'دورات مياه متنقلة', 'ماكينة قص الخرسانة والأسفلت', 'ماكينة تنعيم الخرسانة (هليكوبتر)',
    // ═══ آليات ثقيلة (حفر/رفع/نقل) ═══
    'حفارة (بوكلين)', 'شيول لودر', 'بلدوزر', 'جريدر',
    'رافعة برجية', 'كرين متحرك', 'رافعة شوكية', 'ونش رفع',
    'شاحنة قلاب', 'صهريج مياه', 'مقطورة نقل', 'لوري نقل',
    // ═══ معدات خرسانة ═══
    'خلاطة خرسانة', 'مضخة خرسانة', 'هزاز خرسانة', 'محطة خلط',
    // ═══ معدات خفيفة ═══
    'دكاكة (كومباكتور)', 'رصاصة دك', 'هراس أسطواني',
    'مولد كهرباء ديزل', 'كمبروسر هواء', 'ضاغط هواء',
    'طرمبة غطاسة', 'مضخة نزح مياه',
    // ═══ سقالات ومنصات ═══
    'سقالات معدنية', 'منصة رفع مقصية', 'رافعة بوم',
    'سلالم ألمنيوم', 'جاكات تدعيم',
    // ═══ خردوات ومواد إضافية (بحث Madar) ═══
    'ماكينة لحام انفرتر آرك (MMA)',
    'ماكينة لحام ميغ/ماغ (MIG/MAG) بالسلك',
    'ماكينة لحام تيج (TIG) أرجون',
    'ماكينة قطع بلازما',
    'إلكترود لحام (بارة لحام)',
    'سلك لحام ميغ (بكرة سلك)',
    'سلك لحام تيج (بارة أرجون)',
    'قناع لحام (خوذة لحام)',
    'ماسك (كباس) اللحام - إلكترود هولدر',
    'مشبك أرضي لحام (كلامة ماس)',
    'كيبل لحام (نحاس)',
    'طقم لحام أكسجين وأسيتيلين (لحام غاز)',
    'غسالة ضغط عالي كهربائية منزلية',
    'غسالة ضغط عالي كهربائية صناعية (تجارية)',
    'غسالة ضغط عالي بنزين',
    'غسالة ضغط عالي ديزل',
    'غسالة ضغط ماء ساخن (بخار)',
    'خرطوم ضغط عالي (وايت) للغسالة',
    'مسدس رش (طبنجة) للغسالة ضغط عالي',
    'لانس (بندقية) رش مع فوهة قابلة للتعديل',
    'فرشاة تنظيف أسطح دوّارة للغسالة',
    'خزان فوم (رغوة) صابون للغسالة ضغط عالي',
    // ═══ خردوات إضافية (دفعة 2 - تدقيق Madar) ═══
    'منظم غاز لحام (ريجيليتر)',
    'عربة أسطوانات غاز',
  ],
  supply_store: [
    // ═══ 2026-10-19: brand catalogs (Hilti, fischer, Würth, Fosroc, Sika, MBS, Mapei, Bostik, Henkel, Soudal…) + Masdar ═══
    'انكر وتد (Wedge Anchor / Through Bolt)', 'انكر دروب إن (Drop-in Anchor)', 'انكر كُم (Sleeve Anchor)', 'برغي خرسانة (Concrete Screw / Screw Anchor)',
    'انكر ثقيل للأحمال (Heavy-duty Anchor)', 'انكر سقف بمسمار للتعليق (Ceiling Nail Anchor)', 'قضيب انكر كيميائي مع صامولة ووردة (Chemical Anchor Rod / Stud)', 'مسدس حقن الانكر الكيميائي (Injection Dispenser)',
    'فوهة خلط للانكر الكيميائي (Static Mixer Nozzle)', 'فرشاة ومنفاخ تنظيف ثقوب الانكر (Hole Cleaning Brush & Blow-out Pump)', 'وردة تعبئة للانكرات (Filling / Dynamic Washer)', 'خابور إطار للأبواب والشبابيك (Frame Fixing)',
    'خابور معدني للجدران المفرغة والجبس بورد (Metal Cavity Anchor / Molly)', 'خابور فراشة/توجل للأسقف المفرغة (Spring / Tilt Toggle)', 'خابور جبس بورد بلاستيك/زماك ذاتي الثقب (Self-drill Plasterboard Plug)', 'خابور الخرسانة الخلوية (الطوب الخفيف/سيبوريكس) (Aerated Concrete Plug)',
    'طقم تثبيت مغسلة ومرحاض (Sanitary Fixing Set)', 'مسامير بارود للخرسانة والحديد (Powder-actuated Nails)', 'طلقات بارود (Powder Cartridges / Boosters)', 'مسامير مسدس الغاز للخرسانة (Gas Nails)',
    'مسمار بارود مع مشبك سقف/كابل (Ceiling & Conduit Clip Nail)', 'برغي ذاتي الحفر مع وردة مطاط للساندوتش بانل (Self-drilling Screw + EPDM Washer)', 'برغي خشب وتشبورد (Chipboard / Wood Screw)', 'صامولة وصل طويلة للقضبان الملولبة (Coupling Nut)',
    'كلبس ماسورة وسرج تثبيت (Pipe / Conduit Saddle Clip)', 'فوم مسدس احترافي (Gun-grade PU Foam)', 'منظف الفوم (PU Foam Cleaner)', 'لاصق تركيب بديل المسامير (Construction / Mounting Adhesive)',
    'معجون إيبوكسي ثنائي للتصليح والتثبيت (2K Epoxy Putty / Adhesive)', 'بخاخ جلفنة باردة (زنك) (Zinc Spray / Cold Galvanizing)', 'بخاخ مزيل صدأ ومُفكّك براغي (Penetrating Oil / Rust Remover)', 'مثبت براغي سائل (Threadlocker)',
    'ريشة همر SDS-max للخرسانة (SDS-max Hammer Drill Bit)', 'ريشة همر مجوفة بشفط الغبار (Hollow Dust-extraction Drill Bit)', 'ريشة كور ماسية للخرسانة (Diamond Core Bit)', 'منشار كأس (Hole Saw)',
    'ريشة بلاط وبورسلان ماسية (Diamond Tile Drill Bit)', 'ريشة دريل خرسانة وطوب عادية (Masonry Drill Bit)', 'ريشة خشب (Wood Drill Bit: Brad-point / Spade / Auger)', 'ريشة حديد مدرّجة (Step Drill Bit)',
    'أزميل همر (مدبب/مسطح) (Hammer Chisel)', 'قرص ماسي لقص الخرسانة والحجر (Diamond Cutting Blade)', 'قرص كوب ماسي للتجليخ (Diamond Cup Wheel)', 'شفرة منشار ترددي (سيف) (Reciprocating Saw Blade)',
    'شفرة منشار أركت (Jigsaw Blade)', 'لقم مفك وبوكسات تثبيت (Screwdriver Bits & Nut Setters)', 'غراء تماس (كونتاكت)', 'غراء تماس مائي (بدون رائحة)',
    'غراء خشب أبيض (PVA)', 'غراء خشب بولي يوريثان (D4 مقاوم للماء)', 'لاصق إيبوكسي مكونين (أنبوبين/سرنجة)', 'معجون إيبوكسي للإصلاح (عصا)',
    'غراء فوري (سوبر جلو)', 'لاصق مونتاج (تثبيت بدون مسامير)', 'لاصق هايبرد عالي الالتصاق (High Tack)', 'لاصق ستايروفوم وكرانيش بوليسترين',
    'أصابع شمع غراء حراري (هوت ميلت)', 'شريط ماسكنج ورقي (للدهان)', 'شريط لاصق شفاف للتغليف (كرتون)', 'شريط قماشي (داكت تيب)',
    'شريط لاصق وجهين رقيق (ورقي/شفاف)', 'شريط لاصق وجهين فوم (للمرايا واللوحات)', 'شريط ألمنيوم (فويل تيب)', 'شريط بيوتيل لاصق للتسربات (وجه ألمنيوم)',
    'شريط بيوتيل وجهين (للصاج والزجاج)', 'شريط مانع انزلاق للدرج', 'شريط فوم عازل للأبواب والنوافذ', 'معجون حشو شقوق جاهز (أنبوب/علبة)',
    'معجون خشب (حشوة خشب)', 'معجون بوليستر (معجون حديد/سيارات)', 'فوم منخفض التمدد للأبواب والنوافذ', 'مسدس فوم معدني',
    'منظف الفوم والمسدس (أسيتون بخاخ)', 'مزيل السيليكون والمواد اللاصقة', 'مزيل بقايا الأسمنت والمونة عن البلاط', 'أسيتون صناعي',
    'مزيل دهانات (Paint Stripper)', 'بخاخ متعدد الأغراض (مزيل صدأ ومزلّق)', 'محبس زاوية مزدوج (Double Angle Valve)', 'ساعة ضغط ماء ومضخة اختبار ضغط (Pressure Gauge / Test Pump)',
    'خرطوم حديقة مع بكرة (Garden Hose & Reel)', 'مسدس رشّ ماء للخرطوم (Hose Nozzle Gun)', 'خرطوم هواء وغاز ضغط عالٍ (Air & Gas Hose)', 'خرطوم مسطّح للنزح (Lay-flat Hose)',
    'بكرة كيبل تمديد معدنية (Cable Reel)', 'ترمنال بلوك وفيوز (Terminal Block & Fuses)', 'محوّل جهد 110/220 (Auto Transformer)', 'لمبة أنبوبية ليد T8 (LED Tube)',
    'منفاخ هواء كهربائي (Air Blower)', 'مسدس هواء ساخن (Heat Gun)', 'مسحج ورواتر خشب كهربائي (Planer / Router)', 'منشار زاوية ألمنيوم وخشب (Mitre Saw)',
    'صنفرة كهربائية مدارية (Orbital Sander)', 'مفتاح صدمة شحن (Cordless Impact Wrench)', 'ماكينة قص حديد سنسية (Cut-off Machine / Chop Saw)', 'منشار رخام كهربائي (Marble Cutter)',
    'متر قياس ليزر (Laser Distance Meter)', 'مسدس برشام يدوي ومسامير برشام (Hand Riveter & Rivets)', 'مقص صاج (Aviation Snips)', 'مفتاح مواسير وقطّاعة مواسير (Pipe Wrench & Cutter)',
    'دايز تسنين المواسير (Pipe Threading Die)', 'مفاتيح ربط (بلدي/شق/ألن) (Spanners & Allen Keys)', 'كماشة حدّاد تسليح (Concretor\'s Nippers)', 'عتلة نجّار (Claw / Wrecking Bar)',
    'كريك (مجرفة) ومكنسة شارع (Shovel & Street Broom)', 'سطل مطاطي للمونة (Rubber Mortar Bucket)', 'منشار يدوي خشب وقوس منشار حديد (Hand Saw & Hacksaw)', 'زاوية نجار وقدمة قياس (Square & Caliper)',
    'كتر وشفرات (Utility Knife & Blades)', 'طقم أدوات معزولة للكهربائي 1000V (Insulated Tool Set)', 'قلم قص بلاط ومسطرة قص رخام (Tile Scribe & Cutting Rule)', 'مشمّع (طربال) بولي إيثيلين (PE Tarpaulin)',
    'فيلم تغليف مطاطي (Stretch Film)', 'شريط ربط بلاستيكي/حديدي وكلبسات (Strapping Band)', 'ألواح حماية الأرضيات أثناء التشطيب (Floor Protection Board)', 'حامي إطار الباب وزوايا الدرج المؤقت (Door Jamb & Stair Protector)',
    'برميل وسلسلة وحاجز بلاستيكي مروري (Traffic Drum, Chain & Barrier Mesh)', 'جنزير (سلسلة) حديد مجلفن (Galvanized Chain)', 'برغي سداسي مجلفن DIN 933 (Hex Bolt)', 'برغي ذاتي التسنين برأس مسطّح مع خابور (Self-tapping Screw + Plug)',
    'مسامير فولاذ للخرسانة (Hardened Concrete Nails)', 'خابور مسمار بلاستيك سريع (Nail-in / Hammer-drive Plug)', 'بخاخ دهان تخطيط وتعليم المواقع (Marking Spray Paint)',
    // ═══ 2026-10-13: catalog gap study ═══
    'بخاخ دهان (سبراي)', 'مشترك كهرباء (موزع أفياش)', 'جهاز قياس كهرباء (أفوميتر)', 'لوحات إرشادية للسلامة والإخلاء', 'مطرقة تكسير كهربائية (هيلتي)', 'مسدس سيليكون',
    'مالج ومسطرين وأدوات لياسة', 'منشار كهربائي (دائري/أركت)', 'ميزان ليزر', 'مقص بلاط (قطاعة سيراميك)', 'مسدس دهان (رشاش)', 'مسدس مسامير ودباسة',
    'مكنسة كهربائية صناعية', 'خلاط معجون ودهان كهربائي', 'صندوق عدة', 'سيخ مسنن (قضيب ملولب)', 'وردات (حلقات معدنية)', 'أنكر بولت',
    'أقماع وحواجز مرورية', 'شريط تحذيري', 'شبكة أمان للمباني', 'أفرول عمل', 'حقيبة إسعافات أولية', 'سدادات وواقيات الأذن',
    'عربة يد (عربانة)',
    // ═══ سباكة بسيطة ═══
    'خلاط مغسلة', 'خلاط مطبخ', 'خلاط دش', 'خلاط شطاف', 'صنبور حديقة',
    'محبس زاوية', 'محبس عمومي', 'كوع PVC', 'تي PVC', 'كوبلن',
    'سيفون كرسي', 'سيفون مغسلة', 'مصفاة أرضية',
    'خرطوم سخان', 'خرطوم شطاف', 'وصلة مرنة',
    'شريط تفلون', 'معجون سباكة', 'جلدة محبس',
    'رأس دش', 'عوامة خزان', 'طفاية سيفون',
    // ═══ كهرباء بسيطة ═══
    'سلك كهرباء 2.5مم', 'سلك كهرباء 4مم', 'كابل تمديد',
    'مفتاح إنارة', 'بريزة', 'علبة كهرباء', 'قاطع MCB صغير',
    'لمبة LED', 'لمبة سبوت', 'كشاف صغير', 'أباجورة',
    // 2026-11-12: lighting gaps (owner)
    'لمبة ليد عادية E27',
    'لمبة شمعة E14',
    'لمبة سبوت GU10 / MR16',
    'محول هالوجين وسبوت 12 فولت',
    'لمبة ليد قابلة للشحن (طوارئ)',
    'لمبة ليد بحساس حركة',
    'لمبة هالوجين R7s للكشافات',
    'قاعدة لمبة (دواية) E27 / E14',
    'لمبة نيون فلورسنت T8 تقليدية',
    'ستارتر وبلاست لمبة النيون',
    'نيون ليد 120 سم (جسم مع اللمبة)',
    'فيش كهرباء', 'محول صغير', 'شريط لحام كهرب',
    // ═══ عُدد ═══
    'مفك عادي', 'مفك صليبة', 'طقم مفكات', 'زرادية', 'كماشة',
    'مفتاح ربط', 'مطرقة', 'متر قياس', 'ميزان ماء',
    'دريل كهربائي', 'دريل شحن', 'صاروخ تجليخ',
    'ريشة دريل حديد', 'ريشة همر', 'قرص قص', 'قرص تجليخ', 'ورق صنفرة',
    // ═══ مسامير ═══
    'مسامير حديد', 'براغي', 'صواميل', 'رول بلت', 'فيشر',
    'خوابير تثبيت', 'مسامير صاج',
    // ═══ سلامة ومستهلكات ═══
    'خوذة سلامة', 'قفازات عمل', 'نظارة واقية', 'حذاء سلامة',
    'سترة عاكسة', 'كمامة غبار', 'حزام أمان',
    'شريط لاصق', 'حبل', 'بطارية',
    // ═══ دهانات ولواصق ═══
    'دهان داخلي', 'فرشاة دهان', 'رولة دهان', 'تنر',
    'سيليكون', 'فوم عازل', 'لاصق قوي', 'صمغ',
    'سيليكون شفاف (أنبوب)', 'سيليكون صحي للحمامات (أنبوب)', 'سيليكون حراري (أنبوب)', 'فوم بخاخ (علبة)', 'مانع تسرب مائي للأسطح (سطل)',
    // ═══ خردوات ومواد إضافية (بحث Madar) ═══
    'مفصلة فراشة',
    'مفصلة أوتوماتيك (زنبرك)',
    'مفصلة كوباية (مطبخ) كونسيلد',
    'مفصلة أرضية (كباس أرضي)',
    'مجرى درج تلسكوبي رمان بلي',
    'مجرى درج عادي (بكرة)',
    'مجرى درج مخفي هيدروليك (أندرماونت)',
    'مفصلة بيانو (شريطية)',
    'مفصلة جناح (ركنة مطبخ)',
    'مفصلة زاوية (كنار) للأثاث',
    'قلب كالون (سلندر يوروبروفايل)',
    'كالون دفن (قفل مورتيس)',
    'كباس باب (قفل مقبض دائري)',
    'قفل ديدبولت (كالون ترباس)',
    'قفل رقمي / ذكي للباب',
    'قفل درج / خزانة',
    'مزلاج باب (سقاطة / ترباس)',
    'قفل باب سحاب (ألمنيوم / زجاج)',
    'قفل بادلوك (كالون معلاق)',
    'كالون فندقي بالبطاقة',
    'كباس باب علوي هيدروليكي',
    'كباس باب بذراع منزلق (سلايد)',
    'كباس باب صغير (للأبواب الخفيفة)',
    'كباس باب زجاجي (بتشمنت)',
    'مغلق باب أرضي (فلور سبرنج)',
    'مشط فلور سبرنج (لوح ستانلس علوي)',
    'حامل باب مغناطيسي (ماسك مغناطيس)',
    'مصد باب مطاطي (ستوبر)',
    'منظم أولوية إغلاق الأبواب (سيلكتور)',
    'ذراع/طقم تركيب كباس باب (قطع غيار)',
    'ماسك/مثبت باب علوي (هولد أوبن)',
    'مقبض باب اكبح (لوحة)',
    'مقبض كرة باب',
    'مقبض باب مع كباس (اكبح كامل بقفل)',
    'مقبض سحب باب زجاج (H)',
    'مقبض دفع وسحب لوح (Push/Pull)',
    'مقبض خزائن ومطابخ (يد سحب)',
    'زر (بزلة) خزانة',
    'روزيتة (طقم روزيتات مقبض)',
    'دفاية باب (لوحة حماية)',
    'مقبض باب رئيسي فخم (شنطة)',
    'مسكة باب حديد سحب (كوع)',
    // ═══ خردوات إضافية (دفعة 2 - تدقيق Madar) ═══
    'براغي جبس بورد (دراي وول)',
    'مخرج طوارئ (بار دفع)',
    'قفل مغناطيسي كهربائي (ماغلوك)',
    'ضبة كهربائية (إلكتريك سترايك)',
    'قفازات لحام جلد',
    'كابح صدمة أدراج/أبواب (سوفت كلوز)',
    // ═══ إضافات Madar (دفعة 3) ═══
    'شريط عزل كهربائي (تيب لحام)',
    'شريط تلوين وترميز الكابلات',
    'أربطة كابلات نايلون (تايات)',
    'جلبة كابل (كبس/جلاند)',
    'سلك سحب أسلاك (فيش تيب)',
    'شمع تزليق سحب الكابلات',
    'وصلة توصيل واغو (كلامة)',
    'علبة توزيع كهرباء (بوكس)',
    'كوبلن مواسير كهرباء (وصلة كوندويت)',
    'كم حراري عازل (هيت شرنك)',
    'قرص قص حديد',
    'قرص قص إنوكس (استيل)',
    'قرص قص رخام وبلاط',
    'قرص تجليخ حديد',
    'قرص فلاب (صنفرة)',
    'فرشاة سلك (كأس / دائرية)',
    'شفرة منشار حديد (بشر)',
    'شفرة منشار خشب دائري',
    'حجر شحذ وسن',
  ],
}

// Extended unit options based on BOQ standards
export const UNIT_OPTIONS_EXTENDED: Record<string, string[]> = {
  weight: ['طن MT', 'كغ', 'غرام'],
  length: ['م.ط', 'مم', 'قدم'],
  area: ['م²', 'قدم²'],
  volume: ['م³', 'لتر', 'جالون'],
  count: ['قطعة', 'عدد', 'لوحة', 'طقم', 'مجموعة', 'جهاز', 'وحدة'],
  packaging: ['كيس', 'ربطة', 'لفة', 'كرتون', 'براميل'],
  electrical: ['م.ط', 'قطعة', 'لوحة', 'نقطة'],
}

export const UNIT_OPTIONS = [
  // الوزن (BOQ: ton, kg)
  'طن MT', 'طن', 'كغ',
  // الطول (BOQ: m, lm, rm)
  'م.ط', 'متر',
  // المساحة (BOQ: m²)
  'م²',
  // الحجم (BOQ: m³, litre)
  'م³', 'لتر',
  // العد (BOQ: Nr, No, Item, Each)
  'عدد', 'قطعة', 'وحدة', 'جهاز', 'طقم', 'مجموعة', 'منظومة',
  // التغليف
  'ربطة', 'كيس', 'لفة', 'لوحة', 'برميل', 'جالون',
  // التأجير (آليات ومعدات)
  'يوم', 'شهر',
  // الكهرباء والأنظمة (BOQ: point, circuit)
  'نقطة', 'دائرة', 'موقع', 'اتصال',
  // أعمال الموقع (BOQ: item, lump sum)
  'بند', 'مقطوعية', 'إجمالي',
]

// المناطق الإدارية السعودية (13 منطقة)
export const REGIONS = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'القصيم', 'المنطقة الشرقية',
  'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف',
]

// ترجمة المناطق (عربي → إنجليزي)
export const REGION_LABELS: Record<string, { en: string; ur: string }> = {
  'الرياض': { en: 'Riyadh', ur: 'ریاض' },
  'مكة المكرمة': { en: 'Makkah', ur: 'مکہ' },
  'المدينة المنورة': { en: 'Madinah', ur: 'مدینہ' },
  'القصيم': { en: 'Qassim', ur: 'قصیم' },
  'المنطقة الشرقية': { en: 'Eastern Province', ur: 'مشرقی صوبہ' },
  'عسير': { en: 'Asir', ur: 'عسیر' },
  'تبوك': { en: 'Tabuk', ur: 'تبوک' },
  'حائل': { en: 'Hail', ur: 'حائل' },
  'الحدود الشمالية': { en: 'Northern Borders', ur: 'شمالی سرحدیں' },
  'جازان': { en: 'Jazan', ur: 'جازان' },
  'نجران': { en: 'Najran', ur: 'نجران' },
  'الباحة': { en: 'Al Bahah', ur: 'الباحہ' },
  'الجوف': { en: 'Al Jouf', ur: 'الجوف' },
}

// مدن كل منطقة
export const CITIES_BY_REGION: Record<string, { ar: string; en: string }[]> = {
  'الرياض': [
    { ar: 'الرياض', en: 'Riyadh' }, { ar: 'الخرج', en: 'Al Kharj' },
    { ar: 'الدوادمي', en: 'Dawadmi' }, { ar: 'المجمعة', en: 'Al Majmaah' },
    { ar: 'الزلفي', en: 'Az Zulfi' }, { ar: 'وادي الدواسر', en: 'Wadi ad-Dawasir' },
    { ar: 'عفيف', en: 'Afif' }, { ar: 'الأفلاج', en: 'Al Aflaj' },
  ],
  'مكة المكرمة': [
    { ar: 'مكة المكرمة', en: 'Makkah' }, { ar: 'جدة', en: 'Jeddah' },
    { ar: 'الطائف', en: 'Taif' }, { ar: 'رابغ', en: 'Rabigh' },
    { ar: 'القنفذة', en: 'Al Qunfudhah' }, { ar: 'الليث', en: 'Al Lith' },
  ],
  'المدينة المنورة': [
    { ar: 'المدينة المنورة', en: 'Madinah' }, { ar: 'ينبع', en: 'Yanbu' },
    { ar: 'العلا', en: 'AlUla' }, { ar: 'بدر', en: 'Badr' }, { ar: 'خيبر', en: 'Khaybar' },
  ],
  'القصيم': [
    { ar: 'بريدة', en: 'Buraidah' }, { ar: 'عنيزة', en: 'Unaizah' },
    { ar: 'الرس', en: 'Ar Rass' }, { ar: 'المذنب', en: 'Al Midhnab' },
  ],
  'المنطقة الشرقية': [
    { ar: 'الدمام', en: 'Dammam' }, { ar: 'الخبر', en: 'Khobar' },
    { ar: 'الظهران', en: 'Dhahran' }, { ar: 'الأحساء', en: 'Al Ahsa' },
    { ar: 'الجبيل', en: 'Jubail' }, { ar: 'القطيف', en: 'Qatif' },
    { ar: 'حفر الباطن', en: 'Hafar Al Batin' }, { ar: 'الخفجي', en: 'Khafji' },
  ],
  'عسير': [
    { ar: 'أبها', en: 'Abha' }, { ar: 'خميس مشيط', en: 'Khamis Mushait' },
    { ar: 'بيشة', en: 'Bisha' }, { ar: 'النماص', en: 'An Namas' },
  ],
  'تبوك': [
    { ar: 'تبوك', en: 'Tabuk' }, { ar: 'ضباء', en: 'Duba' },
    { ar: 'تيماء', en: 'Tayma' }, { ar: 'الوجه', en: 'Al Wajh' }, { ar: 'نيوم', en: 'NEOM' },
  ],
  'حائل': [
    { ar: 'حائل', en: 'Hail' }, { ar: 'بقعاء', en: 'Baqaa' }, { ar: 'الشنان', en: 'Ash Shinan' },
  ],
  'الحدود الشمالية': [
    { ar: 'عرعر', en: 'Arar' }, { ar: 'رفحاء', en: 'Rafha' }, { ar: 'طريف', en: 'Turaif' },
  ],
  'جازان': [
    { ar: 'جازان', en: 'Jazan' }, { ar: 'صبيا', en: 'Sabya' },
    { ar: 'أبو عريش', en: 'Abu Arish' }, { ar: 'صامطة', en: 'Samtah' },
  ],
  'نجران': [
    { ar: 'نجران', en: 'Najran' }, { ar: 'شرورة', en: 'Sharurah' },
  ],
  'الباحة': [
    { ar: 'الباحة', en: 'Al Bahah' }, { ar: 'بلجرشي', en: 'Baljurashi' },
    { ar: 'المخواة', en: 'Al Makhwah' },
  ],
  'الجوف': [
    { ar: 'سكاكا', en: 'Sakaka' }, { ar: 'القريات', en: 'Qurayyat' }, { ar: 'دومة الجندل', en: 'Dumat Al Jandal' },
  ],
}

export function getRegionLabel(region: string, locale: string): string {
  if (locale === 'ar') return region
  return REGION_LABELS[region] ? (locale === 'ur' ? REGION_LABELS[region].ur : REGION_LABELS[region].en) : region
}

// =============================================
// DATABASE MODELS
// =============================================
export interface Profile {
  id: string
  role: UserRole
  company_name_ar: string
  company_name_en?: string
  commercial_registration?: string
  vat_number?: string
  phone: string
  city?: string
  region?: string
  verification_status: VerificationStatus
  subscription_plan: SubscriptionPlan
  subscription_expires_at?: string
  license_url?: string
  cr_url?: string
  rating_avg: number
  rating_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  // classification / verification
  supplier_tier?: 'manufacturer' | 'commercial' | 'local'
  contractor_grade?: 'A' | 'B' | 'C' | 'D'
  min_order_value?: number
  rejection_reason?: string
  national_short_address?: string
  latitude?: number
  longitude?: number
  // official CR data pulled from Wathq
  cr_verification_source?: 'manual' | 'wathq'
  cr_verified_at?: string
  cr_official_name?: string
  cr_activity?: string
  cr_status?: string
  cr_issue_date?: string
  cr_expiry_date?: string
  cr_data?: any
  // joined
  sectors?: Sector[]
}

export interface Product {
  id: string
  supplier_id: string
  name: string
  sector: Sector
  unit: string
  base_price?: number
  specifications?: string[]
  description?: string
  delivery_available: boolean
  vat_invoice: boolean
  deferred_payment: boolean
  warranty: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  supplier?: Profile
}

export interface RFQ {
  id: string
  contractor_id: string
  sector: Sector
  product_name: string
  specification?: string
  quantity: number
  unit: string
  region: string
  city?: string
  delivery_required: boolean
  vat_invoice_required: boolean
  hide_identity: boolean
  sub_category?: string | null
  estimated_value?: number | null
  target_tiers?: string[] | null   // null/empty = open to all supplier tiers
  verified_only?: boolean          // only verified suppliers may see/offer
  nearby_only?: boolean            // only suppliers in the same region
  delivery_location?: string | null // detailed delivery address when delivery required
  notes?: string
  status: RFQStatus
  expires_at: string
  offer_count: number
  created_at: string
  // joined
  contractor?: Profile
  offers?: Offer[]
}

export interface Offer {
  id: string
  rfq_id: string
  supplier_id: string
  total_price: number
  unit_price?: number
  delivery_days?: number
  notes?: string
  status: OfferStatus
  po_number?: string
  accepted_at?: string
  created_at: string
  // joined
  supplier?: Profile
  rfq?: RFQ
}

export interface Conversation {
  id: string
  contractor_id: string
  supplier_id: string
  rfq_id?: string
  last_message?: string
  last_message_at: string
  contractor_unread: number
  supplier_unread: number
  created_at: string
  // joined
  contractor?: Profile
  supplier?: Profile
  rfq?: RFQ
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  type: MessageType
  content?: string
  offer_id?: string
  file_url?: string
  is_read: boolean
  created_at: string
  // joined
  sender?: Profile
  offer?: Offer
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface Review {
  id: string
  reviewer_id: string
  reviewed_id: string
  offer_id?: string
  rating: number
  comment?: string
  created_at: string
  reviewer?: Profile
}

// =============================================
// FORM SCHEMAS
// =============================================
export interface RegisterFormData {
  role: UserRole
  company_name_ar: string
  company_name_en?: string
  commercial_registration: string
  vat_number?: string
  phone: string
  email: string
  password: string
  region: string
  city: string
  sectors: Sector[]
}

export interface RFQFormData {
  sector: Sector
  product_name: string
  specification?: string
  quantity: number
  unit: string
  region: string
  city?: string
  delivery_required: boolean
  vat_invoice_required: boolean
  hide_identity: boolean
  notes?: string
  validity_hours: 24 | 48 | 72 | 168
}

export interface OfferFormData {
  rfq_id: string
  total_price: number
  delivery_days: number
  notes?: string
}

export interface ProductFormData {
  name: string
  sector: Sector
  unit: string
  base_price?: number
  specifications: string[]
  description?: string
  delivery_available: boolean
  vat_invoice: boolean
  deferred_payment: boolean
  warranty: boolean
}

// =============================================
// API RESPONSES
// =============================================
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

// =============================================
// DASHBOARD STATS
// =============================================
export interface ContractorStats {
  activeRFQs: number
  totalOffers: number
  completedDeals: number
  totalSavings: number
}

export interface SupplierStats {
  newRequests: number
  sentOffers: number
  completedDeals: number
  totalRevenue: number
  responseRate: number
  acceptanceRate: number
}

export interface AdminStats {
  totalUsers: number
  verifiedSuppliers: number
  activeContractors: number
  monthlyRevenue: number
  pendingLicenses: number
  totalRFQs: number
}

// =============================================
// SUBCONTRACTOR & CLASSIFICATION TYPES
// =============================================

export type ContractorGrade = 'A' | 'B' | 'C' | 'D'
export type SubRequestStatus = 'open' | 'closed' | 'expired' | 'cancelled'
export type SubOfferStatus = 'pending' | 'accepted' | 'rejected'

export type SubcontractorSpecialty =
  | 'painting' | 'tiling' | 'electrical' | 'plumbing'
  | 'hvac' | 'gypsum' | 'fire_safety' | 'security'
  | 'steel_concrete' | 'insulation' | 'aluminum' | 'landscaping'

export const GRADE_LABELS: Record<ContractorGrade, { ar: string; desc: string; cap: string; color: string }> = {
  A: { ar: 'أ', desc: 'الدرجة الأولى', cap: 'فوق 100 مليون ريال', color: '#D4A543' },
  B: { ar: 'ب', desc: 'الدرجة الثانية', cap: '30–100 مليون ريال', color: '#0B2438' },
  C: { ar: 'ج', desc: 'الدرجة الثالثة', cap: '5–30 مليون ريال', color: '#3B6D11' },
  D: { ar: 'د', desc: 'الدرجة الرابعة', cap: 'أقل من 5 مليون ريال', color: '#888780' },
}

export const SPECIALTY_LABELS: Record<SubcontractorSpecialty, { ar: string; en: string; ur: string }> = {
  painting:      { ar: 'دهانات',              en: 'Painting',         ur: 'پینٹنگ' },
  tiling:        { ar: 'بلاط وتبليط',          en: 'Tiling',           ur: 'ٹائلنگ' },
  electrical:    { ar: 'أعمال كهربائية',       en: 'Electrical',       ur: 'الیکٹریکل' },
  plumbing:      { ar: 'أعمال صحية',           en: 'Plumbing',         ur: 'پلمبنگ' },
  hvac:          { ar: 'تكييف وتهوية',          en: 'HVAC',             ur: 'ایئر کنڈیشنگ' },
  gypsum:        { ar: 'جبس وديكور',            en: 'Gypsum & Decor',   ur: 'جپسم' },
  fire_safety:   { ar: 'حريق وإنذار',          en: 'Fire Safety',      ur: 'فائر سیفٹی' },
  security:      { ar: 'أمن ومراقبة',          en: 'Security Systems', ur: 'سکیورٹی' },
  steel_concrete:{ ar: 'حديد وخرسانة',          en: 'Steel & Concrete', ur: 'لوہا اور کنکریٹ' },
  insulation:    { ar: 'عزل حراري ومائي',       en: 'Insulation',       ur: 'موصلیت' },
  aluminum:      { ar: 'أبواب ونوافذ ألمنيوم',  en: 'Aluminum Works',   ur: 'المونیم' },
  landscaping:   { ar: 'تنسيق مواقع',           en: 'Landscaping',      ur: 'لینڈ اسکیپنگ' },
}

export interface ContractorClassification {
  id: string
  profile_id: string
  contractor_grade?: ContractorGrade
  grade_certificate_url?: string
  grade_expires_at?: string
  is_subcontractor: boolean
  years_experience: number
  max_project_value?: number
  specialties?: SubcontractorSpecialty[]
}

export interface SubcontractorRequest {
  id: string
  requester_id: string
  specialty: SubcontractorSpecialty
  min_grade?: ContractorGrade
  region: string
  city?: string
  project_value?: number
  start_date?: string
  duration_months?: number
  description?: string
  requires_permit: boolean
  requires_warranty: boolean
  status: SubRequestStatus
  expires_at: string
  offer_count: number
  created_at: string
  requester?: Profile
  offers?: SubcontractorOffer[]
}

export interface SubcontractorOffer {
  id: string
  request_id: string
  supplier_id: string
  proposed_value?: number
  proposed_duration_months?: number
  notes?: string
  status: SubOfferStatus
  created_at: string
  contractor?: Profile
}

export interface SubRequestFormData {
  specialty: SubcontractorSpecialty
  min_grade?: ContractorGrade
  region: string
  city?: string
  project_value?: number
  start_date?: string
  duration_months?: number
  description?: string
  requires_permit: boolean
  requires_warranty: boolean
  validity_hours: 24 | 48 | 72 | 168
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Catalog review fixes (owner 2026-10-31: «راجع كل الأقسام ما يكون في غلط زي العزل»). Applied once
// at load, so the long lists above stay as they were and this block is the one place to read:
//   CATALOG_REMOVE   duplicates (the same product under two names) — the kept name is noted
//   CATALOG_RENAME   wrong/unclear names → the correct one (old names still translate for old requests)
//   CATALOG_ROUTE    product → [sector, specialty] when it went to the wrong suppliers
// ─────────────────────────────────────────────────────────────────────────────────────────────
const CATALOG_REMOVE = [
  // building: steel + waterproofing + chemicals + bulk
  'قطاع مربع SHS (Steel Square Tube)', 'قطاعات مستطيلة RHS', 'بيم حديد أي بيم (IPE جسور)', 'صفائح فولاذية',
  'عزل بولي يوريثان سائل للأسطح', 'عزل سيماني مرن مكونين (2K)', 'عزل كريستالي للخرسانة (Crystalline)',
  'مستحلب بيتوميني معدّل بالمطاط (RBE)', 'غشاء عزل ذاتي اللصق (Self-adhesive Membrane)', 'شريط مانع تسرب (ووتر ستوب)',
  'قماش بوليستر تسليح للعزل السائل', 'طلاء عزل أسطح أكريليك مرن عاكس للحرارة', 'لفائف عزل PVC/TPO للأسطح', 'بيتومين أولي (Primer)',
  'مادة ربط SBR (لاتكس للمونة)', 'بوندنج إيبوكسي لربط الخرسانة القديمة بالجديدة (Epoxy Bonding Agent)', 'كبسولات تثبيت كيميائية (Resin Capsule Anchors)',
  'مونة حقن هايبرد/فينيل إستر سريعة (Hybrid / Vinylester Injection Mortar)', 'راتنج حقن بولي يوريثان للتسريبات', 'برايمر مانع التسرب للأسطح المسامية',
  'حصى مرشحة Sub-base', 'مواد ردم وتسوية',
  // services, not materials (owner 2026-10-31): digging/levelling is requested as a machine from «الآليات»
  'أعمال ترابية وحفر', 'تمهيد وتسوية أرض', 'عازل مائي سيماني Cementitious Render',
  // finishing
  'لاصق بلاط أسمنتي عادي C1 (سيراميك)', 'لاصق بلاط C2TE (بورسلان ومناطق رطبة)', 'لاصق بلاط مرن C2TE S1 (فورمات كبير وخارجي)',
  'لاصق رخام وحجر أبيض (أسمنتي)', 'ترويبة محسّنة CG2WA (مقاومة للماء والاحتكاك)', 'عازل ترويبة شفاف (Grout Sealer)', 'عزل مائي للحمامات تحت البلاط (جاهز)',
  'زاوية ركن معدنية للجبس (كورنر بيد)', 'شريط تسليح فواصل الجبس', 'منظف الفوم والمسدس (أسيتون بخاخ)',
  'لاصق مونتاج (تثبيت بدون مسامير)', 'معجون إيبوكسي للإصلاح (عصا)', 'لواح خشبية صوتية Acoustic Timber',
  // electrical
  'محول كهربائي 11kV/400V', 'محطة توليد طارئة Generator Hookup Panel', 'نظام DALI تحكم إضاءة', 'حساس حركة (سنسور إضاءة تلقائي)',
  'حساس حركة للإنارة', 'شريط لحام كهرب', 'أنابيب كهربائية PVC', 'أنابيب كهربائية معدنية',
  // plumbing / HVAC
  'حوض مطبخ', 'أنابيب مياه مبردة فولاذية Sch40', 'أنابيب مياه مبردة مدفونة Pre-insulated', 'وعاء تمدد Expansion Vessel', 'أنابيب CPVC',
  // machinery / outdoor
  'كمبروسر هواء', 'رصف بلاط خارجي', 'طبقة أسفلتية', 'نظام ري شبكة خارجية',
]
const CATALOG_RENAME: Record<string, string> = {
  'سلالم رياضية Raker Beams': 'جسور مدرجات مائلة (Raker Beams)',
  'أوتاد خرسانية': 'خوازيق خرسانية',
  'أوتاد حديد مجوف': 'خوازيق حديد أنبوبية (Steel Pipe Piles)',
  'جبصين': 'جبس (بودرة لياسة)',
  'باب دوار Rolling Shutter': 'باب رول (شتر) Rolling Shutter',
  'لواح صوتية PET Panels': 'ألواح صوتية PET Panels',
  'لواح GRC خارجية': 'ألواح GRC خارجية',
  'لواح GRC': 'ألواح GRC',
  'لواح خشب صوتية Acoustic': 'ألواح خشب صوتية Acoustic',
  'لواح خشب MDF': 'ألواح خشب MDF',
  'لواح خشبية مثقبة': 'ألواح خشبية مثقبة',
  'فرشة مسطحة Screed Heavy Duty': 'سكريد أرضيات للأحمال الثقيلة',
  'فرشة مسطحة Self-Levelling': 'سكريد ذاتي التسوية (Self-Levelling)',
  'قرنيوص فينيل Vinyl Skirting': 'وزرة فينيل (Vinyl Skirting)',
  'مطاط Entrance Matting': 'ممسحة مداخل مطاطية (Entrance Matting)',
  'محول صغير': 'محوّل أفياش (أدابتر)',
  'ماسورة EMT مرنة ووصلاتها (Flexible Metal Conduit & EMT Connectors)': 'ماسورة معدنية مرنة (FMC) ووصلاتها',
  'أنابيب معزولة مسبقاً Pre-Insulated (تبريد منطقي)': 'أنابيب معزولة مسبقاً Pre-Insulated (تبريد المناطق)',
  'مجمد حرارة Heat Exchanger': 'مبادل حراري Heat Exchanger',
  'موازنات حريق Fire Damper': 'خانق حريق Fire Damper',
  'كباس باب (قفل مقبض دائري)': 'قفل أكرة دائري (مقبض كروي بقفل)',
  'مقبض باب اكبح (لوحة)': 'مقبض باب على لوحة',
  'مقبض باب مع كباس (اكبح كامل بقفل)': 'مقبض باب على لوحة مع قفل',
  'دفاية باب (لوحة حماية)': 'لوح حماية أسفل الباب (كِك بليت)',
  'حزام أمان': 'حزام أمان للعمل على المرتفعات (هارنس)',
  'بطارية': 'بطاريات جافة (AA/AAA)',
  'مشبك أرضي (جريتنج) ملحوم': 'جريتنج حديد ملحوم (شبك أرضيات)',
  'أسقف جبس مطلي Acoustic Plaster': 'لياسة صوتية (Acoustic Plaster)',
  'أسقف مكشوفة مطلية': 'دهان أسقف مكشوفة',
}
const CATALOG_ROUTE: Record<string, [Sector, string]> = {
  // solar set (2026-11-02)
  'خزانة ورفوف بطاريات': ['electrical', 'solar_pv'],
  'حماية من الصواعق والتيار الزائد DC (SPD)': ['electrical', 'solar_pv'],
  // building
  'خوازيق خرسانية': ['civil', 'piling'],
  'خوازيق حديد أنبوبية (Steel Pipe Piles)': ['civil', 'piling'],
  'شدّات وطوبار أسقف (سلابات)': ['civil', 'formwork_steel'],
  'سياج حديد ملحوم مطلي بودرة (بانل جاهز)': ['civil', 'fencing'],
  'خشب أبيض لين للبناء والنجارة (White Wood / Spruce)': ['civil', 'formwork_ply'],
  'مانع تسرب مائي للأسطح (سطل)': ['civil', 'waterproofing'],
  'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)': ['civil', 'waterproofing'],
  'شريط زوايا مطاطي لعزل الحمامات': ['civil', 'waterproofing'],
  // finishing
  'أرفف خشبية': ['architectural', 'custom_furniture'],
  'بلاط رخام طبيعي': ['architectural', 'marble'],
  'قائم معدني للجبس بورد (Stud)': ['architectural', 'drywall_metal'],
  'ألواح أسمنت بورد (فايبر سمنت)': ['architectural', 'gypsum'],
  'قواطع حمامات HPL': ['architectural', 'cubicles'],
  'ألواح صوتية PET Panels': ['architectural', 'acoustic_panels'],
  'لياسة صوتية (Acoustic Plaster)': ['architectural', 'acoustic_panels'],
  'معجون جدران': ['architectural', 'paint'],
  'معجون جدران جاهز (أكريليك – سطل)': ['architectural', 'paint'],
  'كلادينج ألمنيوم كومبوزيت ACM': ['architectural', 'rainscreen'], // 2026-11-02: aluminium cladding, not GRC
  'ألواح GRC خارجية': ['architectural', 'grc_facade'],
  'ورق جدران': ['architectural', 'curtains'],
  'سجاد وزوالي': ['architectural', 'special_floor'],
  'دهان أسقف مكشوفة': ['architectural', 'paint'],
  // electrical
  'لوحة متوسط جهد MV Switchgear': ['electrical', 'transformers'],
  'لوحة محطة 11kV Switchgear': ['electrical', 'transformers'],
  'صينية كابل Tray 100×100': ['electrical', 'conduits'],
  'صينية كابل Tray 300×75': ['electrical', 'conduits'],
  'صينية كابل Tray 600×100': ['electrical', 'conduits'],
  'نظام WiFi Wireless Access Point': ['electrical', 'data_network'],
  'كابل ألياف بصرية': ['electrical', 'data_network'],
  'سلك تأريض': ['electrical', 'earthing'],
  'شريط نحاس تأريض': ['electrical', 'earthing'],
  'محول (درايفر) ليد': ['electrical', 'led_strips'],
  'ATS نقل تلقائي 1000A': ['electrical', 'panels'],
  'ATS نقل تلقائي 500A': ['electrical', 'panels'],
  'كشاف LED بانل 600×600': ['electrical', 'indoor_lighting'],
  'كشاف LED بانل 300×1200': ['electrical', 'indoor_lighting'],
  'كشاف LED سطحي': ['electrical', 'indoor_lighting'],
  'كشاف LED متدلي': ['electrical', 'indoor_lighting'],
  'كشاف LED صناعي High Bay': ['electrical', 'indoor_lighting'],
  'إضاءة شريطية LED': ['electrical', 'led_strips'],
  'إنتركم (جرس باب مرئي)': ['electrical', 'access_control'],
  'محرك بوابة كهربائي': ['electrical', 'access_control'],
  'أباجورة': ['supply_store', 'store_lighting'],
  'فرشاة سلك (كأس / دائرية)': ['supply_store', 'store_bits'],
  'فوم عازل': ['supply_store', 'store_adhesives'],
  'فيشر': ['supply_store', 'store_fasteners'],
  'مفتاح ربط': ['supply_store', 'store_hand_tools'],
  'لوحة تحكم حريق': ['electrical', 'fire_alarm'],
  // plumbing
  'مرحاض WC مع خزان': ['architectural', 'sanitary_ware'],
  'مرحاض WC ذوي احتياجات خاصة': ['architectural', 'sanitary_ware'],
  'مغسلة Wash Basin': ['architectural', 'sanitary_ware'],
  'مجلى Kitchen Sink': ['architectural', 'sanitary_ware'],
  'حوض استحمام': ['architectural', 'sanitary_ware'],
  'مبولة Urinal': ['architectural', 'sanitary_ware'],
  'سيفون مغسلة': ['mechanical', 'traps_drains'],
  'صمامات كرة نحاس': ['mechanical', 'valves_fittings'],
  'صمامات كرة ستانلس': ['mechanical', 'valves_fittings'],
  'صمامات بوابة': ['mechanical', 'valves_fittings'],
  'صمامات فراشة flanged': ['mechanical', 'valves_fittings'],
  'صمامات فحص': ['mechanical', 'valves_fittings'],
  'صمامات تخفيض ضغط PRV': ['mechanical', 'valves_fittings'],
  'صمامات PICV تحكم ضغط': ['mechanical', 'valves_fittings'],
  'صمامات موتورية 2-Port': ['mechanical', 'valves_fittings'],
  'صمامات موتورية 3-Port': ['mechanical', 'valves_fittings'],
  'صمامات تصريف': ['mechanical', 'valves_fittings'],
  'صمام تحكم منطقة Zone Control Valve': ['mechanical', 'valves_fittings'],
  'مصافي ألمنيوم (أرضية/ركنية/دش/سطح)': ['mechanical', 'traps_drains'],
  'أنابيب HDPE صرف صحي داخلي': ['mechanical', 'drainage_pipes'],
  'أنابيب حديد زهر Cast Iron صرف صامت': ['mechanical', 'silent_drainage'],
  'مصرف سقف Roof Drain 100mm': ['mechanical', 'storm_drainage'],
  'حوض ترسيب مياه أمطار': ['mechanical', 'storm_drainage'],
  'أنابيب HDPE صرف أمطار (SDR11)': ['mechanical', 'storm_drainage'],
  'مضخة تغذية كيماوي Dosing': ['mechanical', 'water_treatment'],
  'مرشحات مياه': ['mechanical', 'water_treatment'],
  // 2026-11-02: fuel items are mechanical (own specialty), not transformers/generators
  'خطوط تغذية وقود': ['mechanical', 'fuel_systems'],
  'خزان وقود ديزل يومي': ['mechanical', 'fuel_systems'],
  'مضخة نقل وقود': ['mechanical', 'fuel_systems'],
  'وحدة تصفية وقود': ['mechanical', 'fuel_systems'],
  'مفصلة أوتوماتيك (زنبرك)': ['supply_store', 'store_hinges'],
  'كوبلن مواسير كهرباء (وصلة كوندويت)': ['supply_store', 'store_elec_access'],
  // HVAC & fire
  'عوازل مجاري هواء فايبر جلاس': ['mechanical', 'duct_insulation'],
  'دكت مرن': ['mechanical', 'flexible_ducts'],
  'مراوح هواء طرد مركزي': ['mechanical', 'ventilation_fans'],
  'ستائر هواء': ['mechanical', 'ventilation_fans'],
  'سخانات مياه مركزية': ['mechanical', 'tanks_heaters'],
  'مضخات مياه مركزية': ['mechanical', 'pumps'],
  'طفاية حريق': ['mechanical', 'fire_cabinets'],
  // outdoor
  'رصف حجر طبيعي': ['civil', 'hardscape'],
  'شبك جبيونات (قفص جباينة حجري)': ['civil', 'fencing'],
  'شبك سداسي (شبك دجاج/تربة)': ['civil', 'fencing'],
  'جريتنج حديد ملحوم (شبك أرضيات)': ['civil', 'steel_sections'], // 2026-11-02: steelwork, not fencing
  'طلب سقالة كاملة (توريد + تصميم)': ['equipment', 'scaffolding_equip'],
  'ألعاب أطفال خارجية': ['civil', 'playground'],
}
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Catalog review 2026-11-02 (catalog-audit/review_2026-11-02.json, fix list A–E). Merged into the maps
// above when they are applied, so this is the one place to read for this review. Requests already in
// the database keep their stored names: a renamed name still finds its specialty (PRODUCT_SUB is
// copied back to the old name and its keywords still match), and catalogName() maps it to the new one.
// Renames change the picture slug: catalog-audit/renames_2026-11-02.json lists old → new slugs.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const REVIEW_1102_REMOVE = [
  // building — generic duplicates of a more precise item that stays
  'زلط', 'خشب بناء للشدّات', 'ألواح بليود (طوبار) Plywood', 'شريط زوايا مطاطي لعزل الحمامات',
  'عزل مائي سائل (Liquid Membrane)', 'عزل مائي سيماني (Cementitious)', 'غشاء بيتوميني لفائف (Bituminous Membrane)',
  'عازل رطوبة للأسطح والجدران', 'مانع تسرب مائي للأسطح والشقوق',
  'إضافات الخرسانة (ملدن/مسرع/مؤخر)', 'مادة معالجة الخرسانة (كيورنج)', 'مادة ربط الخرسانة (بوندنج)',
  'جراوت غير قابل للانكماش', 'مثبت كيميائي (كيميكال أنكر)', 'مونة إصلاح الخرسانة', 'مواد لاصقة وكيماويات (Adhesives & Sealants)',
  'مانع تسرب الفواصل (ماستك)', 'مونة حقن كيميائية إيبوكسي (Injection Epoxy Mortar)',
  'جبس (بودرة لياسة)', // = «جبس تلبيس بودرة (بلاستر)»
  // finishing
  'غراء وترويبة بلاط', 'لاصق بلاط محسّن C2T (بورسلان)', 'لاصق بلاط المسابح', 'موكيت', 'أرضية إيبوكسي',
  'سيليكون', 'فوم عازل', 'لاصق قوي', 'صمغ', 'ألواح MDF وخشب مضغوط (Wood Boards)',
  // electrical
  'لوحة UPS', 'لوحة ATS نقل تلقائي', 'لوحة متوسط جهد MV Switchgear', 'علبة توزيع كهرباء (بوكس)', 'إضاءة شريطية LED',
  // plumbing, HVAC, fire (the plumbing-shop copy of each fitting stays)
  'وصلة كوع PVC', 'وصلة تي PVC', 'كوبلن', 'خرطوم سخان مرن', 'طفاية سيفون', 'عازل حراري مجاري هواء',
  'خلاط مياه Mixer', 'صنبور مياه', 'أنابيب PPR PN20', 'أنابيب خرسانية صرف خارجي', 'مواد منع انتشار الحريق (فاير ستوب)',
  // tools, safety, machinery, outdoor
  'كماشة', 'مفك عادي', 'مفك صليبة', 'ريشة همر', 'قرص قص', 'قرص تجليخ', 'بخاخ متعدد الأغراض (مزيل صدأ ومزلّق)', 'شريط لاصق',
  'سقالات معدنية', 'جاكات تدعيم', 'شبكة ري خارجية',
]
const REVIEW_1102_RENAME: Record<string, string> = {
  // building
  'أسمنت': 'أسمنت بورتلاندي عادي (OPC)',
  'خرسانة مسبقة الصب': 'عناصر خرسانية مسبقة الصب (حدد النوع)',
  'حديد تسليح سلك': 'لفائف حديد تسليح (Wire Rod)',
  'بلوك خرساني خلوي خفيف (AAC Block / سيبوريكس)': 'بلوك خرساني خلوي (سيبوريكس)',
  'عزل سيماني مرن ثنائي المكون (Flexible Cementitious Waterproofing)': 'عزل أسمنتي مرن ثنائي المكون (Flexible Cementitious Waterproofing)',
  'عزل سيماني صلب (Rigid Cementitious Slurry)': 'عزل أسمنتي صلب (Rigid Cementitious Slurry)',
  'براغي': 'براغي (حدد النوع والمقاس)',
  'صواميل': 'صواميل (حدد النوع والمقاس)',
  'رول بلت': 'برغي تمدد (رول بلت)',
  'أنكر بولت': 'مسامير تأسيس (أنكر بولت J/L) لقواعد الأعمدة',
  'فيشر': 'خابور بلاستيك (فيشر)',
  'خوابير تثبيت': 'خوابير بلاستيك',
  // one spelling: «أنكر»
  'انكر كيميائي كبسولة (Chemical Capsule Anchor)': 'أنكر كيميائي كبسولة (Chemical Capsule Anchor)',
  'جلبة شبكية للانكر الكيميائي في الطوب المفرغ (Mesh / Sieve Sleeve)': 'جلبة شبكية للأنكر الكيميائي في الطوب المفرغ (Mesh / Sieve Sleeve)',
  'انكر وتد (Wedge Anchor / Through Bolt)': 'أنكر وتد (Wedge Anchor / Through Bolt)',
  'انكر دروب إن (Drop-in Anchor)': 'أنكر دروب إن (Drop-in Anchor)',
  'انكر كُم (Sleeve Anchor)': 'أنكر كُم (Sleeve Anchor)',
  'انكر ثقيل للأحمال (Heavy-duty Anchor)': 'أنكر ثقيل للأحمال (Heavy-duty Anchor)',
  'انكر سقف بمسمار للتعليق (Ceiling Nail Anchor)': 'أنكر سقف بمسمار للتعليق (Ceiling Nail Anchor)',
  'قضيب انكر كيميائي مع صامولة ووردة (Chemical Anchor Rod / Stud)': 'قضيب أنكر كيميائي مع صامولة ووردة (Chemical Anchor Rod / Stud)',
  'وردة تعبئة للانكرات (Filling / Dynamic Washer)': 'وردة تعبئة للأنكرات (Filling / Dynamic Washer)',
  'قناة انكر مصبوبة في الخرسانة (Cast-in Anchor Channel)': 'قناة أنكر مصبوبة في الخرسانة (Cast-in Anchor Channel)',
  'مسدس حقن الانكر الكيميائي (Injection Dispenser)': 'مسدس حقن الأنكر الكيميائي (Injection Dispenser)',
  'فوهة خلط للانكر الكيميائي (Static Mixer Nozzle)': 'فوهة خلط للأنكر الكيميائي (Static Mixer Nozzle)',
  'فرشاة ومنفاخ تنظيف ثقوب الانكر (Hole Cleaning Brush & Blow-out Pump)': 'فرشاة ومنفاخ تنظيف ثقوب الأنكر (Hole Cleaning Brush & Blow-out Pump)',
  // finishing
  'سجاد وزوالي': 'سجاد',
  'فينيل ورقي Vinyl Sheet': 'فينيل رولات (Vinyl Sheet)',
  'معجون جبس تلييس الفواصل (Joint Compound)': 'معجون جبس تلبيس الفواصل (Joint Compound)',
  'معجون جدران': 'معجون جدران بودرة',
  'أرضية راتنج إيبوكسي مع قرنيص': 'أرضية راتنج إيبوكسي مع وزرة',
  'دهان أسقف مكشوفة': 'دهان أسقف مكشوفة (للخرسانة والمعدن)',
  'دهان داخلي': 'دهان داخلي أكريليك',
  'ريشة بلاط وبورسلان ماسية (Diamond Tile Drill Bit)': 'ريشة بلاط وبورسلين ماسية (Diamond Tile Drill Bit)',
  // electrical
  'Bus Bar 1000A 4P': 'مجرى قضبان توزيع (Busbar Trunking) 1000A 4P',
  'Bus Bar 1600A 4P': 'مجرى قضبان توزيع (Busbar Trunking) 1600A 4P',
  'Bus Bar 2500A 4P': 'مجرى قضبان توزيع (Busbar Trunking) 2500A 4P',
  'مولد طارئ 400V Hook-up Panel': 'لوحة توصيل مولد طارئ 400V (Generator Hook-up Panel)',
  'كشاف ملعب Sports Light S1': 'كشاف ملاعب 500 واط',
  'كشاف ملعب Sports Light S2': 'كشاف ملاعب 1000 واط',
  'شاشة LED إعلانية LED Screen 55"': 'شاشة عرض إعلانية 55 بوصة',
  'مشترك كهرباء (موزع أفياش)': 'مقبس متعدد (مشترك)',
  'بريزة': 'مقبس كهربائي (بريزة)',
  'شريط عزل كهربائي (تيب لحام)': 'شريط عزل كهربائي PVC',
  'وصلة توصيل واغو (كلامة)': 'موصل أسلاك سريع (واغو)',
  // plumbing, HVAC, fire
  'معالجة مياه كيماوي': 'مواد كيميائية لمعالجة المياه',
  'مضخة jockey حريق': 'مضخة حريق مساعدة (Jockey)',
  'مضخة sump صرف': 'مضخة غاطسة لبئر التجميع (Sump)',
  'خزان مياه GRP 434م³': 'خزان مياه GRP مقطعي كبير (حسب السعة)',
  'محبس أرضي مجمّع (Collector Floor Gully)': 'بالوعة أرضية مجمّعة (Collector Floor Gully)',
  'صمامات فراشة flanged': 'صمامات فراشة بفلانشات',
  'سيفون كرسي': 'سيفون مرحاض',
  'طفاية سيفون كرسي': 'طفاية سيفون مرحاض',
  'مجاري هواء جلفنايز 0.7mm': 'مجاري هواء مجلفنة 0.7mm',
  'مجاري هواء جلفنايز 0.8mm': 'مجاري هواء مجلفنة 0.8mm',
  'مجاري هواء جلفنايز 1.0mm': 'مجاري هواء مجلفنة 1.0mm',
  'مجاري هواء جلفنايز 1.2mm': 'مجاري هواء مجلفنة 1.2mm',
  'عازل مطاطي للأنابيب (أرمافلكس)': 'عازل مطاطي رغوي للأنابيب',
  'عازل أنابيب مياه مبردة Fibreglass 1/2"': 'عازل أنابيب مياه مبردة صوف زجاجي 1/2"',
  'عازل أنابيب مياه مبردة Fibreglass 1"': 'عازل أنابيب مياه مبردة صوف زجاجي 1"',
  // tools, hardware, machinery, outdoor
  'طلب سقالة كاملة (توريد + تصميم)': 'سقالة كاملة (توريد وتصميم وتركيب)',
  'خرطوم ضغط عالي (وايت) للغسالة': 'خرطوم ضغط عالي للغسالة',
  'شفرة منشار حديد (بشر)': 'شفرة منشار حديد',
  'مطرقة تكسير كهربائية (هيلتي)': 'مطرقة تكسير كهربائية',
  'زرادية': 'كمّاشة (زرادية)',
  'صاروخ تجليخ': 'جلّاخة زاوية كهربائية (صاروخ)',
  'مجرى درج تلسكوبي رمان بلي': 'مجرى درج تلسكوبي بكريات (رمان بلي)',
  'زر (بزلة) خزانة': 'مقبض زر للخزائن (بزلة)',
  'مفصلة أرضية (كباس أرضي)': 'محور أرضي للباب (بيفوت)',
  'مقبض كرة باب': 'مقبض باب بدون قفل',
  'بوب كات (لودر صغير)': 'لودر انزلاقي صغير (سكِد ستير)',
  'شيول لودر': 'لودر (شيول)',
  'طرمبة غطاسة': 'مضخة غاطسة للمياه العكرة',
  'تربة زراعية Topsoil': 'تربة زراعية سطحية',
  'تشجير وزراعة': 'شتلات وأشجار زينة',
  'شبك تسييج تشيلنك (نسيج ماسي)': 'شبك تسييج تشين لينك (نسيج ماسي)',
  'شبك جبيونات (قفص جباينة حجري)': 'شبك جبيونات (قفص جابيون حجري)',
}
// one name, two products: the same name sat in two sectors for two different things
const REVIEW_1102_RENAME_IN: Partial<Record<Sector, Record<string, string>>> = {
  electrical: { 'مولد كهرباء ديزل': 'مولد كهرباء احتياطي ثابت (Standby)' },
  equipment: { 'مولد كهرباء ديزل': 'مولد كهرباء ديزل متنقل (للإيجار)' },
}
// two products in one line → one line each (same sector and specialty as the old line)
const REVIEW_1102_SPLIT: Record<string, string[]> = {
  'صاج وأنابيب ستانلس ستيل': ['صاج ستانلس ستيل', 'مواسير ستانلس ستيل'],
  'ألياف ماكرو إنشائية (Macro Synthetic / Steel Fibres)': ['ألياف ماكرو صناعية (Macro Synthetic Fibres)', 'ألياف حديدية (Steel Fibres)'],
  'قطاعات وألواح ألمنيوم خام': ['قطاعات ألمنيوم خام', 'ألواح ألمنيوم خام'],
  'مفاتيح وبرازيز Switches & Sockets 13A': ['مقابس 13A', 'مفاتيح إنارة'],
  'بطانية حريق وصندوق طفاية': ['بطانية حريق', 'صندوق طفاية حريق'],
  'مفتاح مواسير وقطّاعة مواسير (Pipe Wrench & Cutter)': ['مفتاح مواسير (Pipe Wrench)', 'قطّاعة مواسير (Pipe Cutter)'],
  'كريك (مجرفة) ومكنسة شارع (Shovel & Street Broom)': ['مجرفة (كريك)', 'مكنسة شارع (Street Broom)'],
  'منشار يدوي خشب وقوس منشار حديد (Hand Saw & Hacksaw)': ['منشار يدوي للخشب (Hand Saw)', 'قوس منشار حديد (Hacksaw)'],
  'زاوية نجار وقدمة قياس (Square & Caliper)': ['زاوية نجار (Carpenter Square)', 'قدمة قياس (Caliper)'],
  'منشار كهربائي (دائري/أركت)': ['منشار كهربائي دائري', 'منشار أركت كهربائي'],
  'برميل وسلسلة وحاجز بلاستيكي مروري (Traffic Drum, Chain & Barrier Mesh)': ['برميل مروري (Traffic Drum)', 'سلسلة بلاستيكية للحواجز (Barrier Chain)', 'شبك حاجز بلاستيكي (Barrier Mesh)'],
  'كباس باب سياج ومفصلات': ['كباس باب سياج', 'مفصلات باب سياج'],
}
const REVIEW_1102_TR: Record<string, { en: string; ur: string }> = {
  'مولد كهرباء احتياطي ثابت (Standby)': { en: 'Standby generator (fixed)', ur: 'اسٹینڈ بائی جنریٹر (مستقل)' },
  'مولد كهرباء ديزل متنقل (للإيجار)': { en: 'Mobile diesel generator (rental)', ur: 'موبائل ڈیزل جنریٹر (کرایہ)' },
  'صاج ستانلس ستيل': { en: 'Stainless steel sheet', ur: 'اسٹین لیس اسٹیل شیٹ' },
  'مواسير ستانلس ستيل': { en: 'Stainless steel pipes', ur: 'اسٹین لیس اسٹیل پائپ' },
  'ألياف ماكرو صناعية (Macro Synthetic Fibres)': { en: 'Macro synthetic fibres', ur: 'میکرو سنتھیٹک فائبر' },
  'ألياف حديدية (Steel Fibres)': { en: 'Steel fibres', ur: 'اسٹیل فائبر' },
  'قطاعات ألمنيوم خام': { en: 'Raw aluminium profiles', ur: 'خام ایلومینیم سیکشن' },
  'ألواح ألمنيوم خام': { en: 'Raw aluminium sheets', ur: 'خام ایلومینیم شیٹ' },
  'مقابس 13A': { en: '13A sockets', ur: '13A ساکٹ' },
  'مفاتيح إنارة': { en: 'Light switches', ur: 'لائٹ سوئچ' },
  'بطانية حريق': { en: 'Fire blanket', ur: 'فائر بلینکٹ' },
  'صندوق طفاية حريق': { en: 'Fire extinguisher cabinet', ur: 'فائر ایکسٹنگوئشر باکس' },
  'مفتاح مواسير (Pipe Wrench)': { en: 'Pipe wrench', ur: 'پائپ رنچ' },
  'قطّاعة مواسير (Pipe Cutter)': { en: 'Pipe cutter', ur: 'پائپ کٹر' },
  'مجرفة (كريك)': { en: 'Shovel', ur: 'بیلچہ' },
  'مكنسة شارع (Street Broom)': { en: 'Street broom', ur: 'سڑک کا جھاڑو' },
  'منشار يدوي للخشب (Hand Saw)': { en: 'Hand saw', ur: 'ہاتھ آری' },
  'قوس منشار حديد (Hacksaw)': { en: 'Hacksaw', ur: 'ہیکسا' },
  'زاوية نجار (Carpenter Square)': { en: "Carpenter's square", ur: 'بڑھئی کا گونیا' },
  'قدمة قياس (Caliper)': { en: 'Caliper', ur: 'کیلیپر' },
  'منشار كهربائي دائري': { en: 'Electric circular saw', ur: 'برقی سرکلر آری' },
  'منشار أركت كهربائي': { en: 'Electric jigsaw', ur: 'برقی جگ سا' },
  'برميل مروري (Traffic Drum)': { en: 'Traffic drum', ur: 'ٹریفک ڈرم' },
  'سلسلة بلاستيكية للحواجز (Barrier Chain)': { en: 'Plastic barrier chain', ur: 'پلاسٹک بیریئر زنجیر' },
  'شبك حاجز بلاستيكي (Barrier Mesh)': { en: 'Plastic barrier mesh', ur: 'پلاسٹک بیریئر جالی' },
  'كباس باب سياج': { en: 'Fence gate closer', ur: 'باڑ گیٹ کلوزر' },
  'مفصلات باب سياج': { en: 'Fence gate hinges', ur: 'باڑ گیٹ قبضے' },
}
// spec fields a renamed product must not inherit from its old name
const REVIEW_1102_SPEC_DROP: Record<string, string[]> = {
  'دهان أسقف مكشوفة (للخرسانة والمعدن)': ['tile_size'], // it was listed with the false ceilings
  'أسمنت بورتلاندي عادي (OPC)': ['type'],               // the line is OPC now; SRC/white/PPC have their own lines
}
const REVIEW_1102_ROUTE: Record<string, [Sector, string]> = {
  // the 15 plumbing-shop items listed in mechanical AND supply_store showed once: keep the shop copy
  'خلاط مغسلة': ['supply_store', 'store_faucets'], 'خلاط مطبخ': ['supply_store', 'store_faucets'],
  'خلاط دش': ['supply_store', 'store_faucets'], 'خلاط شطاف': ['supply_store', 'store_faucets'], 'صنبور حديقة': ['supply_store', 'store_faucets'],
  'رأس دش': ['supply_store', 'store_faucets'],
  'محبس زاوية': ['supply_store', 'store_valves'], 'محبس عمومي': ['supply_store', 'store_valves'],
  'سيفون مرحاض': ['supply_store', 'store_valves'], 'مصفاة أرضية': ['supply_store', 'store_valves'],
  'وصلة مرنة': ['supply_store', 'store_valves'], 'جلدة محبس': ['supply_store', 'store_valves'],
  'خرطوم شطاف': ['supply_store', 'store_hoses'], 'شريط تفلون': ['supply_store', 'store_hoses'],
  'معجون سباكة': ['supply_store', 'store_hoses'], 'عوامة خزان': ['supply_store', 'store_hoses'],
  // building
  'جسور مدرجات مائلة (Raker Beams)': ['civil', 'precast'],
  'زوايا وقطاعات حديد': ['civil', 'steel_sections'],
  'مبيد النمل الأبيض (معالجة التربة)': ['civil', 'waterproofing'], // soil treatment at the foundation stage, not a concrete admixture
  // finishing
  'ألواح خشب صوتية Acoustic': ['architectural', 'acoustic_timber'],
  'صاج ألمنيوم مضلّع/منقوش (Aluminium Chequered Plate)': ['architectural', 'metal_features'],
  'صاج ألمنيوم مزخرف ستوكو (Stucco Embossed Sheet)': ['architectural', 'metal_features'],
  'مظلة سيارات': ['civil', 'shades_screens'],
  'لوحات إرشادية Signage': ['architectural', 'custom_furniture'], // made by decor/sign workshops; shows under «الجدران والديكور»
  // plumbing → civil external drainage
  'أنابيب خرسانية مسلحة RCP': ['civil', 'drainage'], 'غرف تفتيش خرسانية': ['civil', 'drainage'],
  'أغطية منهول حديد': ['civil', 'drainage'], 'مصارف خطية': ['civil', 'drainage'],
  'خزان صرف صحي (بيارة)': ['civil', 'drainage'],
  // pressure / mains pipes (not PPR) and chilled-water pipes (HVAC)
  'مواسير uPVC ضغط سكجول 80 (Sch 80)': ['mechanical', 'pressure_pipes'],
  'أنابيب نحاس مياه باردة': ['mechanical', 'pressure_pipes'], 'أنابيب نحاس مياه حارة': ['mechanical', 'pressure_pipes'],
  'أنابيب CPVC مياه حارة': ['mechanical', 'pressure_pipes'], 'أنابيب PEX': ['mechanical', 'pressure_pipes'],
  'أنابيب HDPE PN16 مياه شرب': ['mechanical', 'pressure_pipes'], 'أنابيب HDPE PN10 مياه شرب': ['mechanical', 'pressure_pipes'],
  'أنابيب حديد مجلفن GI': ['mechanical', 'pressure_pipes'], 'أنابيب GRP فايبرجلاس': ['mechanical', 'pressure_pipes'],
  'أنابيب حديد مرن Ductile Iron مياه رئيسية': ['mechanical', 'pressure_pipes'], 'عداد مياه 100mm': ['mechanical', 'pressure_pipes'],
  'أنابيب فولاذية مياه مبردة Schedule 40': ['mechanical', 'chilled_water_pipes'],
  'أنابيب مياه مبردة Chilled Water': ['mechanical', 'chilled_water_pipes'],
  'أنابيب معزولة مسبقاً Pre-Insulated (تبريد المناطق)': ['mechanical', 'chilled_water_pipes'],
  'خزان وقود ديزل تحت أرضي': ['mechanical', 'fuel_systems'],
  // HVAC & fire
  'مضخة إطفاء حريق Fire Pump': ['mechanical', 'fire_pumps'],
  'مضخة حريق مساعدة (Jockey)': ['mechanical', 'fire_pumps'],
  // tools & machinery
  'خرطوم هواء وغاز ضغط عالٍ (Air & Gas Hose)': ['equipment', 'welding_cutting'],
  'ماكينة ثني حديد التسليح (Rebar Bender)': ['equipment', 'concrete_finishing'],
  'ماكينة قص حديد التسليح (Rebar Cutter)': ['equipment', 'concrete_finishing'],
  'ماكينة قص الخرسانة والأسفلت': ['equipment', 'concrete_finishing'],
  'ماكينة تنعيم الخرسانة (هليكوبتر)': ['equipment', 'concrete_finishing'],
  'دورات مياه متنقلة': ['equipment', 'site_services'],
}
// specialties with no catalog product (2026-11-02): off in the pickers (DB: taxonomy.is_active = false, migration 195)
export const INACTIVE_SUBS: [Sector, string][] = [
  ['electrical', 'mv_cables'], ['civil', 'scaffold_jacks'], ['mechanical', 'fire_valves'], ['mechanical', 'cladding_jacketing'],
  ['architectural', 'louvers'], // its only product (car shade) belongs to «المظلات والسواتر»
]

/** The current catalog name of a product (follows CATALOG_RENAME), e.g. for a name stored on an old request. */
export function catalogName(name: string): string {
  let n = (name || '').trim()
  for (let i = 0; i < 5 && CATALOG_RENAME[n]; i++) n = CATALOG_RENAME[n]
  return n
}
;(function applyCatalogFixes() {
  CATALOG_REMOVE.push(...REVIEW_1102_REMOVE)
  Object.assign(CATALOG_RENAME, REVIEW_1102_RENAME)
  Object.assign(CATALOG_ROUTE, REVIEW_1102_ROUTE)
  const sectors = Object.keys(SECTOR_PRODUCTS) as Sector[]
  const removed = new Set(CATALOG_REMOVE)
  const gone = (p: string) => removed.has(p) || removed.has(catalogName(p))
  // a renamed (or split) product keeps the specialty its old name had (a new name can miss the old keywords)
  for (const oldName of Object.keys(CATALOG_RENAME)) {
    const newName = catalogName(oldName)
    const sec = sectors.find(x => SECTOR_PRODUCTS[x].includes(oldName))
    const sub = sec ? detectSubCategory(oldName, sec) : null
    if (sub && !PRODUCT_SUB[newName]) PRODUCT_SUB[newName] = sub
  }
  for (const s of sectors) {
    const own = REVIEW_1102_RENAME_IN[s] || {}
    for (const [oldName, newName] of Object.entries(own)) {
      const sub = SECTOR_PRODUCTS[s].includes(oldName) ? detectSubCategory(oldName, s) : null
      if (sub && !PRODUCT_SUB[newName]) PRODUCT_SUB[newName] = sub
    }
    for (const p of SECTOR_PRODUCTS[s]) {
      const parts = REVIEW_1102_SPLIT[p]
      const sub = parts ? detectSubCategory(p, s) : null
      if (parts && sub) for (const part of parts) if (!PRODUCT_SUB[part]) PRODUCT_SUB[part] = sub
    }
    SECTOR_PRODUCTS[s] = Array.from(new Set(SECTOR_PRODUCTS[s].filter(p => !gone(p))
      .flatMap(p => REVIEW_1102_SPLIT[p] || [own[p] || catalogName(p)])))
  }
  for (const oldName of Object.keys(CATALOG_RENAME)) {
    const newName = catalogName(oldName)
    if (PRODUCT_SUB[oldName] && !PRODUCT_SUB[newName]) PRODUCT_SUB[newName] = PRODUCT_SUB[oldName]
  }
  applyRenamedExtras()
  for (const [routed, [sector, sub]] of Object.entries(CATALOG_ROUTE)) {
    const name = catalogName(routed)
    if (gone(routed)) continue // a removed product must not come back through its old route
    for (const s of sectors) if (s !== sector) SECTOR_PRODUCTS[s] = SECTOR_PRODUCTS[s].filter(p => p !== name)
    if (!SECTOR_PRODUCTS[sector].includes(name)) SECTOR_PRODUCTS[sector].push(name)
    PRODUCT_SUB[name] = sub
  }
  // old names (stored on earlier requests) route like the product they became
  for (const oldName of Object.keys(CATALOG_RENAME)) {
    const sub = PRODUCT_SUB[catalogName(oldName)]
    if (sub && !PRODUCT_SUB[oldName]) PRODUCT_SUB[oldName] = sub
  }
  for (const [s, key] of INACTIVE_SUBS) delete (SUB_CATEGORIES[s] as any)[key]
})()
/** a renamed product keeps its translations and spec fields (run at load and after each lazy load) */
function applyRenamedExtras() {
  for (const [name, tr] of Object.entries(REVIEW_1102_TR)) PRODUCT_TRANSLATIONS[name] = tr
  const pairs: [string, string][] = Object.keys(CATALOG_RENAME).map(o => [o, catalogName(o)] as [string, string])
  for (const own of Object.values(REVIEW_1102_RENAME_IN)) pairs.push(...Object.entries(own || {}))
  for (const [oldName, newName] of pairs) {
    if (PRODUCT_TRANSLATIONS[oldName] && !PRODUCT_TRANSLATIONS[newName]) PRODUCT_TRANSLATIONS[newName] = PRODUCT_TRANSLATIONS[oldName]
    if (PRODUCT_SPECS[oldName] && !PRODUCT_SPECS[newName]) PRODUCT_SPECS[newName] = PRODUCT_SPECS[oldName]
  }
  for (const [name, keys] of Object.entries(REVIEW_1102_SPEC_DROP)) {
    if (PRODUCT_SPECS[name]) PRODUCT_SPECS[name] = PRODUCT_SPECS[name].filter(f => !keys.includes(f.key))
  }
}
/** for the image tool and audits: renamed products (old name → new name; old pictures are copied to the new slug) */
export const CATALOG_RENAMED = CATALOG_RENAME
/** for audits: one old line → several products (2026-11-02) */
export const CATALOG_SPLIT = REVIEW_1102_SPLIT
export const CATALOG_RENAMED_IN_SECTOR = REVIEW_1102_RENAME_IN
