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

export const SECTOR_PRODUCTS: Record<Sector, string[]> = {
  civil: ['حديد تسليح', 'أسمنت', 'رمل', 'حصى', 'بلوك خرساني', 'شبك رابيتز'],
  architectural: ['بلاط سيراميك', 'دهانات', 'جبس', 'زجاج', 'حجر بازلت'],
  electrical: ['كابلات NYY', 'قواطع كهربائية', 'لوحات توزيع', 'إضاءة LED', 'مفاتيح'],
  mechanical: ['مضخات مياه', 'مكيفات VRV', 'أنابيب HDPE', 'صمامات', 'مراوح'],
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
