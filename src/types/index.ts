// =============================================
// TASEERAK — TypeScript Types
// =============================================

export type UserRole = 'contractor' | 'supplier' | 'admin'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type SubscriptionPlan = 'free' | 'professional'
export type Sector = 'civil' | 'architectural' | 'electrical' | 'mechanical' | 'equipment'
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
  equipment: 'معدات وعُدد',
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
  concrete: { ar: 'الخرسانة والمنتجات الإسمنتية', en: 'Concrete & Cement Products', ur: 'کنکریٹ', icon: '🏭' },
  steel: { ar: 'الحديد والإنشاءات المعدنية', en: 'Steel & Metalwork', ur: 'اسٹیل', icon: '🔩' },
  infrastructure: { ar: 'البنية التحتية والتدعيم', en: 'Infrastructure & Support', ur: 'انفراسٹرکچر', icon: '🚧' },
  rawmaterials: { ar: 'الكسارات والمواد الأولية', en: 'Aggregates & Raw Materials', ur: 'خام مواد', icon: '⛰' },
  equipment: { ar: 'أخشاب ومعدات المقاولات', en: 'Formwork & Equipment', ur: 'آلات', icon: '🪵' },
  // معماري
  floors_walls: { ar: 'الأرضيات والحوائط', en: 'Floors & Walls', ur: 'فرش اور دیواریں', icon: '🔲' },
  paint_facade: { ar: 'الدهانات والديكورات الخارجية', en: 'Paints & Facades', ur: 'پینٹ', icon: '🎨' },
  ceiling_decor: { ar: 'الأسقف والديكورات الداخلية', en: 'Ceilings & Interior Decor', ur: 'چھتیں', icon: '⬜' },
  doors_windows: { ar: 'الأبواب والشبابيك والواجهات', en: 'Doors, Windows & Facades', ur: 'دروازے', icon: '🚪' },
  sanitary_finish: { ar: 'الأدوات الصحية والتشطيبات', en: 'Sanitary Ware & Finishes', ur: 'سینیٹری', icon: '🛁' },
  // ميكانيك
  hvac: { ar: 'التكييف والتهوية', en: 'HVAC & Ventilation', ur: 'ایئر کنڈیشنگ', icon: '❄️' },
  plumbing: { ar: 'السباكة والتغذية والصرف', en: 'Plumbing & Drainage', ur: 'پلمبنگ', icon: '🚰' },
  firefighting: { ar: 'مكافحة الحريق', en: 'Fire Fighting', ur: 'فائر فائٹنگ', icon: '🧯' },
  // كهرباء
  cabling: { ar: 'التمديدات والكابلات', en: 'Cabling & Wiring', ur: 'کیبلنگ', icon: '🔌' },
  panels_switches: { ar: 'اللوحات والمفاتيح', en: 'Panels & Switches', ur: 'پینل', icon: '🎛' },
  lighting: { ar: 'أنظمة الإنارة', en: 'Lighting Systems', ur: 'روشنی', icon: '💡' },
  low_current: { ar: 'أنظمة التيار الخفيف', en: 'Low Current Systems', ur: 'لو کرنٹ', icon: '📹' },
  // معدات وعُدد
  hand_tools: { ar: 'عُدد يدوية', en: 'Hand Tools', ur: 'ہاتھ کے اوزار', icon: '🔧' },
  power_tools: { ar: 'عُدد كهربائية', en: 'Power Tools', ur: 'بجلی کے اوزار', icon: '🔌' },
  heavy_equipment: { ar: 'معدات ثقيلة وآليات', en: 'Heavy Equipment & Machinery', ur: 'بھاری مشینری', icon: '🚜' },
  light_equipment: { ar: 'معدات خفيفة', en: 'Light Equipment', ur: 'ہلکی مشینری', icon: '⚙️' },
  safety: { ar: 'السلامة ومعدات الوقاية', en: 'Safety & PPE', ur: 'حفاظتی سامان', icon: '🦺' },
  consumables: { ar: 'مستهلكات ولوازم', en: 'Consumables & Supplies', ur: 'استعمالی اشیاء', icon: '📦' },
}

