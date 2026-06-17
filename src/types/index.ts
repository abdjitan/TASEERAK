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
  masonry: { ar: 'الكتل والطوب والمسبقات', en: 'Blocks, Bricks & Precast', ur: 'بلاک اور اینٹیں', icon: '🧱' },
  steel: { ar: 'الحديد والإنشاءات المعدنية', en: 'Steel & Metalwork', ur: 'اسٹیل', icon: '🔩' },
  rawmaterials: { ar: 'الركام وأعمال الموقع', en: 'Aggregates & Site Works', ur: 'خام مواد', icon: '⛰' },
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
  // آليات ومعدات (قطاع مستقل — تأجير/بيع)
  heavy_equipment: { ar: 'آليات ثقيلة (حفر/رفع/نقل)', en: 'Heavy Machinery', ur: 'بھاری مشینری', icon: '🚜' },
  light_equipment: { ar: 'معدات خفيفة (مولدات/دكاكات)', en: 'Light Equipment', ur: 'ہلکی مشینری', icon: '⚙️' },
  concrete_machinery: { ar: 'معدات خرسانة وصب', en: 'Concrete Equipment', ur: 'کنکریٹ مشین', icon: '🏭' },
  access_equipment: { ar: 'سقالات ومنصات رفع', en: 'Scaffolding & Access', ur: 'سکیفولڈنگ', icon: '🪜' },
  // محل توريد (Supply Store — متعدد للمحلات الصغيرة)
  store_plumbing: { ar: 'أدوات سباكة بسيطة', en: 'Plumbing Supplies', ur: 'پلمبنگ', icon: '🚿' },
  store_electrical: { ar: 'أدوات كهرباء بسيطة', en: 'Electrical Supplies', ur: 'الیکٹریکل', icon: '💡' },
  store_tools: { ar: 'عُدد يدوية وكهربائية', en: 'Hand & Power Tools', ur: 'اوزار', icon: '🔧' },
  store_fasteners: { ar: 'مسامير وبراغي ومثبتات', en: 'Fasteners & Fixings', ur: 'پیچ', icon: '🔩' },
  store_safety: { ar: 'سلامة ومستهلكات', en: 'Safety & Consumables', ur: 'حفاظتی سامان', icon: '🦺' },
  store_paint: { ar: 'دهانات ولواصق', en: 'Paint & Adhesives', ur: 'پینٹ', icon: '🎨' },
}

