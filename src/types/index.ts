// =============================================
// TASEERAK — TypeScript Types
// =============================================

export type UserRole = 'contractor' | 'supplier' | 'admin'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type SubscriptionPlan = 'free' | 'professional'
export type Sector = 'civil' | 'architectural' | 'electrical' | 'mechanical'
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
}

export const SECTOR_COLORS: Record<Sector, string> = {
  civil: '#dbeafe',
  architectural: '#fce7f3',
  electrical: '#fef3c7',
  mechanical: '#d1fae5',
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
  // Mechanical
  'مضخات مياه':         { en: 'Water Pumps',             ur: 'واٹر پمپ' },
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
    'حديد تسليح', 'أسمنت', 'خرسانة جاهزة', 'رمل بناء', 'حصى', 'زلط',
    'طوب أحمر', 'طوب فارغ', 'بلوك خرساني', 'شبك رابيتز', 'كسارة',
    'جير', 'صلب هيكلي', 'أوتاد خرسانية', 'عتبات خرسانية',
    'أنابيب صرف صحي', 'ركام', 'جبصين', 'حجر طبيعي خام',
  ],
  architectural: [
    'بلاط سيراميك', 'بلاط بورسلين', 'رخام طبيعي', 'جرانيت',
    'دهان أكريليك', 'دهان زيتي', 'جبس', 'زجاج عادي', 'زجاج معشش',
    'أبواب خشب', 'نوافذ ألمنيوم', 'نوافذ UPVC', 'حجر بازلت',
    'فوم عازل حراري', 'صوف صخري', 'ديكور خشبي', 'قرميد سقف',
    'مشربيات', 'حجر صناعي', 'سيراميك حمام',
  ],
  electrical: [
    'كابلات NYY', 'كابلات NYCY', 'سلك نحاس', 'قواطع كهربائية',
    'لوحات توزيع', 'مفاتيح كهربائية', 'مقابس كهربائية', 'إضاءة LED',
    'مصابيح فلورسنت', 'أنابيب كهربائية', 'فيوزات', 'عوازل كهربائية',
    'محول كهربائي', 'مولد كهرباء', 'أجهزة حماية', 'رايات كهربائية',
    'كيبل ارضي', 'كشافات خارجية', 'طبلون كهربائي',
  ],
  mechanical: [
    'مضخات مياه', 'مكيفات VRV', 'أنابيب HDPE', 'أنابيب PPR',
    'أنابيب PVC', 'أنابيب نحاس', 'أنابيب CPVC', 'أنابيب PEX',
    'صمامات كرة', 'صمامات بوابة', 'صمامات فحص', 'فلانشات',
    'وصلات أنابيب', 'خزانات ضغط', 'مرشحات مياه', 'سخانات مياه',
    'مراوح هواء', 'مجاري هواء', 'ضواغط هواء', 'وحدات تكييف',
  ],
}

export const UNIT_OPTIONS = [
  'طن', 'ربطة', 'متر', 'م²', 'م³', 'قطعة', 'كيس', 'لتر', 'طقم', 'لوحة'
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