export const SUB_CATEGORIES: Record<Sector, Record<string, SubCategory>> = {
  civil: {
    // ═══ الخرسانة والمنتجات الإسمنتية ═══
    readymix: { ar: 'خرسانة جاهزة (Ready-Mix)', en: 'Ready-Mix Concrete', ur: 'ریڈی مکس', icon: '🏭', group: 'concrete',
      keywords: ['خرسانة جاهزة','ready mix','readymix','concrete','C25','C30','C35','C40','blinding'] },
    blocks: { ar: 'بلوك وآجر (أسود/معزول/سيبوريكس)', en: 'Blocks & Bricks', ur: 'بلاک', icon: '🧱', group: 'concrete',
      keywords: ['طوب','بلوك','block','brick','aac','سيبوريكس','معزول','مدماك','خفيف','siporex'] },
    precast: { ar: 'خرسانة مسبقة الصنع (Precast)', en: 'Precast Concrete', ur: 'پری کاسٹ', icon: '🏗', group: 'concrete',
      keywords: ['مسبق الصنع','precast','مسبقة','بلاطات مسبقة','أعمدة مسبقة','عتبات مسبقة','مدرجات'] },
    cement: { ar: 'أسمنت ومواد رابطة', en: 'Cement & Binders', ur: 'سیمنٹ', icon: '🪨', group: 'concrete',
      keywords: ['أسمنت','اسمنت','cement','جير','lime'] },
    // ═══ الحديد والإنشاءات المعدنية ═══
    rebar: { ar: 'حديد تسليح', en: 'Rebar / Reinforcement', ur: 'سریا', icon: '🔩', group: 'steel',
      keywords: ['حديد تسليح','تسليح','rebar','reinforc','سابك','الراجحي','بسكويت','سلك تربيط'] },
    structural_steel: { ar: 'حديد تجاري وقطاعات', en: 'Steel Profiles & Beams', ur: 'ساختی اسٹیل', icon: '🏗', group: 'steel',
      keywords: ['هيكلي','صلب','HEB','HEA','IPE','قطاع','structural steel','section','hollow','channel','صفائح','beam','تجاري'] },
    steel_mesh: { ar: 'شبك حديد وإكسسوارات', en: 'Steel Mesh & Accessories', ur: 'میش', icon: '🕸', group: 'steel',
      keywords: ['شبكة حديد','mesh','fabric','رابيتز','شبك لياسة','زوايا حماية'] },
    // ═══ البنية التحتية والتدعيم ═══
    waterproofing: { ar: 'عوازل مائية وحرارية للأساسات', en: 'Foundation Waterproofing', ur: 'واٹر پروفنگ', icon: '🛡', group: 'infrastructure',
      keywords: ['عازل','عزل','waterproof','bitumen','membrane','رطوبة','أساسات','tanking','خيش'] },
    construction_chemicals: { ar: 'مواد كيميائية للبناء', en: 'Construction Chemicals', ur: 'کیمیکل', icon: '🧪', group: 'infrastructure',
      keywords: ['جراوت','grout','إضافات','additive','سيليكون إنشائي','epoxy','معالجة خرسانة','curing','كيماوي'] },
    drainage: { ar: 'صرف خارجي وبنية تحتية', en: 'External Drainage', ur: 'نکاسی', icon: '🚧', group: 'infrastructure',
      keywords: ['صرف أمطار','storm','drainage','منهول','manhole','تفتيش','كيرب','kerb','إسفلت','asphalt','ري'] },
    // ═══ الكسارات والمواد الأولية ═══
    aggregates: { ar: 'رمل وبحص وبودرة', en: 'Sand, Gravel & Powder', ur: 'ریت اور بجری', icon: '⛰', group: 'rawmaterials',
      keywords: ['رمل','بطحاء','حصى','بحص','زلط','ركام','كسارة','sand','gravel','aggregate','بودرة','crusher'] },
    // ═══ أخشاب ومعدات المقاولات ═══
    formwork: { ar: 'أخشاب طوبار (بليود/مرابيع)', en: 'Formwork Timber', ur: 'فارم ورک', icon: '🪵', group: 'equipment',
      keywords: ['طوبار','بليود','plywood','مرابيع','أخشاب','timber','formwork','خشب بناء'] },
    scaffolding: { ar: 'سقالات وجاكات تدعيم', en: 'Scaffolding & Props', ur: 'سکیفولڈنگ', icon: '🏗', group: 'equipment',
      keywords: ['سقالات','scaffold','جاكات','props','تدعيم','shoring','دعامات'] },
  },
  architectural: {
    // ═══ الأرضيات والحوائط ═══
    tiles: { ar: 'بلاط وبورسلان وسيراميك', en: 'Tiles & Porcelain', ur: 'ٹائلز', icon: '🔲', group: 'floors_walls',
      keywords: ['بلاط','سيراميك','بورسلين','بورسلان','tile','ceramic','porcelain','موزاييك','mosaic'] },
    marble: { ar: 'رخام وجرانيت', en: 'Marble & Granite', ur: 'سنگ مرمر', icon: '💎', group: 'floors_walls',
      keywords: ['رخام','جرانيت','marble','granite','حجر طبيعي','natural stone','بازلت','basalt'] },
    wood_floor: { ar: 'باركيه وفينيل وSPC', en: 'Parquet, Vinyl & SPC', ur: 'پارکے', icon: '🟫', group: 'floors_walls',
      keywords: ['باركيه','parquet','فينيل','vinyl','SPC','خشبية','أرضية خشب','laminate'] },
    tile_adhesive: { ar: 'مواد تركيب البلاط (غراء/ترويبة)', en: 'Tile Adhesive & Grout', ur: 'ٹائل گلو', icon: '🪣', group: 'floors_walls',
      keywords: ['غراء','ترويبة','grout','adhesive','لاصق بلاط','tile glue'] },
    special_floor: { ar: 'أرضيات خاصة (إيبوكسي/تيرازو)', en: 'Special Flooring', ur: 'خصوصی فرش', icon: '🟪', group: 'floors_walls',
      keywords: ['إيبوكسي','epoxy','تيرازو','terrazzo','سجاد','carpet','raised access','screed','فرشة','مطاطية','rubber'] },
    // ═══ الدهانات والديكورات الخارجية ═══
    paint: { ar: 'دهانات (جوتن/الجزيرة)', en: 'Paints', ur: 'پینٹ', icon: '🎨', group: 'paint_facade',
      keywords: ['دهان','دهانات','paint','جوتن','jotun','الجزيرة','أكريليك','acrylic','زيتي','ورق جدران','wallpaper'] },
    grc_facade: { ar: 'GRC وكسوة الواجهات', en: 'GRC & Facade Cladding', ur: 'جی آر سی', icon: '🏛', group: 'paint_facade',
      keywords: ['GRC','GRG','جي آر سي','بروفايل واجهات','رشات خارجية','كسوة','facade','render'] },
    // ═══ الأسقف والديكورات الداخلية ═══
    gypsum: { ar: 'جبس بورد وقواطع', en: 'Gypsum Board & Partitions', ur: 'جپسم بورڈ', icon: '⬜', group: 'ceiling_decor',
      keywords: ['جبس بورد','gypsum','بورد','board','partition','قواطع','أوميجا','معجون','جبسوم'] },
    false_ceiling: { ar: 'أسقف مستعارة (ألومنيوم/بلاطات)', en: 'False Ceilings', ur: 'جھوٹی چھت', icon: '🔳', group: 'ceiling_decor',
      keywords: ['أسقف مستعارة','false ceiling','ألومنيوم','شرائح','بلاطات','ممرات','ceiling tile','صوتية'] },
    // ═══ الأبواب والشبابيك والواجهات ═══
    aluminum: { ar: 'ألمنيوم وشبابيك', en: 'Aluminum & Windows', ur: 'ایلومینیم', icon: '🪟', group: 'doors_windows',
      keywords: ['ألمنيوم','aluminum','شبابيك','نوافذ','window','UPVC'] },
    curtain_wall: { ar: 'واجهات زجاجية (Curtain Wall)', en: 'Curtain Wall / Glazing', ur: 'کرٹن وال', icon: '🏢', group: 'doors_windows',
      keywords: ['زجاج','glass','واجهات زجاجية','curtain wall','structural glazing','سيكوريت','tempered','كومبوزيت','كلادينج'] },
    wood_doors: { ar: 'أبواب خشبية', en: 'Wooden Doors', ur: 'لکڑی دروازے', icon: '🚪', group: 'doors_windows',
      keywords: ['أبواب خشب','wooden door','كبس','حشو','سنديان','خشبية'] },
    fire_doors: { ar: 'أبواب حديد وحريق', en: 'Steel & Fire-Rated Doors', ur: 'فائر دروازے', icon: '🔥', group: 'doors_windows',
      keywords: ['أبواب حديد','fire door','مقاومة حريق','fire rated','طوارئ','حديدية'] },
    auto_doors: { ar: 'أبواب أوتوماتيكية وكراجات', en: 'Automatic & Garage Doors', ur: 'آٹومیٹک دروازے', icon: '🚗', group: 'doors_windows',
      keywords: ['أوتوماتيك','automatic','كراج','garage','rolling','شتر','أتوماتيكية'] },
    // ═══ الأدوات الصحية والتشطيبات ═══
    sanitary_ware: { ar: 'أدوات صحية (خلاطات/مغاسل)', en: 'Sanitary Ware', ur: 'سینیٹری ویئر', icon: '🚽', group: 'sanitary_finish',
      keywords: ['أدوات صحية','مرحاض','مغسلة','حوض','خلاط','بانيو','كرسي','sanitary ware','WC','basin','mixer'] },
    bath_accessories: { ar: 'إكسسوارات حمامات ومطابخ', en: 'Bath & Kitchen Accessories', ur: 'لوازمات', icon: '🛁', group: 'sanitary_finish',
      keywords: ['إكسسوارات حمام','accessories','مطبخ','kitchen','مرايا','حوامل'] },
  },
  electrical: {
    // ═══ التمديدات والكابلات ═══
    lv_cables: { ar: 'كابلات وأسلاك (الفنار/بحرة)', en: 'Cables & Wires', ur: 'کیبل', icon: '🔌', group: 'cabling',
      keywords: ['كابل','cable','NYY','XLPE','SWA','LSZH','سلك','wire','CU/','mm²','نحاس','الفنار','بحرة','الرياض'] },
    mv_cables: { ar: 'كابلات جهد متوسط MV', en: 'MV Cables', ur: 'MV کیبل', icon: '⚡', group: 'cabling',
      keywords: ['متوسط جهد','medium voltage','MV cable','11kV','33kV'] },
    conduits: { ar: 'مواسير وحوامل كابلات', en: 'Conduits & Trays', ur: 'کنڈوٹ', icon: '🪛', group: 'cabling',
      keywords: ['أنبوب كهرب','conduit','مواسير تمديد','flexible','مرنة','سكة كابل','tray','ladder','حوامل'] },
    // ═══ اللوحات والمفاتيح ═══
    panels: { ar: 'لوحات توزيع (DB)', en: 'Distribution Boards', ur: 'پینل', icon: '🎛', group: 'panels_switches',
      keywords: ['لوحة','لوحات','panel','MDB','SMDB','SDB','DB','distribution board','busbar'] },
    breakers: { ar: 'قواطع كهربائية', en: 'Circuit Breakers', ur: 'بریکر', icon: '🔘', group: 'panels_switches',
      keywords: ['قاطع','قواطع','breaker','MCB','MCCB','RCCB','ACB','فيوز'] },
    switches: { ar: 'مفاتيح وأفياش وعلب', en: 'Switches & Sockets', ur: 'سوئچ', icon: '🔲', group: 'panels_switches',
      keywords: ['مفاتيح','أفياش','switch','socket','علب','أبراز','outlet','مقابس'] },
    transformers: { ar: 'محولات ومولدات', en: 'Transformers & Generators', ur: 'ٹرانسفارمر', icon: '🔋', group: 'panels_switches',
      keywords: ['محول','مولد','transformer','generator','UPS','ATS','مكثفات'] },
    // ═══ أنظمة الإنارة ═══
    indoor_lighting: { ar: 'إنارة داخلية (داون لايت/ليد)', en: 'Indoor Lighting', ur: 'اندرونی روشنی', icon: '💡', group: 'lighting',
      keywords: ['إضاءة داخلية','داون لايت','downlight','سبوت','spot','لوحات ليد','LED panel','لمبة','مصباح'] },
    outdoor_lighting: { ar: 'إنارة خارجية وأعمدة', en: 'Outdoor & Landscape Lighting', ur: 'بیرونی روشنی', icon: '🏮', group: 'lighting',
      keywords: ['إنارة خارجية','حدائق','كشاف','floodlight','أعمدة إنارة','واجهات','جمالية','landscape'] },
    earthing: { ar: 'تأريض وحماية برق', en: 'Earthing & Lightning', ur: 'ارتھنگ', icon: '🛡', group: 'lighting',
      keywords: ['تأريض','earthing','earth','حماية برق','lightning','أقطاب','rod'] },
    // ═══ أنظمة التيار الخفيف ═══
    cctv: { ar: 'كاميرات مراقبة CCTV', en: 'CCTV Systems', ur: 'سی سی ٹی وی', icon: '📹', group: 'low_current',
      keywords: ['كاميرات','مراقبة','CCTV','شاشات','surveillance'] },
    fire_alarm: { ar: 'إنذار حريق', en: 'Fire Alarm', ur: 'فائر الارم', icon: '🚨', group: 'low_current',
      keywords: ['إنذار حريق','fire alarm','كاشف دخان','smoke detector'] },
    data_network: { ar: 'شبكات بيانات وسنترالات', en: 'Data, Telecom & Intercom', ur: 'ڈیٹا نیٹ ورک', icon: '🌐', group: 'low_current',
      keywords: ['بيانات','data','شبكات','network','telecom','سنترال','intercom','CAT6','ألياف'] },
    sound_systems: { ar: 'أنظمة صوتيات', en: 'Sound Systems', ur: 'ساؤنڈ سسٹم', icon: '🔊', group: 'low_current',
      keywords: ['صوتيات','sound','PA','speaker','مكبرات','إعلام'] },
  },
  mechanical: {
    // ═══ التكييف والتهوية ═══
    ac_units: { ar: 'مكيفات (سبليت/مركزي/تشيلر)', en: 'AC Units (Split/Central/Chiller)', ur: 'ایئر کنڈیشنر', icon: '❄️', group: 'hvac',
      keywords: ['مكيف','سبليت','split','دكت','package','مركزي','تشيلر','chiller','VRF','VRV','AHU','FCU'] },
    ductwork: { ar: 'مجاري هواء ومخارج', en: 'Ductwork & Grilles', ur: 'ڈکٹ', icon: '🌬', group: 'hvac',
      keywords: ['مجاري هواء','duct','دكت','مخارج هواء','grille','عزل دكت','صوف صخري','فايبرجلاس','مراوح','fan','تهوية'] },
    // ═══ السباكة والتغذية والصرف ═══
    water_supply: { ar: 'أنابيب تغذية (PPR)', en: 'Water Supply Pipes (PPR)', ur: 'پانی سپلائی', icon: '🚰', group: 'plumbing',
      keywords: ['PPR','تغذية','مياه باردة','مياه حارة','CPVC','PEX','نحاس مياه','مياه مبردة','chilled water'] },
    drainage_pipes: { ar: 'مواسير صرف (PVC/UPVC)', en: 'Drainage Pipes (PVC)', ur: 'نکاسی پائپ', icon: '🚽', group: 'plumbing',
      keywords: ['صرف صحي','uPVC','PVC','sanitary','soil','waste','قسامات','أكواع','مصرف'] },
    pumps: { ar: 'مضخات مياه', en: 'Water Pumps', ur: 'پمپ', icon: '⚙️', group: 'plumbing',
      keywords: ['مضخة','pump','رفع','تدوير','ضغط','booster','صمام','valve'] },
    tanks_heaters: { ar: 'خزانات وسخانات مياه', en: 'Tanks & Water Heaters', ur: 'ٹینک', icon: '🪣', group: 'plumbing',
      keywords: ['خزان','tank','GRP','فايبرجلاس','بولي','سخان','heater','RO','تحلية','مرشح'] },
    // ═══ مكافحة الحريق ═══
    fire_fighting: { ar: 'مواسير ورشاشات حريق', en: 'Fire Fighting Systems', ur: 'فائر فائٹنگ', icon: '🧯', group: 'firefighting',
      keywords: ['إطفاء','حريق','sprinkler','رشاش','مواسير حريق','سكيدول','schedule 40','هيدرنت','صناديق حريق','UL','FM','مضخة حريق'] },
  },
  equipment: {
    // ═══ عُدد يدوية ═══
    hand_tools: { ar: 'عُدد يدوية (مفكات/زراديات)', en: 'Hand Tools', ur: 'ہاتھ کے اوزار', icon: '🔧', group: 'hand_tools',
      keywords: ['مفك','مفكات','زرادية','زراديات','كماشة','مفتاح','wrench','screwdriver','plier','مطرقة','hammer','منشار يدوي','شاكوش','عدة يدوية','صامولة'] },
    measuring: { ar: 'أدوات قياس وتسوية', en: 'Measuring & Leveling', ur: 'پیمائش', icon: '📏', group: 'hand_tools',
      keywords: ['متر','ميزان','level','قياس','measuring','شريط قياس','tape','ليزر','laser','زاوية','square','ميزان ماء'] },
    // ═══ عُدد كهربائية ═══
    power_tools: { ar: 'عُدد كهربائية (دريل/صاروخ)', en: 'Power Tools', ur: 'بجلی کے اوزار', icon: '🔌', group: 'power_tools',
      keywords: ['دريل','drill','صاروخ','grinder','منشار كهرب','saw','مفك كهرب','شحن','بطارية','جلاخة','راوتر','router','مثقاب'] },
    welding: { ar: 'معدات لحام وقطع', en: 'Welding & Cutting', ur: 'ویلڈنگ', icon: '⚡', group: 'power_tools',
      keywords: ['لحام','welding','قطع','cutting','ماكينة لحام','أكسجين','استيلين','plasma','إلكترود'] },
    // ═══ معدات ثقيلة وآليات ═══
    heavy_machinery: { ar: 'حفارات وشيولات', en: 'Excavators & Loaders', ur: 'کھدائی مشین', icon: '🚜', group: 'heavy_equipment',
      keywords: ['حفار','حفارة','excavator','شيول','loader','بلدوزر','bulldozer','بوكلين','لودر','جريدر','grader'] },
    cranes: { ar: 'رافعات وكرينات', en: 'Cranes & Lifting', ur: 'کرین', icon: '🏗', group: 'heavy_equipment',
      keywords: ['رافعة','crane','كرين','ونش','winch','رفع','lifting','برج رفع','tower crane','مناولة','forklift','رافعة شوكية'] },
    trucks: { ar: 'شاحنات ومعدات نقل', en: 'Trucks & Transport', ur: 'ٹرک', icon: '🚛', group: 'heavy_equipment',
      keywords: ['شاحنة','truck','قلاب','dump','نقل','transport','صهريج','tanker','مقطورة','trailer'] },
    concrete_equip: { ar: 'معدات خرسانة', en: 'Concrete Equipment', ur: 'کنکریٹ مشین', icon: '🏭', group: 'heavy_equipment',
      keywords: ['خلاطة','mixer','مضخة خرسانة','concrete pump','هزاز','vibrator','صب خرسانة','baching'] },
    // ═══ معدات خفيفة ═══
    compaction: { ar: 'معدات دك ورص', en: 'Compaction Equipment', ur: 'کمپیکشن', icon: '🛞', group: 'light_equipment',
      keywords: ['دكاكة','compactor','رصاصة','plate','هراس','roller','رص','مدماك','دك تربة'] },
    generators_equip: { ar: 'مولدات وكمبروسرات', en: 'Generators & Compressors', ur: 'جنریٹر', icon: '⚙️', group: 'light_equipment',
      keywords: ['مولد','generator','كمبروسر','compressor','ضاغط هواء','مكينة','محرك','engine','دينمو'] },
    pumps_equip: { ar: 'طرمبات ومضخات نزح', en: 'Dewatering Pumps', ur: 'پمپ', icon: '💧', group: 'light_equipment',
      keywords: ['طرمبة','مضخة نزح','dewatering','submersible','غطاسة','مضخة مياه','شفط'] },
    // ═══ السلامة ومعدات الوقاية ═══
    ppe: { ar: 'معدات وقاية شخصية (PPE)', en: 'Personal Protective Equipment', ur: 'حفاظتی سامان', icon: '🦺', group: 'safety',
      keywords: ['خوذة','helmet','قفازات','gloves','نظارة','goggles','حذاء سلامة','safety shoes','سترة','vest','كمامة','mask','حزام أمان','harness','PPE','وقاية'] },
    site_safety: { ar: 'سلامة الموقع', en: 'Site Safety', ur: 'سائٹ سیفٹی', icon: '🚧', group: 'safety',
      keywords: ['حواجز','barrier','شريط تحذير','أقماع','cone','لافتات','signage','طفاية','مظلة','شبك أمان','safety net'] },
    // ═══ مستهلكات ولوازم ═══
    fasteners: { ar: 'مسامير وبراغي ومثبتات', en: 'Fasteners & Fixings', ur: 'پیچ', icon: '🔩', group: 'consumables',
      keywords: ['مسمار','برغي','screw','bolt','nail','صامولة','nut','مثبت','fixing','anchor','رول بلت','خابور'] },
    abrasives: { ar: 'أقراص قص وتجليخ', en: 'Cutting & Grinding Discs', ur: 'ڈسک', icon: '⭕', group: 'consumables',
      keywords: ['قرص قص','disc','تجليخ','grinding','صنفرة','sandpaper','شفرة','blade','بريد','cutting disc'] },
    adhesives_equip: { ar: 'لواصق وسيليكون وفوم', en: 'Adhesives & Sealants', ur: 'چپکنے والا', icon: '🧴', group: 'consumables',
      keywords: ['سيليكون','silicone','فوم','foam','لاصق','adhesive','glue','سيلانت','sealant','صمغ','شريط لاصق','tape'] },
  },
}