export const SUB_CATEGORIES: Record<Sector, Record<string, SubCategory>> = {
  civil: {
    // ═══ الخرسانة والمنتجات الإسمنتية ═══
    readymix: { ar: 'خرسانة جاهزة (Ready-Mix)', en: 'Ready-Mix Concrete', ur: 'ریڈی مکس', icon: '🏭', group: 'concrete',
      keywords: ['خرسانة جاهزة','ready mix','readymix','concrete','C25','C30','C35','C40','blinding'] },
    blocks: { ar: 'بلوك وآجر (أسود/معزول/سيبوريكس)', en: 'Blocks & Bricks', ur: 'بلاک', icon: '🧱', group: 'masonry',
      keywords: ['طوب','بلوك','block','brick','aac','سيبوريكس','معزول','مدماك','خفيف','siporex'] },
    precast: { ar: 'خرسانة مسبقة الصنع (Precast)', en: 'Precast Concrete', ur: 'پری کاسٹ', icon: '🏗', group: 'masonry',
      keywords: ['مسبق الصنع','precast','مسبقة','بلاطات مسبقة','أعمدة مسبقة','عتبات مسبقة','مدرجات','مقاعد','seating','bleacher'] },
    cement: { ar: 'أسمنت ومواد رابطة', en: 'Cement & Binders', ur: 'سیمنٹ', icon: '🪨', group: 'concrete',
      keywords: ['أسمنت','اسمنت','cement','جير','lime','جبص','جبصين','gypsum'] },
    // ═══ الحديد والإنشاءات المعدنية ═══
    rebar: { ar: 'حديد تسليح', en: 'Rebar / Reinforcement', ur: 'سریا', icon: '🔩', group: 'steel',
      keywords: ['حديد تسليح','تسليح','rebar','reinforc','سابك','الراجحي','بسكويت','سلك تربيط'] },
    structural_steel: { ar: 'حديد تجاري وقطاعات', en: 'Steel Profiles & Beams', ur: 'ساختی اسٹیل', icon: '🏗', group: 'steel',
      keywords: ['هيكلي','صلب','HEB','HEA','IPE','قطاع','structural steel','section','hollow','channel','صفائح','beam','تجاري'] },
    steel_mesh: { ar: 'شبك حديد وإكسسوارات', en: 'Steel Mesh & Accessories', ur: 'میش', icon: '🕸', group: 'steel',
      keywords: ['شبكة حديد','mesh','fabric','رابيتز','شبك لياسة','زوايا حماية'] },
    // ═══ البنية التحتية والتدعيم ═══
    waterproofing: { ar: 'عوازل مائية وحرارية للأساسات', en: 'Foundation Waterproofing', ur: 'واٹر پروفنگ', icon: '🛡', group: 'infrastructure',
      keywords: ['عازل','عزل','waterproof','bitumen','membrane','رطوبة','أساسات','tanking','خيش','فيلم','بولي','polyethylene','dpm'] },
    piling: { ar: 'أوتاد وخوازيق الأساسات', en: 'Piling & Foundations', ur: 'پائلنگ', icon: '🛠', group: 'infrastructure',
      keywords: ['أوتاد','اوتاد','pile','piling','خازوق','وتد خرساني'] },
    construction_chemicals: { ar: 'مواد كيميائية للبناء', en: 'Construction Chemicals', ur: 'کیمیکل', icon: '🧪', group: 'infrastructure',
      keywords: ['جراوت','grout','إضافات','additive','سيليكون إنشائي','epoxy','معالجة خرسانة','curing','كيماوي'] },
    drainage: { ar: 'صرف خارجي وبنية تحتية', en: 'External Drainage', ur: 'نکاسی', icon: '🚧', group: 'drainage_grp',
      keywords: ['صرف أمطار','storm','drainage','منهول','manhole','تفتيش','إسفلت','asphalt','ductile','دكتايل','حديد مرن','RCP','خرسانية مسلحة','صرف','مصارف','مصرف'] },
    // ═══ الكسارات والمواد الأولية وأعمال الموقع ═══
    aggregates: { ar: 'رمل وبحص وبودرة', en: 'Sand, Gravel & Powder', ur: 'ریت اور بجری', icon: '⛰', group: 'rawmaterials',
      keywords: ['رمل','بطحاء','حصى','بحص','زلط','ركام','كسارة','sand','gravel','aggregate','بودرة','crusher','حجر طبيعي خام','حجر خام'] },
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
    turf: { ar: 'عشب (طبيعي/صناعي/هجين)', en: 'Turf (Natural/Artificial/Hybrid)', ur: 'گھاس', icon: '🌱', group: 'landscape',
      keywords: ['عشب','turf','grass','نجيل','صناعي','artificial','hybrid','هجين','طبيعي','lawn','ملعب عشب'] },
    irrigation: { ar: 'شبكات ري ورشاشات', en: 'Irrigation Systems', ur: 'آبپاشی', icon: '💧', group: 'landscape',
      keywords: ['ري','irrigation','رشاش','sprinkler','rain bird','rainbird','تنقيط','drip','بخاخ','شبكة ري'] },
    fountains: { ar: 'نوافير وبرك مائية', en: 'Fountains & Water Features', ur: 'فوارے', icon: '⛲', group: 'landscape',
      keywords: ['نافورة','fountain','بركة','pool','water feature','شلال','waterfall','مسطح مائي'] },
    hardscape: { ar: 'إنترلوك وبردورات وتبليط خارجي', en: 'Interlock, Kerbs & Paving', ur: 'پیونگ', icon: '🧱', group: 'landscape',
      keywords: ['إنترلوك','interlock','بردورة','كيرب','kerb','curb','تبليط','paving','بلاط خارجي','حجر صناعي','رصف','tactile'] },
    planters: { ar: 'أحواض زراعة وعناصر تنسيق', en: 'Planters & Landscape Elements', ur: 'پلانٹر', icon: '🪴', group: 'landscape',
      keywords: ['حوض زراعة','planter','تربة','soil','مشتل','plant','شجر','tree','نباتات','pergola','مظلة حديقة','تشجير','زراعة','زرع'] },
  },
  architectural: {
    // ═══ الأرضيات والحوائط ═══
    tiles: { ar: 'بلاط وبورسلان وسيراميك', en: 'Tiles & Porcelain', ur: 'ٹائلز', icon: '🔲', group: 'floors_walls',
      keywords: ['بلاط','سيراميك','بورسلين','بورسلان','tile','ceramic','porcelain','موزاييك','mosaic'] },
    marble: { ar: 'رخام وجرانيت وحجر', en: 'Marble, Granite & Stone', ur: 'سنگ مرمر', icon: '💎', group: 'floors_walls',
      keywords: ['رخام','جرانيت','marble','granite','حجر طبيعي','natural stone','حجر صناعي','engineered stone','بازلت','basalt'] },
    wood_floor: { ar: 'باركيه وفينيل وSPC', en: 'Parquet, Vinyl & SPC', ur: 'پارکے', icon: '🟫', group: 'floors_walls',
      keywords: ['باركيه','parquet','فينيل','vinyl','SPC','خشبية','أرضية خشب','laminate'] },
    tile_adhesive: { ar: 'مواد تركيب البلاط (غراء/ترويبة)', en: 'Tile Adhesive & Grout', ur: 'ٹائل گلو', icon: '🪣', group: 'floors_walls',
      keywords: ['غراء','ترويبة','grout','adhesive','لاصق بلاط','tile glue'] },
    special_floor: { ar: 'أرضيات خاصة (إيبوكسي/تيرازو)', en: 'Special Flooring', ur: 'خصوصی فرش', icon: '🟪', group: 'floors_walls',
      keywords: ['إيبوكسي','epoxy','تيرازو','terrazzo','سجاد','carpet','raised access','screed','فرشة','مطاطية','مطاط','matting','rubber'] },
    // ═══ الدهانات والديكورات الخارجية ═══
    paint: { ar: 'دهانات (جوتن/الجزيرة)', en: 'Paints', ur: 'پینٹ', icon: '🎨', group: 'paint_facade',
      keywords: ['دهان','دهانات','paint','جوتن','jotun','الجزيرة','أكريليك','acrylic','زيتي','ورق جدران','wallpaper'] },
    grc_facade: { ar: 'GRC وكسوة الواجهات', en: 'GRC & Facade Cladding', ur: 'جی آر سی', icon: '🏛', group: 'paint_facade',
      keywords: ['GRC','GRG','جي آر سي','بروفايل واجهات','رشات خارجية','كسوة','facade','render'] },
    plaster: { ar: 'لياسة وبياض ومواد التحضير', en: 'Plaster & Render', ur: 'پلستر', icon: '🧱', group: 'paint_facade',
      keywords: ['لياسة','بياض','plaster','شبك لياسة','زاوية لياسة','مونة','طرطشة','تخشين','بطانة'] },
    // ═══ الأسقف والديكورات الداخلية ═══
    gypsum: { ar: 'جبس بورد وقواطع', en: 'Gypsum Board & Partitions', ur: 'جپسم بورڈ', icon: '⬜', group: 'ceiling_decor',
      keywords: ['جبس بورد','gypsum','بورد','board','partition','قواطع','أوميجا','معجون','جبسوم'] },
    false_ceiling: { ar: 'أسقف مستعارة (ألومنيوم/بلاطات)', en: 'False Ceilings', ur: 'جھوٹی چھت', icon: '🔳', group: 'ceiling_decor',
      keywords: ['أسقف مستعارة','false ceiling','ألومنيوم','شرائح','بلاطات','ممرات','ceiling tile','صوتية','كالسيوم','calcium silicate','أسقف مكشوفة','مكشوفة'] },
    // ═══ الأبواب والشبابيك والواجهات ═══
    aluminum: { ar: 'ألمنيوم وشبابيك', en: 'Aluminum & Windows', ur: 'ایلومینیم', icon: '🪟', group: 'doors_windows',
      keywords: ['ألمنيوم','aluminum','شبابيك','نوافذ','window','UPVC'] },
    wood_doors: { ar: 'أبواب خشبية', en: 'Wooden Doors', ur: 'لکڑی دروازے', icon: '🚪', group: 'doors_windows',
      keywords: ['أبواب خشب','wooden door','كبس','حشو','سنديان','خشبية'] },
    fire_doors: { ar: 'أبواب حديد وحريق', en: 'Steel & Fire-Rated Doors', ur: 'فائر دروازے', icon: '🔥', group: 'doors_windows',
      keywords: ['أبواب حديد','fire door','مقاومة حريق','fire rated','طوارئ','حديدية','أبواب ستانلس','stainless door'] },
    auto_doors: { ar: 'أبواب أوتوماتيكية وكراجات', en: 'Automatic & Garage Doors', ur: 'آٹومیٹک دروازے', icon: '🚗', group: 'doors_windows',
      keywords: ['أوتوماتيك','automatic','كراج','garage','rolling','شتر','أتوماتيكية'] },
    // ═══ الواجهات المتطورة (Facade) ═══
    curtain_wall: { ar: 'واجهات ستائرية وزجاجية (Curtain Wall)', en: 'Curtain Wall & Glazing', ur: 'کرٹن وال', icon: '🏢', group: 'facade_systems',
      keywords: ['curtain wall','واجهة ستائرية','واجهة زجاجية','structural glazing','spider','مشدات زجاج','زجاج','glass','سيكوريت','tempered','glazed facade'] },
    rainscreen: { ar: 'كسوة واجهات (Rainscreen/ألمنيوم)', en: 'Aluminium Cladding & Rainscreen', ur: 'رین اسکرین', icon: '🔲', group: 'facade_systems',
      keywords: ['rainscreen','cladding','كسوة','ألمنيوم واجهات','aluminium panel','كومبوزيت','ACP','معدن مثقب'] },
    stone_facade: { ar: 'كسوة واجهات حجرية', en: 'Stone Cladding', ur: 'پتھر کلیڈنگ', icon: '🪨', group: 'facade_systems',
      keywords: ['واجهات حجر','واجهة حجر','كسوة حجر','حجر واجهات','حجر للواجهات','stone cladding','stone facade'] },
    louvers: { ar: 'مظلات وكاسرات شمس', en: 'Louvers & Shading', ur: 'لوور', icon: '🪟', group: 'facade_systems',
      keywords: ['louver','مظلة','كاسر شمس','shading','بريز سوليه','brise soleil','مشربية معدنية'] },
    // ═══ النجارة والأثاث الثابت (Joinery) ═══
    millwork: { ar: 'نجارة وكاونترات', en: 'Joinery & Counters', ur: 'جوائنری', icon: '🪵', group: 'joinery',
      keywords: ['نجارة','joinery','millwork','كاونتر','counter','reception','مكتب استقبال','بار','bar counter','خشب مفصل'] },
    fitted_furniture: { ar: 'أثاث ثابت وخزائن', en: 'Fitted Furniture & Wardrobes', ur: 'فکسڈ فرنیچر', icon: '🪑', group: 'joinery',
      keywords: ['خزائن','wardrobe','أثاث ثابت','fitted','بانكيت','banquette','vanity','solid surface','corian'] },
    cubicles: { ar: 'قواطع حمامات وكبائن', en: 'Toilet Cubicles & Partitions', ur: 'کیوبیکل', icon: '🚪', group: 'joinery',
      keywords: ['قواطع حمام','cubicle','toilet partition','كبائن','HPL partition','لوكرات','locker'] },
    // ═══ العزل الصوتي (Acoustic) ═══
    acoustic_panels: { ar: 'ألواح وأسقف صوتية', en: 'Acoustic Panels & Ceilings', ur: 'صوتی پینل', icon: '🔊', group: 'acoustic',
      keywords: ['صوتي','acoustic','عزل صوت','baffle','sound absorb','بافل','صوف صخري صوتي','بوليستر صوتي'] },
    acoustic_timber: { ar: 'خشب صوتي مشقوق', en: 'Acoustic Timber Slats', ur: 'صوتی لکڑی', icon: '🪵', group: 'acoustic',
      keywords: ['خشب صوتي','acoustic timber','slat','مشقوق','veneer acoustic','شرائح خشب'] },
    // ═══ الأدوات الصحية والتشطيبات ═══
    sanitary_ware: { ar: 'أدوات صحية (خلاطات/مغاسل)', en: 'Sanitary Ware', ur: 'سینیٹری ویئر', icon: '🚽', group: 'sanitary_finish',
      keywords: ['أدوات صحية','مرحاض','مغسلة','حوض','خلاط','بانيو','كرسي','sanitary ware','WC','basin','mixer'] },
    bath_accessories: { ar: 'إكسسوارات حمامات ومطابخ', en: 'Bath & Kitchen Accessories', ur: 'لوازمات', icon: '🛁', group: 'sanitary_finish',
      keywords: ['إكسسوارات حمام','accessories','مطبخ','kitchen','مرايا','حوامل'] },
    // ═══ العزل الحراري والمائي ═══
    thermal_insulation: { ar: 'عوازل حرارية ومائية', en: 'Thermal & Moisture Insulation', ur: 'انسولیشن', icon: '🧊', group: 'building_insulation',
      keywords: ['عازل حراري','XPS','EPS عازل','صوف صخري','rock wool','rockwool','فوم عازل','عازل رطوبة','عازل مائي','waterproofing membrane','polystyrene','بولي ستايرين','عزل أسطح'] },
    // ═══ الأعمال المعدنية والمصاعد ═══
    metal_features: { ar: 'درابزين وسلالم ومشربيات', en: 'Balustrades, Stairs & Screens', ur: 'دھاتی کام', icon: '🛗', group: 'arch_metalwork',
      keywords: ['درابزين','handrail','balustrade','سلالم حديد','سلالم ستانلس','درج معدني','staircase','مشربية','مشربيات','screen معماري','railing','بلكونة','سلم حلزوني'] },
    vertical_transport: { ar: 'مصاعد وسلالم كهربائية', en: 'Elevators & Escalators', ur: 'لفٹ', icon: '🛗', group: 'arch_metalwork',
      keywords: ['مصعد','مصاعد','elevator','lift','سلالم كهربائية','سلم كهربائي','escalator','dumbwaiter','ممشى متحرك','travelator'] },
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
      keywords: ['لوحة','لوحات','panel','MDB','SMDB','SDB','DB','distribution board','busbar','bus bar','هارمونيك','harmonic'] },
    breakers: { ar: 'قواطع كهربائية', en: 'Circuit Breakers', ur: 'بریکر', icon: '🔘', group: 'panels_switches',
      keywords: ['قاطع','قواطع','breaker','MCB','MCCB','RCCB','ACB','فيوز'] },
    switches: { ar: 'مفاتيح وأفياش وعلب', en: 'Switches & Sockets', ur: 'سوئچ', icon: '🔲', group: 'panels_switches',
      keywords: ['مفاتيح','أفياش','switch','socket','علب','أبراز','outlet','مقابس','مقبس','floor box','مقبس طابق'] },
    transformers: { ar: 'محولات ومولدات', en: 'Transformers & Generators', ur: 'ٹرانسفارمر', icon: '🔋', group: 'panels_switches',
      keywords: ['محول','مولد','transformer','generator','UPS','ATS','مكثفات','محطة تحويل','substation'] },
    // ═══ أنظمة الإنارة ═══
    indoor_lighting: { ar: 'إنارة داخلية (داون لايت/ليد)', en: 'Indoor Lighting', ur: 'اندرونی روشنی', icon: '💡', group: 'lighting',
      keywords: ['إضاءة داخلية','داون لايت','downlight','سبوت','spot','لوحات ليد','LED panel','لمبة','مصباح','طوارئ','emergency','exit','مخرج','شريطية','strip','DALI'] },
    outdoor_lighting: { ar: 'إنارة خارجية وأعمدة', en: 'Outdoor & Landscape Lighting', ur: 'بیرونی روشنی', icon: '🏮', group: 'lighting',
      keywords: ['إنارة خارجية','حدائق','كشاف','floodlight','أعمدة إنارة','واجهات','جمالية','landscape'] },
    earthing: { ar: 'تأريض وحماية برق', en: 'Earthing & Lightning', ur: 'ارتھنگ', icon: '🛡', group: 'lighting',
      keywords: ['تأريض','earthing','earth','حماية برق','lightning','أقطاب','rod'] },
    // ═══ أنظمة التيار الخفيف ═══
    cctv: { ar: 'كاميرات مراقبة CCTV', en: 'CCTV Systems', ur: 'سی سی ٹی وی', icon: '📹', group: 'low_current',
      keywords: ['كاميرات','كاميرا','مراقبة','CCTV','PTZ','شاشات','surveillance'] },
    fire_alarm: { ar: 'إنذار حريق', en: 'Fire Alarm', ur: 'فائر الارم', icon: '🚨', group: 'low_current',
      keywords: ['إنذار حريق','fire alarm','كاشف دخان','smoke detector'] },
    data_network: { ar: 'شبكات بيانات وسنترالات', en: 'Data, Telecom & Intercom', ur: 'ڈیٹا نیٹ ورک', icon: '🌐', group: 'low_current',
      keywords: ['بيانات','data','شبكات','network','telecom','سنترال','intercom','CAT6','ألياف'] },
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
      keywords: ['مكيف','سبليت','split','دكت','package','مركزي','تشيلر','chiller','VRF','VRV','AHU','FCU','برج تبريد','cooling tower','مبادل حراري','heat exchanger','مكثف','condenser','مجمد حرارة'] },
    ductwork: { ar: 'مجاري هواء ومخارج', en: 'Ductwork & Grilles', ur: 'ڈکٹ', icon: '🌬', group: 'hvac',
      keywords: ['مجاري هواء','duct','دكت','مخارج هواء','فتحات هواء','موزعات هواء','موزعات','ستائر هواء','air curtain','grille','ديفيوزر','diffuser'] },
    duct_insulation: { ar: 'عزل مجاري الهواء (دكت)', en: 'Duct Insulation', ur: 'ڈکٹ انسولیشن', icon: '🧥', group: 'hvac',
      keywords: ['عزل دكت','عزل مجاري','صوف صخري','rockwool','صوف زجاجي','fiberglass','عزل فوم','rubber insulation','armaflex','nitrile','كانفس','canvas','mastic','foster','ماستيك'] },
    hvac_dampers: { ar: 'خانقات هواء (حريق/دخان/VCD)', en: 'Dampers (Fire/Smoke/VCD)', ur: 'ڈیمپرز', icon: '🛡', group: 'hvac',
      keywords: ['خانق','damper','fire damper','خانق حريق','smoke damper','خانق دخان','VCD','volume control','خانق حجم','motorized damper'] },
    ventilation_fans: { ar: 'مراوح تهوية وشفط', en: 'Ventilation & Exhaust Fans', ur: 'وینٹیلیشن فین', icon: '🌀', group: 'hvac',
      keywords: ['مروحة شفط','exhaust fan','مراوح','ventilation','تهوية','سحب دخان','smoke extract','jet fan','inline fan','مروحة سقف','مروحة جدارية','axial','centrifugal'] },
    flexible_ducts: { ar: 'دكت مرن ووصلات', en: 'Flexible Ducts & Connectors', ur: 'لچکدار ڈکٹ', icon: '🪈', group: 'hvac',
      keywords: ['دكت مرن','flexible duct','flexible connector','وصلة مرنة','flexible','spiral duct','دكت لولبي'] },
    // ═══ السباكة والتغذية والصرف ═══
    water_supply: { ar: 'أنابيب تغذية (PPR)', en: 'Water Supply Pipes (PPR)', ur: 'پانی سپلائی', icon: '🚰', group: 'plumbing',
      keywords: ['PPR','تغذية','مياه باردة','مياه حارة','CPVC','PEX','نحاس مياه','مياه مبردة','chilled water','GI','مجلفن','galvanized','GRP','فايبرجلاس','معزولة مسبقا','pre-insulated','pre insulated','HDPE','مياه شرب','عداد مياه','water meter'] },
    drainage_pipes: { ar: 'مواسير صرف (PVC/UPVC)', en: 'Drainage Pipes (PVC)', ur: 'نکاسی پائپ', icon: '🚽', group: 'plumbing',
      keywords: ['صرف صحي','uPVC','PVC','sanitary','soil','waste','قسامات','أكواع','مصرف','حديد زهر','cast iron','زهر','فصال دهون','grease','interceptor'] },
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
      keywords: ['محبس','صمام زاوية','angle valve','gate valve','محبس زاوية','وصلة','وصلات','كوع','تي','fitting','elbow','tee','كوبلن','نبل','فلانش','فلنشة','flange','عازل اهتزاز','اهتزاز','مواسير تمدد','expansion joint','تمدد','حوامل','تعليقات','pipe support','hanger'] },
    copper_fittings: { ar: 'لوازم نحاسية', en: 'Copper Fittings', ur: 'تانبے', icon: '🟠', group: 'plumbing_supplies',
      keywords: ['نحاس','copper','لوازم نحاسية','وصلة نحاس','كوع نحاس'] },
    traps_drains: { ar: 'سيفونات ومصافي', en: 'Traps & Drains', ur: 'سائفن', icon: '🚽', group: 'plumbing_supplies',
      keywords: ['سيفون','trap','مصفاة','مصرف أرضي','floor drain','نفbreeze','بلف','شبكة صرف','صفاية'] },
    flex_hoses: { ar: 'خراطيم مرنة ووصلات', en: 'Flexible Hoses & Connectors', ur: 'لچکدار نلی', icon: '🪢', group: 'plumbing_supplies',
      keywords: ['خرطوم','hose','مرن','flexible','وصلة مرنة','شطاف','خرطوم سخان','flexi','وصلة شطاف'] },
    plumbing_consumables: { ar: 'تفلون وعوازل وحشوات', en: 'Teflon, Seals & Sealants', ur: 'ٹیفلون', icon: '🧵', group: 'plumbing_supplies',
      keywords: ['تفلون','teflon','شريط','عازل','حشوة','جلدة','seal','gasket','معجون','سيليكون سباكة','خيط سباكة'] },
    shower_accessories: { ar: 'دشات وإكسسوارات حمام', en: 'Shower Heads & Bath Accessories', ur: 'شاور', icon: '🚿', group: 'plumbing_supplies',
      keywords: ['دش','shower','رأس دش','shower head','إكسسوار حمام','حامل','صابونة','مناديل','معلاق'] },
    floats_tanks: { ar: 'عوامات وطفايات سيفون', en: 'Float Valves & Cistern Parts', ur: 'فلوٹ', icon: '🎈', group: 'plumbing_supplies',
      keywords: ['عوامة','float','طفاية','سيفون كرسي','cistern','بكرة','عوامة خزان','محبس عوامة'] },
    // ═══ مكافحة الحريق ═══
    fire_fighting: { ar: 'مواسير ورشاشات حريق', en: 'Fire Pipes & Sprinklers', ur: 'فائر فائٹنگ', icon: '🧯', group: 'firefighting',
      keywords: ['إطفاء','حريق','sprinkler','رشاش','مواسير حريق','سكيدول','schedule 40','اسبركلر'] },
    fire_pumps: { ar: 'مضخات حريق (UL/FM)', en: 'Fire Pumps (UL/FM)', ur: 'فائر پمپ', icon: '🚒', group: 'firefighting',
      keywords: ['مضخة حريق','fire pump','jockey','جوكي','ديزل','diesel','UL','FM','fire pump set','مضخة ديزل','مضخة كهرباء حريق','booster حريق'] },
    fire_cabinets: { ar: 'صناديق حريق وخراطيم', en: 'Fire Hose Cabinets', ur: 'فائر کیبنٹ', icon: '🧰', group: 'firefighting',
      keywords: ['صندوق حريق','fire hose cabinet','كابينة حريق','خرطوم حريق','hose reel','بكرة خرطوم','landing valve','محبس إطفاء','طفاية','extinguisher','fire cabinet'] },
    fire_valves: { ar: 'محابس وصمامات حريق', en: 'Fire Valves & Controls', ur: 'فائر والو', icon: '🎚', group: 'firefighting',
      keywords: ['OS&Y','gate valve','محبس بوابي','inspector test','محبس اختبار','flow switch','مفتاح تدفق','check valve','butterfly','zone control','tamper switch','محبس منطقة','صمام حريق'] },
    fire_connections: { ar: 'وصلات دفاع مدني وهيدرنت', en: 'Siamese & Hydrants', ur: 'سیامیز کنکشن', icon: '🚰', group: 'firefighting',
      keywords: ['siamese','وصلة دفاع مدني','fire department connection','FDC','breeching','هيدرنت','hydrant','landing','وصلة سيامي','مأخذ حريق'] },
    // ═══ العزل الحراري الميكانيكي ═══
    chilled_water_insulation: { ar: 'عزل أنابيب المياه المثلجة', en: 'Chilled Water Pipe Insulation', ur: 'چلڈ واٹر انسولیشن', icon: '🧊', group: 'mech_insulation',
      keywords: ['عزل مياه مثلجة','chilled water insulation','عزل أنابيب','عازل أنابيب','عازل أنابيب مياه مبردة','fibreglass','fiberglass عزل','pipe insulation','armaflex','nitrile','elastomeric','صوف صخري أنابيب','عزل حراري أنابيب','عازل حراري أنابيب'] },
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
      keywords: ['شاحنة','truck','قلاب','dump','نقل','transport','صهريج','tanker','مقطورة','trailer'] },
    // ═══ معدات خرسانة وصب ═══
    concrete_equip: { ar: 'خلاطات ومضخات خرسانة', en: 'Concrete Mixers & Pumps', ur: 'کنکریٹ مشین', icon: '🏭', group: 'concrete_machinery',
      keywords: ['خلاطة','mixer','مضخة خرسانة','concrete pump','هزاز','vibrator','صب خرسانة','baching','محطة خلط'] },
    // ═══ معدات خفيفة (مولدات/دكاكات) ═══
    compaction: { ar: 'معدات دك ورص', en: 'Compaction Equipment', ur: 'کمپیکشن', icon: '🛞', group: 'light_equipment',
      keywords: ['دكاكة','compactor','رصاصة','plate','هراس','roller','رص','مدماك','دك تربة'] },
    generators_equip: { ar: 'مولدات وكمبروسرات', en: 'Generators & Compressors', ur: 'جنریٹر', icon: '⚙️', group: 'light_equipment',
      keywords: ['مولد','generator','كمبروسر','compressor','ضاغط هواء','مكينة','محرك','engine','دينمو'] },
    pumps_equip: { ar: 'طرمبات ومضخات نزح', en: 'Dewatering Pumps', ur: 'پمپ', icon: '💧', group: 'light_equipment',
      keywords: ['طرمبة','مضخة نزح','dewatering','submersible','غطاسة','شفط مياه'] },
    // ═══ سقالات ومنصات رفع ═══
    scaffolding_equip: { ar: 'سقالات ومنصات', en: 'Scaffolding & Platforms', ur: 'سکیفولڈنگ', icon: '🪜', group: 'access_equipment',
      keywords: ['سقالة','سقالات','scaffold','منصة رفع','platform','سلالم','ladder','رافعة مقصية','scissor lift','بوم','جاكات','تدعيم','props','shoring','دعامات'] },
  },
  supply_store: {
    // ═══ أدوات سباكة بسيطة ═══
    store_faucets: { ar: 'خلاطات وصنابير', en: 'Faucets & Mixers', ur: 'نل', icon: '🚿', group: 'store_plumbing',
      keywords: ['خلاط','صنبور','حنفية','faucet','mixer','tap','بطارية مغسلة'] },
    store_valves: { ar: 'محابس ووصلات سباكة', en: 'Valves & Fittings', ur: 'والو', icon: '🔩', group: 'store_plumbing',
      keywords: ['محبس','صمام زاوية','angle valve','وصلة','كوع','تي','elbow','tee','سيفون','trap','نحاس','كوبلن','مصفاة','مصفاة أرضية','floor drain'] },
    store_hoses: { ar: 'خراطيم وتفلون ولوازم', en: 'Hoses, Teflon & Supplies', ur: 'نلی', icon: '🪢', group: 'store_plumbing',
      keywords: ['خرطوم','hose','مرن','شطاف','تفلون','teflon','معجون','جلدة','حشوة','seal','دش','shower','عوامة','float'] },
    // ═══ أدوات كهرباء بسيطة ═══
    store_wires: { ar: 'أسلاك وكابلات بسيطة', en: 'Wires & Cables', ur: 'تار', icon: '🔌', group: 'store_electrical',
      keywords: ['سلك','wire','كابل بسيط','أسلاك','تمديد','مدد كهرب'] },
    store_switches: { ar: 'مفاتيح وأفياش وعلب', en: 'Switches, Sockets & Boxes', ur: 'سوئچ', icon: '🔲', group: 'store_electrical',
      keywords: ['مفتاح','أفياش','بريزة','socket','switch','علبة كهرب','مقبس','أباجورة','outlet'] },
    store_lighting: { ar: 'لمبات وإنارة بسيطة', en: 'Bulbs & Lighting', ur: 'بلب', icon: '💡', group: 'store_electrical',
      keywords: ['لمبة','بلب','bulb','إنارة','سبوت','spot','led','مصباح','كشاف صغير','نجفة'] },
    store_elec_access: { ar: 'إكسسوارات كهرباء', en: 'Electrical Accessories', ur: 'الیکٹریکل لوازم', icon: '⚡', group: 'store_electrical',
      keywords: ['قاطع صغير','MCB','فيش','plug','شريط لحام','كماشة كهرب','عازل','تيب','محول صغير','شاحن'] },
    // ═══ عُدد يدوية وكهربائية ═══
    store_hand_tools: { ar: 'عُدد يدوية (مفكات/زراديات)', en: 'Hand Tools', ur: 'ہاتھ کے اوزار', icon: '🔧', group: 'store_tools',
      keywords: ['مفك','مفكات','زرادية','كماشة','مفتاح','wrench','screwdriver','plier','مطرقة','شاكوش','متر','ميزان'] },
    store_power_tools: { ar: 'عُدد كهربائية (دريل/صاروخ)', en: 'Power Tools', ur: 'بجلی اوزار', icon: '🪚', group: 'store_tools',
      keywords: ['دريل','drill','صاروخ','grinder','منشار كهرب','جلاخة','مثقاب','شحن'] },
    store_bits: { ar: 'ريش ولقم وأقراص', en: 'Bits & Discs', ur: 'بٹ', icon: '🪛', group: 'store_tools',
      keywords: ['ريشة','ريش','لقمة','drill bit','همر','SDS','قرص قص','قرص','تجليخ','grinding','disc','شفرة','blade','صنفرة'] },
    // ═══ مسامير وبراغي ومثبتات ═══
    store_fasteners: { ar: 'مسامير وبراغي وصواميل', en: 'Screws, Bolts & Nuts', ur: 'پیچ', icon: '🔩', group: 'store_fasteners',
      keywords: ['مسمار','مسامير','برغي','screw','bolt','nail','صامولة','صواميل','nut','مثبت','رول بلت','خابور','خوابير','anchor','براغي','فيشر'] },
    // ═══ سلامة ومستهلكات ═══
    store_safety: { ar: 'معدات سلامة وقفازات', en: 'Safety & PPE', ur: 'حفاظتی سامان', icon: '🦺', group: 'store_safety',
      keywords: ['خوذة','قفازات','gloves','نظارة','حذاء سلامة','سترة','كمامة','mask','PPE','وقاية','حزام أمان'] },
    store_consumables: { ar: 'مستهلكات ولوازم متنوعة', en: 'Consumables & Misc', ur: 'استعمالی', icon: '📦', group: 'store_safety',
      keywords: ['شريط لاصق','tape','حبل','rope','كيس','بطارية','battery','مصباح يدوي','جلبة','أربطة'] },
    // ═══ دهانات ولواصق ═══
    store_paint: { ar: 'دهانات وفرش ورولات', en: 'Paint, Brushes & Rollers', ur: 'پینٹ', icon: '🎨', group: 'store_paint',
      keywords: ['دهان','paint','فرشاة','brush','رولة','roller','بوية','صبغ','تنر','thinner'] },
    store_adhesives: { ar: 'سيليكون ولواصق وفوم', en: 'Silicone, Glue & Foam', ur: 'سیلیکون', icon: '🧴', group: 'store_paint',
      keywords: ['سيليكون','silicone','فوم','foam','لاصق','adhesive','glue','سيلانت','sealant','صمغ'] },
  },
}

