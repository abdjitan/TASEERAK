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
  rawmaterials: { ar: 'مواد الدفان والركام', en: 'Backfill & Aggregate', ur: 'بھرائی اور ایگریگیٹ', icon: '⛰' },
  infrastructure: { ar: 'العزل والأساسات والمعالجات', en: 'Insulation, Foundations & Treatments', ur: 'انسولیشن اور بنیادیں', icon: '🛡' },
  drainage_grp: { ar: 'الصرف والأنابيب الخارجية', en: 'Drainage & External Pipes', ur: 'نکاسی اور پائپ', icon: '🚧' },
  formwork: { ar: 'الطوبار والشدّات الخشبية', en: 'Formwork & Shuttering', ur: 'فارم ورک', icon: '🪵' },
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
  building_insulation: { ar: 'العزل الحراري والمائي', en: 'Thermal & Moisture Insulation', ur: 'انسولیشن', icon: '🧊' },
  arch_metalwork: { ar: 'الأعمال المعدنية والمصاعد', en: 'Metalwork & Elevators', ur: 'دھاتی کام', icon: '🛗' },
  sanitary_finish: { ar: 'الأدوات الصحية والتشطيبات', en: 'Sanitary Ware & Finishes', ur: 'سینیٹری', icon: '🛁' },
  // ميكانيك
  hvac: { ar: 'التكييف والتهوية', en: 'HVAC & Ventilation', ur: 'ایئر کنڈیشنگ', icon: '❄️' },
  plumbing: { ar: 'السباكة والتغذية والصرف', en: 'Plumbing & Drainage', ur: 'پلمبنگ', icon: '🚰' },
  plumbing_supplies: { ar: 'لوازم وإكسسوارات السباكة', en: 'Plumbing Supplies & Fittings', ur: 'پلمبنگ سامان', icon: '🔧' },
  firefighting: { ar: 'مكافحة الحريق', en: 'Fire Fighting', ur: 'فائر فائٹنگ', icon: '🧯' },
  mech_insulation: { ar: 'العزل الحراري الميكانيكي', en: 'Mechanical Insulation', ur: 'مکینیکل انسولیشن', icon: '♨️' },
  // كهرباء
  cabling: { ar: 'التمديدات والكابلات', en: 'Cabling & Wiring', ur: 'کیبلنگ', icon: '🔌' },
  panels_switches: { ar: 'اللوحات والمفاتيح', en: 'Panels & Switches', ur: 'پینل', icon: '🎛' },
  lighting: { ar: 'أنظمة الإنارة', en: 'Lighting Systems', ur: 'روشنی', icon: '💡' },
  low_current: { ar: 'أنظمة التيار الخفيف', en: 'Low Current Systems', ur: 'لو کرنٹ', icon: '📹' },
  solar: { ar: 'الطاقة الشمسية', en: 'Solar Energy', ur: 'شمسی توانائی', icon: '☀' },
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
    structural_steel: { ar: 'حديد تجاري وقطاعات', en: 'Steel Profiles & Beams', ur: 'ساختی اسٹیل', icon: '🏗', group: 'steel',
      keywords: ['هيكلي','صلب','HEB','HEA','IPE','قطاع','structural steel','section','hollow','channel','صفائح','beam','تجاري'] },
    steel_sections: { ar: 'قطاعات وصاج حديد (زوايا/مواسير/صاج)', en: 'Steel Sections, Tubes & Sheets', ur: 'اسٹیل سیکشن', icon: '🔩', group: 'steel',
      keywords: ['زاوية حديد','أنجل','angle','فلات بار','flat bar','ماسورة حديد','مربع حديد','مستطيل حديد','صاج','مضلع','شكمة','chequered','صاج مجلفن','GI sheet','hollow section','صلب مجوف','مدادات حديد مجلفنة'] },
    steel_mesh: { ar: 'شبك حديد وإكسسوارات', en: 'Steel Mesh & Accessories', ur: 'میش', icon: '🕸', group: 'steel',
      keywords: ['شبكة حديد','mesh','fabric','رابيتز','شبك لياسة','زوايا حماية'] },
    // ═══ البنية التحتية والتدعيم ═══
    waterproofing: { ar: 'عوازل مائية وحرارية للأساسات', en: 'Foundation Waterproofing', ur: 'واٹر پروفنگ', icon: '🛡', group: 'infrastructure',
      keywords: ['عازل','عزل','عزل مائي','waterproof','bitumen','بيتومين','بيتوميني','membrane','غشاء','رطوبة','أساسات','tanking','tank','بطانة','سيماني','سائل','primer','protection','خيش','فيلم','بولي','polyethylene','dpm','مانع تسرب الفواصل','شريط مانع تسرب','قماش جيوتكستايل'] },
    piling: { ar: 'أوتاد وخوازيق الأساسات', en: 'Piling & Foundations', ur: 'پائلنگ', icon: '🛠', group: 'infrastructure',
      keywords: ['أوتاد','اوتاد','pile','piling','خازوق','وتد خرساني'] },
    construction_chemicals: { ar: 'مواد كيميائية للبناء', en: 'Construction Chemicals', ur: 'کیمیکل', icon: '🧪', group: 'infrastructure',
      keywords: ['جراوت','grout','إضافات','additive','سيليكون إنشائي','epoxy','معالجة خرسانة','curing','كيماوي','مبيد النمل الأبيض','مادة معالجة الخرسانة','مادة ربط الخرسانة','مثبت كيميائي','حشوة فواصل التمدد','لاصق بلوك','مونة رقيقة','مونة إصلاح الخرسانة','سيليكون','silicone','مانع تسرب','sealant','ماستك','فوم بولي','مقاوم للحريق','معجون حريق','fire putty','water plug','بوليمر','بولي سلفايد','بولي يوريثان','لملء الفراغات','weather seal','chemical anchor','anchor bolt resin','curing compound','admixture'] },
    drainage: { ar: 'صرف خارجي وبنية تحتية', en: 'External Drainage', ur: 'نکاسی', icon: '🚧', group: 'drainage_grp',
      keywords: ['صرف أمطار','storm','drainage','منهول','manhole','تفتيش','ductile','دكتايل','حديد مرن','RCP','خرسانية مسلحة','صرف','مصارف','مصرف'] },
    // ═══ الكسارات والمواد الأولية وأعمال الموقع ═══
    aggregates: { ar: 'رمل وبحص وبودرة', en: 'Sand, Gravel & Powder', ur: 'ریت اور بجری', icon: '⛰', group: 'rawmaterials',
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
      keywords: ['إنترلوك','interlock','بردورة','كيرب','kerb','curb','تبليط','paving','بلاط خارجي','حجر صناعي','رصف','tactile','إسفلت','asphalt','أسفلتية','طبقة أسفلتية','حصى زينة وأحجار ديكور','حصى زينة','ألعاب أطفال خارجية','مطبات صناعية','مطبات','أرضيات خشب خارجية'] },
    planters: { ar: 'أحواض زراعة وعناصر تنسيق', en: 'Planters & Landscape Elements', ur: 'پلانٹر', icon: '🪴', group: 'landscape',
      keywords: ['حوض زراعة','planter','تربة','soil','مشتل','plant','شجر','tree','نباتات','pergola','مظلة حديقة','تشجير','زراعة','زرع'] },
    fencing: { ar: 'تسييج وشِباك وبوابات', en: 'Fencing, Mesh & Gates', ur: 'باڑ', icon: '🚧', group: 'landscape',
      keywords: ['تسييج','سياج','شبك تسييج','شبك مربعات','جبيونات','بوابة سياج','سلك ربط','أعمدة تسييج','شبك تمدد','تشيلنك','fence','fencing','gabion', 'سلك شائك', 'شبوك', 'شائك', 'كونسيرتينا', 'حلاقي', 'razor', 'barbed'] },
  },
  architectural: {
    // ═══ الأرضيات والحوائط ═══
    tiles: { ar: 'بلاط وبورسلان وسيراميك وتيرازو', en: 'Tiles, Porcelain & Terrazzo', ur: 'ٹائلز اور ٹیرازو', icon: '🔲', group: 'floors_walls',
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
    grc_facade: { ar: 'GRC وكسوة الواجهات', en: 'GRC & Facade Cladding', ur: 'جی آر سی', icon: '🏛', group: 'paint_facade',
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
    thermal_insulation: { ar: 'عوازل حرارية ومائية', en: 'Thermal & Moisture Insulation', ur: 'انسولیشن', icon: '🧊', group: 'building_insulation',
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
    switches: { ar: 'مفاتيح وأفياش وعلب', en: 'Switches & Sockets', ur: 'سوئچ', icon: '🔲', group: 'panels_switches',
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
      keywords: ['طاقة شمسية','الطاقة الشمسية','ألواح شمسية','الألواح الشمسية','شمسي','سولار','انفرتر طاقة','ليثيوم','منظم شحن','solar','pv'] },
    decor_lighting: { ar: 'إنارة ديكور وثريات', en: 'Decorative Lighting & Chandeliers', ur: 'سجاوٹی روشنی', icon: '✨', group: 'lighting',
      keywords: ['ثريا','ثريات','نجفة','نجف','أباجورة','أبليك','إنارة ديكور','إنارة معلقة','معلقة ديكور','إنارة أرضية','chandelier','pendant','lamp','wall light','floor lamp','إنارة سقف مودرن','إنارة مرآة وحمّام','مصباح طاولة ومكتب LED','مصباح طاولة','لمبات ديكور فيلامنت'] },
    earthing: { ar: 'تأريض وحماية برق', en: 'Earthing & Lightning', ur: 'ارتھنگ', icon: '🛡', group: 'lighting',
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
    duct_insulation: { ar: 'عزل مجاري الهواء (دكت)', en: 'Duct Insulation', ur: 'ڈکٹ انسولیشن', icon: '🧥', group: 'hvac',
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
      keywords: ['PPR','تغذية','مياه باردة','مياه حارة','CPVC','PEX','نحاس مياه','مياه مبردة','chilled water','GI','مجلفن','galvanized','GRP','فايبرجلاس','معزولة مسبقا','pre-insulated','pre insulated','HDPE','مياه شرب','عداد مياه','water meter'] },
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
      keywords: ['خزان','tank','GRP','فايبرجلاس','بولي','سخان','heater','RO','تحلية','مرشح', 'تصفية وقود', 'وحدة وقود','خزان صرف صحي'] },
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
      keywords: ['خلاطة','mixer','مضخة خرسانة','concrete pump','هزاز','vibrator','صب خرسانة','baching','محطة خلط','ماكينة قص الخرسانة والأسفلت','ماكينة تنعيم الخرسانة'] },
    // ═══ معدات خفيفة (مولدات/دكاكات) ═══
    compaction: { ar: 'معدات دك ورص', en: 'Compaction Equipment', ur: 'کمپیکشن', icon: '🛞', group: 'light_equipment',
      keywords: ['دكاكة','compactor','رصاصة','plate','هراس','roller','رص','مدماك','دك تربة'] },
    generators_equip: { ar: 'مولدات وكمبروسرات', en: 'Generators & Compressors', ur: 'جنریٹر', icon: '⚙️', group: 'light_equipment',
      keywords: ['مولد','generator','كمبروسر','compressor','ضاغط هواء','مكينة','محرك','engine','دينمو','دورات مياه متنقلة','دورات مياه'] },
    pumps_equip: { ar: 'طرمبات ومضخات نزح', en: 'Dewatering Pumps', ur: 'پمپ', icon: '💧', group: 'light_equipment',
      keywords: ['طرمبة','مضخة نزح','dewatering','submersible','غطاسة','شفط مياه'] },
    // ═══ سقالات ومنصات رفع ═══
    scaffolding_equip: { ar: 'سقالات ومنصات', en: 'Scaffolding & Platforms', ur: 'سکیفولڈنگ', icon: '🪜', group: 'access_equipment',
      keywords: ['سقالة','سقالات','scaffold','منصة رفع','platform','سلالم','ladder','رافعة مقصية','scissor lift','بوم','جاكات','تدعيم','props','shoring','دعامات'] },
    // ═══ معدات ورشة ولحام ═══
    welding_cutting: { ar: 'ماكينات ولوازم لحام وقص', en: 'Welding & Cutting Machines', ur: 'ویلڈنگ', icon: '🔥', group: 'workshop_equip',
      keywords: ['لحام','welding','إلكترود','سلك لحام','بلازما','plasma','قناع لحام','منظم غاز','عربة أسطوانات','آرك','تيج','ميغ','MIG','TIG'] },
    pressure_wash: { ar: 'غسالات ضغط عالي', en: 'High-Pressure Washers', ur: 'پریشر واشر', icon: '💦', group: 'workshop_equip',
      keywords: ['غسالة ضغط','ضغط عالي','pressure washer','كارشر','بخاخ ضغط', 'لانس', 'بندقية رش', 'فوهة رش', 'فرشاة تنظيف', 'أسطح دوارة', 'غسالة'] },
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
    store_switches: { ar: 'مفاتيح وأفياش (محلات الكهرباء)', en: 'Switches & sockets (electrical shops)', ur: 'سوئچ', icon: '🔲', group: 'store_electrical',
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

export function detectSubCategory(productName: string, sector: Sector): string | null {
  const norm = normalizeText(productName)
  const subs = SUB_CATEGORIES[sector]
  if (!subs) return null
  const fixed = PRODUCT_SUB[(productName || '').trim()]
  if (fixed && subs[fixed]) return fixed
  let bestMatch: string | null = null
  let maxScore = 0
  for (const [key, sub] of Object.entries(subs)) {
    let score = 0
    for (const kw of sub.keywords) {
      const nkw = normalizeText(kw)
      // الحارس .length>0 ضروري: norm.includes('') يُرجع true دائماً
      if (nkw.length > 0 && norm.includes(nkw)) score++
    }
    if (score > maxScore) { maxScore = score; bestMatch = key }
  }
  return bestMatch
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 3: «ترطيب» شجرة التخصصات في الذاكرة من قاعدة البيانات.
// يُحدّث SUB_CATEGORIES (الأسماء/الأيقونة/المجموعة/الكلمات) لكل صف، ويضيف أي
// تخصص جديد أضافه الأدمن — فتظهر تعديلات الأدمن في قوائم الواجهة دون نشر.
// يُستدعى من TaxonomyProvider على المتصفح (يطفّر كائناً مفرداً على مستوى الموديول).
export function hydrateTaxonomy(rows: any[]): void {
  if (!Array.isArray(rows)) return
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

// وحدة القياس الافتراضية لكل تخصص فرعي — تُملأ تلقائياً عند اختيار المادة
const SUB_UNITS: Record<string, string> = {
  // مدني
  readymix: 'م³', cement: 'كيس', blocks: 'حبة', precast: 'عدد',
  rebar: 'طن', structural_steel: 'طن', steel_mesh: 'عدد',
  waterproofing: 'م²', piling: 'م.ط', construction_chemicals: 'عدد',
  drainage: 'م.ط', aggregates: 'م³', earthworks: 'م³',
  formwork_ply: 'لوحة', formwork_timber: 'عدد', formwork_steel: 'عدد',
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
}

// وحدة القياس الافتراضية لمادة: أولوية لوحدة المواصفات إن وُجدت، ثم وحدة التخصص الفرعي
// Order units for pieces vs area (shared by the site and the mobile app, 2026-10-15):
// furniture, decor and light fittings are bought by the piece or set; curtains, rugs, wallpaper,
// parquet and turf by area/length. Everything else keeps PRODUCT_SPECS units then the general list.
const PIECE_SUBS = new Set(['custom_furniture', 'fitted_furniture', 'office_furniture', 'decor_lighting', 'kitchen_appliances', 'cubicles'])
const PIECE_RE = /طاولة|كرسي|كنب|أريكة|خزانة|سرير|دولاب|مكتب|ثري|أباجور|مصباح|مرآة|طقم|غرفة|بوفيه|(^|\s)رف|تسريحة|كومود|مجلس|ديكور|لوحة فنية/
const AREA_RE = /ستار|ستائر|سجاد|موكيت|ورق جدران|باركيه|عشب|زوالي/
/** Allowed order units for a product, or null when the general list applies. */
export function unitOptionsFor(productName: string, sector: Sector): string[] | null {
  const n = (productName || '').trim()
  if (!n) return null
  if (AREA_RE.test(n)) return ['م²', 'متر', 'عدد']
  const sub = detectSubCategory(n, sector)
  if ((sub && PIECE_SUBS.has(sub)) || PIECE_RE.test(n)) return ['عدد', 'طقم']
  if (sub && SUB_UNIT_OPTIONS[sub]) {
    const def = SUB_UNITS[sub]
    return Array.from(new Set([...(def ? [def] : []), ...SUB_UNIT_OPTIONS[sub]]))
  }
  return null
}

// The unit choices shown for a product (web + app): its own spec units when it has several; when it
// has one (or none), that one first, then its specialty's logical units (owner 2026-10-24: a block
// must offer «حبة / طبلية», not only «حبة»).
export function unitChoicesFor(productName: string, sector: Sector): string[] | null {
  // older spec lists spell some units long-hand; show one spelling
  const SAME: Record<string, string> = { 'متر مربع': 'م²', 'متر مكعب': 'م³', 'بالألف حبة': 'ألف حبة' }
  const own = ((PRODUCT_SPECS[(productName || '').trim()] || []).find(f => f.key === 'unit')?.options || []).map(u => SAME[u] || u)
  const logical = unitOptionsFor(productName, sector)
  if (!logical) return own.length ? Array.from(new Set(own)) : null
  // a product with its own list keeps it, adding the specialty's units only when the two lists
  // share a unit (same kind of product — guards against a mis-detected specialty, e.g. طوبار ⊃ طوب)
  if (own.length >= 2 && !own.some(u => logical.includes(u))) return Array.from(new Set(own))
  return Array.from(new Set([...own, ...logical]))
}

export function getDefaultUnit(productName: string, sector: Sector): string {
  const specs = PRODUCT_SPECS[(productName || '').trim()]
  if (specs) {
    const u = specs.find(f => f.key === 'unit')
    if (u && u.options.length) return u.options[0]
  }
  const only = unitOptionsFor(productName, sector)
  if (only) return only[0]
  const sub = detectSubCategory(productName, sector)
  return (sub && SUB_UNITS[sub]) || ''
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
  'cabling', 'panels_switches', 'lighting', 'low_current', 'solar',
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
const SPEC_GROUPS: Array<{ products: string[]; spec: SpecField[] }> = [
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
for (const g of SPEC_GROUPS) { for (const p of g.products) PRODUCT_SPECS[p] = g.spec }

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
  'drainage_pipes', 'water_supply', 'fire_fighting', 'ductwork', 'store_fasteners',
])
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
export const PRODUCT_TRANSLATIONS: Record<string, { en: string; ur: string }> = {
  // 2026-10-19 research
  'انكر وتد (Wedge Anchor / Through Bolt)': { en: 'Wedge anchor (through bolt)', ur: 'ویج اینکر' },
  'انكر دروب إن (Drop-in Anchor)': { en: 'Drop-in anchor', ur: 'ڈراپ اِن اینکر' },
  'انكر كُم (Sleeve Anchor)': { en: 'Sleeve anchor', ur: 'سلیو اینکر' },
  'برغي خرسانة (Concrete Screw / Screw Anchor)': { en: 'Concrete screw anchor', ur: 'کنکریٹ اسکرو اینکر' },
  'انكر ثقيل للأحمال (Heavy-duty Anchor)': { en: 'Heavy-duty expansion anchor', ur: 'ہیوی ڈیوٹی اینکر' },
  'انكر سقف بمسمار للتعليق (Ceiling Nail Anchor)': { en: 'Ceiling drive / nail anchor', ur: 'سیلنگ نیل اینکر' },
  'مونة حقن كيميائية إيبوكسي (Injection Epoxy Mortar)': { en: 'Epoxy injection mortar (rebar & heavy anchors)', ur: 'ایپوکسی انجیکشن مارٹر' },
  'مونة حقن هايبرد/فينيل إستر سريعة (Hybrid / Vinylester Injection Mortar)': { en: 'Hybrid / vinylester injection mortar', ur: 'ہائبرڈ انجیکشن مارٹر' },
  'انكر كيميائي كبسولة (Chemical Capsule Anchor)': { en: 'Chemical capsule (resin capsule) anchor', ur: 'کیمیکل کیپسول اینکر' },
  'قضيب انكر كيميائي مع صامولة ووردة (Chemical Anchor Rod / Stud)': { en: 'Anchor rod for chemical anchors', ur: 'کیمیکل اینکر راڈ' },
  'جلبة شبكية للانكر الكيميائي في الطوب المفرغ (Mesh / Sieve Sleeve)': { en: 'Mesh sleeve for hollow masonry', ur: 'میش سلیو' },
  'مسدس حقن الانكر الكيميائي (Injection Dispenser)': { en: 'Manual injection dispenser', ur: 'انجیکشن ڈسپنسر گن' },
  'فوهة خلط للانكر الكيميائي (Static Mixer Nozzle)': { en: 'Static mixing nozzle', ur: 'مکسر نوزل' },
  'فرشاة ومنفاخ تنظيف ثقوب الانكر (Hole Cleaning Brush & Blow-out Pump)': { en: 'Hole-cleaning brush & blow-out pump', ur: 'ہول کلیننگ برش اور پمپ' },
  'وردة تعبئة للانكرات (Filling / Dynamic Washer)': { en: 'Filling washer (gap-filling)', ur: 'فلنگ واشر' },
  'خابور إطار للأبواب والشبابيك (Frame Fixing)': { en: 'Frame fixing (long nylon plug + screw)', ur: 'فریم فکسنگ' },
  'خابور معدني للجدران المفرغة والجبس بورد (Metal Cavity Anchor / Molly)': { en: 'Metal cavity anchor (Molly type)', ur: 'مولی اینکر (کھوکھلی دیوار)' },
  'خابور فراشة/توجل للأسقف المفرغة (Spring / Tilt Toggle)': { en: 'Spring / tilt toggle', ur: 'ٹوگل اینکر' },
  'خابور جبس بورد بلاستيك/زماك ذاتي الثقب (Self-drill Plasterboard Plug)': { en: 'Self-drilling plasterboard plug', ur: 'سیلف ڈرل جپسم پلگ' },
  'خابور الخرسانة الخلوية (الطوب الخفيف/سيبوريكس) (Aerated Concrete Plug)': { en: 'Aerated-concrete (AAC) plug', ur: 'ہلکی اینٹ پلگ' },
  'مسمار عزل حراري بقرص (Insulation Fixing)': { en: 'Insulation fixing (plate anchor)', ur: 'انسولیشن فکسنگ' },
  'طقم تثبيت مغسلة ومرحاض (Sanitary Fixing Set)': { en: 'Sanitary (washbasin/WC) fixing set', ur: 'سینیٹری فکسنگ سیٹ' },
  'مسامير بارود للخرسانة والحديد (Powder-actuated Nails)': { en: 'Powder-actuated fastening nails', ur: 'پاؤڈر ایکچوئیٹڈ کیل' },
  'طلقات بارود (Powder Cartridges / Boosters)': { en: 'Powder cartridges (boosters)', ur: 'پاؤڈر کارتوس' },
  'مسامير مسدس الغاز للخرسانة (Gas Nails)': { en: 'Gas-actuated concrete nails', ur: 'گیس نیلر کیل' },
  'مسمار بارود مع مشبك سقف/كابل (Ceiling & Conduit Clip Nail)': { en: 'Pre-mounted ceiling / conduit clip nail', ur: 'کلپ والا کیل' },
  'برغي ذاتي الحفر مع وردة مطاط للساندوتش بانل (Self-drilling Screw + EPDM Washer)': { en: 'Self-drilling screw with EPDM washer', ur: 'سیلف ڈرلنگ اسکرو (واشر کے ساتھ)' },
  'برغي خشب وتشبورد (Chipboard / Wood Screw)': { en: 'Chipboard / wood screw', ur: 'لکڑی کا پیچ' },
  'صامولة وصل طويلة للقضبان الملولبة (Coupling Nut)': { en: 'Coupling (connector) nut', ur: 'کپلنگ نٹ' },
  'قناة تثبيت يونيسترت (Strut Channel)': { en: 'Strut (installation) channel', ur: 'اسٹرٹ چینل' },
  'صامولة زنبركية للقناة (Channel Spring Nut)': { en: 'Channel spring nut', ur: 'چینل اسپرنگ نٹ' },
  'زوايا ووصلات قناة التثبيت (Channel Brackets & Connectors)': { en: 'Strut angle brackets & connectors', ur: 'چینل بریکٹ اور کنیکٹر' },
  'ذراع حامل كابولي (Cantilever Bracket)': { en: 'Cantilever arm / bracket', ur: 'کینٹیلیور بریکٹ' },
  'قاعدة تثبيت قناة/قضيب (Channel Base Plate / Rod Hanger)': { en: 'Channel base plate / rod hanger', ur: 'بیس پلیٹ (چینل)' },
  'علاقة مواسير مبطنة بالمطاط (Rubber-lined Pipe Clamp)': { en: 'Rubber-lined (EPDM) pipe clamp', ur: 'ربڑ والا پائپ کلیمپ' },
  'كلامب مواسير ثقيل للأحمال (Heavy-duty Pipe Clamp)': { en: 'Heavy-duty pipe clamp', ur: 'ہیوی ڈیوٹی پائپ کلیمپ' },
  'علاقة كلفيس/حلقة لمواسير الحريق والرشاشات (Clevis / Ring Hanger)': { en: 'Clevis / adjustable ring hanger (sprinkler)', ur: 'کلیویس ہینگر' },
  'كلامب كمرة (Beam Clamp)': { en: 'Beam clamp', ur: 'بیم کلیمپ' },
  'حامل انزلاقي/أسطواني للمواسير الساخنة (Pipe Slide / Roller Support)': { en: 'Pipe slide / roller support', ur: 'پائپ رولر سپورٹ' },
  'كلبس ماسورة وسرج تثبيت (Pipe / Conduit Saddle Clip)': { en: 'Pipe / conduit saddle clip', ur: 'پائپ کلپ (سیڈل)' },
  'قناة انكر مصبوبة في الخرسانة (Cast-in Anchor Channel)': { en: 'Cast-in anchor channel', ur: 'کاسٹ اِن اینکر چینل' },
  'طوق حريق للمواسير البلاستيكية (Firestop Collar)': { en: 'Firestop pipe collar', ur: 'فائر اسٹاپ کالر' },
  'شريط حريق منتفخ للمواسير (Intumescent Wrap Strip)': { en: 'Intumescent wrap strip', ur: 'انٹومیسنٹ ریپ اسٹرپ' },
  'لوح حريق مغطى للفتحات (Coated Firestop Board / Batt)': { en: 'Coated firestop board (batt)', ur: 'فائر اسٹاپ بورڈ' },
  'مونة حريق للفتحات الكبيرة (Firestop Mortar)': { en: 'Firestop mortar', ur: 'فائر اسٹاپ مارٹر' },
  'وسائد حريق (Firestop Pillows)': { en: 'Firestop pillows', ur: 'فائر اسٹاپ تکیے' },
  'كتل/سدادات حريق للكابلات (Firestop Blocks / Plugs)': { en: 'Firestop blocks / plugs', ur: 'فائر اسٹاپ بلاک' },
  'جلبة حريق لعبور الكابلات (Cable Transit Firestop Sleeve)': { en: 'Firestop cable transit sleeve', ur: 'فائر اسٹاپ کیبل سلیو' },
  'رذاذ حريق مرن للفواصل وأعلى الجدران (Firestop Joint Spray)': { en: 'Elastomeric firestop joint spray', ur: 'فائر اسٹاپ جوائنٹ اسپرے' },
  'طلاء حريق للكابلات (Ablative Cable Coating)': { en: 'Ablative firestop coating (cables)', ur: 'فائر اسٹاپ کوٹنگ' },
  'جلبة حريق تُصب في البلاطة (Cast-in Firestop Device)': { en: 'Cast-in firestop sleeve', ur: 'کاسٹ اِن فائر اسٹاپ سلیو' },
  'وسادات معجون حريق لعلب الكهرباء (Firestop Putty Pads)': { en: 'Firestop putty pads (electrical boxes)', ur: 'فائر اسٹاپ پٹی پیڈ' },
  'ملصق تعريف أنظمة الحريق (Firestop Identification Label)': { en: 'Firestop identification labels', ur: 'فائر اسٹاپ لیبل' },
  'فوم مسدس احترافي (Gun-grade PU Foam)': { en: 'Gun-grade PU foam', ur: 'گن گریڈ فوم' },
  'منظف الفوم (PU Foam Cleaner)': { en: 'PU foam cleaner', ur: 'فوم کلینر' },
  'لاصق تركيب بديل المسامير (Construction / Mounting Adhesive)': { en: 'Construction mounting adhesive', ur: 'ماؤنٹنگ ایڈہیسو' },
  'معجون إيبوكسي ثنائي للتصليح والتثبيت (2K Epoxy Putty / Adhesive)': { en: 'Two-component epoxy adhesive / putty', ur: 'دو جزوی ایپوکسی پٹی' },
  'بخاخ جلفنة باردة (زنك) (Zinc Spray / Cold Galvanizing)': { en: 'Zinc spray (cold galvanizing)', ur: 'زنک اسپرے' },
  'بخاخ مزيل صدأ ومُفكّك براغي (Penetrating Oil / Rust Remover)': { en: 'Penetrating oil / rust remover spray', ur: 'زنگ اتارنے والا اسپرے' },
  'مثبت براغي سائل (Threadlocker)': { en: 'Threadlocker', ur: 'تھریڈ لاکر' },
  'ريشة همر SDS-max للخرسانة (SDS-max Hammer Drill Bit)': { en: 'SDS-max hammer drill bit', ur: 'ایس ڈی ایس میکس ڈرل بٹ' },
  'ريشة همر مجوفة بشفط الغبار (Hollow Dust-extraction Drill Bit)': { en: 'Hollow drill bit (dust extraction)', ur: 'ہولو ڈرل بٹ' },
  'ريشة كور ماسية للخرسانة (Diamond Core Bit)': { en: 'Diamond core bit', ur: 'ڈائمنڈ کور بٹ' },
  'منشار كأس (Hole Saw)': { en: 'Hole saw', ur: 'ہول سا' },
  'ريشة بلاط وبورسلان ماسية (Diamond Tile Drill Bit)': { en: 'Diamond tile / porcelain drill bit', ur: 'ٹائل ڈائمنڈ ڈرل بٹ' },
  'ريشة دريل خرسانة وطوب عادية (Masonry Drill Bit)': { en: 'Masonry drill bit (straight shank)', ur: 'میسنری ڈرل بٹ' },
  'ريشة خشب (Wood Drill Bit: Brad-point / Spade / Auger)': { en: 'Wood drill bit', ur: 'لکڑی کی ڈرل بٹ' },
  'ريشة حديد مدرّجة (Step Drill Bit)': { en: 'Step drill bit', ur: 'اسٹیپ ڈرل بٹ' },
  'أزميل همر (مدبب/مسطح) (Hammer Chisel)': { en: 'Chisel for breaker / rotary hammer', ur: 'ہیمر چھینی' },
  'قرص ماسي لقص الخرسانة والحجر (Diamond Cutting Blade)': { en: 'Diamond cutting blade (concrete/masonry)', ur: 'ڈائمنڈ کٹنگ بلیڈ' },
  'قرص كوب ماسي للتجليخ (Diamond Cup Wheel)': { en: 'Diamond cup grinding wheel', ur: 'ڈائمنڈ کپ وہیل' },
  'شفرة منشار ترددي (سيف) (Reciprocating Saw Blade)': { en: 'Reciprocating (sabre) saw blade', ur: 'ریسیپروکیٹنگ سا بلیڈ' },
  'شفرة منشار أركت (Jigsaw Blade)': { en: 'Jigsaw blade', ur: 'جگ سا بلیڈ' },
  'لقم مفك وبوكسات تثبيت (Screwdriver Bits & Nut Setters)': { en: 'Screwdriver bits & nut setters', ur: 'اسکرو ڈرائیور بٹس' },
  'ملدن خرسانة عالي الأداء (Superplasticizer PCE)': { en: 'High-range water reducer / superplasticizer (PCE)', ur: 'ہائی پرفارمنس سپر پلاسٹیسائزر (PCE)' },
  'ملدن عادي مخفض للمياه (Plasticizer / Water Reducer)': { en: 'Normal plasticizer / water reducer', ur: 'عام پلاسٹیسائزر (واٹر ریڈیوسر)' },
  'مؤخر شك الخرسانة (Retarder)': { en: 'Set retarder', ur: 'کنکریٹ سیٹ ریٹارڈر' },
  'مسرع شك الخرسانة خالٍ من الكلوريد (Accelerator)': { en: 'Non-chloride set accelerator', ur: 'کنکریٹ ایکسلریٹر (بغیر کلورائیڈ)' },
  'مسرع خرسانة مرشوشة (Shotcrete Accelerator)': { en: 'Shotcrete accelerator (alkali-free)', ur: 'شاٹ کریٹ ایکسلریٹر' },
  'مضاف عزل مائي للخرسانة (Waterproofing Admixture)': { en: 'Integral waterproofing admixture', ur: 'کنکریٹ واٹر پروفنگ ایڈمکسچر' },
  'مضاف بلوري للخرسانة (Crystalline Admixture)': { en: 'Crystalline waterproofing admixture', ur: 'کرسٹلائن ایڈمکسچر' },
  'مثبط تآكل حديد التسليح (Corrosion Inhibitor)': { en: 'Corrosion-inhibiting admixture / surface-applied inhibitor', ur: 'زنگ روک ایڈمکسچر (کوروژن انہیبیٹر)' },
  'مضاف سحب الهواء (Air Entraining Agent)': { en: 'Air-entraining admixture', ur: 'ایئر انٹریننگ ایڈمکسچر' },
  'مضاف تقليل الانكماش (Shrinkage Reducing Admixture)': { en: 'Shrinkage-reducing admixture (SRA)', ur: 'سکڑاؤ کم کرنے والا ایڈمکسچر' },
  'مضاف لزوجة للخرسانة ذاتية الدمك (VMA)': { en: 'Viscosity-modifying admixture (SCC / underwater)', ur: 'وسکوسٹی موڈیفائنگ ایڈمکسچر' },
  'ميكروسيليكا (Silica Fume)': { en: 'Micro-silica / silica fume', ur: 'مائیکرو سلیکا' },
  'ألياف بولي بروبيلين للخرسانة (PP Micro Fibres)': { en: 'Polypropylene micro-fibres', ur: 'پولی پروپیلین فائبر' },
  'ألياف ماكرو إنشائية (Macro Synthetic / Steel Fibres)': { en: 'Structural macro-synthetic or steel fibres', ur: 'میکرو اسٹرکچرل فائبر (سنتھیٹک/اسٹیل)' },
  'مضاف جراوت حقن الكابلات (Grout Admixture / Expanding)': { en: 'Expanding grout admixture (post-tension ducts)', ur: 'گراؤٹ ایڈمکسچر (ایکسپینڈنگ)' },
  'مادة معالجة خرسانة شمعية (Wax-based Curing Compound)': { en: 'Wax-emulsion curing compound', ur: 'ویکس بیسڈ کیورنگ کمپاؤنڈ' },
  'مادة معالجة راتنجية/أكريليك (Resin / Acrylic Curing Compound)': { en: 'Resin or acrylic curing compound (cure & seal)', ur: 'ریزن/ایکریلک کیورنگ کمپاؤنڈ' },
  'مانع تبخر للخرسانة الطرية (Evaporation Retarder)': { en: 'Evaporation retarder (fresh concrete, hot weather)', ur: 'کنکریٹ تبخیر روکنے والا محلول' },
  'مادة فك قوالب كيميائية (Chemical Release Agent)': { en: 'Chemical form-release agent (fair-face, steel/ply forms)', ur: 'کیمیکل شٹرنگ ریلیز ایجنٹ' },
  'مؤخر سطحي لكشف الركام (Surface Retarder)': { en: 'Surface retarder (exposed aggregate)', ur: 'سرفیس ریٹارڈر' },
  'بوندنج SBR لاتكس (SBR Bonding Agent)': { en: 'SBR latex bonding agent / mortar modifier', ur: 'ایس بی آر بانڈنگ ایجنٹ' },
  'بوندنج أكريليك (Acrylic Bonding Agent)': { en: 'Acrylic bonding primer', ur: 'ایکریلک بانڈنگ ایجنٹ' },
  'بوندنج إيبوكسي لربط الخرسانة القديمة بالجديدة (Epoxy Bonding Agent)': { en: 'Epoxy bonding agent (old-to-new concrete)', ur: 'ایپوکسی بانڈنگ ایجنٹ' },
  'دهان حماية حديد التسليح قبل الإصلاح (Rebar Anti-corrosion Primer)': { en: 'Reinforcement corrosion-protection primer', ur: 'سریا زنگ روک پرائمر' },
  'جراوت أسمنتي انسيابي عالي المقاومة (Cementitious Precision Grout)': { en: 'Non-shrink cementitious precision grout', ur: 'سیمنٹ بیسڈ نان شرنک گراؤٹ' },
  'جراوت إيبوكسي لقواعد المعدات (Epoxy Grout)': { en: 'Epoxy machine-base / baseplate grout', ur: 'ایپوکسی گراؤٹ (مشین بیس)' },
  'جراوت سريع الشك لأغطية المناهل والإصلاح السريع (Rapid-set Grout)': { en: 'Rapid-setting grout / mortar (manholes, roads)', ur: 'تیز سیٹ ہونے والا گراؤٹ' },
  'جراوت حقن كابلات الشد اللاحق (Post-tension Duct Grout)': { en: 'Cable-duct grout (post-tensioning)', ur: 'پوسٹ ٹینشن ڈکٹ گراؤٹ' },
  'مثبت كيميائي إيبوكسي إنشائي (Epoxy Anchoring Resin)': { en: 'Structural epoxy anchoring resin (rebar dowelling)', ur: 'ایپوکسی کیمیکل اینکر' },
  'مثبت كيميائي بوليستر/فينيل إستر (Polyester / Vinylester Anchor)': { en: 'Polyester or vinylester anchoring resin', ur: 'پولی ایسٹر/وینائل ایسٹر اینکر' },
  'كبسولات تثبيت كيميائية (Resin Capsule Anchors)': { en: 'Chemical anchor capsules', ur: 'کیمیکل اینکر کیپسول' },
  'مونة إصلاح إنشائية عالية المقاومة R4 (Structural Repair Mortar)': { en: 'Structural repair mortar, class R4', ur: 'اسٹرکچرل ریپئر مارٹر R4' },
  'مونة إصلاح خفيفة للأسقف والجدران (Lightweight Repair Mortar)': { en: 'Lightweight thixotropic repair mortar (overhead/vertical)', ur: 'ہلکا ریپئر مارٹر (چھت/دیوار)' },
  'خرسانة دقيقة قابلة للصب (Micro-concrete)': { en: 'Flowable micro-concrete for jacketing / deep repairs', ur: 'مائیکرو کنکریٹ' },
  'مونة إصلاح إيبوكسي (Epoxy Repair Mortar)': { en: 'Epoxy repair mortar', ur: 'ایپوکسی ریپئر مارٹر' },
  'معجون تسوية وتشطيب الخرسانة (Fairing / Skim Coat)': { en: 'Cementitious fairing / pore-filling coat', ur: 'کنکریٹ اسکم کوٹ / فیئرنگ' },
  'لاصق إيبوكسي إنشائي (Structural Epoxy Adhesive)': { en: 'Structural epoxy paste adhesive', ur: 'اسٹرکچرل ایپوکسی ایڈہیسو' },
  'ألياف كربون لتقوية المنشآت (CFRP Strengthening)': { en: 'CFRP plates / fabric for structural strengthening', ur: 'کاربن فائبر اسٹرینتھننگ' },
  'راتنج حقن شقوق إيبوكسي (Epoxy Crack Injection)': { en: 'Low-viscosity epoxy crack-injection resin', ur: 'ایپوکسی کریک انجیکشن' },
  'راتنج حقن بولي يوريثان لإيقاف التسرب (PU Injection Resin)': { en: 'PU water-stopping injection resin (foaming / elastic)', ur: 'پولی یوریتھین انجیکشن ریزن' },
  'جل حقن أكريليك للستائر المائية (Acrylic Injection Gel)': { en: 'Acrylic injection gel (curtain injection)', ur: 'ایکریلک انجیکشن جیل' },
  'حشوات حقن (Injection Packers)': { en: 'Injection packers / nipples', ur: 'انجیکشن پیکرز' },
  'عزل سيماني مرن ثنائي المكون (Flexible Cementitious Waterproofing)': { en: 'Two-component flexible cementitious membrane', ur: 'دو جزئی لچکدار سیمنٹ واٹر پروفنگ' },
  'عزل سيماني صلب (Rigid Cementitious Slurry)': { en: 'Rigid cementitious waterproofing slurry', ur: 'سخت سیمنٹ واٹر پروف سلری' },
  'عزل بلوري متغلغل (Crystalline Waterproofing Coating)': { en: 'Crystalline penetrating waterproofing slurry', ur: 'کرسٹلائن واٹر پروفنگ کوٹنگ' },
  'عزل بولي يوريثان سائل للأسطح المكشوفة (PU Liquid Membrane)': { en: 'Liquid-applied PU roof membrane (UV-exposed)', ur: 'پولی یوریتھین لیکوئیڈ میمبرین' },
  'عزل أكريليك مائي مرن للأسطح (Acrylic Elastomeric Membrane)': { en: 'Water-based acrylic elastomeric roof coating', ur: 'ایکریلک لچکدار چھت کوٹنگ' },
  'عزل بيتوميني مطاطي سائل (Bitumen-Rubber Emulsion)': { en: 'Bitumen-rubber emulsion coating (foundations)', ur: 'بٹومن ربڑ ایملشن کوٹنگ' },
  'عزل بولي يوريا بالرش (Polyurea Spray Membrane)': { en: 'Hot-spray pure polyurea membrane', ur: 'پولی یوریا اسپرے میمبرین' },
  'غشاء عزل ذاتي اللصق (Self-adhesive Membrane)': { en: 'Self-adhesive SBS bitumen membrane (cold-applied)', ur: 'سیلف ایڈہیسو میمبرین' },
  'غشاء HDPE مسبق التركيب للأساسات (Pre-applied HDPE Membrane)': { en: 'Pre-applied fully-bonded HDPE membrane', ur: 'پری اپلائیڈ HDPE میمبرین' },
  'غشاء PVC للعزل (PVC Membrane)': { en: 'PVC waterproofing membrane (roof / basement / tunnel)', ur: 'پی وی سی واٹر پروفنگ میمبرین' },
  'غشاء TPO للأسطح (TPO Membrane)': { en: 'TPO roofing membrane', ur: 'ٹی پی او چھت میمبرین' },
  'لباد / غشاء بنتونايت (Bentonite Membrane)': { en: 'Bentonite geocomposite membrane', ur: 'بینٹونائٹ میمبرین' },
  'ووتر ستوب PVC للفواصل (PVC Waterstop)': { en: 'PVC waterstop (centre-bulb / dumbbell / base)', ur: 'پی وی سی واٹر اسٹاپ' },
  'شريط منتفخ هيدروفيلي (Hydrophilic Swelling Strip)': { en: 'Hydrophilic swelling waterstop strip', ur: 'ہائیڈروفلک سوئیلنگ اسٹرپ' },
  'خرطوم حقن فواصل الصب (Injection Hose)': { en: 'Re-injectable joint injection hose', ur: 'انجیکشن ہوز (جوائنٹس)' },
  'شريط عزل فواصل مرن TPE/هايبالون (Joint Sealing Tape)': { en: 'Elastic joint sealing tape bonded with epoxy', ur: 'لچکدار جوائنٹ سیلنگ ٹیپ' },
  'شريط وزوايا عزل للحمامات والأسطح (Waterproofing Corner Tape)': { en: 'Waterproofing tape, corners & pipe collars', ur: 'واٹر پروفنگ کارنر ٹیپ' },
  'شبك/قماش تسليح للعزل السائل (Reinforcement Fleece)': { en: 'Polyester / glass reinforcement fleece for liquid membranes', ur: 'لیکوئیڈ میمبرین ری انفورسمنٹ فلیس' },
  'عزل مائي سائل تحت البلاط للحمامات (Under-tile Liquid Membrane)': { en: 'Ready-to-use under-tile waterproofing (wet areas)', ur: 'ٹائل کے نیچے واٹر پروفنگ' },
  'طارد ماء سيلاني شفاف (Silane / Siloxane Water Repellent)': { en: 'Penetrating silane/siloxane water repellent', ur: 'سیلین واٹر ریپیلنٹ' },
  'دهان حماية خرسانة مضاد للكربنة (Anti-carbonation Coating)': { en: 'Elastomeric anti-carbonation coating', ur: 'اینٹی کاربونیشن کوٹنگ' },
  'دهان إيبوكسي معتمد لخزانات مياه الشرب (Potable Water Epoxy Coating)': { en: 'Potable-water approved epoxy tank coating', ur: 'پینے کے پانی کے ٹینک کی ایپوکسی کوٹنگ' },
  'دهان إيبوكسي قطراني (Coal-tar / Bitumen Epoxy)': { en: 'Coal-tar or hydrocarbon-modified epoxy (sewage / buried)', ur: 'کول تار ایپوکسی' },
  'بطانة مقاومة للكيماويات لغرف الصرف والمحطات (Chemical-resistant Lining)': { en: 'Chemical-resistant epoxy/novolac lining (sewers, STP)', ur: 'کیمیکل ریزسٹنٹ لائننگ' },
  'دهان بولي يوريثان أليفاتي نهائي (PU Topcoat)': { en: 'Aliphatic PU UV-stable topcoat', ur: 'ایلیفیٹک پی یو ٹاپ کوٹ' },
  'دهان منتفخ مقاوم للحريق للحديد (Intumescent Paint, Cellulosic)': { en: 'Thin-film intumescent coating for structural steel', ur: 'انٹومیسنٹ فائر پروف پینٹ' },
  'دهان منتفخ إيبوكسي (Epoxy Intumescent, Hydrocarbon)': { en: 'Epoxy intumescent (hydrocarbon / jet fire)', ur: 'ایپوکسی انٹومیسنٹ' },
  'مونة رش أسمنتية مقاومة للحريق (Cementitious Fireproofing Spray)': { en: 'Spray-applied cementitious fire protection', ur: 'سیمنٹ بیسڈ فائر پروفنگ اسپرے' },
  'مقسي سطح خرسانة بودرة (Dry-shake Floor Hardener)': { en: 'Dry-shake surface hardener (mineral / metallic)', ur: 'ڈرائی شیک فلور ہارڈنر' },
  'مقسي ومانع غبار سائل للخرسانة (Liquid Densifier / Lithium Silicate)': { en: 'Liquid densifier / dust-proofer (silicate)', ur: 'لیکوئیڈ کنکریٹ ڈینسیفائر' },
  'برايمر إيبوكسي للأرضيات (Epoxy Floor Primer)': { en: 'Epoxy primer / sealer for floors', ur: 'ایپوکسی فلور پرائمر' },
  'أرضية بولي يوريثان أسمنتية (PU Cement / Urethane Cement Floor)': { en: 'Polyurethane-cement heavy-duty floor (food, chemical, thermal shock)', ur: 'پی یو سیمنٹ فلور' },
  'أرضية بولي يوريثان مرنة (Elastic PU Floor)': { en: 'Elastic / crack-bridging PU floor (car parks, decks)', ur: 'لچکدار پی یو فلور' },
  'أرضية إيبوكسي مضادة للكهرباء الساكنة (ESD / Antistatic Epoxy)': { en: 'Conductive / antistatic epoxy floor', ur: 'اینٹی اسٹیٹک ایپوکسی فلور' },
  'مونة إيبوكسي للأرضيات الثقيلة (Epoxy Screed)': { en: 'Trowelled epoxy screed / mortar', ur: 'ایپوکسی اسکریڈ' },
  'مايكروسمنت للأرضيات والجدران (Microcement)': { en: 'Decorative microcement / cementitious overlay', ur: 'مائیکرو سیمنٹ' },
  'رابط سكريد سريع الجفاف (Rapid-drying Screed Binder)': { en: 'Rapid-drying screed binder / premix', ur: 'تیز خشک ہونے والا اسکریڈ بائنڈر' },
  'معجون تسوية جدران وأرضيات قبل البلاط (Levelling Mortar)': { en: 'Levelling / smoothing mortar (walls and floors)', ur: 'لیولنگ مارٹر' },
  'غراء بلاط أسمنتي عادي C1 (Standard Tile Adhesive)': { en: 'Standard cementitious tile adhesive C1', ur: 'عام ٹائل ایڈہیسو C1' },
  'غراء بلاط محسن C2TE للبورسلين (Improved Tile Adhesive C2TE)': { en: 'Improved polymer-modified adhesive C2TE (porcelain, large format)', ur: 'امپروؤڈ ٹائل ایڈہیسو C2TE' },
  'غراء بلاط مرن S1/S2 للواجهات والمسابح (Deformable Tile Adhesive S1/S2)': { en: 'Highly deformable adhesive C2TE S1 / S2 (facades, pools, heated)', ur: 'لچکدار ٹائل ایڈہیسو S1/S2' },
  'لاصق بلاط إيبوكسي (Epoxy Tile Adhesive)': { en: 'Epoxy tile adhesive (R2, chemical areas)', ur: 'ایپوکسی ٹائل ایڈہیسو' },
  'لاصق رخام وحجر طبيعي أبيض سريع (White Rapid Stone Adhesive)': { en: 'White rapid-setting adhesive for marble & natural stone', ur: 'ماربل/پتھر کے لیے سفید ایڈہیسو' },
  'ترويبة أسمنتية محسنة CG2 (Polymer-modified Tile Grout)': { en: 'Polymer-modified cementitious grout CG2WA', ur: 'پولیمر سیمنٹ ٹائل گراؤٹ CG2' },
  'برايمر قبل الغراء والسكريد (Primer for Adhesives / Screeds)': { en: 'Acrylic primer for adhesives & screeds', ur: 'ایڈہیسو/اسکریڈ پرائمر' },
  'مادة حماية وتلميع حجر وترويبة (Stone & Grout Sealer)': { en: 'Stone / grout impregnating sealer', ur: 'پتھر/گراؤٹ سیلر' },
  'حبل فوم خلفي للفواصل (Backer Rod)': { en: 'Closed-cell PE backer rod', ur: 'بیکر راڈ (جوائنٹ فوم)' },
  'حشوة فواصل شبه صلبة للأرضيات الصناعية (Semi-rigid Joint Filler)': { en: 'Semi-rigid epoxy / polyurea floor-joint filler', ur: 'نیم سخت فلور جوائنٹ فلر' },
  'مانع تسرب فواصل مقاوم للوقود (Fuel-resistant Joint Sealant)': { en: 'Fuel-resistant joint sealant (aprons, fuel stations)', ur: 'فیول ریزسٹنٹ جوائنٹ سیلنٹ' },
  'برايمر مانع التسرب للفواصل (Sealant Primer)': { en: 'Joint-sealant primer (porous / non-porous)', ur: 'سیلنٹ پرائمر' },
  'غطاء فواصل تمدد مرن (Expansion Joint System, elastomeric)': { en: 'Elastomeric expansion-joint seal (bridges, car parks)', ur: 'ایکسپینشن جوائنٹ سسٹم' },
  'مونة تثبيت وتعشيق سريعة (Rapid Anchoring Mortar / Hydraulic Cement)': { en: 'Fast-set anchoring cement (posts, bolts, railings)', ur: 'تیز سیٹ اینکرنگ سیمنٹ' },
  'غراء تماس (كونتاكت)': { en: 'Contact adhesive (solvent)', ur: 'کانٹیکٹ گوند' },
  'غراء تماس مائي (بدون رائحة)': { en: 'Water-based contact adhesive', ur: 'پانی پر مبنی کانٹیکٹ گوند' },
  'لاصق أرضيات فينيل وسجاد': { en: 'Vinyl / carpet flooring adhesive', ur: 'ونائل و قالین فرش گوند' },
  'غراء خشب أبيض (PVA)': { en: 'PVA wood glue (white glue)', ur: 'سفید لکڑی گوند (پی وی اے)' },
  'غراء خشب بولي يوريثان (D4 مقاوم للماء)': { en: 'PU wood adhesive D4', ur: 'پی یو لکڑی گوند D4' },
  'غراء مواسير CPVC (مياه حارة)': { en: 'CPVC solvent cement', ur: 'سی پی وی سی پائپ گوند' },
  'منظف وبرايمر مواسير PVC قبل اللحام': { en: 'PVC/CPVC pipe cleaner–primer', ur: 'پی وی سی پائپ کلینر / پرائمر' },
  'لاصق إيبوكسي مكونين (أنبوبين/سرنجة)': { en: 'Two-part epoxy adhesive', ur: 'دو جزو ایپوکسی گوند' },
  'معجون إيبوكسي للإصلاح (عصا)': { en: 'Epoxy repair putty stick', ur: 'ایپوکسی مرمتی پٹی' },
  'غراء فوري (سوبر جلو)': { en: 'Cyanoacrylate super glue', ur: 'سپر گلو (فوری گوند)' },
  'لاصق مونتاج (تثبيت بدون مسامير)': { en: 'Construction / montage adhesive (no-nails)', ur: 'مونٹاج گوند (بغیر کیل)' },
  'لاصق هايبرد عالي الالتصاق (High Tack)': { en: 'High-tack MS-polymer adhesive', ur: 'ہائی ٹیک ہائبرڈ گوند' },
  'لاصق بولي يوريثان إنشائي للألواح والكلادينج': { en: 'PU structural panel / cladding adhesive', ur: 'پی یو ساختی پینل گوند' },
  'فوم لاصق للألواح العازلة (XPS/EPS)': { en: 'Adhesive PU foam for insulation boards', ur: 'انسولیشن بورڈ کے لیے چپکنے والا فوم' },
  'لاصق ألواح الجبس والكرانيش (بودرة)': { en: 'Gypsum board / cornice adhesive (powder)', ur: 'جپسم بورڈ و کارنس گوند' },
  'لاصق ستايروفوم وكرانيش بوليسترين': { en: 'Polystyrene / cornice adhesive (solvent-free)', ur: 'اسٹائروفوم گوند' },
  'أصابع شمع غراء حراري (هوت ميلت)': { en: 'Hot-melt glue sticks', ur: 'گرم گوند کی چھڑیاں' },
  'لاصق رخام وحجر (بوليستر/إيبوكسي)': { en: 'Marble & stone adhesive (polyester/epoxy knife-grade)', ur: 'ماربل و پتھر گوند' },
  'غراء عزل الدكت (لاصق الصوف والفوم)': { en: 'Duct insulation adhesive', ur: 'ڈکٹ انسولیشن گوند' },
  'لاصق عزل الأنابيب المطاطي (أرمافلكس)': { en: 'Elastomeric pipe-insulation adhesive', ur: 'ربڑ پائپ انسولیشن گوند' },
  'مادة ربط SBR (لاتكس للمونة)': { en: 'SBR latex bonding agent', ur: 'ایس بی آر لیٹیکس بانڈنگ ایجنٹ' },
  'مادة ربط PVA للياسة (بوندنج أبيض)': { en: 'PVA bonding agent for plaster', ur: 'پی وی اے پلستر بانڈ' },
  'مادة ربط إيبوكسي (خرسانة قديمة بجديدة)': { en: 'Epoxy bonding agent (old-to-new concrete)', ur: 'ایپوکسی بانڈنگ ایجنٹ' },
  'شريط ماسكنج ورقي (للدهان)': { en: 'Paper masking tape', ur: 'ماسکنگ ٹیپ' },
  'شريط لاصق شفاف للتغليف (كرتون)': { en: 'Packing tape (clear/brown)', ur: 'پیکنگ ٹیپ' },
  'شريط قماشي (داكت تيب)': { en: 'Cloth duct tape', ur: 'کپڑے والی ڈکٹ ٹیپ' },
  'شريط لاصق وجهين رقيق (ورقي/شفاف)': { en: 'Double-sided tissue tape', ur: 'دو طرفہ پتلی ٹیپ' },
  'شريط لاصق وجهين فوم (للمرايا واللوحات)': { en: 'Double-sided foam mounting tape', ur: 'دو طرفہ فوم ٹیپ' },
  'شريط VHB إنشائي للألواح والواجهات': { en: 'VHB structural bonding tape (glazing/panel)', ur: 'وی ایچ بی ساختی ٹیپ' },
  'شريط ألمنيوم (فويل تيب)': { en: 'Aluminium foil tape', ur: 'ایلومینیم فوائل ٹیپ' },
  'شريط ألمنيوم مقوى FSK لعزل الدكت': { en: 'Reinforced aluminium FSK tape (fire-tested)', ur: 'مضبوط ایلومینیم FSK ٹیپ' },
  'شريط بيوتيل لاصق للتسربات (وجه ألمنيوم)': { en: 'Butyl sealing tape, foil-faced', ur: 'بیوٹائل سیلنگ ٹیپ' },
  'شريط بيوتيل وجهين (للصاج والزجاج)': { en: 'Double-sided butyl tape (roof sheets/glazing)', ur: 'دو طرفہ بیوٹائل ٹیپ' },
  'شريط بيتوميني ذاتي اللصق (فلاشينج)': { en: 'Self-adhesive bitumen flashing tape', ur: 'خود چپکنے والی بٹومین ٹیپ' },
  'شريط عازل للحريق والمياه للفواصل (FWBT)': { en: 'Fire & water barrier tape', ur: 'آگ اور پانی روکنے والی ٹیپ' },
  'شريط مانع انزلاق للدرج': { en: 'Anti-slip safety tape', ur: 'پھسلن روک ٹیپ' },
  'شريط فوم عازل للأبواب والنوافذ': { en: 'Self-adhesive foam weather-strip', ur: 'دروازوں کے لیے فوم سیل ٹیپ' },
  'شريط تمدد لعزل فواصل النوافذ (Expanding Tape)': { en: 'Pre-compressed expanding sealing tape', ur: 'پھیلنے والی سیلنگ ٹیپ' },
  'برايمر بيتوميني مائي (WB)': { en: 'Water-based bitumen primer', ur: 'پانی پر مبنی بٹومین پرائمر' },
  'برايمر بيتوميني سولفنت (كت باك MC/RC)': { en: 'Solvent cut-back bitumen primer', ur: 'سولونٹ بٹومین پرائمر (کٹ بیک)' },
  'دهان بيتوميني مستحلب (إيمولشن)': { en: 'Bitumen emulsion coating', ur: 'بٹومین ایملشن کوٹنگ' },
  'مستحلب بيتوميني معدّل بالمطاط (RBE)': { en: 'Rubber-modified bitumen emulsion', ur: 'ربڑ ملا بٹومین ایملشن' },
  'دهان بيتوميني مقوى بالألياف (للأسطح)': { en: 'Fibre-reinforced bitumen coating', ur: 'فائبر ملا بٹومین کوٹنگ' },
  'دهان بيتوميني سولفنت (للأساسات)': { en: 'Solvent-based bitumen coating', ur: 'سولونٹ بٹومین کوٹنگ' },
  'طلاء عزل أسطح أكريليك مرن عاكس للحرارة': { en: 'Elastomeric acrylic reflective roof coating', ur: 'لچکدار ایکریلک چھت کوٹنگ' },
  'عزل بولي يوريثان سائل للأسطح': { en: 'Liquid-applied PU roof membrane', ur: 'مائع پولی یوریتھین چھت جھلی' },
  'عزل سيماني مرن مكونين (2K)': { en: 'Flexible two-part cementitious waterproofing', ur: 'دو جزو لچکدار سیمنٹ واٹر پروفنگ' },
  'عزل مائي للحمامات تحت البلاط (جاهز)': { en: 'Under-tile wet-area liquid membrane', ur: 'ٹائل کے نیچے باتھ روم واٹر پروفنگ' },
  'شريط زوايا مطاطي لعزل الحمامات': { en: 'Wet-area sealing band & corners', ur: 'باتھ روم کونے کی سیلنگ ٹیپ' },
  'غشاء بيتوميني APP لفة (4مم)': { en: 'APP modified bitumen membrane roll', ur: 'اے پی پی بٹومین جھلی رول' },
  'غشاء بيتوميني SBS (مرن للبرودة)': { en: 'SBS modified bitumen membrane', ur: 'ایس بی ایس بٹومین جھلی' },
  'غشاء بيتوميني مكسو بالحبيبات (للأسطح المكشوفة)': { en: 'Mineral-slated (granule) bitumen membrane', ur: 'دانے دار بٹومین جھلی' },
  'غشاء بيتوميني ذاتي اللصق (بدون لهب)': { en: 'Self-adhesive (torch-free) bitumen membrane', ur: 'خود چپکنے والی بٹومین جھلی' },
  'لفائف عزل PVC/TPO للأسطح': { en: 'PVC / TPO single-ply roof membrane', ur: 'پی وی سی / ٹی پی او چھت جھلی' },
  'قماش بوليستر تسليح للعزل السائل': { en: 'Polyester reinforcing fleece for liquid membranes', ur: 'مائع جھلی کے لیے پولیسٹر فلیس' },
  'عزل كريستالي للخرسانة (Crystalline)': { en: 'Crystalline waterproofing slurry/admixture', ur: 'کرسٹلائن واٹر پروفنگ' },
  'راتنج حقن بولي يوريثان للتسريبات': { en: 'PU injection resin for leak sealing', ur: 'رساؤ کے لیے پی یو انجیکشن رال' },
  'عازل مائي شفاف للواجهات والحجر (سيلان/سيلوكسان)': { en: 'Clear water-repellent (silane/siloxane)', ur: 'شفاف پانی روک کوٹنگ' },
  'لاصق بلاط أسمنتي عادي C1 (سيراميك)': { en: 'Standard cementitious tile adhesive C1', ur: 'عام ٹائل گوند C1' },
  'لاصق بلاط محسّن C2T (بورسلان)': { en: 'Improved tile adhesive C2T', ur: 'بہتر ٹائل گوند C2T' },
  'لاصق بلاط C2TE (بورسلان ومناطق رطبة)': { en: 'Improved extended-open-time tile adhesive C2TE', ur: 'ٹائل گوند C2TE' },
  'لاصق بلاط مرن C2TE S1 (فورمات كبير وخارجي)': { en: 'Flexible tile adhesive C2TE S1 (large format/facade)', ur: 'لچکدار ٹائل گوند C2TE S1' },
  'لاصق بلاط سريع التصلب C2F': { en: 'Rapid-setting tile adhesive C2F', ur: 'جلد سخت ہونے والا ٹائل گوند' },
  'لاصق رخام وحجر أبيض (أسمنتي)': { en: 'White cementitious marble & stone adhesive', ur: 'سفید ماربل ٹائل گوند' },
  'لاصق بلاط المسابح': { en: 'Swimming-pool tile adhesive', ur: 'سوئمنگ پول ٹائل گوند' },
  'لاصق بلاط جاهز (معجون سطل)': { en: 'Ready-mixed dispersion tile adhesive D1/D2', ur: 'تیار ٹائل گوند پیسٹ' },
  'ترويبة أسمنتية عادية CG1': { en: 'Standard cementitious tile grout CG1', ur: 'عام ٹائل گراؤٹ CG1' },
  'ترويبة محسّنة CG2WA (مقاومة للماء والاحتكاك)': { en: 'Improved grout CG2 WA (water/abrasion resistant)', ur: 'بہتر گراؤٹ CG2 WA' },
  'ترويبة المسابح': { en: 'Swimming-pool grout', ur: 'سوئمنگ پول گراؤٹ' },
  'عازل ترويبة شفاف (Grout Sealer)': { en: 'Grout & tile sealer', ur: 'گراؤٹ سیلر' },
  'معجون جدران جاهز (أكريليك – سطل)': { en: 'Ready-mixed acrylic wall putty', ur: 'تیار ایکریلک وال پٹی' },
  'معجون أسمنتي بودرة للواجهات (سكيم كوت)': { en: 'Cementitious skim-coat / powder putty', ur: 'سیمنٹ پاؤڈر پٹی (اسکم کوٹ)' },
  'جبس تلبيس بودرة (بلاستر)': { en: 'Gypsum plaster powder', ur: 'جپسم پلستر پاؤڈر' },
  'معجون حشو شقوق جاهز (أنبوب/علبة)': { en: 'Ready-mixed crack filler (DIY)', ur: 'دراڑیں بھرنے والی تیار پٹی' },
  'معجون خشب (حشوة خشب)': { en: 'Wood filler', ur: 'لکڑی کی پٹی' },
  'معجون بوليستر (معجون حديد/سيارات)': { en: 'Polyester body filler', ur: 'پولیسٹر باڈی فلر' },
  'برايمر قبل اللاصق للأسطح الملساء (بلاط فوق بلاط)': { en: 'Tile primer / adhesion promoter for smooth substrates', ur: 'ٹائل پرائمر' },
  'برايمر مانع التسرب للأسطح المسامية': { en: 'Sealant primer (porous/non-porous)', ur: 'سیلنٹ پرائمر' },
  'فوم منخفض التمدد للأبواب والنوافذ': { en: 'Low-expansion PU foam (door/window frames)', ur: 'کم پھیلنے والا فوم' },
  'مسدس فوم معدني': { en: 'PU foam applicator gun', ur: 'فوم گن' },
  'منظف الفوم والمسدس (أسيتون بخاخ)': { en: 'Gun & foam cleaner', ur: 'فوم و گن کلینر' },
  'مزيل السيليكون والمواد اللاصقة': { en: 'Silicone & adhesive remover', ur: 'سلیکون اور گوند ہٹانے والا' },
  'منظف أسطح قبل السيليكون (زجاج/ألمنيوم)': { en: 'Surface cleaner / activator before sealing', ur: 'سیلنگ سے پہلے سطح صاف کرنے والا' },
  'مزيل بقايا الأسمنت والمونة عن البلاط': { en: 'Cement & mortar residue remover (acid cleaner)', ur: 'سیمنٹ کے داغ ہٹانے والا' },
  'منظف بقايا الترويبة الإيبوكسية': { en: 'Epoxy grout haze remover', ur: 'ایپوکسی گراؤٹ صاف کرنے والا' },
  'أسيتون صناعي': { en: 'Industrial acetone', ur: 'صنعتی ایسیٹون' },
  'مزيل دهانات (Paint Stripper)': { en: 'Paint & varnish stripper', ur: 'پینٹ ہٹانے والا' },
  'بخاخ متعدد الأغراض (مزيل صدأ ومزلّق)': { en: 'Multi-purpose penetrating/rust-release spray', ur: 'زنگ ہٹانے والا اسپرے' },
  'صاج مدرفل على البارد (CR Sheet)': { en: 'Cold-rolled steel sheet', ur: 'کولڈ رولڈ اسٹیل شیٹ' },
  'صاج ملوّن مسبق الدهان (PPGI / PPGL)': { en: 'Pre-painted galvanized / galvalume sheet', ur: 'پری پینٹڈ گیلوانائزڈ شیٹ' },
  'صاج مموّج ملوّن للأسقف والسواتر (Corrugated Sheet)': { en: 'Corrugated pre-painted roofing sheet', ur: 'رنگین نالی دار چھت کی شیٹ' },
  'لفائف صاج أسود حار (HR Coil)': { en: 'Hot-rolled steel coil', ur: 'ہاٹ رولڈ اسٹیل کوائل' },
  'لفائف صاج مجلفن (GI Coil G90)': { en: 'Galvanized steel coil', ur: 'گیلوانائزڈ اسٹیل کوائل' },
  'لوح حديد سميك (Heavy Steel Plate ASTM A36 / Gr.50)': { en: 'Heavy HR steel plate', ur: 'موٹی اسٹیل پلیٹ' },
  'حديد مربع مصمت (Square Bar)': { en: 'Solid square steel bar', ur: 'ٹھوس چوکور سریا' },
  'حديد مدوّر مصمت / شافت (Round Bar)': { en: 'Solid round bar / shafting', ur: 'گول ٹھوس سریا (شافٹ)' },
  'ماسورة حديد بيضاوية (Oval Tube)': { en: 'Oval steel tube', ur: 'بیضوی اسٹیل ٹیوب' },
  'جسور حديد يابانية JIS (H / I Beam)': { en: 'JIS H-beam / I-beam', ur: 'جاپانی معیار H/I بیم' },
  'حديد تسليح مقصوص ومثني حسب المخطط (Cut & Bend)': { en: 'Cut-and-bent rebar to schedule', ur: 'کٹ اینڈ بینڈ سریا' },
  'حديد تسليح مطلي إيبوكسي (Epoxy-coated Rebar)': { en: 'Epoxy-coated deformed rebar', ur: 'ایپوکسی کوٹڈ سریا' },
  'حديد تسليح أملس (Plain Round Rebar)': { en: 'Plain (smooth) rebar', ur: 'سادہ گول سریا' },
  'سلك رباط حديد التسليح (Binding Wire)': { en: 'Rebar tie / binding wire', ur: 'سریا باندھنے کی تار' },
  'كرسي حمل حديد التسليح (Bar Chair)': { en: 'Rebar chair support', ur: 'سریا کرسی اسپیسر' },
  'فاصل عجلة بلاستيكي للأعمدة والجدران (Wheel Spacer)': { en: 'PVC wheel spacer', ur: 'پہیہ نما پلاسٹک اسپیسر' },
  'عتبة خرسانية مسبقة الصب للفتحات (Precast Lintel)': { en: 'Precast concrete lintel', ur: 'پری کاسٹ کنکریٹ لنٹل' },
  'عتبة بلوك خفيف (AAC Lintel)': { en: 'AAC lintel', ur: 'اے اے سی لنٹل' },
  'عتبة حديد مجلفنة للفتحات (Steel Lintel)': { en: 'Galvanized steel lintel', ur: 'گیلوانائزڈ اسٹیل لنٹل' },
  'بلوك خرساني خلوي خفيف (AAC Block / سيبوريكس)': { en: 'Autoclaved aerated concrete block', ur: 'ہلکا اے اے سی بلاک' },
  'بلوك أسمنتي مصمت (Solid Concrete Block)': { en: 'Solid concrete block', ur: 'ٹھوس سیمنٹ بلاک' },
  'طوب أحمر حامل للأحمال (Load-bearing Clay Brick)': { en: 'Load-bearing red clay brick', ur: 'لوڈ بیئرنگ سرخ اینٹ' },
  'طوب أحمر لحماية المواسير (Pipe-protector Brick)': { en: 'Pipe-protector clay brick', ur: 'پائپ حفاظتی اینٹ' },
  'هوردي بوليسترين للأسقف (EPS Hourdi Block)': { en: 'Polystyrene hourdi slab block', ur: 'پولی اسٹائرین ہوردی بلاک' },
  'أسمنت مقاوم للكبريتات (SRC)': { en: 'Sulphate-resisting cement', ur: 'سلفیٹ مزاحم سیمنٹ' },
  'أسمنت أبيض (White Portland Cement)': { en: 'White Portland cement', ur: 'سفید سیمنٹ' },
  'أسمنت بوزولاني (PPC)': { en: 'Portland pozzolana cement', ur: 'پوزولانا سیمنٹ' },
  'أسمنت لياسة وتشطيب (Masonry / Finishing Cement)': { en: 'Masonry / plastering cement', ur: 'پلاستر سیمنٹ' },
  'شبك سلّمي لتسليح البلوك (Block Ladder Mesh)': { en: 'Galvanized block ladder reinforcement', ur: 'بلاک لیڈر میش' },
  'رباط جدار معدني مموّج (Wall Tie)': { en: 'Corrugated wall tie', ur: 'دیوار ٹائی' },
  'صامولة جناح للطوبار (Formwork Wing Nut)': { en: 'Formwork wing nut', ur: 'فارم ورک ونگ نٹ' },
  'صحن تثبيت قضيب الشد (Tie-rod Waler Plate)': { en: 'Tie-rod washer / waler plate', ur: 'ٹائی راڈ واشر پلیٹ' },
  'ماسورة ومخروط PVC لقضيب الشد (Tie-rod Sleeve & Cone)': { en: 'PVC tie-rod spacer tube and cone', ur: 'ٹائی راڈ پی وی سی پائپ اور کون' },
  'مانع تسرب لقضيب الشد للخزانات (Tie-rod Water Stopper)': { en: 'Tie-rod water barrier stopper', ur: 'ٹائی راڈ واٹر اسٹاپر' },
  'قمطة طوبار سريعة (Rapid Clamp)': { en: 'Formwork rapid clamp and tensioner', ur: 'ریپڈ کلیمپ' },
  'شطفة زوايا PVC للخرسانة (PVC Chamfer Strip)': { en: 'PVC chamfer strip', ur: 'پی وی سی چیمفر پٹی' },
  'لوح سقالة خشبي (Scaffold Plank)': { en: 'Timber scaffold board', ur: 'لکڑی کا اسکیفولڈ تختہ' },
  'خشب أبيض لين للبناء والنجارة (White Wood / Spruce)': { en: 'White wood (spruce) sawn timber', ur: 'سفید لکڑی' },
  'خشب أحمر سويدي (Redwood / Pine)': { en: 'Swedish redwood timber', ur: 'سرخ لکڑی (سویڈش)' },
  'بليود مغطّى بالفيلم للطوبار (Film-faced Plywood)': { en: 'Film-faced shuttering plywood', ur: 'فلم فیسڈ پلائی ووڈ' },
  'بليود مقشّر خشب طبيعي (Veneer Plywood)': { en: 'Decorative veneer plywood', ur: 'وینیئر پلائی ووڈ' },
  'بليود مطلي بوليستر (Polyester Plywood)': { en: 'Polyester-coated plywood', ur: 'پولیسٹر پلائی ووڈ' },
  'ألواح بلوك بورد (Blockboard)': { en: 'Blockboard', ur: 'بلاک بورڈ' },
  'MDF مقاوم للرطوبة (MR MDF – أخضر)': { en: 'Moisture-resistant MDF', ur: 'نمی مزاحم ایم ڈی ایف' },
  'MDF مقاوم للحريق (FR MDF – أحمر)': { en: 'Fire-retardant MDF', ur: 'آگ مزاحم ایم ڈی ایف' },
  'MDF مقشّر خشب طبيعي (Veneered MDF)': { en: 'Veneered MDF', ur: 'وینیئر ایم ڈی ایف' },
  'لوح ميلامين خشب مضغوط (MFC / Melamine Chipboard)': { en: 'Melamine-faced chipboard', ur: 'میلامین چپ بورڈ' },
  'خشب مضغوط عادي (Chipboard / فونتكس)': { en: 'Raw particle board', ur: 'سادہ چپ بورڈ' },
  'ألواح OSB (Oriented Strand Board)': { en: 'OSB board', ur: 'او ایس بی بورڈ' },
  'MDF مخدّد ميلامين للعرض (Slatwall / Grooved MDF)': { en: 'Grooved melamine MDF (slatwall)', ur: 'گروو ایم ڈی ایف (سلیٹ وال)' },
  'زاوية لياسة مجلفنة بشبك (Angle Bead)': { en: 'Galvanized plaster angle bead', ur: 'پلاستر اینگل بیڈ' },
  'زاوية إيقاف اللياسة (Plaster Stop Bead)': { en: 'Plaster stop bead', ur: 'پلاستر اسٹاپ بیڈ' },
  'زاوية فاصل حركة للياسة (Control Joint Bead)': { en: 'Plaster control / movement joint bead', ur: 'کنٹرول جوائنٹ بیڈ' },
  'زاوية بروز (أركيتريف) للياسة حول الفتحات (Architrave Bead)': { en: 'Architrave bead', ur: 'آرکیٹریو بیڈ' },
  'شبك فايبر جلاس لتسليح اللياسة (Fibreglass Plaster Mesh)': { en: 'Alkali-resistant fibreglass plaster mesh', ur: 'فائبر گلاس پلاستر جالی' },
  'شبك زاوية مجلفن لتقاطع البلوك والخرسانة (Corner / Strip Mesh)': { en: 'Galvanized corner and strip lath', ur: 'گیلوانائزڈ کارنر میش' },
  'شعر سيزال لأعمال الجبس (Sisal Fibre)': { en: 'Sisal fibre for gypsum work', ur: 'سیزل فائبر' },
  'طبقة رشّ أولية قبل اللياسة (Spatter Dash / Scratch Coat)': { en: 'Spatter-dash bonding coat', ur: 'اسپیٹر ڈیش کوٹ' },
  'فتحة صيانة للسقف المستعار (Ceiling Access Panel)': { en: 'Gypsum ceiling access panel', ur: 'سیلنگ ایکسیس پینل' },
  'ألواح بوليسترين EPS (ستايروفوم أبيض)': { en: 'EPS polystyrene insulation board', ur: 'ای پی ایس فوم بورڈ' },
  'شرائح بوليسترين لحشو البلوك المعزول (Block Insulation Filler)': { en: 'Polystyrene filler strips for insulated blocks', ur: 'بلاک انسولیشن فلر' },
  'لفائف فوم بولي إيثيلين عازل (PE Foam Roll)': { en: 'Polyethylene foam insulation roll', ur: 'پی ای فوم رول' },
  'مزراب صاج للهناجر (Steel Gutter)': { en: 'Steel side gutter for sheds', ur: 'شیڈ کا اسٹیل پرنالہ' },
  'غطاء قمة السقف للهناجر (Ridge Capping)': { en: 'Roof ridge capping', ur: 'چھت ریج کیپ' },
  'صاج مقوّس للمظلات والهناجر (Curved Sheet)': { en: 'Curved roofing sheet', ur: 'خمیدہ چھت شیٹ' },
  'إكسسوارات أبواب الهناجر المنزلقة (Hangar Door Track & Rollers)': { en: 'Sliding hangar door hardware', ur: 'ہینگر دروازے کی ریل اور رولر' },
  'صاج ألمنيوم مضلّع/منقوش (Aluminium Chequered Plate)': { en: 'Aluminium tread / chequer plate', ur: 'ایلومینیم چیکرڈ پلیٹ' },
  'صاج ألمنيوم مزخرف ستوكو (Stucco Embossed Sheet)': { en: 'Stucco-embossed aluminium sheet', ur: 'اسٹکو ایلومینیم شیٹ' },
  'مواسير صرف PP صامتة بحلقة مطاطية (PP Silent Push-fit)': { en: 'Silent PP push-fit soil pipe', ur: 'پی پی سائلنٹ ڈرینیج پائپ' },
  'مصيدة صرف P (P-Trap) uPVC': { en: 'uPVC P-trap', ur: 'یو پی وی سی پی ٹریپ' },
  'محبس أرضي مجمّع (Collector Floor Gully)': { en: 'Multi-inlet floor gully / collector', ur: 'فلور گلی کلیکٹر' },
  'سدادة/كوع تفتيش وتنظيف (Cleanout / Access Fitting)': { en: 'uPVC access cleanout fitting', ur: 'کلین آؤٹ فٹنگ' },
  'غطاء تهوية للسطح (Roof Vent Cap)': { en: 'Roof vent cowl', ur: 'چھت وینٹ کیپ' },
  'وصلات صرف uPVC (واي/مخفّض/تي صحي/وصلة إصلاح)': { en: 'uPVC drainage fittings (wye, reducer, sanitary tee, repair coupling)', ur: 'یو پی وی سی ڈرینیج فٹنگز' },
  'مواسير uPVC ضغط سكجول 80 (Sch 80)': { en: 'uPVC Schedule-80 pressure pipe', ur: 'شیڈول 80 پی وی سی پائپ' },
  'محبس دفن PPR (Concealed Stop Valve)': { en: 'PPR concealed valve', ur: 'چھپا ہوا پی پی آر والو' },
  'خلاط دفن (Concealed Mixer Valve)': { en: 'Concealed shower mixer body', ur: 'چھپا ہوا مکسر والو' },
  'وصلات PPR بسن نحاسي داخلي/خارجي (PPR Brass Adaptor)': { en: 'PPR brass-threaded adaptors (male/female, elbow, tee, union)', ur: 'پی پی آر پیتل اڈاپٹر' },
  'قوس تعدية PPR (Crossover)': { en: 'PPR crossover bend', ur: 'پی پی آر کراس اوور' },
  'سدادة اختبار ضغط PPR (Test Plug)': { en: 'PPR pressure test plug', ur: 'ٹیسٹ پلگ' },
  'مجموعة تثبيت حائط للسخان والغسالة (Wall-mount Group)': { en: 'PPR wall-mounting elbow group', ur: 'وال ماؤنٹ گروپ' },
  'مصفاة Y نحاس (Y-Strainer)': { en: 'Brass Y-strainer', ur: 'پیتل وائی اسٹرینر' },
  'صمام قدم للمضخة (Foot Valve)': { en: 'Brass foot valve', ur: 'فٹ والو' },
  'محبس زاوية مزدوج (Double Angle Valve)': { en: 'Double-outlet angle valve', ur: 'ڈبل اینگل والو' },
  'صمام أمان السخان (Water Heater Safety Valve)': { en: 'Water heater safety / relief valve', ur: 'گیزر سیفٹی والو' },
  'قطع غيار السخان (عنصر تسخين/ثرموستات/جلدة)': { en: 'Water heater element, thermostat and gasket', ur: 'گیزر ہیٹنگ ایلیمنٹ اور تھرموسٹیٹ' },
  'سخان مياه كهربائي فوري (Instant Electric Heater)': { en: 'Instantaneous electric water heater', ur: 'فوری الیکٹرک گیزر' },
  'مروحة تبريد خزان بالطاقة الشمسية (Solar Tank Cooler)': { en: 'Solar-powered water tank cooling fan', ur: 'سولر ٹینک کولر' },
  'غطاء خزان أرضي/منهل ألمنيوم أو فايبر (Tank & Manhole Cover)': { en: 'Aluminium / fibreglass tank and manhole cover', ur: 'ٹینک ڈھکن ایلومینیم' },
  'زر طرد للخزان المخفي (Flush Plate)': { en: 'Dual-flush control plate', ur: 'فلش پلیٹ' },
  'خزان طرد ظاهر (Exposed Cistern)': { en: 'Exposed flush cistern', ur: 'بیرونی فلش ٹینک' },
  'غطاء مقعد مرحاض (Toilet Seat Cover)': { en: 'Toilet seat and cover', ur: 'ٹوائلٹ سیٹ کور' },
  'حلقة شمع/مطاط لتركيب المرحاض (Wax / Rubber Ring)': { en: 'WC wax ring and rubber flange seal', ur: 'ٹوائلٹ ویکس رنگ' },
  'مصرف مغسلة أوتوماتيكي (Pop-up / Click-clack Waste)': { en: 'Pop-up basin waste', ur: 'پاپ اپ ویسٹ' },
  'مصافي ألمنيوم (أرضية/ركنية/دش/سطح)': { en: 'Aluminium floor, corner, shower and roof strainers', ur: 'ایلومینیم اسٹرینر' },
  'مزلّق تركيب مواسير الصرف (Pipe Lubricant)': { en: 'uPVC pipe joint lubricant', ur: 'پائپ لبریکنٹ' },
  'ساعة ضغط ماء ومضخة اختبار ضغط (Pressure Gauge / Test Pump)': { en: 'Water pressure gauge and hydro test pump', ur: 'پانی پریشر گیج اور ٹیسٹ پمپ' },
  'خرطوم حديقة مع بكرة (Garden Hose & Reel)': { en: 'Garden hose with reel', ur: 'باغ کا پائپ اور ریل' },
  'مسدس رشّ ماء للخرطوم (Hose Nozzle Gun)': { en: 'Hose spray nozzle / gun', ur: 'پانی اسپرے گن' },
  'خرطوم هواء وغاز ضغط عالٍ (Air & Gas Hose)': { en: 'High-pressure air and gas hose', ur: 'ہائی پریشر ایئر ہوز' },
  'خرطوم مسطّح للنزح (Lay-flat Hose)': { en: 'Lay-flat discharge hose', ur: 'فلیٹ ہوز' },
  'سلك مفرد نحاسي معزول (THHN / NYA)': { en: 'Single-core building wire (THHN / NYA)', ur: 'سنگل کور تار' },
  'كابل مرن متعدد الأقطاب (Flexible Cord)': { en: 'Multi-core flexible cord (H05VV-F)', ur: 'فلیکسیبل ملٹی کور تار' },
  'كابل ستلايت محوري (RG6 Coaxial)': { en: 'RG6 coaxial cable', ur: 'آر جی 6 کواکسیل کیبل' },
  'سلك هاتف (Telephone Wire)': { en: 'Telephone wire', ur: 'ٹیلیفون تار' },
  'ماسورة كهرباء مرنة مموّجة (Corrugated Flexible Conduit)': { en: 'Corrugated flexible PVC conduit', ur: 'لچکدار نالی دار کنڈیوٹ' },
  'ماسورة EMT مرنة ووصلاتها (Flexible Metal Conduit & EMT Connectors)': { en: 'Flexible metal conduit and EMT connectors/couplings', ur: 'لچکدار دھاتی کنڈیوٹ' },
  'قاطع تفاضلي مع حماية زيادة الحمل (RCBO)': { en: 'RCBO', ur: 'آر سی بی او بریکر' },
  'صندوق عداد وقاطع رئيسي خارجي (Outdoor Meter / Busbar Chamber)': { en: 'Outdoor busbar chamber with main breaker', ur: 'بیرونی میٹر باکس مین بریکر' },
  'مفتاح فندقي بالبطاقة (Key-card Switch)': { en: 'Hotel key-card energy saver switch', ur: 'ہوٹل کی کارڈ سوئچ' },
  'مفتاح ستارة كهربائية (Curtain / Blind Switch)': { en: 'Curtain / shutter switch', ur: 'پردہ سوئچ' },
  'وحدة تحكم الطبّاخ 45A (Cooker Control Unit)': { en: '45A cooker control unit', ur: 'ککر کنٹرول یونٹ' },
  'مخرج موصول بفيوز (Fused Connection Unit / Spur)': { en: 'Fused connection unit (spur)', ur: 'فیوزڈ کنکشن یونٹ' },
  'مفتاح مكيّف ثنائي القطب بلمبة (20A/45A DP Switch)': { en: 'Double-pole AC switch with indicator', ur: 'اے سی ڈبل پول سوئچ' },
  'غطاء مقاوم للماء للأفياش (Weatherproof Cover IP55)': { en: 'Weatherproof socket cover', ur: 'واٹر پروف ساکٹ کور' },
  'بكرة كيبل تمديد معدنية (Cable Reel)': { en: 'Metal extension cable reel', ur: 'دھاتی کیبل ریل' },
  'ترمنال بلوك وفيوز (Terminal Block & Fuses)': { en: 'Terminal blocks and cartridge fuses', ur: 'ٹرمینل بلاک اور فیوز' },
  'محوّل جهد 110/220 (Auto Transformer)': { en: 'Step-up/down auto transformer', ur: 'وولٹیج کنورٹر' },
  'غرفة تفتيش تأريض (Earth Pit) وكلامب': { en: 'Concrete earth inspection pit and earth clamp', ur: 'ارتھ پٹ' },
  'لمبة أنبوبية ليد T8 (LED Tube)': { en: 'LED T8 tube', ur: 'ایل ای ڈی ٹیوب لائٹ' },
  'كشاف ليد مقاوم للماء والغبار (Vapour-proof / Batten)': { en: 'LED waterproof batten / vapour-proof luminaire', ur: 'واٹر پروف ایل ای ڈی بیٹن' },
  'ماكينة ثني حديد التسليح (Rebar Bender)': { en: 'Rebar bending machine', ur: 'سریا موڑنے کی مشین' },
  'ماكينة قص حديد التسليح (Rebar Cutter)': { en: 'Rebar cutting machine', ur: 'سریا کاٹنے کی مشین' },
  'منفاخ هواء كهربائي (Air Blower)': { en: 'Electric air blower', ur: 'الیکٹرک بلوئر' },
  'مسدس هواء ساخن (Heat Gun)': { en: 'Heat gun', ur: 'ہیٹ گن' },
  'مسحج ورواتر خشب كهربائي (Planer / Router)': { en: 'Electric planer and wood router', ur: 'الیکٹرک رندہ اور راؤٹر' },
  'منشار زاوية ألمنيوم وخشب (Mitre Saw)': { en: 'Mitre saw', ur: 'مائٹر آری' },
  'صنفرة كهربائية مدارية (Orbital Sander)': { en: 'Orbital / sheet sander', ur: 'الیکٹرک سینڈر' },
  'مفتاح صدمة شحن (Cordless Impact Wrench)': { en: 'Cordless impact wrench / driver', ur: 'کورڈلیس امپیکٹ رنچ' },
  'ماكينة قص حديد سنسية (Cut-off Machine / Chop Saw)': { en: 'Abrasive cut-off saw', ur: 'کٹ آف مشین' },
  'منشار رخام كهربائي (Marble Cutter)': { en: 'Handheld marble / tile cutter', ur: 'ماربل کٹر' },
  'متر قياس ليزر (Laser Distance Meter)': { en: 'Laser distance measurer', ur: 'لیزر فاصلہ پیما' },
  'مسدس برشام يدوي ومسامير برشام (Hand Riveter & Rivets)': { en: 'Hand riveter and blind rivets', ur: 'ریوٹ گن اور ریوٹس' },
  'مقص صاج (Aviation Snips)': { en: 'Aviation tin snips', ur: 'ٹن کاٹنے کی قینچی' },
  'مفتاح مواسير وقطّاعة مواسير (Pipe Wrench & Cutter)': { en: 'Pipe wrench and pipe cutter', ur: 'پائپ رنچ اور کٹر' },
  'دايز تسنين المواسير (Pipe Threading Die)': { en: 'Pipe threading die set', ur: 'پائپ تھریڈنگ ڈائی' },
  'مفاتيح ربط (بلدي/شق/ألن) (Spanners & Allen Keys)': { en: 'Combination, ratchet and adjustable spanners, Allen keys', ur: 'رنچ اور ایلن کی سیٹ' },
  'كماشة حدّاد تسليح (Concretor\'s Nippers)': { en: 'Rebar-tying (concretor\'s) pincers', ur: 'سریا باندھنے والی کماشہ' },
  'عتلة نجّار (Claw / Wrecking Bar)': { en: 'Claw / wrecking bar', ur: 'لوہے کی سبل' },
  'كريك (مجرفة) ومكنسة شارع (Shovel & Street Broom)': { en: 'Shovel and street broom', ur: 'بیلچہ اور سڑک کا جھاڑو' },
  'سطل مطاطي للمونة (Rubber Mortar Bucket)': { en: 'Rubber mortar bucket', ur: 'ربڑ کی بالٹی' },
  'منشار يدوي خشب وقوس منشار حديد (Hand Saw & Hacksaw)': { en: 'Hand saw and hacksaw frame', ur: 'ہاتھ کی آری' },
  'زاوية نجار وقدمة قياس (Square & Caliper)': { en: 'Carpenter\'s square and vernier caliper', ur: 'بڑھئی کا گونیا اور کیلیپر' },
  'كتر وشفرات (Utility Knife & Blades)': { en: 'Utility knife and snap-off blades', ur: 'کٹر چاقو' },
  'طقم أدوات معزولة للكهربائي 1000V (Insulated Tool Set)': { en: 'VDE insulated tool set', ur: 'انسولیٹڈ ٹول سیٹ' },
  'قلم قص بلاط ومسطرة قص رخام (Tile Scribe & Cutting Rule)': { en: 'Tile cutter pen and marble cutting guide', ur: 'ٹائل کٹر پین' },
  'مشمّع (طربال) بولي إيثيلين (PE Tarpaulin)': { en: 'PE tarpaulin', ur: 'ترپال' },
  'خيش لمعالجة الخرسانة (Hessian Cloth)': { en: 'Hessian curing cloth', ur: 'ٹاٹ (ہیسیئن)' },
  'فيلم تغليف مطاطي (Stretch Film)': { en: 'Stretch wrap film', ur: 'اسٹریچ فلم' },
  'شريط ربط بلاستيكي/حديدي وكلبسات (Strapping Band)': { en: 'Plastic / steel strapping and seals', ur: 'پیکنگ اسٹریپ' },
  'ألواح حماية الأرضيات أثناء التشطيب (Floor Protection Board)': { en: 'Temporary floor protection board / paper', ur: 'فرش حفاظتی بورڈ' },
  'حامي إطار الباب وزوايا الدرج المؤقت (Door Jamb & Stair Protector)': { en: 'Temporary door-jamb and stair protector', ur: 'دروازہ فریم پروٹیکٹر' },
  'برميل وسلسلة وحاجز بلاستيكي مروري (Traffic Drum, Chain & Barrier Mesh)': { en: 'Traffic drum, plastic chain and orange barrier mesh', ur: 'ٹریفک ڈرم اور حفاظتی زنجیر' },
  'جنزير (سلسلة) حديد مجلفن (Galvanized Chain)': { en: 'Galvanized steel chain', ur: 'گیلوانائزڈ زنجیر' },
  'برغي سداسي مجلفن DIN 933 (Hex Bolt)': { en: 'Hex bolt DIN 933', ur: 'ہیکس بولٹ' },
  'برغي ذاتي التسنين برأس مسطّح مع خابور (Self-tapping Screw + Plug)': { en: 'Self-tapping screw with plastic plug', ur: 'سیلف ٹیپنگ اسکرو اور فشر' },
  'مسامير فولاذ للخرسانة (Hardened Concrete Nails)': { en: 'Hardened steel masonry nails', ur: 'کنکریٹ کیلیں' },
  'خابور مسمار بلاستيك سريع (Nail-in / Hammer-drive Plug)': { en: 'Nylon hammer-drive / expand nail plug', ur: 'نیل ان پلگ' },
  'برايمر زنك فوسفات للحديد (Zinc Phosphate Primer)': { en: 'Zinc phosphate anti-corrosive primer', ur: 'زنک فاسفیٹ پرائمر' },
  'بخاخ دهان تخطيط وتعليم المواقع (Marking Spray Paint)': { en: 'Site marking spray paint', ur: 'مارکنگ اسپرے' },
  // silicones & sealants (2026-10-17)
  'سيليكون محايد (Neutral)': { en: 'Neutral-cure silicone sealant', ur: 'نیوٹرل سلیکون' },
  'سيليكون حمضي (Acetic)': { en: 'Acetic (acetoxy) silicone sealant', ur: 'ایسیٹک سلیکون' },
  'سيليكون صحي مضاد للفطريات (حمامات ومطابخ)': { en: 'Sanitary anti-fungal silicone', ur: 'سینیٹری اینٹی فنگل سلیکون' },
  'سيليكون إنشائي للواجهات الزجاجية (Structural)': { en: 'Structural glazing silicone', ur: 'اسٹرکچرل گلیزنگ سلیکون' },
  'سيليكون عزل الطقس للزجاج والألمنيوم (Weather Seal)': { en: 'Weatherseal silicone for glass & aluminium', ur: 'ویدر سیل سلیکون' },
  'سيليكون حراري لدرجات الحرارة العالية': { en: 'High-temperature silicone', ur: 'ہائی ٹمپریچر سلیکون' },
  'سيليكون مقاوم للحريق (Fire Rated)': { en: 'Fire-rated silicone sealant', ur: 'فائر ریٹڈ سلیکون' },
  'أكريليك مقاوم للحريق (Intumescent)': { en: 'Intumescent fire-rated acrylic', ur: 'فائر ریٹڈ ایکریلک' },
  'فوم مقاوم للحريق (PU Fire Foam)': { en: 'Fire-rated PU gun foam', ur: 'فائر ریٹڈ فوم' },
  'معجون حريق لفتحات الكابلات والمواسير (Fire Putty)': { en: 'Intumescent fire putty for cable & pipe penetrations', ur: 'فائر پٹی' },
  'فوم بولي يوريثان لملء الفراغات': { en: 'Expanding PU gap-filling foam', ur: 'پی یو فوم' },
  'مانع تسرب بولي يوريثان (PU Sealant)': { en: 'Polyurethane joint sealant', ur: 'پی یو سیلنٹ' },
  'مانع تسرب أكريليك قابل للدهان': { en: 'Paintable acrylic sealant', ur: 'ایکریلک سیلنٹ' },
  'مانع تسرب MS بوليمر (هايبرد)': { en: 'MS polymer (hybrid) sealant', ur: 'ایم ایس پولیمر سیلنٹ' },
  'مانع تسرب بولي سلفايد للفواصل': { en: 'Polysulphide joint sealant', ur: 'پولی سلفائیڈ سیلنٹ' },
  'مانع تسرب مائي للأسطح والشقوق': { en: 'Waterproof sealant for roofs & cracks', ur: 'واٹر پروف سیلنٹ' },
  'مانع تسرب المياه الفوري (Water Plug)': { en: 'Rapid water-stop plug (hydraulic cement)', ur: 'واٹر پلگ' },
  'ماستك بيتوميني للفواصل والأسطح': { en: 'Bituminous mastic sealant', ur: 'بیٹومینس ماسٹک' },
  'سيليكون شفاف (أنبوب)': { en: 'Clear silicone (tube)', ur: 'شفاف سلیکون (ٹیوب)' },
  'سيليكون صحي للحمامات (أنبوب)': { en: 'Bathroom silicone (tube)', ur: 'باتھ روم سلیکون (ٹیوب)' },
  'سيليكون حراري (أنبوب)': { en: 'High-temperature silicone (tube)', ur: 'ہیٹ ریزسٹنٹ سلیکون (ٹیوب)' },
  'فوم بخاخ (علبة)': { en: 'Spray PU foam (can)', ur: 'اسپرے فوم (کین)' },
  'مانع تسرب مائي للأسطح (سطل)': { en: 'Roof waterproof sealant (pail)', ur: 'چھت واٹر پروف سیلنٹ (بالٹی)' },
  // ═══ 2026-10-14: generic furniture (buyer specifies the type) ═══
  'طاولة حسب الطلب (أي نوع)': { en: 'Custom table (any type)', ur: 'کوئی بھی میز' },
  'كرسي حسب الطلب (أي نوع)': { en: 'Custom chair (any type)', ur: 'کوئی بھی کرسی' },
  'خزانة حسب الطلب (أي نوع)': { en: 'Custom cabinet (any type)', ur: 'کوئی بھی الماری' },
  // ═══ 2026-10-14: furniture by room ═══
  'غرفة نوم كاملة حسب الطلب': { en: 'Complete custom bedroom set', ur: 'مکمل بیڈروم سیٹ' },
  'تسريحة ومرآة حسب الطلب': { en: 'Custom dressing table & mirror', ur: 'ڈریسنگ ٹیبل' },
  'كومودينو (طاولة جانبية للسرير)': { en: 'Bedside tables (nightstands)', ur: 'سائیڈ ٹیبل بیڈ' },
  'غرفة أطفال حسب الطلب': { en: 'Custom kids\' bedroom', ur: 'بچوں کا کمرہ' },
  'سرير أطفال وأسرّة دورين': { en: 'Kids\' beds & bunk beds', ur: 'بچوں کا بستر' },
  'كنب زاوية (L) حسب الطلب': { en: 'Custom corner (L-shaped) sofa', ur: 'کارنر صوفہ' },
  'طاولات جانبية (سايد تيبل)': { en: 'Side tables', ur: 'سائیڈ ٹیبل' },
  'بوفيه وسايدبورد حسب الطلب': { en: 'Custom buffet & sideboard', ur: 'بوفے سائیڈ بورڈ' },
  'جدار تلفزيون وديكور جداري حسب الطلب': { en: 'Custom TV wall & feature wall', ur: 'ٹی وی وال ڈیکور' },
  'رفوف حائط ديكور': { en: 'Decorative wall shelves', ur: 'دیواری شیلف' },
  'قواطع ديكور خشبية (بارتيشن)': { en: 'Decorative wooden partitions', ur: 'لکڑی کا پارٹیشن' },
  // ═══ 2026-10-14: home lighting ═══
  'إنارة سقف مودرن (بلافونيير)': { en: 'Modern ceiling light (flush mount)', ur: 'جدید چھت کی لائٹ' },
  'ثريا كريستال كبيرة للدرج والصالات': { en: 'Large crystal chandelier (stairwell / hall)', ur: 'بڑا کرسٹل جھومر' },
  'إنارة مرآة وحمّام': { en: 'Mirror & bathroom light', ur: 'آئینہ اور باتھ روم لائٹ' },
  'مصباح طاولة ومكتب LED': { en: 'LED desk & table lamp', ur: 'ایل ای ڈی ٹیبل لیمپ' },
  'لمبات ديكور فيلامنت (إديسون)': { en: 'Decorative filament (Edison) bulbs', ur: 'فلامنٹ بلب' },
  'إنارة مخفية خطية (لينير)': { en: 'Linear recessed lighting', ur: 'لینیئر لائٹ' },
  'إنارة تحت خزائن المطبخ': { en: 'Under-cabinet kitchen lighting', ur: 'کچن کیبنٹ لائٹ' },
  'إنارة جدارية خارجية': { en: 'Outdoor wall light', ur: 'بیرونی دیوار لائٹ' },
  'إنارة درج وأرضيات (ستيب لايت)': { en: 'Step & floor lights', ur: 'سیڑھی کی لائٹس' },
  'لمبة ذكية (واي فاي)': { en: 'Smart Wi-Fi bulb', ur: 'اسمارٹ بلب' },
  'حساس حركة للإنارة': { en: 'Motion sensor for lighting', ur: 'موشن سینسر' },
  // ═══ 2026-10-13: materials buyers ask for that were missing (catalog gap study) ═══
  'ألواح ساندوتش بانل': { en: 'Sandwich panels', ur: 'سینڈوچ پینل' },
  'قرميد أسقف': { en: 'Roof tiles', ur: 'چھت کی ٹائلیں' },
  'بلوك هوردي للأسقف': { en: 'Hourdi slab blocks', ur: 'ہوردی بلاک' },
  'بلوك عازل حراري': { en: 'Insulated block', ur: 'انسولیٹڈ بلاک' },
  'ألواح أسمنت بورد (فايبر سمنت)': { en: 'Cement board / fibre-cement board', ur: 'سیمنٹ بورڈ' },
  'مدادات حديد مجلفنة (Z/C)': { en: 'Galvanized purlins (Z/C)', ur: 'گیلوانائزڈ پرلن' },
  'فواصل تسليح (بسكوت خرساني)': { en: 'Rebar spacers (concrete cover blocks)', ur: 'ریبار اسپیسر' },
  'غرف جاهزة (كرفانات)': { en: 'Prefab cabins (portacabins)', ur: 'تیار کمرے (کیبن)' },
  'هناجر ومستودعات حديدية': { en: 'Steel hangars & warehouses', ur: 'اسٹیل ہینگر' },
  'قطاعات وألواح ألمنيوم خام': { en: 'Raw aluminium profiles & sheets', ur: 'ایلومینیم پروفائل' },
  'صاج وأنابيب ستانلس ستيل': { en: 'Stainless steel sheets & tubes', ur: 'اسٹین لیس اسٹیل' },
  'كرانيش جبس وبولي يوريثان': { en: 'Gypsum & PU cornices', ur: 'جپسم کارنس' },
  'ألواح بديل الرخام': { en: 'Marble-look PVC wall sheets', ur: 'ماربل نما پینل' },
  'ألواح جدارية بديل الخشب (WPC)': { en: 'WPC / fluted wall panels', ur: 'ڈبلیو پی سی وال پینل' },
  'زوايا وبروفايلات البلاط': { en: 'Tile trims & edge profiles', ur: 'ٹائل ٹرم' },
  'بلاط موزاييك': { en: 'Mosaic tiles', ur: 'موزیک ٹائلیں' },
  'صلبان وكلبسات تسوية البلاط': { en: 'Tile spacers & levelling clips', ur: 'ٹائل اسپیسر' },
  'ترويبة إيبوكسي': { en: 'Epoxy tile grout', ur: 'ایپوکسی گراؤٹ' },
  'دهان خارجي حجري (روشن/جرافياتو)': { en: 'Exterior stone-texture paint', ur: 'بیرونی ٹیکسچر پینٹ' },
  'دهان أساس (برايمر)': { en: 'Primer / sealer', ur: 'پرائمر' },
  'دهان حديد مانع للصدأ (سلاقون)': { en: 'Anti-rust metal paint', ur: 'زنگ روک پینٹ' },
  'دهانات ديكورية (مخمل/رخامي)': { en: 'Decorative paints (velvet, marble effect)', ur: 'آرائشی پینٹ' },
  'ورنيش وصبغة خشب': { en: 'Wood varnish & stain', ur: 'وارنش' },
  'بخاخ دهان (سبراي)': { en: 'Spray paint', ur: 'اسپرے پینٹ' },
  'دهان خطوط الطرق والمواقف': { en: 'Road & parking line paint', ur: 'سڑک لائن پینٹ' },
  'أبواب WPC وPVC للحمامات': { en: 'WPC / PVC bathroom doors', ur: 'ڈبلیو پی سی دروازے' },
  'شبك نوافذ ضد الحشرات': { en: 'Insect screens', ur: 'مچھر جالی' },
  'حماية حديد للنوافذ': { en: 'Window security grilles', ur: 'کھڑکی گرل' },
  'كابينة شاور زجاج': { en: 'Glass shower enclosure', ur: 'شیشے کا شاور کیبن' },
  'قواطع زجاجية للمكاتب': { en: 'Glass office partitions', ur: 'شیشے کے پارٹیشن' },
  'مرايا ديكور حسب المقاس': { en: 'Decorative / cut-to-size mirrors', ur: 'آرائشی آئینے' },
  'ألواح بولي كربونات': { en: 'Polycarbonate sheets', ur: 'پولی کاربونیٹ شیٹ' },
  'سكاي لايت (منور سقفي)': { en: 'Skylight', ur: 'اسکائی لائٹ' },
  'ألواح فورمايكا HPL وأكريليك': { en: 'HPL laminate & acrylic sheets', ur: 'ایچ پی ایل شیٹ' },
  'خشب ماسيف للنجارة (زان/بلوط)': { en: 'Solid hardwood lumber', ur: 'ٹھوس لکڑی' },
  'شريط حواف PVC (إيدج باند)': { en: 'PVC edge banding', ur: 'ایج بینڈ' },
  'قشرة خشب طبيعي': { en: 'Natural wood veneer', ur: 'لکڑی کا وینیر' },
  'درج داخلي خشب ورخام ودرابزين': { en: 'Interior stairs (wood/marble) & handrails', ur: 'اندرونی سیڑھیاں' },
  'مصعد منزلي (فيلا)': { en: 'Home lift (villa elevator)', ur: 'گھریلو لفٹ' },
  'مصعد طعام وأغراض صغير': { en: 'Dumbwaiter (goods lift)', ur: 'ڈمب ویٹر' },
  'مجلس عربي (جلسة أرضية)': { en: 'Arabic floor majlis seating', ur: 'عربی مجلس' },
  'مجاري وحوامل الستائر': { en: 'Curtain tracks & rods', ur: 'پردے کی ریل' },
  'ستائر كهربائية (موتور)': { en: 'Motorised curtains', ur: 'برقی پردے' },
  'وحدة مغسلة (فانيتي)': { en: 'Bathroom vanity unit', ur: 'واش بیسن کیبنٹ' },
  'أجهزة مطبخ مدمجة (فرن/موقد/شفاط)': { en: 'Built-in kitchen appliances (oven, hob, hood)', ur: 'بلٹ ان کچن آلات' },
  'إكسسوارات خزائن المطبخ (سلال جرارة)': { en: 'Kitchen cabinet pull-outs & accessories', ur: 'کچن کیبنٹ لوازمات' },
  'مراتب (فرشات سرير)': { en: 'Mattresses', ur: 'گدے' },
  'أثاث مكتبي (كراسي ومكاتب وخزائن ملفات)': { en: 'Office furniture', ur: 'دفتری فرنیچر' },
  'رفوف معدنية للمستودعات والمحلات': { en: 'Steel shelving & racking', ur: 'دھاتی ریک' },
  'أثاث خارجي (جلسات حدائق)': { en: 'Outdoor furniture', ur: 'بیرونی فرنیچر' },
  'سجاد وزوالي': { en: 'Rugs', ur: 'قالین' },
  'مشب نار (موقد حطب)': { en: 'Majlis fireplace', ur: 'آتش دان' },
  'وحدة تلفزيون (مكتبة شاشة)': { en: 'TV unit / media wall', ur: 'ٹی وی یونٹ' },
  'لوحات وتحف ديكور': { en: 'Wall art & decor accessories', ur: 'آرائشی سامان' },
  'خزانة أحذية (جزامة)': { en: 'Shoe cabinet', ur: 'جوتوں کی الماری' },
  'إنارة حدائق وممرات': { en: 'Garden & pathway lights', ur: 'باغ کی روشنی' },
  'أعمدة إنارة شوارع وأحواش': { en: 'Street & yard lighting poles', ur: 'اسٹریٹ لائٹ پول' },
  'كشافات وإنارة بالطاقة الشمسية': { en: 'Solar-powered lights', ur: 'سولر لائٹس' },
  'إنارة تراك (مسار)': { en: 'Track lighting', ur: 'ٹریک لائٹ' },
  'حامي جهد كهربائي': { en: 'Voltage protector', ur: 'وولٹیج پروٹیکٹر' },
  'عداد كهرباء فرعي': { en: 'Electricity sub-meter', ur: 'سب میٹر' },
  'شاحن سيارات كهربائية': { en: 'EV charger', ur: 'الیکٹرک کار چارجر' },
  'مفتاح فصل (آيسوليتر)': { en: 'Isolator switch', ur: 'آئسولیٹر سوئچ' },
  'مشترك كهرباء (موزع أفياش)': { en: 'Power strip / multi-plug', ur: 'پاور اسٹرپ' },
  'جهاز قياس كهرباء (أفوميتر)': { en: 'Multimeter', ur: 'ملٹی میٹر' },
  'ألواح طاقة شمسية': { en: 'Solar PV panels', ur: 'سولر پینل' },
  'انفرتر طاقة شمسية': { en: 'Solar inverter', ur: 'سولر انورٹر' },
  'بطاريات تخزين ليثيوم': { en: 'Lithium storage batteries', ur: 'لیتھیم بیٹری' },
  'منظم شحن شمسي': { en: 'Solar charge controller', ur: 'چارج کنٹرولر' },
  'هياكل تثبيت الألواح الشمسية': { en: 'Solar panel mounting structures', ur: 'سولر اسٹینڈ' },
  'كابلات وموصلات طاقة شمسية': { en: 'Solar DC cables & MC4 connectors', ur: 'سولر کیبل' },
  'مضخة مياه بالطاقة الشمسية': { en: 'Solar water pump', ur: 'سولر واٹر پمپ' },
  'مفاتيح إنارة ذكية': { en: 'Smart light switches', ur: 'اسمارٹ سوئچ' },
  'مقابس ذكية': { en: 'Smart plugs', ur: 'اسمارٹ پلگ' },
  'بوابة تحكم المنزل الذكي': { en: 'Smart-home hub', ur: 'اسمارٹ ہوم ہب' },
  'حساسات ذكية (باب/تسرب/دخان)': { en: 'Smart sensors (door, leak, smoke)', ur: 'اسمارٹ سینسر' },
  'محرك بوابة كهربائي': { en: 'Gate / garage door motor', ur: 'گیٹ موٹر' },
  'كاميرا واي فاي منزلية': { en: 'Wi-Fi home camera', ur: 'وائی فائی کیمرہ' },
  'خزان دفن للمرحاض المعلق': { en: 'Concealed cistern for wall-hung WC', ur: 'چھپا ہوا فلش ٹینک' },
  'غراء مواسير PVC': { en: 'PVC pipe solvent cement', ur: 'پی وی سی پائپ گلو' },
  'عوامة كهربائية (حساس منسوب)': { en: 'Electric float switch', ur: 'الیکٹرک فلوٹ سوئچ' },
  'مواسير وتمديدات غاز': { en: 'Gas piping & fittings', ur: 'گیس پائپ' },
  'خزان غاز مركزي': { en: 'Central LPG tank', ur: 'سینٹرل گیس ٹینک' },
  'منظم غاز وكاشف تسرب': { en: 'Gas regulator & leak detector', ur: 'گیس ریگولیٹر' },
  'خزان صرف صحي (بيارة)': { en: 'Septic tank', ur: 'سیپٹک ٹینک' },
  'مضخة رفع مياه الصرف': { en: 'Sewage lifting pump', ur: 'سیوریج پمپ' },
  'مجمع توزيع مياه (مانيفولد)': { en: 'Water manifold', ur: 'واٹر مینی فولڈ' },
  'جاكوزي (حوض مساج)': { en: 'Jacuzzi / whirlpool bath', ur: 'جکوزی' },
  'سخان غاز فوري': { en: 'Instant gas water heater', ur: 'گیس گیزر' },
  'مكيف مخفي (دكت سبليت)': { en: 'Ducted split AC', ur: 'ڈکٹڈ اسپلٹ اے سی' },
  'مواسير نحاس تكييف': { en: 'AC copper pipe', ur: 'اے سی تانبے کا پائپ' },
  'غاز تبريد (فريون)': { en: 'Refrigerant gas (freon)', ur: 'ریفریجرینٹ گیس' },
  'عازل مطاطي للأنابيب (أرمافلكس)': { en: 'Elastomeric rubber pipe insulation', ur: 'ربڑ انسولیشن' },
  'دكت مرن': { en: 'Flexible duct', ur: 'فلیکسیبل ڈکٹ' },
  'حامل وقاعدة مكيف': { en: 'AC brackets & stands', ur: 'اے سی اسٹینڈ' },
  'مكيف صحراوي': { en: 'Evaporative (desert) cooler', ur: 'صحرائی کولر' },
  'شفاط مطبخ تجاري': { en: 'Commercial kitchen exhaust hood', ur: 'کمرشل کچن ہڈ' },
  'طفاية حريق': { en: 'Fire extinguisher', ur: 'آگ بجھانے والا آلہ' },
  'كاشف دخان مستقل': { en: 'Standalone smoke detector', ur: 'اسموک ڈیٹیکٹر' },
  'نظام إطفاء آلي (FM200/مطابخ)': { en: 'Clean-agent & kitchen fire suppression', ur: 'خودکار آگ بجھانے کا نظام' },
  'مواد منع انتشار الحريق (فاير ستوب)': { en: 'Firestop sealants & collars', ur: 'فائر اسٹاپ' },
  'بطانية حريق وصندوق طفاية': { en: 'Fire blanket & extinguisher cabinet', ur: 'فائر بلینکٹ' },
  'لوحات إرشادية للسلامة والإخلاء': { en: 'Safety & evacuation signs', ur: 'حفاظتی نشانات' },
  'مبيد النمل الأبيض (معالجة التربة)': { en: 'Anti-termite soil treatment', ur: 'دیمک کش دوا' },
  'إضافات الخرسانة (ملدن/مسرع/مؤخر)': { en: 'Concrete admixtures', ur: 'کنکریٹ ایڈمکسچر' },
  'مادة معالجة الخرسانة (كيورنج)': { en: 'Concrete curing compound', ur: 'کیورنگ کمپاؤنڈ' },
  'مادة ربط الخرسانة (بوندنج)': { en: 'Concrete bonding agent', ur: 'بانڈنگ ایجنٹ' },
  'جراوت غير قابل للانكماش': { en: 'Non-shrink grout', ur: 'نان شرنک گراؤٹ' },
  'مثبت كيميائي (كيميكال أنكر)': { en: 'Chemical anchor (epoxy)', ur: 'کیمیکل اینکر' },
  'مانع تسرب الفواصل (ماستك)': { en: 'Joint sealant (PU / polysulphide)', ur: 'جوائنٹ سیلنٹ' },
  'شريط مانع تسرب (ووتر ستوب)': { en: 'PVC waterstop', ur: 'واٹر اسٹاپ' },
  'حشوة فواصل التمدد (فلر بورد)': { en: 'Expansion joint filler board & backer rod', ur: 'فلر بورڈ' },
  'رش فوم بولي يوريثان للأسطح': { en: 'Spray polyurethane roof foam', ur: 'اسپرے فوم' },
  'صوف زجاجي (لفائف عزل)': { en: 'Glass wool rolls', ur: 'گلاس وول' },
  'عازل حراري عاكس (فويل)': { en: 'Reflective foil insulation', ur: 'ریفلیکٹو فوائل' },
  'قماش جيوتكستايل': { en: 'Geotextile fabric', ur: 'جیوٹیکسٹائل' },
  'لاصق بلوك (مونة رقيقة)': { en: 'Thin-bed block adhesive', ur: 'بلاک ایڈہیسو' },
  'مونة إصلاح الخرسانة': { en: 'Concrete repair mortar', ur: 'مرمت مارٹر' },
  'مطرقة تكسير كهربائية (هيلتي)': { en: 'Rotary hammer / demolition breaker', ur: 'روٹری ہیمر' },
  'مسدس سيليكون': { en: 'Caulking gun', ur: 'سلیکون گن' },
  'مالج ومسطرين وأدوات لياسة': { en: 'Trowels & plastering tools', ur: 'کرنی اور پلستر اوزار' },
  'منشار كهربائي (دائري/أركت)': { en: 'Power saws (circular, jigsaw)', ur: 'برقی آری' },
  'ميزان ليزر': { en: 'Laser level', ur: 'لیزر لیول' },
  'مقص بلاط (قطاعة سيراميك)': { en: 'Tile cutter', ur: 'ٹائل کٹر' },
  'مسدس دهان (رشاش)': { en: 'Paint spray gun', ur: 'پینٹ اسپرے گن' },
  'مسدس مسامير ودباسة': { en: 'Nail gun & staple gun', ur: 'نیل گن' },
  'مكنسة كهربائية صناعية': { en: 'Industrial wet/dry vacuum', ur: 'صنعتی ویکیوم' },
  'خلاط معجون ودهان كهربائي': { en: 'Electric paddle mixer', ur: 'پیڈل مکسر' },
  'صندوق عدة': { en: 'Tool box', ur: 'ٹول باکس' },
  'سيخ مسنن (قضيب ملولب)': { en: 'Threaded rod', ur: 'تھریڈڈ راڈ' },
  'وردات (حلقات معدنية)': { en: 'Washers', ur: 'واشر' },
  'أنكر بولت': { en: 'Anchor bolts / wedge anchors', ur: 'اینکر بولٹ' },
  'بوب كات (لودر صغير)': { en: 'Skid-steer loader (Bobcat)', ur: 'اسکڈ اسٹیئر لوڈر' },
  'حاوية مخلفات بناء': { en: 'Construction waste skip', ur: 'کچرا کنٹینر' },
  'دورات مياه متنقلة': { en: 'Portable toilets', ur: 'پورٹیبل ٹوائلٹ' },
  'ماكينة قص الخرسانة والأسفلت': { en: 'Concrete & asphalt floor saw', ur: 'فلور کٹر' },
  'ماكينة تنعيم الخرسانة (هليكوبتر)': { en: 'Power trowel (helicopter)', ur: 'پاور ٹروول' },
  'أقماع وحواجز مرورية': { en: 'Traffic cones & barriers', ur: 'ٹریفک کون' },
  'شريط تحذيري': { en: 'Caution tape', ur: 'وارننگ ٹیپ' },
  'شبكة أمان للمباني': { en: 'Building safety / debris net', ur: 'سیفٹی نیٹ' },
  'أفرول عمل': { en: 'Work coverall', ur: 'ورک کوورآل' },
  'حقيبة إسعافات أولية': { en: 'First-aid kit', ur: 'فرسٹ ایڈ کٹ' },
  'سدادات وواقيات الأذن': { en: 'Ear protection', ur: 'کان کی حفاظت' },
  'برجولات ومظلات حدائق': { en: 'Pergolas & garden shades', ur: 'پرگولا' },
  'سواتر (قماش/حديد/خشب)': { en: 'Privacy screens', ur: 'پرائیویسی اسکرین' },
  'مظلات شراع (شد إنشائي)': { en: 'Tensile / sail shades', ur: 'ٹینسائل شیڈ' },
  'بيوت شعر وخيام': { en: 'Traditional tents (بيت شعر)', ur: 'خیمے' },
  'مضخة وفلتر المسبح': { en: 'Pool pump & sand filter', ur: 'پول پمپ اور فلٹر' },
  'كيماويات المسابح (كلور)': { en: 'Pool chemicals (chlorine)', ur: 'پول کیمیکل' },
  'إنارة المسابح': { en: 'Pool lights', ur: 'پول لائٹس' },
  'سلالم المسابح الستانلس': { en: 'Stainless pool ladders', ur: 'پول سیڑھی' },
  'ملحقات المسابح (سكيمر وفوهات)': { en: 'Pool fittings (skimmer, inlets, drain)', ur: 'پول فٹنگز' },
  'بلاط وحواف المسابح': { en: 'Pool tiles & coping', ur: 'پول ٹائلیں' },
  'نجيل طبيعي (ثيل)': { en: 'Natural turf (sod)', ur: 'قدرتی گھاس' },
  'رشاشات وتنقيط الري': { en: 'Sprinklers & drip irrigation', ur: 'چھڑکاؤ اور ڈرپ' },
  'مؤقت ري وصمامات كهربائية': { en: 'Irrigation controller & solenoid valves', ur: 'آبپاشی ٹائمر' },
  'حصى زينة وأحجار ديكور': { en: 'Decorative pebbles & landscape stones', ur: 'آرائشی کنکر' },
  'أحواض زراعة (أصص)': { en: 'Planters & pots', ur: 'گملے' },
  'نوافير وشلالات': { en: 'Fountains & water features', ur: 'فوارے' },
  'ألعاب أطفال خارجية': { en: 'Outdoor playground equipment', ur: 'بچوں کے جھولے' },
  'مطبات صناعية': { en: 'Speed bumps', ur: 'اسپیڈ بریکر' },
  'أرضيات خشب خارجية (ديكينج WPC)': { en: 'WPC outdoor decking', ur: 'آؤٹ ڈور ڈیکنگ' },
  'طاولة طعام حسب الطلب': { en: 'Custom dining table', ur: 'آرڈر پر کھانے کی میز' },
  'طاولة قهوة حسب الطلب': { en: 'Custom coffee table', ur: 'آرڈر پر کافی ٹیبل' },
  'كنب حسب الطلب': { en: 'Custom sofa', ur: 'آرڈر پر صوفہ' },
  'خزانة ملابس (دولاب) حسب الطلب': { en: 'Custom wardrobe', ur: 'آرڈر پر الماری' },
  'سرير حسب الطلب': { en: 'Custom bed', ur: 'آرڈر پر بستر' },
  'مكتب خشبي حسب الطلب': { en: 'Custom wooden desk', ur: 'آرڈر پر لکڑی کی میز' },
  'كراسي طعام': { en: 'Dining chairs', ur: 'کھانے کی کرسیاں' },
  'مكتبة ورفوف حسب الطلب': { en: 'Custom bookcase & shelves', ur: 'آرڈر پر کتابوں کی الماری' },
  'ستائر قماش': { en: 'Fabric curtains', ur: 'کپڑے کے پردے' },
  'ستائر رول (بلاك آوت)': { en: 'Roller blinds (blackout)', ur: 'رولر پردے (بلیک آؤٹ)' },
  'ستائر شرائح (Blinds)': { en: 'Slat blinds', ur: 'سلیٹ بلائنڈز' },
  'موكيت': { en: 'Wall-to-wall carpet', ur: 'قالین' },
  'ثريا (نجفة)': { en: 'Chandelier', ur: 'فانوس (جھومر)' },
  'إنارة معلقة ديكور': { en: 'Decorative pendant light', ur: 'سجاوٹی لٹکنے والی روشنی' },
  'أبليك جداري': { en: 'Wall sconce', ur: 'دیوار کی روشنی' },
  'أباجورة': { en: 'Table lamp', ur: 'ٹیبل لیمپ' },
  'إنارة أرضية (ستاند)': { en: 'Floor lamp', ur: 'فرش لیمپ' },
  'مكيف سبليت': { en: 'Split air conditioner', ur: 'اسپلٹ اے سی' },
  'مكيف شباك': { en: 'Window air conditioner', ur: 'ونڈو اے سی' },
  'مكيف دولابي': { en: 'Floor-standing air conditioner', ur: 'فلور اسٹینڈنگ اے سی' },
  'مروحة سقف': { en: 'Ceiling fan', ur: 'چھت کا پنکھا' },
  'خزان مياه بلاستيك': { en: 'Plastic water tank', ur: 'پلاسٹک پانی کی ٹینکی' },
  'مضخة مياه منزلية (رفع ضغط)': { en: 'Home water pump (booster)', ur: 'گھریلو پانی کا پمپ (پریشر)' },
  'فلتر مياه منزلي': { en: 'Home water filter', ur: 'گھریلو پانی کا فلٹر' },
  'سخان شمسي': { en: 'Solar water heater', ur: 'سولر واٹر ہیٹر' },
  'معجون جدران': { en: 'Wall putty', ur: 'وال پٹی' },
  'باب حديد خارجي': { en: 'External steel door', ur: 'بیرونی لوہے کا دروازہ' },
  'مرآة حمام': { en: 'Bathroom mirror', ur: 'باتھ روم آئینہ' },
  'خزائن مطبخ': { en: 'Kitchen cabinets', ur: 'کچن کیبنٹ' },
  'سطح مطبخ (رخام/جرانيت)': { en: 'Kitchen countertop (marble/granite)', ur: 'کچن کاؤنٹر ٹاپ (ماربل/گرینائٹ)' },
  'مظلة سيارات': { en: 'Car parking shade', ur: 'کار پارکنگ شیڈ' },
  'بوابة كراج (حديد/أوتوماتيك)': { en: 'Garage gate (steel/automatic)', ur: 'گیراج گیٹ (لوہا/آٹومیٹک)' },
  'إنتركم (جرس باب مرئي)': { en: 'Intercom (video doorbell)', ur: 'انٹرکام (ویڈیو ڈور بیل)' },
  'عشب صناعي': { en: 'Artificial grass', ur: 'مصنوعی گھاس' },
  'إنترلوك رصف': { en: 'Interlock paving blocks', ur: 'انٹرلاک پیونگ' },
  'عربة يد (عربانة)': { en: 'Wheelbarrow', ur: 'ہتھ گاڑی' },
  // ═══ طبقات الردم والأساس ═══
  'طبقة أساس حصوية (Base Course)': { en: 'Base Course (Crushed Aggregate)', ur: 'بیس کورس (کرشڈ)' },
  'طبقة تحت الأساس (Sub-base)': { en: 'Sub-base Course', ur: 'سب بیس کورس' },
  'ردم إنشائي مصنّف (Structural Fill)': { en: 'Classified Structural Fill', ur: 'ساختی بھرائی' },
  'ردم عام / إحلال (General Backfill)': { en: 'General Backfill / Replacement', ur: 'عام بھرائی / تبدیلی' },

  // ═══ سقالات وشدّات (طلب مع تصميم) ═══
  'طلب سقالة كاملة (توريد + تصميم)': { en: 'Complete Scaffolding (Supply + Design)', ur: 'مکمل اسکیفولڈنگ (سپلائی + ڈیزائن)' },
  'شدّات وطوبار أسقف (سلابات)': { en: 'Slab Formwork & Shoring', ur: 'سلیب فارم ورک اور شورنگ' },

  // ═══ إضافات Madar (دفعة 3) ═══
  'شريط عزل كهربائي (تيب لحام)': { en: 'PVC Electrical Insulation Tape', ur: 'بجلی کی انسولیشن ٹیپ' },
  'شريط تلوين وترميز الكابلات': { en: 'Color-Coding Electrical Tape', ur: 'کیبل کلر کوڈنگ ٹیپ' },
  'أربطة كابلات نايلون (تايات)': { en: 'Nylon Cable Ties', ur: 'نائلون کیبل ٹائیز' },
  'جلبة كابل (كبس/جلاند)': { en: 'Cable Gland', ur: 'کیبل گلینڈ' },
  'سلك سحب أسلاك (فيش تيب)': { en: 'Fish Tape / Wire Puller', ur: 'وائر پُلنگ فش ٹیپ' },
  'شمع تزليق سحب الكابلات': { en: 'Wire Pulling Lubricant', ur: 'وائر پُلنگ لبریکینٹ' },
  'وصلة توصيل واغو (كلامة)': { en: 'Wago / Lever Wire Connector', ur: 'واگو وائر کنیکٹر' },
  'علبة توزيع كهرباء (بوكس)': { en: 'Junction Box', ur: 'جنکشن باکس' },
  'كوبلن مواسير كهرباء (وصلة كوندويت)': { en: 'Conduit Coupler', ur: 'کنڈوٹ کپلر جوڑ' },
  'كم حراري عازل (هيت شرنك)': { en: 'Heat Shrink Tubing / Sleeve', ur: 'ہیٹ شرنک سلیو' },
  'ديمر (منظّم إضاءة) للحائط': { en: 'Wall Light Dimmer', ur: 'وال لائٹ ڈمر (روشنی کنٹرول)' },
  'بريزة يو إس بي شحن (Type-A/Type-C)': { en: 'USB Charging Socket', ur: 'یو ایس بی چارجنگ ساکٹ' },
  'بريزة شبكة/داتا (RJ45)': { en: 'Data / Network Socket (RJ45)', ur: 'ڈیٹا / نیٹ ورک ساکٹ (RJ45)' },
  'بريزة تلفزيون/ستلايت (TV Coax)': { en: 'TV / Satellite Coaxial Socket', ur: 'ٹی وی / سیٹلائٹ کوایکس ساکٹ' },
  'حساس حركة (سنسور إضاءة تلقائي)': { en: 'Motion / Presence Sensor', ur: 'موشن / پریزنس سینسر' },
  'تايمر ديجيتال (مؤقّت زمني)': { en: 'Digital Timer / Time Switch', ur: 'ڈیجیٹل ٹائمر / ٹائم سوئچ' },
  'كونتاكتور مودولار (قاطع تحميل)': { en: 'Modular Contactor', ur: 'ماڈیولر کنٹیکٹر' },
  'ريليه مودولار (ريلي تبديل/تعشيق)': { en: 'Modular Relay / Latching Relay', ur: 'ماڈیولر ریلے / لیچنگ ریلے' },
  'ثرموستات (منظّم حرارة تكييف/تدفئة)': { en: 'Room Thermostat', ur: 'روم تھرموسٹیٹ' },
  'جرس باب مع زر ضغط (بيل بوش)': { en: 'Door Bell with Push Button', ur: 'ڈور بیل مع پش بٹن' },
  'شريط ليد مرن (SMD)': { en: 'Flexible LED Strip (SMD)', ur: 'لچکدار ایل ای ڈی سٹرپ (SMD)' },
  'نيون فليكس ليد': { en: 'LED Neon Flex', ur: 'ایل ای ڈی نیون فلیکس' },
  'محول (درايفر) ليد': { en: 'LED Driver / Power Supply', ur: 'ایل ای ڈی ڈرائیور / پاور سپلائی' },
  'بروفايل ألمنيوم للشريط': { en: 'Aluminium Profile for LED Strip', ur: 'ایل ای ڈی سٹرپ کے لیے ایلومینیم پروفائل' },
  'كنترول RGB لشريط الليد': { en: 'RGB LED Controller', ur: 'آر جی بی ایل ای ڈی کنٹرولر' },
  'موصلات شريط ليد': { en: 'LED Strip Connectors', ur: 'ایل ای ڈی سٹرپ کنیکٹرز' },
  'شريط ليد رقمي متغير الألوان': { en: 'Addressable Digital LED Strip', ur: 'ایڈریس ایبل ڈیجیٹل ایل ای ڈی سٹرپ' },
  'بروفايل ليد مقاوم للماء (نيون بار)': { en: 'Waterproof LED Bar / Rigid Neon Profile', ur: 'واٹر پروف ایل ای ڈی بار / رجڈ نیون پروفائل' },
  'قرص قص حديد': { en: 'Steel Cutting Disc', ur: 'لوہا کاٹنے والی ڈسک' },
  'قرص قص إنوكس (استيل)': { en: 'Inox / Stainless Steel Cutting Disc', ur: 'سٹینلیس سٹیل (انوکس) کاٹنے والی ڈسک' },
  'قرص قص رخام وبلاط': { en: 'Marble & Tile Cutting Disc', ur: 'ماربل اور ٹائل کاٹنے والی ڈسک' },
  'قرص تجليخ حديد': { en: 'Steel Grinding Disc', ur: 'لوہا گھسائی (گرائنڈنگ) ڈسک' },
  'قرص فلاب (صنفرة)': { en: 'Flap Disc (Sanding)', ur: 'فلیپ ڈسک (سینڈنگ)' },
  'فرشاة سلك (كأس / دائرية)': { en: 'Wire Brush (Cup / Wheel)', ur: 'تار برش (کپ / وہیل)' },
  'شفرة منشار حديد (بشر)': { en: 'Hacksaw Blade', ur: 'لوہا کاٹنے والی آری کی بلیڈ (ہیک سا)' },
  'شفرة منشار خشب دائري': { en: 'Wood Circular Saw Blade', ur: 'لکڑی کی گول آری کی بلیڈ' },
  'حجر شحذ وسن': { en: 'Sharpening / Grinding Stone', ur: 'دھار تیز کرنے والا پتھر' },
  'زاوية حديد (أنجل) متساوية الأضلاع': { en: 'Equal Steel Angle (L-Section)', ur: 'لوہے کا اینگل (برابر بازو)' },
  'لوح مسطح حديد (فلات بار)': { en: 'Steel Flat Bar', ur: 'لوہے کی فلیٹ پٹی (فلیٹ بار)' },
  'ماسورة حديد أسود (مواسير سكجول 40)': { en: 'Black Steel Round Pipe (Schedule 40)', ur: 'کالے لوہے کا گول پائپ (شیڈول 40)' },
  'مربع حديد أسود (SHS)': { en: 'Steel Square Tube (Square Hollow Section)', ur: 'کالے لوہے کا مربع پائپ (SHS)' },
  'مستطيل حديد أسود (RHS)': { en: 'Steel Rectangular Tube (Rectangular Hollow Section)', ur: 'کالے لوہے کا مستطیل پائپ (RHS)' },
  'صاج أسود ألواح (صاج حار هوت رولد)': { en: 'Black Hot-Rolled Steel Sheet / Plate', ur: 'کالی لوہے کی چادر / پلیٹ (ہاٹ رولڈ)' },
  'صاج مضلع (شكمة / تير دروب)': { en: 'Steel Chequered Plate (Checker Plate)', ur: 'چیکرڈ اسٹیل پلیٹ (شکمہ)' },
  'صاج مجلفن (GI جلفنة ساخنة)': { en: 'Hot-Dip Galvanized Steel Sheet (GI)', ur: 'گلوانائزڈ اسٹیل چادر (GI)' },
  'بيم حديد أي بيم (IPE جسور)': { en: 'IPE Parallel Flange I-Beam', ur: 'آئی بیم (IPE پیرالل فلینج)' },

  // ═══ خردوات إضافية (دفعة 2 - تدقيق Madar) ═══
  'براغي جبس بورد (دراي وول)': { en: 'Drywall Screws', ur: 'ڈرائی وال اسکرو' },
  'مخرج طوارئ (بار دفع)': { en: 'Panic Bar / Push Exit Device', ur: 'پینک بار' },
  'قفل مغناطيسي كهربائي (ماغلوك)': { en: 'Electromagnetic Lock (Maglock)', ur: 'میگ لاک' },
  'ضبة كهربائية (إلكتريك سترايك)': { en: 'Electric Strike', ur: 'الیکٹرک اسٹرائیک' },
  'قفازات لحام جلد': { en: 'Welding Gloves (Leather)', ur: 'ویلڈنگ دستانے' },
  'كابح صدمة أدراج/أبواب (سوفت كلوز)': { en: 'Soft-Close Damper', ur: 'سافٹ کلوز ڈیمپر' },
  'منظم غاز لحام (ريجيليتر)': { en: 'Welding Gas Regulator', ur: 'گیس ریگولیٹر' },
  'عربة أسطوانات غاز': { en: 'Gas Cylinder Trolley', ur: 'گیس سلنڈر ٹرالی' },
  'زاوية ركن معدنية للجبس (كورنر بيد)': { en: 'Metal Corner Bead', ur: 'کارنر بیڈ' },
  'شريط تسليح فواصل الجبس': { en: 'Drywall Joint Tape', ur: 'جوائنٹ ٹیپ' },
  'بوابة سياج جاهزة': { en: 'Ready Fence Gate', ur: 'باڑ گیٹ' },
  'سلك ربط وأربطة تثبيت الشبك': { en: 'Tie Wire & Fence Clips', ur: 'ٹائی وائر' },

  // ═══ خردوات ومواد إضافية (بحث Madar) ═══
  'مفصلة فراشة': { en: 'Butt Hinge', ur: 'بٹ ہنج (پتلی قبضہ)' },
  'مفصلة أوتوماتيك (زنبرك)': { en: 'Spring Hinge (Self-Closing)', ur: 'اسپرنگ ہنج (خودکار بند ہونے والا)' },
  'مفصلة كوباية (مطبخ) كونسيلد': { en: 'Concealed Cabinet Hinge (Cup Hinge)', ur: 'کیبنٹ کپ ہنج (چھپا ہوا قبضہ)' },
  'مفصلة أرضية (كباس أرضي)': { en: 'Floor Hinge (Floor Spring)', ur: 'فلور ہنج (فرشی اسپرنگ قبضہ)' },
  'مجرى درج تلسكوبي رمان بلي': { en: 'Ball Bearing Telescopic Drawer Slide', ur: 'بال بیئرنگ ٹیلی اسکوپک دراز سلائیڈ' },
  'مجرى درج عادي (بكرة)': { en: 'Standard Roller Drawer Slide', ur: 'عام رولر دراز سلائیڈ' },
  'مجرى درج مخفي هيدروليك (أندرماونت)': { en: 'Concealed Undermount Soft-Close Slide', ur: 'انڈر ماؤنٹ ہائیڈرولک دراز سلائیڈ' },
  'مفصلة بيانو (شريطية)': { en: 'Piano Hinge (Continuous Hinge)', ur: 'پیانو ہنج (مسلسل قبضہ)' },
  'مفصلة جناح (ركنة مطبخ)': { en: 'Flag Hinge / Lift-Off Hinge', ur: 'فلیگ ہنج (لفٹ آف قبضہ)' },
  'مفصلة زاوية (كنار) للأثاث': { en: 'Corner / Cranked Furniture Hinge', ur: 'کارنر فرنیچر ہنج' },
  'قلب كالون (سلندر يوروبروفايل)': { en: 'Euro Profile Cylinder', ur: 'یورو پروفائل سلنڈر' },
  'كالون دفن (قفل مورتيس)': { en: 'Mortice Lock', ur: 'مورٹس لاک' },
  'كباس باب (قفل مقبض دائري)': { en: 'Cylindrical Knob / Handle Lock', ur: 'نوب لاک / ہینڈل لاک' },
  'قفل ديدبولت (كالون ترباس)': { en: 'Deadbolt Lock', ur: 'ڈیڈ بولٹ لاک' },
  'قفل رقمي / ذكي للباب': { en: 'Digital / Smart Door Lock', ur: 'ڈیجیٹل / سمارٹ ڈور لاک' },
  'قفل درج / خزانة': { en: 'Drawer / Cabinet Lock', ur: 'دراز / کیبنٹ لاک' },
  'مزلاج باب (سقاطة / ترباس)': { en: 'Barrel / Tower Bolt (Latch)', ur: 'بولٹ / لیچ' },
  'قفل باب سحاب (ألمنيوم / زجاج)': { en: 'Sliding Door Lock', ur: 'سلائیڈنگ ڈور لاک' },
  'قفل بادلوك (كالون معلاق)': { en: 'Padlock', ur: 'پیڈ لاک / قفل' },
  'كالون فندقي بالبطاقة': { en: 'Hotel Card Lock', ur: 'ہوٹل کارڈ لاک' },
  'كباس باب علوي هيدروليكي': { en: 'Overhead Hydraulic Door Closer', ur: 'اوور ہیڈ ہائیڈرولک ڈور کلوزر' },
  'كباس باب بذراع منزلق (سلايد)': { en: 'Slide Arm Door Closer', ur: 'سلائیڈ آرم ڈور کلوزر' },
  'كباس باب صغير (للأبواب الخفيفة)': { en: 'Small / Light Door Closer', ur: 'چھوٹا ڈور کلوزر' },
  'كباس باب زجاجي (بتشمنت)': { en: 'Patch Fitting Door Closer (Glass Door)', ur: 'شیشے کے دروازے کا کلوزر' },
  'مغلق باب أرضي (فلور سبرنج)': { en: 'Floor Spring Door Closer', ur: 'فلور اسپرنگ ڈور کلوزر' },
  'مشط فلور سبرنج (لوح ستانلس علوي)': { en: 'Floor Spring Cover Plate', ur: 'فلور اسپرنگ کور پلیٹ' },
  'حامل باب مغناطيسي (ماسك مغناطيس)': { en: 'Magnetic Door Holder / Catch', ur: 'مقناطیسی ڈور ہولڈر' },
  'مصد باب مطاطي (ستوبر)': { en: 'Door Stopper', ur: 'ڈور اسٹاپر' },
  'منظم أولوية إغلاق الأبواب (سيلكتور)': { en: 'Door Coordinator / Selector', ur: 'ڈور کوآرڈینیٹر' },
  'ذراع/طقم تركيب كباس باب (قطع غيار)': { en: 'Door Closer Arm / Bracket Set', ur: 'ڈور کلوزر آرم سیٹ' },
  'ماسك/مثبت باب علوي (هولد أوبن)': { en: 'Overhead Door Holder / Hold Open', ur: 'اوور ہیڈ ڈور ہولڈر' },
  'مقبض باب اكبح (لوحة)': { en: 'Lever Door Handle on Backplate', ur: 'لیور دروازہ ہینڈل بمع بیک پلیٹ' },
  'مقبض كرة باب': { en: 'Door Knob (Ball Knob)', ur: 'دروازہ گول ناب' },
  'مقبض باب مع كباس (اكبح كامل بقفل)': { en: 'Lever Handle Lockset with Cylinder', ur: 'لیور ہینڈل لاک سیٹ بمع سلنڈر' },
  'مقبض سحب باب زجاج (H)': { en: 'Glass Door Pull Handle (H-Type)', ur: 'شیشے کے دروازے کا پل ہینڈل' },
  'مقبض دفع وسحب لوح (Push/Pull)': { en: 'Push & Pull Plate Handle Set', ur: 'پش اینڈ پل پلیٹ ہینڈل سیٹ' },
  'مقبض خزائن ومطابخ (يد سحب)': { en: 'Cabinet & Kitchen Pull Handle', ur: 'الماری اور کچن پل ہینڈل' },
  'زر (بزلة) خزانة': { en: 'Cabinet Knob', ur: 'الماری ناب' },
  'روزيتة (طقم روزيتات مقبض)': { en: 'Handle Rosette / Escutcheon Set', ur: 'ہینڈل روزیٹ سیٹ' },
  'دفاية باب (لوحة حماية)': { en: 'Door Kick Plate / Push Plate', ur: 'دروازہ کِک پلیٹ' },
  'مقبض باب رئيسي فخم (شنطة)': { en: 'Main Entrance Pull Handle Set', ur: 'مین دروازہ پل ہینڈل سیٹ' },
  'مسكة باب حديد سحب (كوع)': { en: 'Pull Handle (Angled/Offset)', ur: 'اینگل پل ہینڈل' },
  'ماكينة لحام انفرتر آرك (MMA)': { en: 'Inverter Arc Welding Machine (MMA/Stick)', ur: 'انورٹر آرک ویلڈنگ مشین (MMA)' },
  'ماكينة لحام ميغ/ماغ (MIG/MAG) بالسلك': { en: 'MIG/MAG Wire Welding Machine', ur: 'MIG/MAG وائر ویلڈنگ مشین' },
  'ماكينة لحام تيج (TIG) أرجون': { en: 'TIG Welding Machine (Argon)', ur: 'TIG ویلڈنگ مشین (آرگن)' },
  'ماكينة قطع بلازما': { en: 'Plasma Cutting Machine', ur: 'پلازما کٹنگ مشین' },
  'إلكترود لحام (بارة لحام)': { en: 'Welding Electrode (Rod)', ur: 'ویلڈنگ الیکٹروڈ (راڈ)' },
  'سلك لحام ميغ (بكرة سلك)': { en: 'MIG Welding Wire (Spool)', ur: 'MIG ویلڈنگ وائر (اسپول)' },
  'سلك لحام تيج (بارة أرجون)': { en: 'TIG Welding Rod (Filler)', ur: 'TIG ویلڈنگ راڈ (فلر)' },
  'قناع لحام (خوذة لحام)': { en: 'Welding Mask / Helmet', ur: 'ویلڈنگ ماسک / ہیلمٹ' },
  'ماسك (كباس) اللحام - إلكترود هولدر': { en: 'Welding Electrode Holder', ur: 'ویلڈنگ الیکٹروڈ ہولڈر' },
  'مشبك أرضي لحام (كلامة ماس)': { en: 'Welding Earth Clamp (Ground Clamp)', ur: 'ویلڈنگ ارتھ کلیمپ (گراؤنڈ)' },
  'كيبل لحام (نحاس)': { en: 'Welding Cable (Copper)', ur: 'ویلڈنگ کیبل (کاپر)' },
  'طقم لحام أكسجين وأسيتيلين (لحام غاز)': { en: 'Oxygen-Acetylene Welding & Cutting Kit', ur: 'آکسیجن-ایسٹیلین ویلڈنگ کٹ' },
  'غسالة ضغط عالي كهربائية منزلية': { en: 'Electric High-Pressure Washer (Domestic)', ur: 'الیکٹرک ہائی پریشر واشر (گھریلو)' },
  'غسالة ضغط عالي كهربائية صناعية (تجارية)': { en: 'Industrial Electric High-Pressure Washer (Commercial)', ur: 'صنعتی الیکٹرک ہائی پریشر واشر (کمرشل)' },
  'غسالة ضغط عالي بنزين': { en: 'Petrol High-Pressure Washer', ur: 'پیٹرول ہائی پریشر واشر' },
  'غسالة ضغط عالي ديزل': { en: 'Diesel High-Pressure Washer', ur: 'ڈیزل ہائی پریشر واشر' },
  'غسالة ضغط ماء ساخن (بخار)': { en: 'Hot Water / Steam High-Pressure Washer', ur: 'گرم پانی / بھاپ ہائی پریشر واشر' },
  'خرطوم ضغط عالي (وايت) للغسالة': { en: 'High-Pressure Hose for Washer', ur: 'ہائی پریشر واشر ہوز' },
  'مسدس رش (طبنجة) للغسالة ضغط عالي': { en: 'Spray Gun (Trigger Gun) for Pressure Washer', ur: 'پریشر واشر اسپرے گن (ٹرگر گن)' },
  'لانس (بندقية) رش مع فوهة قابلة للتعديل': { en: 'Spray Lance with Adjustable Nozzle', ur: 'ایڈجسٹ ایبل نوزل کے ساتھ اسپرے لانس' },
  'فرشاة تنظيف أسطح دوّارة للغسالة': { en: 'Rotary Surface Cleaner for Pressure Washer', ur: 'پریشر واشر روٹری سرفیس کلینر' },
  'خزان فوم (رغوة) صابون للغسالة ضغط عالي': { en: 'Foam Cannon / Snow Foam Lance', ur: 'فوم کینن / اسنو فوم لانس' },
  'قائم معدني للجبس بورد (Stud)': { en: 'Metal Stud (C-Profile) for Gypsum Board', ur: 'میٹل اسٹڈ (سی پروفائل) برائے جپسم بورڈ' },
  'مسار معدني (Track / U-Channel)': { en: 'Metal Track / Runner (U-Channel)', ur: 'میٹل ٹریک / رنر (یو چینل)' },
  'أوميغا سقف معلق (Furring Channel)': { en: 'Furring Channel (Omega) for Suspended Ceiling', ur: 'فرنگ چینل (اومیگا) برائے معلق چھت' },
  'زاوية جدار (Wall Angle) للسقف المعلق': { en: 'Wall Angle (Perimeter Angle) for Ceiling', ur: 'وال اینگل (پیریمیٹر اینگل) برائے چھت' },
  'زاوية حماية أركان (Corner Bead)': { en: 'Corner Bead / Angle Bead', ur: 'کارنر بیڈ / اینگل بیڈ' },
  'معجون جبس تلييس الفواصل (Joint Compound)': { en: 'Gypsum Joint Compound', ur: 'جپسم جوائنٹ کمپاؤنڈ (پٹی)' },
  'شريط تسليح الفواصل (Jointing Tape)': { en: 'Drywall Jointing Tape', ur: 'جوائنٹنگ ٹیپ برائے فاصلے' },
  'معلاق سقف قابل للضبط (Ceiling Hanger)': { en: 'Adjustable Ceiling Hanger / Suspension Rod', ur: 'ایڈجسٹ ایبل سیلنگ ہینگر / سسپنشن راڈ' },
  'وصلة تعشيق قوائم (Stud Connector / Splice)': { en: 'Stud Connector / Channel Splice', ur: 'اسٹڈ کنیکٹر / چینل اسپلائس' },
  'شريط عازل تحت القوائم (Acoustic Isolation Strip)': { en: 'Acoustic / Isolation Foam Strip for Track', ur: 'صوتی/آئسولیشن فوم اسٹرپ برائے ٹریک' },
  'شبك تسييج تشيلنك (نسيج ماسي)': { en: 'Chain-Link Fence Mesh', ur: 'چین لنک باڑ کی جالی' },
  'شبك مربعات ملحوم (لفة/بانل)': { en: 'Welded Square Wire Mesh', ur: 'ویلڈڈ مربع تار جالی' },
  'سياج حديد ملحوم مطلي بودرة (بانل جاهز)': { en: 'Powder-Coated Welded Fence Panel', ur: 'پاؤڈر کوٹڈ ویلڈڈ باڑ پینل' },
  'أعمدة تسييج (قوائم شبك)': { en: 'Fence Posts', ur: 'باڑ کے کھمبے' },
  'شبك جبيونات (قفص جباينة حجري)': { en: 'Gabion Box Mesh', ur: 'گیبیئن باکس جالی' },
  'شبك تمدد إكسباندد (حديد ممدد)': { en: 'Expanded Metal Mesh', ur: 'ایکسپینڈڈ میٹل جالی' },
  'سياج موقع مؤقت (حواجز موقع متنقلة)': { en: 'Temporary Site Fence Panel', ur: 'عارضی سائٹ باڑ پینل' },
  'سلك شائك (شبوك)': { en: 'Barbed Wire', ur: 'خاردار تار' },
  'أسلاك كونسيرتينا (شائكة حلاقية)': { en: 'Razor / Concertina Wire', ur: 'ریزر / کنسرٹینا تار' },
  'شبك سداسي (شبك دجاج/تربة)': { en: 'Hexagonal Wire Netting (Chicken Wire)', ur: 'ہیکساگونل تار جالی (مرغی جالی)' },
  'مشبك أرضي (جريتنج) ملحوم': { en: 'Steel Welded Bar Grating', ur: 'سٹیل ویلڈڈ بار گریٹنگ' },
  'كباس باب سياج ومفصلات': { en: 'Fence Gate Latch & Hinges Kit', ur: 'باڑ گیٹ کنڈی اور قبضے' },

  // Civil
  'حديد تسليح':         { en: 'Steel Reinforcement',    ur: 'اسٹیل ریانفورسمنٹ' },
  'أسمنت':              { en: 'Cement',                  ur: 'سیمنٹ' },
  'خرسانة جاهزة':       { en: 'Ready Mix Concrete',      ur: 'ریڈی مکس کنکریٹ' },
  'رمل بناء':           { en: 'Construction Sand',       ur: 'تعمیراتی ریت' },
  'حصى':                { en: 'Gravel',                  ur: 'بجری' },
  'زلط':                { en: 'Crushed Stone',           ur: 'کچا پتھر' },
  'طوب أحمر':           { en: 'Red Brick',               ur: 'سرخ اینٹ' },
  'طوب فارغ':           { en: 'Hollow Brick',            ur: 'کھوکھلی اینٹ' },
  'بلوك خرساني':        { en: 'Concrete Block',          ur: 'کنکریٹ بلاک' },
  'شبك رابيتز':         { en: 'Rabitz Wire Mesh',        ur: 'ربٹز جالی' },
  'كسارة':              { en: 'Crusher Stone',           ur: 'کرشر پتھر' },
  'جير':                { en: 'Lime',                    ur: 'چونا' },
  'صلب هيكلي':          { en: 'Structural Steel',        ur: 'ساختی اسٹیل' },
  'أوتاد خرسانية':      { en: 'Concrete Piles',          ur: 'کنکریٹ پائل' },
  'عتبات خرسانية':      { en: 'Concrete Beams',          ur: 'کنکریٹ بیم' },
  'أنابيب صرف صحي':    { en: 'Sanitary Pipes',          ur: 'سینیٹری پائپ' },
  'ركام':               { en: 'Aggregates',              ur: 'مجموعی مواد' },
  'جبصين':              { en: 'Gypsum Plaster',          ur: 'جپسم پلاسٹر' },
  'حجر خام للردم والحواجز': { en: 'Rubble / Fill Stone',   ur: 'بھرائی پتھر' },
  // Architectural
  'بلاط سيراميك':       { en: 'Ceramic Tiles',           ur: 'سیرامک ٹائلز' },
  'بلاط بورسلين':       { en: 'Porcelain Tiles',         ur: 'پورسلین ٹائلز' },
  'رخام طبيعي':         { en: 'Natural Marble',          ur: 'قدرتی سنگ مرمر' },
  'جرانيت':             { en: 'Granite',                 ur: 'گرینائٹ' },
  'دهان أكريليك':       { en: 'Acrylic Paint',           ur: 'اکریلک پینٹ' },
  'دهان زيتي':          { en: 'Oil Paint',               ur: 'آئل پینٹ' },
  'جبس':                { en: 'Gypsum Board',            ur: 'جپسم بورڈ' },
  'زجاج عادي':          { en: 'Clear Glass',             ur: 'شفاف شیشہ' },
  'زجاج معشش':          { en: 'Wired Glass',             ur: 'تار والا شیشہ' },
  'أبواب خشب':          { en: 'Wooden Doors',            ur: 'لکڑی کے دروازے' },
  'نوافذ ألمنيوم':       { en: 'Aluminum Windows',        ur: 'ایلومینیم کھڑکیاں' },
  'نوافذ UPVC':          { en: 'UPVC Windows',            ur: 'یو پی وی سی کھڑکیاں' },
  'حجر بازلت':          { en: 'Basalt Stone',            ur: 'بازالٹ پتھر' },
  'فوم عازل حراري':     { en: 'Thermal Insulation Foam', ur: 'تھرمل انسولیشن فوم' },
  'صوف صخري':           { en: 'Rock Wool',               ur: 'راک وول' },
  'ديكور خشبي':         { en: 'Wooden Decor',            ur: 'لکڑی کی سجاوٹ' },
  'قرميد سقف':          { en: 'Roof Tiles',              ur: 'چھت کی ٹائلز' },
  'مشربيات':            { en: 'Mashrabiya',              ur: 'مشربیہ' },
  'حجر صناعي':          { en: 'Artificial Stone',        ur: 'مصنوعی پتھر' },
  'سيراميك حمام':       { en: 'Bathroom Ceramics',       ur: 'باتھ روم سیرامک' },
  // Electrical
  'كابلات NYY':         { en: 'NYY Cables',              ur: 'این وائی وائی کیبل' },
  'كابلات NYCY':        { en: 'NYCY Cables',             ur: 'این وائی سی وائی کیبل' },
  'سلك نحاس':           { en: 'Copper Wire',             ur: 'تانبے کی تار' },
  'قواطع كهربائية':     { en: 'Circuit Breakers',        ur: 'سرکٹ بریکر' },
  'لوحات توزيع':        { en: 'Distribution Panels',     ur: 'ڈسٹریبیوشن پینل' },
  'مفاتيح كهربائية':    { en: 'Electrical Switches',     ur: 'برقی سوئچ' },
  'مقابس كهربائية':     { en: 'Electrical Outlets',      ur: 'برقی ساکٹ' },
  'إضاءة LED':          { en: 'LED Lighting',            ur: 'ایل ای ڈی روشنی' },
  'مصابيح فلورسنت':     { en: 'Fluorescent Lamps',       ur: 'فلوروسینٹ بلب' },
  'أنابيب كهربائية':    { en: 'Electrical Conduits',     ur: 'برقی کنڈوٹ' },
  'فيوزات':             { en: 'Fuses',                   ur: 'فیوز' },
  'عوازل كهربائية':     { en: 'Electrical Insulators',   ur: 'برقی عایق' },
  'محول كهربائي':       { en: 'Electrical Transformer',  ur: 'ٹرانسفارمر' },
  'مولد كهرباء':        { en: 'Generator',               ur: 'جنریٹر' },
  'أجهزة حماية':        { en: 'Protection Devices',      ur: 'حفاظتی آلات' },
  'رايات كهربائية':     { en: 'Cable Trays',             ur: 'کیبل ٹرے' },
  'كيبل ارضي':          { en: 'Underground Cable',       ur: 'زیر زمین کیبل' },
  'كشافات خارجية':      { en: 'Outdoor Floodlights',     ur: 'آؤٹ ڈور فلڈ لائٹ' },
  'طبلون كهربائي':      { en: 'Electrical Panel Board',  ur: 'برقی پینل بورڈ' },
  // Civil extended
  'حديد تسليح سلك':    { en: 'Steel Wire Mesh',          ur: 'اسٹیل وائر میش' },
  'شبكة حديد جاهزة':   { en: 'Prefab Steel Mesh',        ur: 'پری فیب اسٹیل میش' },
  'خرسانة جاهزة C25':  { en: 'Ready Mix Concrete C25',   ur: 'ریڈی مکس C25' },
  'خرسانة جاهزة C30':  { en: 'Ready Mix Concrete C30',   ur: 'ریڈی مکس C30' },
  'خرسانة جاهزة C35':  { en: 'Ready Mix Concrete C35',   ur: 'ریڈی مکس C35' },
  'خرسانة جاهزة C40':  { en: 'Ready Mix Concrete C40',   ur: 'ریڈی مکس C40' },
  'رمل ناعم':           { en: 'Fine Sand',                ur: 'باریک ریت' },
  'ركام مدمج':          { en: 'Compacted Aggregate',      ur: 'کمپیکٹڈ ایگریگیٹ' },
  'بلوك EPS عازل':      { en: 'EPS Insulated Block',      ur: 'ای پی ایس بلاک' },
  'صلب هيكلي HEB':      { en: 'HEB Structural Steel',     ur: 'HEB اسٹیل' },
  'صلب هيكلي HEA':      { en: 'HEA Structural Steel',     ur: 'HEA اسٹیل' },
  'صلب هيكلي IPE':      { en: 'IPE Structural Steel',     ur: 'IPE اسٹیل' },
  'قطاعات قنوات U/UPN/UPE (Channels)': { en: 'Steel Channels (UPN/UPE/U)', ur: 'اسٹیل چینل' },
  'صفائح فولاذية':      { en: 'Steel Plates',             ur: 'اسٹیل پلیٹ' },
  'أوتاد حديد مجوف':    { en: 'Hollow Steel Piles',        ur: 'کھوکھلے اسٹیل پائل' },
  'عتبات جسور خرسانية': { en: 'Precast Concrete Beams',   ur: 'پری کاسٹ بیم' },
  'أنابيب صرف صحي PVC': { en: 'PVC Sewage Pipes',         ur: 'پی وی سی سیوریج پائپ' },
  'أنابيب صرف HDPE':    { en: 'HDPE Drainage Pipes',      ur: 'ایچ ڈی پی ای ڈرینیج' },
  'أنابيب صرف خرساني':  { en: 'Concrete Sewer Pipes',     ur: 'کنکریٹ سیور پائپ' },
  'غرف تفتيش خرسانية':  { en: 'Concrete Inspection Chambers', ur: 'کنکریٹ چیمبر' },
  'أغطية منهول حديد':   { en: 'Cast Iron Manhole Covers', ur: 'مین ہول کور' },
  'مواد ردم':            { en: 'Backfill Materials',       ur: 'بیک فل مواد' },
  'مواد عازلة للأساسات': { en: 'Foundation Waterproofing', ur: 'فاؤنڈیشن واٹر پروفنگ' },
  'فيلم بولي ايثيلين':  { en: 'Polyethylene Film',        ur: 'پولی ایتھیلین فلم' },
  // Architectural extended
  'بلاط بورسلين مستورد': { en: 'Imported Porcelain Tiles',  ur: 'امپورٹڈ پورسلین' },
  'باركيه خشبي':         { en: 'Hardwood Parquet',          ur: 'لکڑی پارکے' },
  'أرضية إيبوكسي':       { en: 'Epoxy Floor',               ur: 'ایپوکسی فرش' },
  'سجاد':                { en: 'Carpet',                    ur: 'قالین' },
  'فينيل':               { en: 'Vinyl Flooring',            ur: 'ونائل فلور' },
  'دهان مضاد للرطوبة':   { en: 'Anti-humidity Paint',       ur: 'نمی مخالف پینٹ' },
  'ورق جدران':           { en: 'Wallpaper',                 ur: 'وال پیپر' },
  'جبس بورد':            { en: 'Gypsum Board',              ur: 'جپسم بورڈ' },
  'لواح GRC':            { en: 'GRC Panels',                ur: 'جی آر سی پینل' },
  'لواح خشب MDF':        { en: 'MDF Wood Panels',           ur: 'ایم ڈی ایف پینل' },
  'كلادينج ألمنيوم':     { en: 'Aluminum Cladding',         ur: 'ایلومینیم کلیڈنگ' },
  'أسقف مستعارة جبس':   { en: 'Gypsum False Ceiling',      ur: 'جپسم جھوٹی چھت' },
  'أسقف مستعارة معدنية': { en: 'Metal False Ceiling',       ur: 'دھاتی جھوٹی چھت' },
  'أسقف كالسيوم سيليكات':{ en: 'Calcium Silicate Ceiling',  ur: 'کیلشیم سلیکیٹ چھت' },
  'بلاطات أسقف 600×600': { en: 'Ceiling Tiles 600×600',     ur: 'چھت ٹائل 600×600' },
  'أبواب خشب داخلية':    { en: 'Interior Wooden Doors',     ur: 'اندرونی لکڑی دروازے' },
  'أبواب حديد مقاومة للحريق': { en: 'Fire Rated Steel Doors', ur: 'فائر ریٹڈ دروازے' },
  'أبواب ألمنيوم':        { en: 'Aluminum Doors',            ur: 'ایلومینیم دروازے' },
  'نوافذ ألمنيوم مزدوجة': { en: 'Double Glazed Alu Windows', ur: 'ڈبل گلیزڈ کھڑکیاں' },
  'ستائر حديد':          { en: 'Roller Shutters',           ur: 'رولر شٹر' },
  'زجاج عازل مزدوج':     { en: 'Double Insulated Glass',    ur: 'ڈبل انسولیٹڈ شیشہ' },
  'زجاج سيكوريت':        { en: 'Tempered Glass',            ur: 'ٹمپرڈ گلاس' },
  'زجاج رفلكتيف':        { en: 'Reflective Glass',          ur: 'ریفلیکٹیو گلاس' },
  'واجهات كومبوزيت':      { en: 'Composite Facades',         ur: 'کمپوزٹ فیسڈ' },
  'عازل XPS':            { en: 'XPS Insulation Board',      ur: 'XPS انسولیشن' },
  'عازل رطوبة للأسطح':   { en: 'Roof Waterproofing',        ur: 'چھت واٹر پروفنگ' },
  'مواد عازلة للصوت':    { en: 'Acoustic Insulation',       ur: 'صوتی انسولیشن' },
  'أدوات صحية':          { en: 'Sanitary Ware',             ur: 'سینیٹری ویئر' },
  'خلاطات مياه':         { en: 'Water Faucets/Mixers',      ur: 'واٹر مکسر' },
  'درابزين ستانلس':      { en: 'Stainless Steel Railing',   ur: 'سٹین لیس ریلنگ' },
  'سلالم حديد':          { en: 'Steel Staircases',          ur: 'اسٹیل سیڑھیاں' },
  // Electrical extended
  'كابلات NYY 2.5mm':   { en: 'NYY Cable 2.5mm²',          ur: 'NYY کیبل 2.5mm' },
  'كابلات NYY 4mm':     { en: 'NYY Cable 4mm²',            ur: 'NYY کیبل 4mm' },
  'كابلات NYY 6mm':     { en: 'NYY Cable 6mm²',            ur: 'NYY کیبل 6mm' },
  'كابلات NYY 10mm':    { en: 'NYY Cable 10mm²',           ur: 'NYY کیبل 10mm' },
  'كابلات NYY 16mm':    { en: 'NYY Cable 16mm²',           ur: 'NYY کیبل 16mm' },
  'كابلات NYY 25mm':    { en: 'NYY Cable 25mm²',           ur: 'NYY کیبل 25mm' },
  'كابلات NYY 35mm':    { en: 'NYY Cable 35mm²',           ur: 'NYY کیبل 35mm' },
  'كابلات NYY 50mm':    { en: 'NYY Cable 50mm²',           ur: 'NYY کیبل 50mm' },
  'كابلات NYY 70mm':    { en: 'NYY Cable 70mm²',           ur: 'NYY کیبل 70mm' },
  'كابلات NYY 95mm':    { en: 'NYY Cable 95mm²',           ur: 'NYY کیبل 95mm' },
  'كابلات NYY 120mm':   { en: 'NYY Cable 120mm²',          ur: 'NYY کیبل 120mm' },
  'كابلات NYY 150mm':   { en: 'NYY Cable 150mm²',          ur: 'NYY کیبل 150mm' },
  'كابلات NYCY متعدد الأوجه': { en: 'NYCY Multi-core Cable', ur: 'NYCY ملٹی کور' },
  'كابل أرضي معزول':    { en: 'Armored Underground Cable',  ur: 'آرمرڈ کیبل' },
  'سلك نحاس 1.5mm':    { en: 'Copper Wire 1.5mm²',        ur: 'تانبے تار 1.5mm' },
  'سلك نحاس 2.5mm':    { en: 'Copper Wire 2.5mm²',        ur: 'تانبے تار 2.5mm' },
  'سلك نحاس 4mm':      { en: 'Copper Wire 4mm²',          ur: 'تانبے تار 4mm' },
  'كابل إنذار حريق':    { en: 'Fire Alarm Cable',           ur: 'فائر الارم کیبل' },
  'كابل بيانات CAT6':   { en: 'CAT6 Data Cable',           ur: 'CAT6 ڈیٹا کیبل' },
  'لوحة توزيع رئيسية MDB': { en: 'Main Distribution Board MDB', ur: 'مین ڈسٹریبیوشن بورڈ' },
  'لوحة توزيع فرعية SDB':  { en: 'Sub Distribution Board SDB',  ur: 'سب ڈسٹریبیوشن بورڈ' },
  'لوحة توزيع إضاءة LDB':  { en: 'Lighting Distribution Board', ur: 'لائٹنگ بورڈ' },
  'لوحة UPS':            { en: 'UPS Panel',                  ur: 'یو پی ایس پینل' },
  'لوحة قواطع MCB':     { en: 'MCB Consumer Unit',          ur: 'MCB یونٹ' },
  'قاطع كهربائي MCB 1P': { en: 'MCB 1 Pole Circuit Breaker', ur: 'MCB 1 پول' },
  'قاطع كهربائي MCB 3P': { en: 'MCB 3 Pole Circuit Breaker', ur: 'MCB 3 پول' },
  'قاطع تفاضلي RCCB':   { en: 'RCCB Residual Current Breaker', ur: 'RCCB قاطع' },
  'قاطع MCCB':          { en: 'Molded Case Circuit Breaker', ur: 'MCCB قاطع' },
  'قاطع هوائي ACB':     { en: 'Air Circuit Breaker ACB',    ur: 'ACB قاطع' },
  'لمبة LED بانل 60×60': { en: 'LED Panel 60×60cm',         ur: 'LED پینل 60×60' },
  'لمبة LED بانل 30×120': { en: 'LED Panel 30×120cm',        ur: 'LED پینل 30×120' },
  'كشاف LED خارجي':     { en: 'LED Outdoor Floodlight',    ur: 'LED آؤٹ ڈور لائٹ' },
  'كشاف LED صناعي':     { en: 'LED Industrial High Bay',   ur: 'LED انڈسٹریل لائٹ' },
  'إضاءة طوارئ':        { en: 'Emergency Lighting',         ur: 'ایمرجنسی لائٹنگ' },
  'إضاءة شريطية LED':   { en: 'LED Strip Light',           ur: 'LED سٹرپ لائٹ' },
  'إضاءة مخرج طوارئ':   { en: 'Emergency Exit Sign',        ur: 'ایگزٹ سائن لائٹ' },
  'محول كهربائي 11kV':  { en: 'Transformer 11kV',          ur: 'ٹرانسفارمر 11kV' },
  'محول كهربائي 400V':  { en: 'Transformer 400V',          ur: 'ٹرانسفارمر 400V' },
  'لوحة MV متوسط جهد':  { en: 'MV Switchgear Panel',       ur: 'MV سوچ گیئر' },
  'مكثفات تحسين معامل القدرة': { en: 'Power Factor Capacitor Bank', ur: 'کپیسیٹر بینک' },
  'مولد كهرباء ديزل':   { en: 'Diesel Generator Set',      ur: 'ڈیزل جنریٹر' },
  'UPS لا انقطاعي':     { en: 'UPS Uninterruptible Power',  ur: 'UPS پاور سپلائی' },
  'أنابيب كهربائية PVC': { en: 'PVC Electrical Conduit',    ur: 'PVC کنڈوٹ' },
  'أنابيب كهربائية معدنية': { en: 'Steel Electrical Conduit', ur: 'اسٹیل کنڈوٹ' },
  'سكة كابل مشبكة':     { en: 'Cable Ladder Tray',         ur: 'کیبل لیڈر ٹرے' },
  'سكة كابل مغطاة':     { en: 'Covered Cable Tray',        ur: 'کور کیبل ٹرے' },
  'علب توزيع':          { en: 'Junction Boxes',            ur: 'جنکشن باکس' },
  'مفاتيح وأبراز':      { en: 'Switches & Sockets',        ur: 'سوئچ اور ساکٹ' },
  'سلك تأريض':          { en: 'Earth Wire',                ur: 'ارتھ تار' },
  'أقطاب تأريض':        { en: 'Earth Rods',                ur: 'ارتھ راڈ' },
  'شريط نحاس تأريض':    { en: 'Copper Earth Tape',         ur: 'تانبے ارتھ ٹیپ' },
  'برق حماية':          { en: 'Lightning Protection',       ur: 'بجلی حفاظت' },
  'جهاز كشف تسرب':      { en: 'Earth Leakage Detector',    ur: 'لیکیج ڈیٹیکٹر' },
  // Mechanical extended
  'أنابيب HDPE PN10':   { en: 'HDPE Pipe PN10',            ur: 'HDPE پائپ PN10' },
  'أنابيب HDPE PN16':   { en: 'HDPE Pipe PN16',            ur: 'HDPE پائپ PN16' },
  'أنابيب PPR PN20':    { en: 'PPR Pipe PN20',             ur: 'PPR پائپ PN20' },
  'أنابيب PPR PN25':    { en: 'PPR Pipe PN25',             ur: 'PPR پائپ PN25' },
  'أنابيب PVC C':       { en: 'PVC-C Pressure Pipe',       ur: 'PVC-C پریشر پائپ' },
  'أنابيب GRE مقاومة كيماوي': { en: 'GRE Chemical Resistant Pipe', ur: 'GRE پائپ' },
  'أنابيب فولاذية BS1387': { en: 'Steel Pipe BS1387',       ur: 'اسٹیل پائپ BS1387' },
  'أنابيب مياه إطفاء GRV': { en: 'Fire Fighting GRV Pipe',  ur: 'فائر فائٹنگ پائپ' },
  'صمامات كرة ستانلس':  { en: 'Stainless Steel Ball Valves', ur: 'سٹین لیس بال والو' },
  'صمامات فراشة':       { en: 'Butterfly Valves',          ur: 'بٹرفلائی والو' },
  'صمامات تخفيض ضغط':  { en: 'Pressure Reducing Valves',  ur: 'پریشر ریڈوسنگ والو' },
  'صمامات تصريف':       { en: 'Drain Valves',              ur: 'ڈرین والو' },
  'صمامات تحكم كهربائية': { en: 'Motorized Control Valves', ur: 'موٹرائزڈ والو' },
  'مضخات مياه مركزية':  { en: 'Central Water Pumps',       ur: 'مرکزی واٹر پمپ' },
  'مضخة boosting ضغط':  { en: 'Pressure Boosting Pump',    ur: 'بوسٹنگ پمپ' },
  'مضخة إطفاء حريق':   { en: 'Fire Fighting Pump',         ur: 'فائر پمپ' },
  'مضخة سمبرسبل صرف':  { en: 'Submersible Drainage Pump',  ur: 'سبمرسبل پمپ' },
  'مضخة دوسينج كيماوي': { en: 'Chemical Dosing Pump',       ur: 'ڈوسنگ پمپ' },
  'وحدة مناولة هواء AHU': { en: 'Air Handling Unit AHU',   ur: 'AHU ایئر یونٹ' },
  'وحدة FCU سقفية':    { en: 'Fan Coil Unit Ceiling',      ur: 'FCU سقفی' },
  'وحدة FCU خرطوم':    { en: 'Fan Coil Unit Cassette',     ur: 'FCU کیسٹ' },
  'مكيفات VRV/VRF خارجية': { en: 'VRV/VRF Outdoor Units',  ur: 'VRV آؤٹ ڈور' },
  'مبرد مياه Chiller':  { en: 'Water Cooled Chiller',       ur: 'واٹر چلر' },
  'برج تبريد Cooling Tower': { en: 'Cooling Tower',          ur: 'کولنگ ٹاور' },
  'ضخ حراري Heat Pump': { en: 'Heat Pump',                  ur: 'ہیٹ پمپ' },
  'مراوح هواء محورية':  { en: 'Axial Flow Fans',            ur: 'محوری پنکھے' },
  'مراوح هواء طرد مركزي': { en: 'Centrifugal Fans',          ur: 'سینٹریفیوگل پنکھے' },
  'مجاري هواء جلفنايز': { en: 'Galvanized Steel Ducts',     ur: 'گلوانائزڈ ڈکٹ' },
  'مجاري هواء ستانلس':  { en: 'Stainless Steel Ducts',      ur: 'سٹین لیس ڈکٹ' },
  'عوازل مجاري هواء':  { en: 'Duct Insulation',             ur: 'ڈکٹ انسولیشن' },
  'فتحات هواء GI':      { en: 'GI Air Grilles',             ur: 'GI ہوا گرلیں' },
  'موزعات هواء':        { en: 'Air Diffusers',              ur: 'ایئر ڈفیوزر' },
  'ستائر هواء':         { en: 'Air Curtains',               ur: 'ایئر کرٹن' },
  'خزان مياه فايبر جلاس': { en: 'Fiberglass Water Tank',    ur: 'فائبر گلاس ٹینک' },
  'سخانات مياه مركزية': { en: 'Central Water Heaters',      ur: 'مرکزی واٹر ہیٹر' },
  'سخانات مياه كهربائية': { en: 'Electric Water Heaters',   ur: 'برقی واٹر ہیٹر' },
  'أنظمة RO تحلية':    { en: 'RO Water Purification System', ur: 'RO واٹر سسٹم' },
  'مضخات تداول مياه ساخنة': { en: 'Hot Water Circulation Pumps', ur: 'گرم پانی پمپ' },
  'منظومة إطفاء Sprinkler': { en: 'Sprinkler Fire Fighting System', ur: 'اسپرنکلر سسٹم' },
  'عوازل اهتزاز':       { en: 'Vibration Isolators',        ur: 'وائبریشن آئسولیٹر' },
  'مواسير تمدد':        { en: 'Expansion Joints',           ur: 'ایکسپینشن جوائنٹ' },
  'خراطيم مرنة':        { en: 'Flexible Hoses',             ur: 'لچکدار نلی' },
  'حوامل وتعليقات أنابيب': { en: 'Pipe Supports & Hangers', ur: 'پائپ سپورٹ' },
  // Mechanical
  'مكيفات VRV':         { en: 'VRV Air Conditioners',    ur: 'وی آر وی ایئر کنڈیشنر' },
  'أنابيب HDPE':        { en: 'HDPE Pipes',              ur: 'ایچ ڈی پی ای پائپ' },
  'أنابيب PPR':         { en: 'PPR Pipes',               ur: 'پی پی آر پائپ' },
  'أنابيب PVC':         { en: 'PVC Pipes',               ur: 'پی وی سی پائپ' },
  'أنابيب نحاس':        { en: 'Copper Pipes',            ur: 'تانبے کے پائپ' },
  'أنابيب CPVC':        { en: 'CPVC Pipes',              ur: 'سی پی وی سی پائپ' },
  'أنابيب PEX':         { en: 'PEX Pipes',               ur: 'پی ای ایکس پائپ' },
  'صمامات كرة':         { en: 'Ball Valves',             ur: 'بال والو' },
  'صمامات بوابة':       { en: 'Gate Valves',             ur: 'گیٹ والو' },
  'صمامات فحص':         { en: 'Check Valves',            ur: 'چیک والو' },
  'فلانشات':            { en: 'Flanges',                 ur: 'فلانج' },
  'وصلات أنابيب':       { en: 'Pipe Fittings',           ur: 'پائپ فٹنگ' },
  'خزانات ضغط':         { en: 'Pressure Tanks',          ur: 'پریشر ٹینک' },
  'مرشحات مياه':        { en: 'Water Filters',           ur: 'واٹر فلٹر' },
  'سخانات مياه':        { en: 'Water Heaters',           ur: 'واٹر ہیٹر' },
  'مراوح هواء':         { en: 'Air Fans',                ur: 'ہوا کے پنکھے' },
  'مجاري هواء':         { en: 'Air Ducts',               ur: 'ایئر ڈکٹ' },
  'ضواغط هواء':         { en: 'Air Compressors',         ur: 'ایئر کمپریسر' },
  'وحدات تكييف':        { en: 'AC Units',                ur: 'ایئر کنڈیشنر یونٹ' },
  // ── المدني (civil) — ترجمات مضافة ──
  'خرسانة مسبقة الصب': { en: 'Precast Concrete', ur: 'پری کاسٹ کنکریٹ' },
  'عتبات خرسانية مسبقة الصب': { en: 'Precast Concrete Lintels', ur: 'پری کاسٹ عتبے' },
  'أعمدة مسبقة الصب': { en: 'Precast Concrete Columns', ur: 'پری کاسٹ کالم' },
  'بلاطات مسبقة الصب': { en: 'Precast Concrete Slabs', ur: 'پری کاسٹ سلیب' },
  'مدرجات مسبقة الصب': { en: 'Precast Concrete Bleachers', ur: 'پری کاسٹ بلیچرز' },
  'بلوك AAC خفيف': { en: 'Lightweight AAC Block', ur: 'ہلکا اے اے سی بلاک' },
  'ألواح بليود (طوبار) Plywood': { en: 'Plywood Formwork Boards', ur: 'پلائی ووڈ فارم ورک' },
  'خشب بناء للشدّات': { en: 'Formwork Timber', ur: 'فارم ورک لکڑی' },
  'خشب بناء (Construction Timber)': { en: 'Construction Timber', ur: 'تعمیراتی لکڑی' },
  'مرابيع خشب (طوبار)': { en: 'Timber Battens (Formwork)', ur: 'لکڑی کے بیٹن' },
  'عوارض خشبية H20': { en: 'H20 Timber Beams', ur: 'H20 لکڑی بیم' },
  'طوبار معدني جاهز': { en: 'Steel Formwork System', ur: 'دھاتی فارم ورک' },
  'قمط شدّة أعمدة Column Clamp': { en: 'Column Clamps', ur: 'کالم کلیمپ' },
  'قضبان شد الطوبار Tie Rods': { en: 'Formwork Tie Rods', ur: 'ٹائی راڈ' },
  'زيت فك الطوبار Shutter Oil': { en: 'Shutter Release Oil', ur: 'شٹر آئل' },
  'سقالة رينج لوك (Ringlock)': { en: 'Ringlock Scaffold', ur: 'رنگ لاک سکیفولڈ' },
  'سقالة كب لوك (Cuplock)': { en: 'Cuplock Scaffold', ur: 'کپلاک سکیفولڈ' },
  'قائم سقالة Standard': { en: 'Scaffold Standard', ur: 'سکیفولڈ اسٹینڈرڈ' },
  'عارضة أفقية سقالة Ledger': { en: 'Scaffold Ledger', ur: 'سکیفولڈ لیجر' },
  'دعامة قطرية سقالة Brace': { en: 'Scaffold Brace', ur: 'سکیفولڈ بریس' },
  'ماسورة سقالة Tube': { en: 'Scaffold Tube', ur: 'سکیفولڈ ٹیوب' },
  'إطار سقالة معدنية Frame': { en: 'Scaffold Frame', ur: 'سکیفولڈ فریم' },
  'قاعدة ثابتة Base Plate': { en: 'Base Plate', ur: 'بیس پلیٹ' },
  'بيس جاك قابل للتعديل': { en: 'Adjustable Base Jack', ur: 'ایڈجسٹ ایبل بیس جیک' },
  'يو جاك U-Head': { en: 'U-Head Jack', ur: 'یو ہیڈ جیک' },
  'سكرو جاك تعديل': { en: 'Adjustable Screw Jack', ur: 'سکرو جیک' },
  'منصة وقوف معدنية Steel Deck': { en: 'Steel Scaffold Deck', ur: 'اسٹیل ڈیک' },
  'سلم سقالة': { en: 'Scaffold Ladder', ur: 'سکیفولڈ سیڑھی' },
  'كوبلر مشبك سقالة Coupler': { en: 'Scaffold Coupler', ur: 'سکیفولڈ کپلر' },
  'جاكات تدعيم Acrow Prop': { en: 'Acrow Props', ur: 'ایکرو پراپ' },
  'برج تدعيم Shoring Tower': { en: 'Shoring Tower', ur: 'شورنگ ٹاور' },
  'درابزين أمان سقالة Guard Rail': { en: 'Scaffold Guard Rail', ur: 'گارڈ ریل' },
  'أنابيب HDPE صرف أمطار (SDR11)': { en: 'HDPE SDR11 Stormwater Pipe', ur: 'ایچ ڈی پی ای اسٹارم پائپ' },
  'أنابيب HDPE SDR11 صرف أمطار 100mm': { en: 'HDPE SDR11 Stormwater Pipe 100mm', ur: 'ایچ ڈی پی ای اسٹارم پائپ 100mm' },
  'أنابيب HDPE SDR11 صرف أمطار 150mm': { en: 'HDPE SDR11 Stormwater Pipe 150mm', ur: 'ایچ ڈی پی ای اسٹارم پائپ 150mm' },
  'أنابيب HDPE SDR11 صرف أمطار 200mm': { en: 'HDPE SDR11 Stormwater Pipe 200mm', ur: 'ایچ ڈی پی ای اسٹارم پائپ 200mm' },
  'أنابيب HDPE SDR11 صرف أمطار 300mm': { en: 'HDPE SDR11 Stormwater Pipe 300mm', ur: 'ایچ ڈی پی ای اسٹارم پائپ 300mm' },
  'أنابيب HDPE SDR11 صرف أمطار 400mm': { en: 'HDPE SDR11 Stormwater Pipe 400mm', ur: 'ایچ ڈی پی ای اسٹارم پائپ 400mm' },
  'أنابيب خرسانية صرف خارجي': { en: 'Concrete Drainage Pipes', ur: 'کنکریٹ ڈرینج پائپ' },
  'أنابيب خرسانية مسلحة RCP': { en: 'Reinforced Concrete Pipe (RCP)', ur: 'آر سی پی پائپ' },
  'أنابيب حديد مرن Ductile Iron مياه رئيسية': { en: 'Ductile Iron Water Main Pipes', ur: 'ڈکٹائل آئرن واٹر پائپ' },
  'مصارف خطية': { en: 'Linear Drains', ur: 'لائنر ڈرین' },
  'أعمال ترابية وحفر': { en: 'Earthworks & Excavation', ur: 'مٹی کا کام اور کھدائی' },
  'مواد ردم وتسوية': { en: 'Backfill & Leveling Material', ur: 'بھرائی اور لیولنگ میٹریل' },
  'إسفلت': { en: 'Asphalt', ur: 'اسفالٹ' },
  'حجر كيرب': { en: 'Kerbstone', ur: 'کرب اسٹون' },
  'بلاط رصف خارجي': { en: 'Exterior Paving Tiles', ur: 'باہری پیومنٹ ٹائل' },
  'أنابيب ري HDPE خارجية': { en: 'HDPE Irrigation Pipes', ur: 'ایچ ڈی پی ای آبپاشی پائپ' },
  'شبكة ري خارجية': { en: 'External Irrigation Network', ur: 'آبپاشی نیٹ ورک' },
  'عازل مائي للأساسات Liquid Applied': { en: 'Liquid-Applied Foundation Waterproofing', ur: 'فاؤنڈیشن واٹر پروفنگ' },
  'عزل مائي سائل (Liquid Membrane)': { en: 'Liquid Waterproofing Membrane', ur: 'لیکویڈ واٹر پروف میمبرین' },
  'عزل مائي سيماني (Cementitious)': { en: 'Cementitious Waterproofing', ur: 'سیمنٹیشس واٹر پروفنگ' },
  'غشاء بيتوميني لفائف (Bituminous Membrane)': { en: 'Bituminous Membrane Roll', ur: 'بٹومینس میمبرین رول' },
  'بطانة خزانات سائلة (Tank Lining)': { en: 'Liquid Tank Lining', ur: 'ٹینک لائننگ' },
  'بيتومين أولي (Primer)': { en: 'Bituminous Primer', ur: 'بٹومین پرائمر' },
  'لوح حماية بيتوميني (Protection Board)': { en: 'Bituminous Protection Board', ur: 'پروٹیکشن بورڈ' },
  'مواد لاصقة وكيماويات (Adhesives & Sealants)': { en: 'Adhesives & Sealants', ur: 'چپکنے والے اور سیلنٹ' },
  'عازل مائي Tanking': { en: 'Tanking Waterproofing', ur: 'ٹینکنگ واٹر پروفنگ' },
  'غشاء عازل للأسطح': { en: 'Roof Waterproofing Membrane', ur: 'چھت واٹر پروف میمبرین' },
  'مدرجات مسبقة الصب Bleachers': { en: 'Precast Bleachers', ur: 'پری کاسٹ بلیچرز' },
  'مقاعد ملعب': { en: 'Stadium Seating', ur: 'اسٹیڈیم سیٹنگ' },
  'سلالم رياضية Raker Beams': { en: 'Raker Beams', ur: 'ریکر بیم' },
  'قطاعات دائرية CHS 273mm': { en: 'Circular Hollow Section CHS 273mm', ur: 'سی ایچ ایس 273mm' },
  'قطاعات دائرية CHS (Circular Hollow Section)': { en: 'Circular Hollow Section (CHS)', ur: 'سرکلر ہالو سیکشن' },
  'قطاع مربع SHS (Steel Square Tube)': { en: 'Steel Square Tube (SHS)', ur: 'اسٹیل اسکوائر ٹیوب' },
  'قطاعات دائرية CHS 300mm': { en: 'Circular Hollow Section CHS 300mm', ur: 'سی ایچ ایس 300mm' },
  'قطاعات مستطيلة RHS': { en: 'Rectangular Hollow Section (RHS)', ur: 'آر ایچ ایس سیکشن' },
  'زوايا وقطاعات حديد': { en: 'Steel Angles & Sections', ur: 'اسٹیل اینگل اور سیکشن' },
  'تمهيد وتسوية أرض': { en: 'Site Grading & Leveling', ur: 'گریڈنگ اور لیولنگ' },
  'حصى مرشحة Sub-base': { en: 'Sub-base Aggregate', ur: 'سب بیس ایگریگیٹ' },
  'طبقة أسفلتية': { en: 'Asphalt Layer', ur: 'اسفالٹ پرت' },
  'رصف بلاط خارجي': { en: 'Exterior Tile Paving', ur: 'باہری ٹائل پیومنٹ' },
  'رصف حجر طبيعي': { en: 'Natural Stone Paving', ur: 'قدرتی پتھر پیومنٹ' },
  'تشجير وزراعة': { en: 'Landscaping & Planting', ur: 'لینڈ اسکیپنگ اور پودے' },
  'تربة زراعية Topsoil': { en: 'Topsoil', ur: 'ٹاپ سوائل' },
  'نظام ري شبكة خارجية': { en: 'External Irrigation System', ur: 'آبپاشی سسٹم' },
  'مضخة ري': { en: 'Irrigation Pump', ur: 'آبپاشی پمپ' },
  // ── المعماري (architectural) + بلوك ──
  'بلوك': { en: 'Block', ur: 'بلاک' },
  'غراء وترويبة بلاط': { en: 'Tile Adhesive & Grout', ur: 'ٹائل ایڈہیسو اور گراؤٹ' },
  'حديد أسقف مستعارة': { en: 'False Ceiling Framing', ur: 'فالس سیلنگ فریم' },
  'خلطة لياسة جاهزة': { en: 'Ready-Mix Plaster', ur: 'تیار پلاسٹر' },
  'إكسسوارات لياسة': { en: 'Plastering Accessories', ur: 'پلاسٹرنگ لوازم' },
  'بلاط بورسلين حجري': { en: 'Stone-Look Porcelain Tile', ur: 'پتھر پورسلین ٹائل' },
  'بلاط بورسلين رمادي': { en: 'Grey Porcelain Tile', ur: 'گرے پورسلین ٹائل' },
  'بلاط بورسلين رخامي': { en: 'Marble-Look Porcelain Tile', ur: 'ماربل پورسلین ٹائل' },
  'بلاط بورسلين خشبي': { en: 'Wood-Look Porcelain Tile', ur: 'ووڈ پورسلین ٹائل' },
  'بلاط بورسلين خرساني': { en: 'Concrete-Look Porcelain Tile', ur: 'کنکریٹ پورسلین ٹائل' },
  'بلاط رخام طبيعي': { en: 'Natural Marble Tile', ur: 'قدرتی ماربل ٹائل' },
  'أرضية راتنج إيبوكسي مع قرنيص': { en: 'Epoxy Resin Floor with Skirting', ur: 'ایپوکسی فرش مع اسکرٹنگ' },
  'سجاد Carpet Tile': { en: 'Carpet Tile', ur: 'کارپٹ ٹائل' },
  'سجاد رول لاصق': { en: 'Adhesive Roll Carpet', ur: 'رول کارپٹ' },
  'مطاط Entrance Matting': { en: 'Entrance Matting', ur: 'اینٹرینس میٹنگ' },
  'جبس بورد حوائط': { en: 'Wall Gypsum Board', ur: 'دیوار جپسم بورڈ' },
  'جبس بورد مقاوم رطوبة MR': { en: 'Moisture-Resistant Gypsum Board (MR)', ur: 'نمی مزاحم جپسم بورڈ' },
  'جبس بورد مقاوم حريق FR': { en: 'Fire-Resistant Gypsum Board (FR)', ur: 'آگ مزاحم جپسم بورڈ' },
  'جبس بورد مزدوج': { en: 'Double-Layer Gypsum Board', ur: 'ڈبل جپسم بورڈ' },
  'بلاط سيراميك جدار': { en: 'Ceramic Wall Tile', ur: 'سیرامک وال ٹائل' },
  'بلاط بورسلين جدار': { en: 'Porcelain Wall Tile', ur: 'پورسلین وال ٹائل' },
  'لواح خشب صوتية Acoustic': { en: 'Acoustic Wood Panels', ur: 'صوتی ووڈ پینل' },
  'لواح GRC خارجية': { en: 'External GRC Panels', ur: 'جی آر سی پینل' },
  'كلادينج ألمنيوم كومبوزيت ACM': { en: 'Aluminium Composite Cladding (ACM)', ur: 'اے سی ایم کلیڈنگ' },
  'بلاطات أسقف صوتية 600×600': { en: 'Acoustic Ceiling Tiles 600×600', ur: 'صوتی سیلنگ ٹائل 600×600' },
  'أسقف صوتية مبطنة': { en: 'Lined Acoustic Ceiling', ur: 'صوتی سیلنگ' },
  'أسقف مكشوفة مطلية': { en: 'Painted Exposed Ceiling', ur: 'پینٹڈ ایکسپوزڈ سیلنگ' },
  'عازل XPS للأسطح': { en: 'XPS Roof Insulation', ur: 'ایکس پی ایس چھت انسولیشن' },
  'صوف صخري Rock Wool': { en: 'Rock Wool', ur: 'راک وول' },
  'عازل رطوبة للأسطح والجدران': { en: 'Roof & Wall Waterproofing', ur: 'چھت اور دیوار واٹر پروفنگ' },
  'مواد عازلة صوتية Acoustic': { en: 'Acoustic Insulation Materials', ur: 'صوتی انسولیشن میٹریل' },
  'عازل حراري مجاري هواء': { en: 'Air Duct Thermal Insulation', ur: 'ڈکٹ تھرمل انسولیشن' },
  'أبواب خشب مع إطار معدني': { en: 'Wooden Doors with Steel Frame', ur: 'لکڑی دروازہ دھاتی فریم' },
  'أبواب حديد مقاومة حريق 45 دقيقة': { en: 'Fire-Rated Steel Doors 45min', ur: 'فائر اسٹیل دروازہ 45 منٹ' },
  'أبواب حديد مقاومة حريق 90 دقيقة': { en: 'Fire-Rated Steel Doors 90min', ur: 'فائر اسٹیل دروازہ 90 منٹ' },
  'أبواب ستانلس': { en: 'Stainless Steel Doors', ur: 'اسٹینلیس دروازہ' },
  'باب دوار Rolling Shutter': { en: 'Rolling Shutter Door', ur: 'رولنگ شٹر' },
  'نوافذ ألمنيوم زجاج مزدوج': { en: 'Double-Glazed Aluminium Windows', ur: 'ڈبل گلیزڈ ایلومینیم کھڑکی' },
  'زجاج سيكوريت Tempered': { en: 'Tempered Glass', ur: 'ٹیمپرڈ گلاس' },
  'واجهات زجاجية Curtain Wall': { en: 'Curtain Wall Glazing', ur: 'کرٹین وال' },
  'واجهات حجر': { en: 'Stone Cladding Facade', ur: 'پتھر کلیڈنگ' },
  'درابزين زجاجي بحواجز': { en: 'Glass Balustrade', ur: 'گلاس بیلسٹریڈ' },
  'أرفف خشبية': { en: 'Wooden Shelves', ur: 'لکڑی شیلف' },
  'لوحات إرشادية Signage': { en: 'Signage', ur: 'سائننج' },
  'كاونتر استقبال خشبي': { en: 'Wooden Reception Counter', ur: 'ریسپشن کاؤنٹر' },
  'خزائن حائط ثابتة': { en: 'Fixed Wall Cabinets', ur: 'دیواری الماری' },
  'أثاث ثابت خشبي Built-in': { en: 'Built-in Wooden Furniture', ur: 'بلٹ ان فرنیچر' },
  'ألواح MDF وخشب مضغوط (Wood Boards)': { en: 'MDF / Chipboard / OSB Boards', ur: 'ایم ڈی ایف بورڈ' },
  'قواطع حمامات HPL': { en: 'HPL Toilet Partitions', ur: 'ایچ پی ایل پارٹیشن' },
  'كبائن دورات مياه Toilet Cubicles': { en: 'Toilet Cubicles', ur: 'ٹوائلٹ کیوبیکل' },
  'أرضية راتنج إيبوكسي High Build': { en: 'High-Build Epoxy Floor', ur: 'ہائی بلڈ ایپوکسی فرش' },
  'أرضية تيرازو Terrazzo': { en: 'Terrazzo Flooring', ur: 'ٹیرازو فرش' },
  'أرضية مطاطية Rubber Flooring': { en: 'Rubber Flooring', ur: 'ربڑ فرش' },
  'أرضية مطاطية رياضية Sports Floor': { en: 'Sports Rubber Flooring', ur: 'اسپورٹس ربڑ فرش' },
  'أرضية أكسس فلور Raised Access Floor': { en: 'Raised Access Floor', ur: 'ریزڈ ایکسس فلور' },
  'فرشة مسطحة Screed Heavy Duty': { en: 'Heavy-Duty Screed', ur: 'ہیوی ڈیوٹی اسکریڈ' },
  'فرشة مسطحة Self-Levelling': { en: 'Self-Levelling Screed', ur: 'سیلف لیولنگ اسکریڈ' },
  'فينيل ورقي Vinyl Sheet': { en: 'Vinyl Sheet Flooring', ur: 'ونائل شیٹ فرش' },
  'فينيل مضاد للانزلاق': { en: 'Anti-Slip Vinyl', ur: 'اینٹی سلپ ونائل' },
  'قرنيوص فينيل Vinyl Skirting': { en: 'Vinyl Skirting', ur: 'ونائل اسکرٹنگ' },
  'لواح خشبية صوتية Acoustic Timber': { en: 'Acoustic Timber Panels', ur: 'صوتی ٹمبر پینل' },
  'لواح صوتية PET Panels': { en: 'Acoustic PET Panels', ur: 'پی ای ٹی پینل' },
  'عازل مائي سيماني Cementitious Render': { en: 'Cementitious Waterproof Render', ur: 'سیمنٹیشس واٹر پروف رینڈر' },
  'أسقف صوتية Acoustic Baffle': { en: 'Acoustic Baffle Ceiling', ur: 'صوتی بیفل سیلنگ' },
  'أسقف جبس مطلي Acoustic Plaster': { en: 'Acoustic Plaster Ceiling', ur: 'صوتی پلاسٹر سیلنگ' },
  'سلالم كهربائية Escalator': { en: 'Escalator', ur: 'ایسکلیٹر' },
  'مصاعد Elevator/Lift': { en: 'Elevator / Lift', ur: 'لفٹ' },
  // ── الكهرباء (electrical) ──
  'مواسير كهرباء EMT/PVC': { en: 'Electrical Conduit EMT/PVC', ur: 'بجلی پائپ EMT/PVC' },
  'كابل 1Cx6mm² CU/LSZH': { en: '1Cx6mm² CU/LSZH Cable', ur: 'کیبل 1Cx6mm² CU/LSZH' },
  'كابل 1Cx10mm² CU/LSZH': { en: '1Cx10mm² CU/LSZH Cable', ur: 'کیبل 1Cx10mm² CU/LSZH' },
  'كابل 1Cx16mm² CU/LSZH': { en: '1Cx16mm² CU/LSZH Cable', ur: 'کیبل 1Cx16mm² CU/LSZH' },
  'كابل 1Cx25mm² CU/LSZH': { en: '1Cx25mm² CU/LSZH Cable', ur: 'کیبل 1Cx25mm² CU/LSZH' },
  'كابل 1Cx35mm² CU/LSZH': { en: '1Cx35mm² CU/LSZH Cable', ur: 'کیبل 1Cx35mm² CU/LSZH' },
  'كابل 1Cx50mm² CU/LSZH': { en: '1Cx50mm² CU/LSZH Cable', ur: 'کیبل 1Cx50mm² CU/LSZH' },
  'كابل 1Cx70mm² CU/LSZH': { en: '1Cx70mm² CU/LSZH Cable', ur: 'کیبل 1Cx70mm² CU/LSZH' },
  'كابل 1Cx95mm² CU/LSZH': { en: '1Cx95mm² CU/LSZH Cable', ur: 'کیبل 1Cx95mm² CU/LSZH' },
  'كابل 1Cx120mm² CU/LSZH': { en: '1Cx120mm² CU/LSZH Cable', ur: 'کیبل 1Cx120mm² CU/LSZH' },
  'كابل 1Cx150mm² CU/LSZH': { en: '1Cx150mm² CU/LSZH Cable', ur: 'کیبل 1Cx150mm² CU/LSZH' },
  'كابل 1Cx185mm² CU/LSZH': { en: '1Cx185mm² CU/LSZH Cable', ur: 'کیبل 1Cx185mm² CU/LSZH' },
  'كابل 1Cx240mm² CU/LSZH': { en: '1Cx240mm² CU/LSZH Cable', ur: 'کیبل 1Cx240mm² CU/LSZH' },
  'كابل 3Cx6mm² CU/XLPE/SWA/LSZH': { en: '3Cx6mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 3Cx6mm² CU/XLPE/SWA/LSZH' },
  'كابل 3Cx10mm² CU/XLPE/SWA/LSZH': { en: '3Cx10mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 3Cx10mm² CU/XLPE/SWA/LSZH' },
  'كابل 3Cx16mm² CU/XLPE/SWA/LSZH': { en: '3Cx16mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 3Cx16mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx10mm² CU/XLPE/SWA/LSZH': { en: '4Cx10mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx10mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx16mm² CU/XLPE/SWA/LSZH': { en: '4Cx16mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx16mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx25mm² CU/XLPE/SWA/LSZH': { en: '4Cx25mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx25mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx35mm² CU/XLPE/SWA/LSZH': { en: '4Cx35mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx35mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx50mm² CU/XLPE/SWA/LSZH': { en: '4Cx50mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx50mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx70mm² CU/XLPE/SWA/LSZH': { en: '4Cx70mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx70mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx95mm² CU/XLPE/SWA/LSZH': { en: '4Cx95mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx95mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx120mm² CU/XLPE/SWA/LSZH': { en: '4Cx120mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx120mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx185mm² CU/XLPE/SWA/LSZH': { en: '4Cx185mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx185mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx240mm² CU/XLPE/SWA/LSZH': { en: '4Cx240mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx240mm² CU/XLPE/SWA/LSZH' },
  'كابل 4Cx300mm² CU/XLPE/SWA/LSZH': { en: '4Cx300mm² CU/XLPE/SWA/LSZH Cable', ur: 'کیبل 4Cx300mm² CU/XLPE/SWA/LSZH' },
  'كابل MICA مقاوم للحريق 2Cx6mm²': { en: 'MICA Fire-Resistant Cable 2Cx6mm²', ur: 'مائیکا فائر کیبل 2Cx6mm²' },
  'كابل MICA مقاوم للحريق 2Cx16mm²': { en: 'MICA Fire-Resistant Cable 2Cx16mm²', ur: 'مائیکا فائر کیبل 2Cx16mm²' },
  'كابل إنذار حريق MICA': { en: 'MICA Fire Alarm Cable', ur: 'فائر الارم کیبل مائیکا' },
  'كابل ألياف بصرية': { en: 'Fiber Optic Cable', ur: 'فائبر آپٹک کیبل' },
  'Bus Bar 1000A 4P': { en: 'Busbar 1000A 4P', ur: 'بس بار 1000A 4P' },
  'Bus Bar 1600A 4P': { en: 'Busbar 1600A 4P', ur: 'بس بار 1600A 4P' },
  'Bus Bar 2500A 4P': { en: 'Busbar 2500A 4P', ur: 'بس بار 2500A 4P' },
  'لوحة رئيسية MDB': { en: 'Main Distribution Board (MDB)', ur: 'مین ڈسٹری بیوشن بورڈ' },
  'لوحة فرعية SMDB': { en: 'Sub Main Distribution Board (SMDB)', ur: 'سب مین بورڈ' },
  'لوحة إضاءة LDB': { en: 'Lighting Distribution Board (LDB)', ur: 'لائٹنگ ڈسٹری بیوشن بورڈ' },
  'لوحة طاقة PP': { en: 'Power Panel (PP)', ur: 'پاور پینل' },
  'لوحة تحكم محركات MCC': { en: 'Motor Control Center (MCC)', ur: 'موٹر کنٹرول سینٹر' },
  'لوحة ATS نقل تلقائي': { en: 'Automatic Transfer Switch Panel (ATS)', ur: 'اے ٹی ایس پینل' },
  'لوحة متوسط جهد MV Switchgear': { en: 'MV Switchgear Panel', ur: 'ایم وی سوئچ گیئر' },
  'قاطع MCB 1P': { en: 'MCB Breaker 1P', ur: 'ایم سی بی بریکر 1P' },
  'قاطع MCB 3P': { en: 'MCB Breaker 3P', ur: 'ایم سی بی بریکر 3P' },
  'كشاف LED بانل 600×600': { en: 'LED Panel Light 600×600', ur: 'ایل ای ڈی پینل 600×600' },
  'كشاف LED بانل 300×1200': { en: 'LED Panel Light 300×1200', ur: 'ایل ای ڈی پینل 300×1200' },
  'كشاف LED Downlight': { en: 'LED Downlight', ur: 'ایل ای ڈی ڈاؤن لائٹ' },
  'كشاف LED سطحي': { en: 'LED Surface Light', ur: 'سرفیس ایل ای ڈی' },
  'كشاف LED متدلي': { en: 'LED Pendant Light', ur: 'پینڈنٹ ایل ای ڈی' },
  'كشاف LED فلود خارجي': { en: 'LED Flood Light', ur: 'فلڈ لائٹ' },
  'كشاف LED صناعي High Bay': { en: 'LED High Bay Light', ur: 'ہائی بے لائٹ' },
  'إضاءة طوارئ Emergency': { en: 'Emergency Light', ur: 'ایمرجنسی لائٹ' },
  'إضاءة مخرج طوارئ Exit Sign': { en: 'Exit Sign Light', ur: 'ایگزٹ سائن' },
  'نظام تحكم إضاءة DALI': { en: 'DALI Lighting Control System', ur: 'ڈالی لائٹنگ کنٹرول سسٹم' },
  'محول كهربائي HV/LV': { en: 'HV/LV Transformer', ur: 'ٹرانسفارمر HV/LV' },
  'محول كهربائي 11kV/400V': { en: '11kV/400V Transformer', ur: 'ٹرانسفارمر 11kV/400V' },
  'UPS بلا انقطاع': { en: 'UPS (Uninterruptible Power Supply)', ur: 'یو پی ایس' },
  'محطة توليد طارئة Generator Hookup Panel': { en: 'Generator Hook-up Panel', ur: 'جنریٹر ہک اپ پینل' },
  'سكة كابل Ladder 100×75': { en: 'Cable Ladder 100×75', ur: 'کیبل لیڈر 100×75' },
  'سكة كابل Ladder 150×75': { en: 'Cable Ladder 150×75', ur: 'کیبل لیڈر 150×75' },
  'سكة كابل Ladder 200×75': { en: 'Cable Ladder 200×75', ur: 'کیبل لیڈر 200×75' },
  'سكة كابل Ladder 300×75': { en: 'Cable Ladder 300×75', ur: 'کیبل لیڈر 300×75' },
  'صينية كابل Tray 100×100': { en: 'Cable Tray 100×100', ur: 'کیبل ٹرے 100×100' },
  'صينية كابل Tray 300×75': { en: 'Cable Tray 300×75', ur: 'کیبل ٹرے 300×75' },
  'صينية كابل Tray 600×100': { en: 'Cable Tray 600×100', ur: 'کیبل ٹرے 600×100' },
  'علب توزيع Junction Box': { en: 'Junction Box', ur: 'جنکشن باکس' },
  'مفاتيح وبرازيز Switches & Sockets 13A': { en: 'Switches & Sockets 13A', ur: 'سوئچ اور ساکٹ 13A' },
  'مقبس طابق Floor Box': { en: 'Floor Box', ur: 'فلور باکس' },
  'أقطاب تأريض Earth Rod': { en: 'Earth Rod', ur: 'ارتھ راڈ' },
  'حماية برق Lightning Protection': { en: 'Lightning Protection', ur: 'لائٹننگ پروٹیکشن' },
  'نظام إنذار حريق FA': { en: 'Fire Alarm System (FA)', ur: 'فائر الارم سسٹم' },
  'نظام مراقبة CCTV': { en: 'CCTV Surveillance System', ur: 'سی سی ٹی وی سسٹم' },
  'نظام تحكم دخول ACS': { en: 'Access Control System (ACS)', ur: 'ایکسس کنٹرول سسٹم' },
  'نظام بيانات Data Network CAT6': { en: 'CAT6 Data Network', ur: 'ڈیٹا نیٹ ورک CAT6' },
  'نظام صوت وإعلام PA System': { en: 'PA / Public Address System', ur: 'پی اے سسٹم' },
  'نظام BMS تحكم مبنى': { en: 'Building Management System (BMS)', ur: 'بلڈنگ مینجمنٹ سسٹم' },
  'كاميرا CCTV': { en: 'CCTV Camera', ur: 'سی سی ٹی وی کیمرہ' },
  'نقطة بيانات Data Outlet': { en: 'Data Outlet', ur: 'ڈیٹا آؤٹ لیٹ' },
  'نظام WiFi Wireless Access Point': { en: 'WiFi Wireless Access Point', ur: 'وائی فائی ایکسس پوائنٹ' },
  'شاشة إعلانية LED Display': { en: 'LED Display Screen', ur: 'ایل ای ڈی ڈسپلے' },
  'نظام DALI تحكم إضاءة': { en: 'DALI Lighting Control', ur: 'ڈالی کنٹرول' },
  'حساس حركة PIR': { en: 'PIR Motion Sensor', ur: 'پی آئی آر موشن سینسر' },
  'تحكم إضاءة واجهات': { en: 'Facade Lighting Control', ur: 'فیساد لائٹنگ کنٹرول' },
  'محطة تحويل HV Substation': { en: 'HV Substation', ur: 'ایچ وی سب اسٹیشن' },
  'لوحة محطة 11kV Switchgear': { en: '11kV Switchgear Panel', ur: '11kV سوئچ گیئر' },
  'مولد طارئ 400V Hook-up Panel': { en: '400V Generator Hook-up Panel', ur: '400V ہک اپ پینل' },
  'ATS نقل تلقائي 1000A': { en: 'ATS 1000A', ur: 'اے ٹی ایس 1000A' },
  'ATS نقل تلقائي 500A': { en: 'ATS 500A', ur: 'اے ٹی ایس 500A' },
  'مرشح هارمونيك Active Harmonic Filter': { en: 'Active Harmonic Filter', ur: 'ایکٹو ہارمونک فلٹر' },
  'كشاف ملعب Sports Light S1': { en: 'Sports Floodlight S1', ur: 'اسپورٹس لائٹ S1' },
  'كشاف ملعب Sports Light S2': { en: 'Sports Floodlight S2', ur: 'اسپورٹس لائٹ S2' },
  'شاشة LED إعلانية LED Screen 55"': { en: 'LED Advertising Screen 55"', ur: 'ایل ای ڈی اسکرین 55"' },
  'بوابة تحكم دخول Speed Gate Turnstile': { en: 'Speed Gate Turnstile', ur: 'اسپیڈ گیٹ' },
  'حاجز وقوف سيارات Barrier': { en: 'Parking Barrier', ur: 'پارکنگ بیریئر' },
  'كاميرا PTZ متحركة': { en: 'PTZ Camera', ur: 'پی ٹی زیڈ کیمرہ' },
  // ── الميكانيك (mechanical) ──
  'أنابيب نحاس مياه باردة': { en: 'Copper Pipe – Cold Water', ur: 'تانبے کا پائپ ٹھنڈا پانی' },
  'أنابيب نحاس مياه حارة': { en: 'Copper Pipe – Hot Water', ur: 'تانبے کا پائپ گرم پانی' },
  'أنابيب CPVC مياه حارة': { en: 'CPVC Hot Water Pipe', ur: 'سی پی وی سی گرم پانی پائپ' },
  'أنابيب HDPE PN16 مياه شرب': { en: 'HDPE PN16 Potable Water Pipe', ur: 'ایچ ڈی پی ای PN16 پائپ' },
  'أنابيب HDPE PN10 مياه شرب': { en: 'HDPE PN10 Potable Water Pipe', ur: 'ایچ ڈی پی ای PN10 پائپ' },
  'أنابيب فولاذية مياه مبردة Schedule 40': { en: 'Steel Chilled Water Pipe Sch40', ur: 'اسٹیل چلڈ واٹر پائپ Sch40' },
  'أنابيب مياه مبردة Chilled Water': { en: 'Chilled Water Pipe', ur: 'چلڈ واٹر پائپ' },
  'أنابيب حديد مجلفن GI': { en: 'Galvanized Iron (GI) Pipe', ur: 'جی آئی پائپ' },
  'أنابيب معزولة مسبقاً Pre-Insulated (تبريد منطقي)': { en: 'Pre-Insulated Pipe (District Cooling)', ur: 'پری انسولیٹڈ پائپ' },
  'أنابيب GRP فايبرجلاس': { en: 'GRP Fiberglass Pipe', ur: 'جی آر پی پائپ' },
  'أنابيب uPVC صرف صحي داخلي': { en: 'uPVC Internal Drainage Pipe', ur: 'یو پی وی سی ڈرینج پائپ' },
  'أنابيب uPVC صرف صحي': { en: 'uPVC Sanitary Drainage Pipe', ur: 'یو پی وی سی ڈرینج پائپ' },
  'أنابيب PPR تغذية': { en: 'PPR Water Supply Pipe', ur: 'پی پی آر پائپ' },
  'أنابيب فولاذية لمكافحة الحريق Sprinkler': { en: 'Steel Sprinkler / Fire-Fighting Pipe', ur: 'فائر اسپرنکلر پائپ' },
  'أنابيب مياه مبردة فولاذية Sch40': { en: 'Steel Chilled Water Pipe Sch40', ur: 'چلڈ واٹر پائپ Sch40' },
  'أنابيب uPVC صرف صحي 50mm': { en: 'uPVC Drainage Pipe 50mm', ur: 'یو پی وی سی ڈرینج 50mm' },
  'أنابيب uPVC صرف صحي 75mm': { en: 'uPVC Drainage Pipe 75mm', ur: 'یو پی وی سی ڈرینج 75mm' },
  'أنابيب uPVC صرف صحي 100mm': { en: 'uPVC Drainage Pipe 100mm', ur: 'یو پی وی سی ڈرینج 100mm' },
  'أنابيب uPVC صرف صحي 150mm': { en: 'uPVC Drainage Pipe 150mm', ur: 'یو پی وی سی ڈرینج 150mm' },
  'أنابيب uPVC صرف صحي 200mm': { en: 'uPVC Drainage Pipe 200mm', ur: 'یو پی وی سی ڈرینج 200mm' },
  'أنابيب HDPE صرف صحي داخلي': { en: 'HDPE Internal Drainage Pipe', ur: 'ایچ ڈی پی ای ڈرینج پائپ' },
  'أنابيب حديد زهر Cast Iron صرف صامت': { en: 'Cast Iron Silent Drainage Pipe', ur: 'کاسٹ آئرن ڈرینج پائپ' },
  'أنابيب فولاذية sprinkler 25mm': { en: 'Steel Sprinkler Pipe 25mm', ur: 'اسپرنکلر پائپ 25mm' },
  'أنابيب فولاذية sprinkler 32mm': { en: 'Steel Sprinkler Pipe 32mm', ur: 'اسپرنکلر پائپ 32mm' },
  'أنابيب فولاذية sprinkler 40mm': { en: 'Steel Sprinkler Pipe 40mm', ur: 'اسپرنکلر پائپ 40mm' },
  'أنابيب فولاذية sprinkler 50mm': { en: 'Steel Sprinkler Pipe 50mm', ur: 'اسپرنکلر پائپ 50mm' },
  'أنابيب فولاذية sprinkler 65mm': { en: 'Steel Sprinkler Pipe 65mm', ur: 'اسپرنکلر پائپ 65mm' },
  'أنابيب فولاذية sprinkler 80mm': { en: 'Steel Sprinkler Pipe 80mm', ur: 'اسپرنکلر پائپ 80mm' },
  'أنابيب فولاذية sprinkler 100mm': { en: 'Steel Sprinkler Pipe 100mm', ur: 'اسپرنکلر پائپ 100mm' },
  'أنابيب فولاذية sprinkler 150mm': { en: 'Steel Sprinkler Pipe 150mm', ur: 'اسپرنکلر پائپ 150mm' },
  'أنابيب فولاذية sprinkler 200mm': { en: 'Steel Sprinkler Pipe 200mm', ur: 'اسپرنکلر پائپ 200mm' },
  'صمامات كرة نحاس': { en: 'Brass Ball Valve', ur: 'براس بال والو' },
  'صمامات فراشة flanged': { en: 'Flanged Butterfly Valve', ur: 'بٹرفلائی والو' },
  'صمامات تخفيض ضغط PRV': { en: 'Pressure Reducing Valve (PRV)', ur: 'پریشر ریڈیوسنگ والو' },
  'صمامات PICV تحكم ضغط': { en: 'PICV Pressure-Independent Valve', ur: 'پی آئی سی وی والو' },
  'صمامات موتورية 2-Port': { en: 'Motorized Valve 2-Port', ur: 'موٹرائزڈ والو 2-Port' },
  'صمامات موتورية 3-Port': { en: 'Motorized Valve 3-Port', ur: 'موٹرائزڈ والو 3-Port' },
  'مضخة ضغط Booster Pump': { en: 'Booster Pump', ur: 'بوسٹر پمپ' },
  'مضخة إطفاء حريق Fire Pump': { en: 'Fire Pump', ur: 'فائر پمپ' },
  'مضخة jockey حريق': { en: 'Jockey Pump', ur: 'جوکی پمپ' },
  'مضخة sump صرف': { en: 'Sump Pump', ur: 'سمپ پمپ' },
  'مضخة تداول مياه ساخنة': { en: 'Hot Water Circulation Pump', ur: 'سرکولیشن پمپ' },
  'مضخة مياه ري': { en: 'Irrigation Pump', ur: 'آبپاشی پمپ' },
  'مضخة تغذية كيماوي Dosing': { en: 'Chemical Dosing Pump', ur: 'ڈوزنگ پمپ' },
  'وحدة مناولة هواء AHU مع عجلة حرارية': { en: 'Air Handling Unit (AHU) with Heat Wheel', ur: 'اے ایچ یو' },
  'وحدة FCU كاسيت': { en: 'Cassette FCU', ur: 'ایف سی یو کیسٹ' },
  'وحدات مكيف VRF خارجية': { en: 'VRF Outdoor Unit', ur: 'وی آر ایف آؤٹ ڈور' },
  'وحدات مكيف VRF داخلية': { en: 'VRF Indoor Unit', ur: 'وی آر ایف اِن ڈور' },
  'مجمد حرارة Heat Exchanger': { en: 'Heat Exchanger', ur: 'ہیٹ ایکسچینجر' },
  'مكثف هواء Condenser': { en: 'Air Condenser', ur: 'کنڈینسر' },
  'مراوح هواء محورية Axial Fan': { en: 'Axial Fan', ur: 'ایکسیل فین' },
  'مراوح استخلاص هواء WC': { en: 'WC Exhaust Fan', ur: 'ایگزاسٹ فین' },
  'مجاري هواء جلفنايز 0.7mm': { en: 'Galvanized Air Duct 0.7mm', ur: 'جلوانائزڈ ڈکٹ 0.7mm' },
  'مجاري هواء جلفنايز 0.8mm': { en: 'Galvanized Air Duct 0.8mm', ur: 'جلوانائزڈ ڈکٹ 0.8mm' },
  'مجاري هواء جلفنايز 1.0mm': { en: 'Galvanized Air Duct 1.0mm', ur: 'جلوانائزڈ ڈکٹ 1.0mm' },
  'مجاري هواء جلفنايز 1.2mm': { en: 'Galvanized Air Duct 1.2mm', ur: 'جلوانائزڈ ڈکٹ 1.2mm' },
  'عوازل مجاري هواء فايبر جلاس': { en: 'Fiberglass Duct Insulation', ur: 'ڈکٹ انسولیشن' },
  'فتحات هواء': { en: 'Air Grilles & Diffusers', ur: 'ایئر گرل' },
  'موازنات هواء Balancing Damper': { en: 'Balancing Damper', ur: 'بیلنسنگ ڈیمپر' },
  'موازنات حريق Fire Damper': { en: 'Fire Damper', ur: 'فائر ڈیمپر' },
  'خزان ضغط Expansion Vessel': { en: 'Expansion Vessel', ur: 'ایکسپینشن ویسل' },
  'معالجة مياه كيماوي': { en: 'Water Treatment Chemicals', ur: 'واٹر ٹریٹمنٹ کیمیکل' },
  'رؤوس رش مياه Sprinkler': { en: 'Sprinkler Heads', ur: 'اسپرنکلر ہیڈ' },
  'صمام تحكم منطقة Zone Control Valve': { en: 'Zone Control Valve', ur: 'زون کنٹرول والو' },
  'خزانات إطفاء حريق': { en: 'Fire Water Tank', ur: 'فائر واٹر ٹینک' },
  'بكرة خرطوم حريق Hose Reel': { en: 'Fire Hose Reel', ur: 'ہوز ریل' },
  'هيدرنت حريق Fire Hydrant': { en: 'Fire Hydrant', ur: 'فائر ہائیڈرنٹ' },
  'لوحة تحكم حريق': { en: 'Fire Control Panel', ur: 'فائر کنٹرول پینل' },
  'عوازل اهتزاز Flex': { en: 'Vibration Isolator (Flex)', ur: 'وائبریشن آئسولیٹر' },
  'مواسير تمدد Expansion Joint': { en: 'Expansion Joint', ur: 'ایکسپینشن جوائنٹ' },
  'مرحاض WC مع خزان': { en: 'WC with Cistern', ur: 'ڈبلیو سی سسٹرن' },
  'مرحاض WC ذوي احتياجات خاصة': { en: 'Accessible WC', ur: 'ایکسیسبل ڈبلیو سی' },
  'مغسلة Wash Basin': { en: 'Wash Basin', ur: 'واش بیسن' },
  'حوض مطبخ': { en: 'Kitchen Basin', ur: 'کچن بیسن' },
  'مجلى Kitchen Sink': { en: 'Kitchen Sink', ur: 'کچن سنک' },
  'حوض استحمام': { en: 'Bathtub', ur: 'باتھ ٹب' },
  'دش Shower': { en: 'Shower', ur: 'شاور' },
  'مبولة Urinal': { en: 'Urinal', ur: 'یورینل' },
  'صنبور مياه': { en: 'Water Tap', ur: 'پانی کا نل' },
  'خلاط مياه Mixer': { en: 'Water Mixer', ur: 'واٹر مکسر' },
  'مصرف أرضي Floor Drain 100x100': { en: 'Floor Drain 100x100', ur: 'فلور ڈرین 100x100' },
  'مصرف سقف Roof Drain 100mm': { en: 'Roof Drain 100mm', ur: 'روف ڈرین 100mm' },
  'خلاط مغسلة': { en: 'Basin Mixer', ur: 'بیسن مکسر' },
  'خلاط مطبخ': { en: 'Kitchen Mixer', ur: 'کچن مکسر' },
  'خلاط دش': { en: 'Shower Mixer', ur: 'شاور مکسر' },
  'صنبور حديقة': { en: 'Garden Tap', ur: 'گارڈن نل' },
  'محبس زاوية': { en: 'Angle Valve', ur: 'اینگل والو' },
  'محبس عمومي': { en: 'Gate Valve', ur: 'گیٹ والو' },
  'وصلة كوع PVC': { en: 'PVC Elbow', ur: 'پی وی سی ایلبو' },
  'وصلة تي PVC': { en: 'PVC Tee', ur: 'پی وی سی ٹی' },
  'كوبلن نحاس': { en: 'Brass Coupling', ur: 'براس کپلنگ' },
  'لوازم نحاسية': { en: 'Brass Fittings', ur: 'براس فٹنگ' },
  'سيفون كرسي': { en: 'WC Siphon', ur: 'ڈبلیو سی سائفن' },
  'سيفون مغسلة': { en: 'Basin Siphon', ur: 'بیسن سائفن' },
  'مصفاة أرضية': { en: 'Floor Strainer', ur: 'فلور اسٹرینر' },
  'خرطوم سخان مرن': { en: 'Flexible Heater Hose', ur: 'ہیٹر ہوز' },
  'خرطوم شطاف': { en: 'Bidet Spray Hose', ur: 'شطاف ہوز' },
  'وصلة مرنة': { en: 'Flexible Connector', ur: 'فلیکسیبل کنیکٹر' },
  'شريط تفلون': { en: 'Teflon Tape', ur: 'ٹیفلون ٹیپ' },
  'معجون سباكة': { en: 'Plumbing Sealant', ur: 'پلمبنگ سیلنٹ' },
  'جلدة محبس': { en: 'Valve Washer', ur: 'والو واشر' },
  'حشوة عزل': { en: 'Sealing Gasket', ur: 'سیلنگ گیسکٹ' },
  'رأس دش': { en: 'Shower Head', ur: 'شاور ہیڈ' },
  'دش مطري': { en: 'Rain Shower', ur: 'رین شاور' },
  'عوامة خزان': { en: 'Tank Float Valve', ur: 'ٹینک فلوٹ والو' },
  'طفاية سيفون كرسي': { en: 'WC Flush Valve', ur: 'فلش والو' },
  'إكسسوار حمام (حامل مناديل)': { en: 'Bathroom Accessory (Towel Holder)', ur: 'باتھ روم لوازم' },
  'معلاق منشفة': { en: 'Towel Rail', ur: 'تولیہ ریل' },
  'فصال دهون Grease Interceptor': { en: 'Grease Interceptor', ur: 'گریس انٹرسیپٹر' },
  'حوض ترسيب مياه أمطار': { en: 'Stormwater Settling Tank', ur: 'اسٹارم واٹر ٹینک' },
  'أنابيب CPVC 65mm': { en: 'CPVC Pipe 65mm', ur: 'سی پی وی سی 65mm' },
  'أنابيب CPVC 80mm': { en: 'CPVC Pipe 80mm', ur: 'سی پی وی سی 80mm' },
  'أنابيب CPVC 100mm': { en: 'CPVC Pipe 100mm', ur: 'سی پی وی سی 100mm' },
  'أنابيب CPVC 110mm': { en: 'CPVC Pipe 110mm', ur: 'سی پی وی سی 110mm' },
  'أنابيب CPVC 150mm': { en: 'CPVC Pipe 150mm', ur: 'سی پی وی سی 150mm' },
  'عداد مياه 100mm': { en: 'Water Meter 100mm', ur: 'واٹر میٹر 100mm' },
  'خزان مياه GRP 20م³': { en: 'GRP Water Tank 20m³', ur: 'جی آر پی ٹینک 20m³' },
  'خزان مياه GRP 434م³': { en: 'GRP Water Tank 434m³', ur: 'جی آر پی ٹینک 434m³' },
  'وعاء تمدد Expansion Vessel': { en: 'Expansion Vessel', ur: 'ایکسپینشن ویسل' },
  'أنابيب مياه مبردة Sch40 DN65': { en: 'Chilled Water Pipe Sch40 DN65', ur: 'چلڈ واٹر Sch40 DN65' },
  'أنابيب مياه مبردة Sch40 DN80': { en: 'Chilled Water Pipe Sch40 DN80', ur: 'چلڈ واٹر Sch40 DN80' },
  'أنابيب مياه مبردة Sch40 DN100': { en: 'Chilled Water Pipe Sch40 DN100', ur: 'چلڈ واٹر Sch40 DN100' },
  'أنابيب مياه مبردة Sch40 DN125': { en: 'Chilled Water Pipe Sch40 DN125', ur: 'چلڈ واٹر Sch40 DN125' },
  'أنابيب مياه مبردة Sch40 DN150': { en: 'Chilled Water Pipe Sch40 DN150', ur: 'چلڈ واٹر Sch40 DN150' },
  'أنابيب مياه مبردة Sch40 DN200': { en: 'Chilled Water Pipe Sch40 DN200', ur: 'چلڈ واٹر Sch40 DN200' },
  'أنابيب مياه مبردة Sch40 DN250': { en: 'Chilled Water Pipe Sch40 DN250', ur: 'چلڈ واٹر Sch40 DN250' },
  'أنابيب مياه مبردة Sch40 DN300': { en: 'Chilled Water Pipe Sch40 DN300', ur: 'چلڈ واٹر Sch40 DN300' },
  'أنابيب مياه مبردة مدفونة Pre-insulated': { en: 'Buried Pre-Insulated Chilled Water Pipe', ur: 'پری انسولیٹڈ چلڈ واٹر' },
  'عازل أنابيب مياه مبردة Fibreglass 1/2"': { en: 'Fiberglass Chilled Water Insulation 1/2"', ur: 'فائبر گلاس انسولیشن 1/2"' },
  'عازل أنابيب مياه مبردة Fibreglass 1"': { en: 'Fiberglass Chilled Water Insulation 1"', ur: 'فائبر گلاس انسولیشن 1"' },
  'خزان وقود ديزل تحت أرضي': { en: 'Underground Diesel Tank', ur: 'انڈر گراؤنڈ ڈیزل ٹینک' },
  'خزان وقود ديزل يومي': { en: 'Diesel Day Tank', ur: 'ڈیزل ڈے ٹینک' },
  'مضخة نقل وقود': { en: 'Fuel Transfer Pump', ur: 'فیول ٹرانسفر پمپ' },
  'وحدة تصفية وقود': { en: 'Fuel Filtration Unit', ur: 'فیول فلٹریشن یونٹ' },
  'خطوط تغذية وقود': { en: 'Fuel Supply Lines', ur: 'فیول سپلائی لائن' },
  // ── المعدات (equipment) + المستلزمات (supply_store) ──
  'حفارة (بوكلين)': { en: 'Excavator', ur: 'کھدائی مشین' },
  'شيول لودر': { en: 'Wheel Loader', ur: 'وہیل لوڈر' },
  'بلدوزر': { en: 'Bulldozer', ur: 'بلڈوزر' },
  'جريدر': { en: 'Grader', ur: 'گریڈر' },
  'رافعة برجية': { en: 'Tower Crane', ur: 'ٹاور کرین' },
  'كرين متحرك': { en: 'Mobile Crane', ur: 'موبائل کرین' },
  'رافعة شوكية': { en: 'Forklift', ur: 'فورک لفٹ' },
  'ونش رفع': { en: 'Hoist', ur: 'ونچ' },
  'شاحنة قلاب': { en: 'Dump Truck', ur: 'ڈمپ ٹرک' },
  'صهريج مياه': { en: 'Water Tanker', ur: 'واٹر ٹینکر' },
  'مقطورة نقل': { en: 'Transport Trailer', ur: 'ٹریلر' },
  'لوري نقل': { en: 'Transport Lorry', ur: 'لاری' },
  'خلاطة خرسانة': { en: 'Concrete Mixer', ur: 'کنکریٹ مکسر' },
  'مضخة خرسانة': { en: 'Concrete Pump', ur: 'کنکریٹ پمپ' },
  'هزاز خرسانة': { en: 'Concrete Vibrator', ur: 'کنکریٹ وائبریٹر' },
  'محطة خلط': { en: 'Batching Plant', ur: 'بیچنگ پلانٹ' },
  'دكاكة (كومباكتور)': { en: 'Compactor', ur: 'کمپیکٹر' },
  'رصاصة دك': { en: 'Plate Compactor', ur: 'پلیٹ کمپیکٹر' },
  'هراس أسطواني': { en: 'Roller Compactor', ur: 'رولر کمپیکٹر' },
  'كمبروسر هواء': { en: 'Air Compressor', ur: 'ایئر کمپریسر' },
  'ضاغط هواء': { en: 'Air Compressor (Pneumatic)', ur: 'ایئر کمپریسر' },
  'طرمبة غطاسة': { en: 'Submersible Pump', ur: 'سب مرسیبل پمپ' },
  'مضخة نزح مياه': { en: 'Dewatering Pump', ur: 'ڈی واٹرنگ پمپ' },
  'سقالات معدنية': { en: 'Steel Scaffolding', ur: 'اسٹیل سکیفولڈنگ' },
  'منصة رفع مقصية': { en: 'Scissor Lift', ur: 'سیزر لفٹ' },
  'رافعة بوم': { en: 'Boom Lift', ur: 'بوم لفٹ' },
  'سلالم ألمنيوم': { en: 'Aluminium Ladder', ur: 'ایلومینیم سیڑھی' },
  'جاكات تدعيم': { en: 'Shoring Props', ur: 'شورنگ پراپ' },
  'كوع PVC': { en: 'PVC Elbow', ur: 'پی وی سی ایلبو' },
  'تي PVC': { en: 'PVC Tee', ur: 'پی وی سی ٹی' },
  'كوبلن': { en: 'Coupling', ur: 'کپلنگ' },
  'خرطوم سخان': { en: 'Heater Hose', ur: 'ہیٹر ہوز' },
  'طفاية سيفون': { en: 'Flush Valve', ur: 'فلش والو' },
  'سلك كهرباء 2.5مم': { en: 'Electrical Wire 2.5mm', ur: 'بجلی تار 2.5mm' },
  'سلك كهرباء 4مم': { en: 'Electrical Wire 4mm', ur: 'بجلی تار 4mm' },
  'كابل تمديد': { en: 'Extension Cable', ur: 'ایکسٹینشن کیبل' },
  'مفتاح إنارة': { en: 'Light Switch', ur: 'لائٹ سوئچ' },
  'بريزة': { en: 'Socket', ur: 'ساکٹ' },
  'علبة كهرباء': { en: 'Electrical Box', ur: 'الیکٹریکل باکس' },
  'قاطع MCB صغير': { en: 'Mini MCB Breaker', ur: 'منی ایم سی بی' },
  'لمبة LED': { en: 'LED Bulb', ur: 'ایل ای ڈی بلب' },
  'لمبة سبوت': { en: 'Spotlight', ur: 'اسپاٹ لائٹ' },
  'كشاف صغير': { en: 'Small Floodlight', ur: 'چھوٹا کشاف' },
  'فيش كهرباء': { en: 'Electrical Plug', ur: 'پلگ' },
  'محول صغير': { en: 'Small Adapter', ur: 'اڈاپٹر' },
  'شريط لحام كهرب': { en: 'Electrical Insulation Tape', ur: 'انسولیشن ٹیپ' },
  'مفك عادي': { en: 'Flat Screwdriver', ur: 'فلیٹ پیچ کس' },
  'مفك صليبة': { en: 'Phillips Screwdriver', ur: 'فلپس پیچ کس' },
  'طقم مفكات': { en: 'Screwdriver Set', ur: 'پیچ کس سیٹ' },
  'زرادية': { en: 'Pliers', ur: 'پلائر' },
  'كماشة': { en: 'Pincers', ur: 'پنسر' },
  'مفتاح ربط': { en: 'Wrench', ur: 'رنچ' },
  'مطرقة': { en: 'Hammer', ur: 'ہتھوڑا' },
  'متر قياس': { en: 'Measuring Tape', ur: 'پیمائش ٹیپ' },
  'ميزان ماء': { en: 'Spirit Level', ur: 'لیول' },
  'دريل كهربائي': { en: 'Electric Drill', ur: 'الیکٹرک ڈرل' },
  'دريل شحن': { en: 'Cordless Drill', ur: 'کورڈلیس ڈرل' },
  'صاروخ تجليخ': { en: 'Angle Grinder', ur: 'گرائنڈر' },
  'ريشة دريل حديد': { en: 'Metal Drill Bit', ur: 'میٹل ڈرل بٹ' },
  'ريشة همر': { en: 'Hammer Drill Bit', ur: 'ہمر بٹ' },
  'قرص قص': { en: 'Cutting Disc', ur: 'کٹنگ ڈسک' },
  'قرص تجليخ': { en: 'Grinding Disc', ur: 'گرائنڈنگ ڈسک' },
  'ورق صنفرة': { en: 'Sandpaper', ur: 'سینڈ پیپر' },
  'مسامير حديد': { en: 'Steel Nails', ur: 'لوہے کی کیلیں' },
  'براغي': { en: 'Screws', ur: 'پیچ' },
  'صواميل': { en: 'Nuts', ur: 'نٹ' },
  'رول بلت': { en: 'Rawl Bolt', ur: 'رال بولٹ' },
  'فيشر': { en: 'Wall Plug (Fischer)', ur: 'فشر' },
  'خوابير تثبيت': { en: 'Fixing Anchors', ur: 'اینکر' },
  'مسامير صاج': { en: 'Self-Tapping Screws', ur: 'سیلف ٹیپنگ پیچ' },
  'خوذة سلامة': { en: 'Safety Helmet', ur: 'حفاظتی ہیلمٹ' },
  'قفازات عمل': { en: 'Work Gloves', ur: 'دستانے' },
  'نظارة واقية': { en: 'Safety Goggles', ur: 'حفاظتی چشمہ' },
  'حذاء سلامة': { en: 'Safety Shoes', ur: 'حفاظتی جوتے' },
  'سترة عاكسة': { en: 'Reflective Vest', ur: 'ریفلیکٹو ویسٹ' },
  'كمامة غبار': { en: 'Dust Mask', ur: 'ماسک' },
  'حزام أمان': { en: 'Safety Harness', ur: 'سیفٹی ہارنس' },
  'شريط لاصق': { en: 'Adhesive Tape', ur: 'چپکنے والا ٹیپ' },
  'حبل': { en: 'Rope', ur: 'رسی' },
  'بطارية': { en: 'Battery', ur: 'بیٹری' },
  'دهان داخلي': { en: 'Interior Paint', ur: 'اندرونی پینٹ' },
  'فرشاة دهان': { en: 'Paint Brush', ur: 'پینٹ برش' },
  'رولة دهان': { en: 'Paint Roller', ur: 'پینٹ رولر' },
  'تنر': { en: 'Thinner', ur: 'تھنر' },
  'سيليكون': { en: 'Silicone', ur: 'سیلیکون' },
  'فوم عازل': { en: 'Insulation Foam', ur: 'انسولیشن فوم' },
  'لاصق قوي': { en: 'Strong Adhesive', ur: 'مضبوط چپکنے والا' },
  'صمغ': { en: 'Glue', ur: 'گوند' },
}

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
    'فيلم بولي ايثيلين',
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
    'فوم عازل حراري', 'عازل رطوبة للأسطح والجدران',
    'مواد عازلة صوتية Acoustic', 'عازل حراري مجاري هواء',
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
    'هياكل تثبيت الألواح الشمسية', 'كابلات وموصلات طاقة شمسية', 'مضخة مياه بالطاقة الشمسية', 'مفاتيح إنارة ذكية', 'مقابس ذكية', 'بوابة تحكم المنزل الذكي',
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
    'غراء عزل الدكت (لاصق الصوف والفوم)', 'لاصق عزل الأنابيب المطاطي (أرمافلكس)', 'شريط ألمنيوم مقوى FSK لعزل الدكت', 'مواسير صرف PP صامتة بحلقة مطاطية (PP Silent Push-fit)',
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
    'خلاط مغسلة', 'خلاط مطبخ', 'خلاط دش', 'صنبور حديقة',
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
    'خلاط مغسلة', 'خلاط مطبخ', 'خلاط دش', 'صنبور حديقة',
    'محبس زاوية', 'محبس عمومي', 'كوع PVC', 'تي PVC', 'كوبلن',
    'سيفون كرسي', 'سيفون مغسلة', 'مصفاة أرضية',
    'خرطوم سخان', 'خرطوم شطاف', 'وصلة مرنة',
    'شريط تفلون', 'معجون سباكة', 'جلدة محبس',
    'رأس دش', 'عوامة خزان', 'طفاية سيفون',
    // ═══ كهرباء بسيطة ═══
    'سلك كهرباء 2.5مم', 'سلك كهرباء 4مم', 'كابل تمديد',
    'مفتاح إنارة', 'بريزة', 'علبة كهرباء', 'قاطع MCB صغير',
    'لمبة LED', 'لمبة سبوت', 'كشاف صغير', 'أباجورة',
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