// كشف التخصص الفرعي تلقائياً من اسم المادة
export function detectSubCategory(productName: string, sector: Sector): string | null {
  const lower = productName.toLowerCase()
  const subs = SUB_CATEGORIES[sector]
  if (!subs) return null
  let bestMatch: string | null = null
  let maxScore = 0
  for (const [key, sub] of Object.entries(subs)) {
    let score = 0
    for (const kw of sub.keywords) {
      if (lower.includes(kw.toLowerCase())) score++
    }
    if (score > maxScore) { maxScore = score; bestMatch = key }
  }
  return bestMatch
}

// جلب label التخصص الفرعي بأي لغة
export function getSubCategoryLabel(sector: Sector, subKey: string, locale: string): string {
  const sub = SUB_CATEGORIES[sector]?.[subKey]
  if (!sub) return subKey
  return locale === 'en' ? sub.en : locale === 'ur' ? sub.ur : sub.ar
}

export const SECTOR_COLORS: Record<Sector, string> = {
  civil: '#dbeafe',
  architectural: '#fce7f3',
  electrical: '#fef3c7',
  mechanical: '#d1fae5',
  equipment: '#e7e5e4',
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
  'حجر طبيعي خام':      { en: 'Raw Natural Stone',       ur: 'خام قدرتی پتھر' },
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

export const SECTOR_PRODUCTS: Record<Sector, string[]> = {
  civil: [
    // ═══ الخرسانة (BOQ: C2 POURED CONCRETE, C5 PRECAST) ═══
    'حديد تسليح', 'حديد تسليح سلك', 'شبكة حديد جاهزة', 'أسمنت',
    'خرسانة جاهزة C25', 'خرسانة جاهزة C30', 'خرسانة جاهزة C35', 'خرسانة جاهزة C40',
    'خرسانة مسبقة الصب', 'عتبات خرسانية مسبقة الصب', 'أعمدة مسبقة الصب',
    'بلاطات مسبقة الصب', 'مدرجات مسبقة الصب',
    // ═══ الركام والرمل ═══
    'رمل بناء', 'رمل ناعم', 'حصى', 'زلط', 'كسارة', 'ركام مدمج',
    // ═══ المباني (BOQ: D MASONRY) ═══
    'طوب أحمر', 'طوب فارغ', 'بلوك خرساني', 'بلوك AAC خفيف', 'بلوك EPS عازل',
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
    'أنابيب خرسانية صرف خارجي',
    'غرف تفتيش خرسانية', 'أغطية منهول حديد', 'مصارف خطية',
    // ═══ الأعمال الخارجية (BOQ: B SITE WORK) ═══
    'أعمال ترابية وحفر', 'مواد ردم وتسوية', 'إسفلت',
    'حجر كيرب', 'بلاط رصف خارجي',
    'أنابيب ري HDPE خارجية', 'شبكة ري خارجية',
    // ═══ عزل الأساسات والتشطيب الخارجي ═══
    'شبك رابيتز', 'جير', 'جبصين', 'حجر طبيعي خام',
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
    'واجهات زجاجية Curtain Wall', 'حجر بازلت', 'حجر صناعي',
    // ═══ الإكسسوارات (BOQ: 16-K ACCESSORIES) ═══
    'درابزين ستانلس', 'درابزين زجاجي بحواجز',
    'سلالم حديد', 'مشربيات',
    'أرفف خشبية', 'لوحات إرشادية Signage',
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
    // ═══ أنابيب الصرف الصحي الداخلي (BOQ: Q SANITARY) ═══
    // ✅ الصرف الداخلي = ميكانيك (عكس الصرف الخارجي الذي = مدني)
    'أنابيب uPVC صرف صحي داخلي', 'أنابيب uPVC صرف صحي 50mm',
    'أنابيب uPVC صرف صحي 75mm', 'أنابيب uPVC صرف صحي 100mm',
    'أنابيب uPVC صرف صحي 150mm',
    'أنابيب HDPE صرف صحي داخلي',
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
    // ═══ عُدد يدوية ═══
    'مفك عادي', 'مفك صليبة', 'طقم مفكات', 'زرادية', 'كماشة',
    'مفتاح ربط إنجليزي', 'طقم مفاتيح', 'مطرقة', 'شاكوش',
    'منشار يدوي', 'مبرد حديد', 'إزميل', 'سكين قص',
    // ═══ أدوات قياس ═══
    'متر قياس 5م', 'متر قياس 8م', 'ميزان ماء', 'ميزان ليزر',
    'زاوية قياس', 'شريط قياس معدني',
    // ═══ عُدد كهربائية ═══
    'دريل كهربائي', 'دريل شحن', 'صاروخ تجليخ', 'صاروخ قص',
    'منشار كهربائي', 'مفك كهربائي', 'جلاخة', 'راوتر خشب',
    'مثقاب مطرقي', 'ماكينة لحام', 'ماكينة قص بلازما',
    // ═══ معدات ثقيلة ═══
    'حفارة (بوكلين)', 'شيول لودر', 'بلدوزر', 'جريدر',
    'رافعة برجية', 'كرين متحرك', 'رافعة شوكية',
    'شاحنة قلاب', 'صهريج مياه', 'مقطورة نقل',
    'خلاطة خرسانة', 'مضخة خرسانة', 'هزاز خرسانة',
    // ═══ معدات خفيفة ═══
    'دكاكة (كومباكتور)', 'رصاصة دك', 'هراس أسطواني',
    'مولد كهرباء ديزل', 'كمبروسر هواء', 'ضاغط هواء',
    'طرمبة غطاسة', 'مضخة نزح مياه',
    // ═══ السلامة ═══
    'خوذة سلامة', 'قفازات عمل', 'نظارة واقية',
    'حذاء سلامة', 'سترة عاكسة', 'كمامة غبار',
    'حزام أمان', 'حواجز تحذير', 'أقماع مرورية',
    'شريط تحذير', 'طفاية حريق', 'شبك أمان',
    // ═══ مستهلكات ═══
    'مسامير حديد', 'براغي', 'صواميل', 'رول بلت',
    'خوابير تثبيت', 'قرص قص حديد', 'قرص تجليخ',
    'ورق صنفرة', 'شفرات قص', 'سيليكون', 'فوم عازل',
    'شريط لاصق', 'لاصق قوي',
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
  'ربطة', 'كيس', 'لفة', 'لوحة', 'برميل',
  // الكهرباء والأنظمة (BOQ: point, circuit)
  'نقطة', 'دائرة', 'موقع', 'اتصال',
  // أعمال الموقع (BOQ: item, lump sum)
  'بند', 'مقطوعية', 'إجمالي',
]

export const REGIONS = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
  'ينبع', 'تبوك', 'أبها', 'حائل', 'القصيم', 'جازان', 'نجران',
]

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