// كشف التخصص الفرعي تلقائياً من اسم المادة
// يستخدم التطبيع ليتسامح مع الأخطاء الإملائية (همزة ناقصة، تاء/هاء، تشكيل، تطويل، أوردو)
export function detectSubCategory(productName: string, sector: Sector): string | null {
  const norm = normalizeText(productName)
  const subs = SUB_CATEGORIES[sector]
  if (!subs) return null
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
  readymix: 'م³', cement: 'كيس', blocks: 'عدد', precast: 'عدد',
  rebar: 'طن', structural_steel: 'طن', steel_mesh: 'عدد',
  waterproofing: 'م²', piling: 'م.ط', construction_chemicals: 'عدد',
  drainage: 'م.ط', aggregates: 'م³', earthworks: 'م³',
  formwork_ply: 'لوحة', formwork_timber: 'عدد', formwork_steel: 'عدد',
  scaffold_structure: 'عدد', scaffold_jacks: 'عدد', shoring_props: 'عدد',
  turf: 'م²', irrigation: 'عدد', fountains: 'عدد', hardscape: 'م²', planters: 'عدد',
  // معماري
  tiles: 'م²', marble: 'م²', wood_floor: 'م²', tile_adhesive: 'كيس', special_floor: 'م²',
  paint: 'جالون', grc_facade: 'م²', gypsum: 'م²', false_ceiling: 'م²',
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

// وحدة القياس الافتراضية لمادة: أولوية لوحدة المواصفات إن وُجدت، ثم وحدة التخصص الفرعي
export function getDefaultUnit(productName: string, sector: Sector): string {
  const specs = PRODUCT_SPECS[(productName || '').trim()]
  if (specs) {
    const u = specs.find(f => f.key === 'unit')
    if (u && u.options.length) return u.options[0]
  }
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
  'cabling', 'panels_switches', 'lighting', 'low_current',
  // آليات ومعدات
  'heavy_equipment', 'concrete_machinery', 'light_equipment', 'access_equipment',
  // محل توريد
  'store_plumbing', 'store_electrical', 'store_tools', 'store_fasteners', 'store_paint', 'store_safety',
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
    { key: 'placing', ar: 'طريقة الصب', en: 'Placing', options: ['بالمضخة','مضخة بوم (Boom)','صب مباشر'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['م³ (متر مكعب)'] },
  ],
  'بلوك خرساني': [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مجوف Hollow','معزول Insulated','مصمت Solid','خفيف AAC'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['20×20×40 سم','15×20×40 سم','10×20×40 سم','25×20×40 سم'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['حبة','متر مربع','بالألف حبة'] },
  ],
  'طوب أحمر': [
    { key: 'type', ar: 'النوع', en: 'Type', options: ['مفرّغ','مصمت','حراري'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['قياسي 6×12×25','كبير','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['بالألف حبة','حبة','متر مربع'] },
  ],
}

// ===== مكتبة موسّعة: مواصفات تفصيلية لمزيد من المواد (تُضاف بالحلقات لكفاءة) =====
const SPEC_GROUPS: Array<{ products: string[]; spec: SpecField[] }> = [
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
    { key: 'core', ar: 'النوع', en: 'Type', options: ['مفرّغ (Hollow core)','معبّأ (Solid core)','خشب صلب (Solid wood)','HDF','MDF'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['قشرة طبيعية (Veneer)','ميلامين','CPL/HPL','لاكيه','دهان','PVC'] },
    { key: 'size', ar: 'المقاس (عرض×ارتفاع)', en: 'Size', options: ['90×210 سم','80×210 سم','100×210 سم','70×210 سم','حسب الطلب'] },
    { key: 'frame', ar: 'الإطار', en: 'Frame', options: ['إطار خشب','إطار معدني (حلق صاج)','بدون إطار'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد (باب كامل)','الورقة فقط'] },
  ] },
  // أبواب الحريد المقاومة للحريق
  { products: ['أبواب حديد مقاومة حريق 45 دقيقة','أبواب حديد مقاومة حريق 90 دقيقة'], spec: [
    { key: 'leaf', ar: 'عدد الدرف', en: 'Leaves', options: ['مفرد (Single)','مزدوج (Double)'] },
    { key: 'size', ar: 'المقاس', en: 'Size', options: ['90×210 سم','100×210 سم','120×210 سم (مزدوج)','حسب الطلب'] },
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
    { key: 'size', ar: 'المقاس (Profile)', en: 'Profile Size', options: ['IPE 100','IPE 160','IPE 200','IPE 300','IPE 400'] },
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
  { products: ['أنابيب خرسانية صرف خارجي'], spec: [
    { key: 'diameter', ar: 'القطر الداخلي', en: 'Inner Diameter', options: ['300 مم','400 مم','600 مم','800 مم','1000 مم'] },
    { key: 'class', ar: 'الدرجة (Class)', en: 'Class', options: ['Class 2','Class 3','Class 4'] },
    { key: 'lining', ar: 'التبطين', en: 'Lining', options: ['مبطنة (HDPE/PVC)','غير مبطنة','مطلية إيبوكسي'] },
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','الأنابيب السعودية','مصنع محلي'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['متر طولي','حبة (أنبوب)'] },
  ] },
  { products: ['ألواح بليود (طوبار) Plywood'], spec: [
    { key: 'origin', ar: 'المنشأ', en: 'Origin', options: ['إندونيسي','ماليزي','صيني','أوروبي'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['18 مم','12 مم','9 مم'] },
    { key: 'film_face', ar: 'الطبقة الخارجية', en: 'Film Face', options: ['فيلم أسود (Black Film)','فيلم بني (Brown Film)','بدون فيلم (عادي)'] },
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
    { key: 'brand', ar: 'العلامة (اختياري)', en: 'Brand (optional)', options: ['أي علامة معتمدة','سافيتو (Saveto)','فيتونيت (Vetonit)','لاتيكريت (Laticrete)'] },
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
  { products: ['خرسانة مسبقة الصب','عتبات خرسانية مسبقة الصب','أعمدة مسبقة الصب','بلاطات مسبقة الصب','مدرجات مسبقة الصب','مدرجات مسبقة الصب Bleachers','مقاعد ملعب','سلالم رياضية Raker Beams'], spec: [
    { key: 'strength', ar: 'قوة الخرسانة', en: 'Strength', options: ['C30','C35','C40','C45','C50','حسب التصميم'] },
    { key: 'finish', ar: 'التشطيب', en: 'Finish', options: ['عادي','مصقول','مكشوف الركام','حسب الطلب'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['عدد','م³ (متر مكعب)','متر طولي'] },
  ] },
  // HEB/HEA: المقاس بالتسمية القياسية (HEA 200…)
  { products: ['صلب هيكلي HEB','صلب هيكلي HEA'], spec: [
    { key: 'section', ar: 'المقاس (المقطع)', en: 'Section', options: ['100','120','140','160','180','200','220','240','260','280','300','320','340','360','400','450','500','550','600','650','700','800','900','1000'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR','حسب المواصفة'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود','متر طولي'] },
  ] },
  { products: ['قطاعات مستطيلة RHS'], spec: [
    { key: 'size', ar: 'المقاس (مم)', en: 'Size', options: ['40×40','50×50','60×40','80×40','80×80','100×50','100×100','120×60','150×100','200×100','حسب المخطط'] },
    { key: 'thickness', ar: 'سماكة الجدار', en: 'Wall thickness', options: ['2 مم','2.5 مم','3 مم','4 مم','5 مم','6 مم'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود','متر طولي'] },
  ] },
  { products: ['زوايا وقطاعات حديد'], spec: [
    { key: 'size', ar: 'مقاس الزاوية (مم)', en: 'Angle Size', options: ['30×30','40×40','50×50','60×60','70×70','75×75','80×80','100×100','حسب المخطط'] },
    { key: 'thickness', ar: 'السماكة', en: 'Thickness', options: ['3 مم','4 مم','5 مم','6 مم','8 مم','10 مم'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود','متر طولي'] },
  ] },
  // القطاعات الدائرية CHS (القطر بالاسم — نضيف سماكة الجدار)
  { products: ['قطاعات دائرية CHS 273mm','قطاعات دائرية CHS 300mm'], spec: [
    { key: 'thickness', ar: 'سماكة الجدار', en: 'Wall thickness', options: ['5 مم','6 مم','8 مم','10 مم','12 مم','حسب المخطط'] },
    { key: 'grade', ar: 'درجة الصلب', en: 'Grade', options: ['S235JR','S275JR','S355JR'] },
    { key: 'length', ar: 'الطول', en: 'Length', options: ['6 متر','12 متر','حسب القص'] },
    { key: 'unit', ar: 'وحدة الطلب', en: 'Order unit', options: ['طن','عود','متر طولي'] },
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
    // ═══ الخرسانة (BOQ: C2 POURED CONCRETE, C5 PRECAST) ═══
    'حديد تسليح', 'حديد تسليح سلك', 'شبكة حديد جاهزة', 'أسمنت',
    'خرسانة جاهزة',
    'خرسانة مسبقة الصب', 'عتبات خرسانية مسبقة الصب', 'أعمدة مسبقة الصب',
    'بلاطات مسبقة الصب', 'مدرجات مسبقة الصب',
    // ═══ الركام والرمل ═══
    'رمل بناء', 'رمل ناعم', 'حصى', 'زلط', 'كسارة', 'ركام مدمج',
    // ═══ المباني (BOQ: D MASONRY) ═══
    'طوب أحمر', 'طوب فارغ', 'بلوك خرساني', 'بلوك AAC خفيف', 'بلوك EPS عازل',
    // ═══ الطوبار والشدّات الخشبية (Formwork) ═══
    'ألواح بليود (طوبار) Plywood', 'خشب بناء للشدّات',
    'مرابيع خشب (طوبار)', 'عوارض خشبية H20',
    'طوبار معدني جاهز', 'قمط شدّة أعمدة Column Clamp',
    'قضبان شد الطوبار Tie Rods', 'زيت فك الطوبار Shutter Oil',
    // ═══ السقالات والدعامات (Scaffolding & Shoring) ═══
    'قائم سقالة Standard', 'عارضة أفقية سقالة Ledger',
    'دعامة قطرية سقالة Brace', 'ماسورة سقالة Tube', 'إطار سقالة معدنية Frame',
    'قاعدة ثابتة Base Plate', 'بيس جاك قابل للتعديل', 'يو جاك U-Head', 'سكرو جاك تعديل',
    'منصة وقوف معدنية Steel Deck', 'سلم سقالة', 'كوبلر مشبك سقالة Coupler',
    'جاكات تدعيم Acrow Prop', 'برج تدعيم Shoring Tower', 'درابزين أمان سقالة Guard Rail',
    // ═══ الهيكل المعدني (BOQ: E METAL WORK) ═══
    'صلب هيكلي HEB', 'صلب هيكلي HEA', 'صلب هيكلي IPE',
    'صفائح فولاذية', 'أوتاد خرسانية', 'أوتاد حديد مجوف',
    // ═══ الصرف الخارجي - CIVIL فقط (BOQ: Storm Drainage) ═══
    // ✅ هادي أنابيب صرف الأمطار الخارجية المدفونة = مدني
    // ❌ أنابيب الصرف الصحي الداخلية = ميكانيك (شوف قسم mechanical)
    'أنابيب HDPE SDR11 صرف أمطار 100mm',
    'أنابيب HDPE SDR11 صرف أمطار 150mm',
    'أنابيب HDPE SDR11 صرف أمطار 200mm',
    'أنابيب HDPE SDR11 صرف أمطار 300mm',
    'أنابيب HDPE SDR11 صرف أمطار 400mm',
    'أنابيب خرسانية صرف خارجي', 'أنابيب خرسانية مسلحة RCP',
    'أنابيب حديد مرن Ductile Iron مياه رئيسية',
    'غرف تفتيش خرسانية', 'أغطية منهول حديد', 'مصارف خطية',
    // ═══ الأعمال الخارجية (BOQ: B SITE WORK) ═══
    'أعمال ترابية وحفر', 'مواد ردم وتسوية', 'إسفلت',
    'حجر كيرب', 'بلاط رصف خارجي',
    'أنابيب ري HDPE خارجية', 'شبكة ري خارجية',
    // ═══ عزل الأساسات والتشطيب الخارجي ═══
    'شبك رابيتز', 'جير', 'جبصين', 'حجر خام للردم والحواجز',
    'عازل مائي للأساسات Liquid Applied', 'فيلم بولي ايثيلين',
    'عازل مائي Tanking', 'غشاء عازل للأسطح',
    // ═══ الأعمال الخاصة - BOQ 2 Stadium ═══
    'مدرجات مسبقة الصب Bleachers', 'مقاعد ملعب',
    'سلالم رياضية Raker Beams',
    // ═══ الصلب الهيكلي الدائري - BOQ 2 ═══
    'قطاعات دائرية CHS 273mm', 'قطاعات دائرية CHS 300mm',
    'قطاعات مستطيلة RHS', 'زوايا وقطاعات حديد',
    // ═══ أعمال موقع خارجية إضافية ═══
    'تمهيد وتسوية أرض', 'حصى مرشحة Sub-base',
    'طبقة أسفلتية', 'رصف بلاط خارجي', 'رصف حجر طبيعي',
    // ═══ تنسيق موقع Landscaping ═══
    'تشجير وزراعة', 'تربة زراعية Topsoil',
    'نظام ري شبكة خارجية', 'مضخة ري',
  ],
  architectural: [
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
  ],
  electrical: [
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
  ],
  mechanical: [
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
    'أنابيب uPVC صرف صحي داخلي', 'أنابيب uPVC صرف صحي 50mm',
    'أنابيب uPVC صرف صحي 75mm', 'أنابيب uPVC صرف صحي 100mm',
    'أنابيب uPVC صرف صحي 150mm', 'أنابيب uPVC صرف صحي 200mm',
    'أنابيب HDPE صرف صحي داخلي',
    'أنابيب حديد زهر Cast Iron صرف صامت',
    // ═══ أنابيب إطفاء الحريق (BOQ: Q FIRE PROTECTION) ═══
    'أنابيب فولاذية sprinkler 25mm', 'أنابيب فولاذية sprinkler 32mm',
    'أنابيب فولاذية sprinkler 40mm', 'أنابيب فولاذية sprinkler 50mm',
    'أنابيب فولاذية sprinkler 65mm', 'أنابيب فولاذية sprinkler 80mm',
    'أنابيب فولاذية sprinkler 100mm', 'أنابيب فولاذية sprinkler 150mm',
    'أنابيب فولاذية sprinkler 200mm',
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
    'أنابيب CPVC 65mm', 'أنابيب CPVC 80mm',
    'أنابيب CPVC 100mm', 'أنابيب CPVC 110mm', 'أنابيب CPVC 150mm',
    // ═══ عدادات مياه وخزانات ═══
    'عداد مياه 100mm', 'خزان مياه GRP 20م³',
    'خزان مياه GRP 434م³', 'وعاء تمدد Expansion Vessel',
    // ═══ أنابيب مياه مبردة بأقطار محددة (BOQ: 23) ═══
    'أنابيب مياه مبردة Sch40 DN65', 'أنابيب مياه مبردة Sch40 DN80',
    'أنابيب مياه مبردة Sch40 DN100', 'أنابيب مياه مبردة Sch40 DN125',
    'أنابيب مياه مبردة Sch40 DN150', 'أنابيب مياه مبردة Sch40 DN200',
    'أنابيب مياه مبردة Sch40 DN250', 'أنابيب مياه مبردة Sch40 DN300',
    'أنابيب مياه مبردة مدفونة Pre-insulated',
    'عازل أنابيب مياه مبردة Fibreglass 1/2"',
    'عازل أنابيب مياه مبردة Fibreglass 1"',
    // ═══ وقود (BOQ: 26-FUEL) ═══
    'خزان وقود ديزل تحت أرضي', 'خزان وقود ديزل يومي',
    'مضخة نقل وقود', 'وحدة تصفية وقود', 'خطوط تغذية وقود',
  ],
  equipment: [
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
  ],
  supply_store: [
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
  A: { ar: 'أ', desc: 'الدرجة الأولى', cap: 'فوق 100 مليون ريال', color: '#F5831F' },
  B: { ar: 'ب', desc: 'الدرجة الثانية', cap: '30–100 مليون ريال', color: '#1B2D5B' },
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
