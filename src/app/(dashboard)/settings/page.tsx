'use client'

import { useState, useEffect } from 'react'
import PageLoader from '@/components/shared/PageLoader'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import SupportThread from '@/components/shared/SupportThread'
import DistrictField from '@/components/shared/DistrictField'
import EnablePush from '@/components/shared/EnablePush'
import { REGIONS } from '@/types'

const txt = {
  ar: {
    title: 'إعدادات الحساب', back: '← رجوع', logout: 'خروج',
    profileTab: 'معلومات الشركة', passwordTab: 'كلمة المرور', langTab: 'اللغة', docsTab: 'المستندات',
    companyAr: 'اسم الشركة', companyEn: 'اسم الشركة (إنجليزي)',
    phone: 'رقم الجوال (واتساب)', region: 'المنطقة', city: 'المدينة',
    selectRegion: 'اختر المنطقة', saveProfile: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ...', saved: '✓ تم الحفظ بنجاح', error: 'حدث خطأ، حاول مرة أخرى',
    currentPass: 'كلمة المرور الحالية', newPass: 'كلمة المرور الجديدة',
    confirmPass: 'تأكيد كلمة المرور الجديدة', changePass: 'تغيير كلمة المرور',
    passMatch: 'كلمات المرور غير متطابقة', passMin: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    passChanged: '✓ تم تغيير كلمة المرور بنجاح',
    langTitle: 'اختر لغة العرض', langSaved: '✓ تم حفظ اللغة',
    loading: 'جارٍ التحميل...',
    email: 'البريد الإلكتروني', emailNote: 'لا يمكن تغيير البريد الإلكتروني',
    role: 'نوع الحساب', contractor: 'مقاول', supplier: 'مورد',
    verStatus: 'حالة التحقق', pending: 'قيد المراجعة', verified: 'موثق', rejected: 'مرفوض',
    docsTitle: 'المستندات الرسمية', docsSub: 'ارفع مستنداتك لإتمام عملية التحقق',
    licenseLabel: 'رخصة العمل', crLabel: 'السجل التجاري',
    uploadDoc: 'اضغط لرفع الملف', docHint: 'PDF أو صورة — حجم أقصى 5MB',
    uploadBtn: 'رفع المستندات', uploaded: '✓ تم رفع المستندات بنجاح',
    currentDoc: 'المستند الحالي', viewDoc: 'عرض',
    rejectedBanner: 'تم رفض حسابك — يرجى رفع المستندات المطلوبة مرة أخرى',
  },
  en: {
    title: 'Account Settings', back: '← Back', logout: 'Logout',
    profileTab: 'Company Info', passwordTab: 'Password', langTab: 'Language', docsTab: 'Documents',
    companyAr: 'Company Name', companyEn: 'Company Name (English)',
    phone: 'Phone (WhatsApp)', region: 'Region', city: 'City',
    selectRegion: 'Select region', saveProfile: 'Save Changes',
    saving: 'Saving...', saved: '✓ Saved successfully', error: 'An error occurred, try again',
    currentPass: 'Current Password', newPass: 'New Password',
    confirmPass: 'Confirm New Password', changePass: 'Change Password',
    passMatch: 'Passwords do not match', passMin: 'Password must be at least 8 characters',
    passChanged: '✓ Password changed successfully',
    langTitle: 'Choose Display Language', langSaved: '✓ Language saved',
    loading: 'Loading...',
    email: 'Email Address', emailNote: 'Email cannot be changed',
    role: 'Account Type', contractor: 'Contractor', supplier: 'Supplier',
    verStatus: 'Verification Status', pending: 'Pending', verified: 'Verified', rejected: 'Rejected',
    docsTitle: 'Official Documents', docsSub: 'Upload your documents to complete verification',
    licenseLabel: 'Business License', crLabel: 'Commercial Registration',
    uploadDoc: 'Click to upload file', docHint: 'PDF or image — max 5MB',
    uploadBtn: 'Upload Documents', uploaded: '✓ Documents uploaded successfully',
    currentDoc: 'Current document', viewDoc: 'View',
    rejectedBanner: 'Your account was rejected — please reupload required documents',
  },
  ur: {
    title: 'اکاؤنٹ کی ترتیبات', back: '← واپس', logout: 'لاگ آؤٹ',
    profileTab: 'کمپنی کی معلومات', passwordTab: 'پاسورڈ', langTab: 'زبان', docsTab: 'دستاویزات',
    companyAr: 'کمپنی کا نام', companyEn: 'کمپنی کا نام (انگریزی)',
    phone: 'فون (واٹس ایپ)', region: 'علاقہ', city: 'شہر',
    selectRegion: 'علاقہ منتخب کریں', saveProfile: 'تبدیلیاں محفوظ کریں',
    saving: 'محفوظ ہو رہا ہے...', saved: '✓ کامیابی سے محفوظ', error: 'خرابی ہوئی، دوبارہ کوشش کریں',
    currentPass: 'موجودہ پاسورڈ', newPass: 'نیا پاسورڈ',
    confirmPass: 'نئے پاسورڈ کی تصدیق', changePass: 'پاسورڈ تبدیل کریں',
    passMatch: 'پاسورڈ مماثل نہیں', passMin: 'پاسورڈ کم از کم 8 حروف کا ہونا چاہیے',
    passChanged: '✓ پاسورڈ کامیابی سے تبدیل ہو گیا',
    langTitle: 'ڈسپلے زبان منتخب کریں', langSaved: '✓ زبان محفوظ ہو گئی',
    loading: 'لوڈ ہو رہا ہے...',
    email: 'ای میل ایڈریس', emailNote: 'ای میل تبدیل نہیں کی جا سکتی',
    role: 'اکاؤنٹ کی قسم', contractor: 'ٹھیکیدار', supplier: 'سپلائر',
    verStatus: 'تصدیق کی حیثیت', pending: 'زیر التواء', verified: 'تصدیق شدہ', rejected: 'مسترد',
    docsTitle: 'سرکاری دستاویزات', docsSub: 'تصدیق مکمل کرنے کے لیے دستاویزات اپلوڈ کریں',
    licenseLabel: 'کاروباری لائسنس', crLabel: 'تجارتی رجسٹریشن',
    uploadDoc: 'فائل اپلوڈ کرنے کے لیے کلک کریں', docHint: 'PDF یا تصویر — زیادہ سے زیادہ 5MB',
    uploadBtn: 'دستاویزات اپلوڈ کریں', uploaded: '✓ دستاویزات کامیابی سے اپلوڈ',
    currentDoc: 'موجودہ دستاویز', viewDoc: 'دیکھیں',
    rejectedBanner: 'آپ کا اکاؤنٹ مسترد ہو گیا — مطلوبہ دستاویزات دوبارہ اپلوڈ کریں',
  },
}

const langOptions = [
  { key: 'ar', flag: '🇸🇦', name: 'العربية', nameLocal: 'Arabic' },
  { key: 'en', flag: '🇬🇧', name: 'English', nameLocal: 'الإنجليزية' },
  { key: 'ur', flag: '🇵🇰', name: 'اردو', nameLocal: 'Urdu' },
]

export default function SettingsPage() {
  const { locale, dir, setLocale } = useTranslation()
  const t = txt[locale] || txt.ar
  // CR verification (Wathq) labels
  const CRV = {
    ar: { card: 'التحقق الرسمي من السجل التجاري', sub: 'تحقق فوري عبر منصة واثق (وزارة التجارة)', btn: 'تحقق عبر واثق', checking: 'جارٍ التحقق...', noCr: 'لا يوجد رقم سجل تجاري في حسابك' },
    en: { card: 'Official CR Verification', sub: 'Instant verification via Wathq (Ministry of Commerce)', btn: 'Verify via Wathq', checking: 'Checking...', noCr: 'No commercial registration on your account' },
    ur: { card: 'سرکاری CR تصدیق', sub: 'واثق کے ذریعے فوری تصدیق', btn: 'واثق سے تصدیق', checking: 'تصدیق ہو رہی ہے...', noCr: 'آپ کے اکاؤنٹ میں کوئی CR نمبر نہیں' },
  }
  const cv = CRV[locale] || CRV.ar

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')
  // فتح تبويب محدّد عبر ?tab= (مثلاً من «أكمل التوثيق» في «أكمل ملفك» → ?tab=docs)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('tab')
    if (p && ['profile', 'docs', 'password', 'language'].includes(p)) setTab(p)
  }, [])

  // Profile fields
  const [companyAr, setCompanyAr] = useState('')
  const [companyEn, setCompanyEn] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [district, setDistrict] = useState('')
  const [prefLang, setPrefLang] = useState('ar')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password fields
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  // Classification
  const [supplierTier, setSupplierTier] = useState('local')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [contractorGrade, setContractorGrade] = useState('')

  // رقم التواصل الرسمي للمورد (يظهر للمقاول بعد الترسية فقط)
  const [useDiffContact, setUseDiffContact] = useState(false)
  const [contactPhone, setContactPhone] = useState('')

  // Docs
  const [licenseFile, setLicenseFile] = useState<any>(null)
  const [crFile, setCrFile] = useState<any>(null)
  const [docsMsg, setDocsMsg] = useState('')
  const [docsSaving, setDocsSaving] = useState(false)
  const [crCheck, setCrCheck] = useState<any>(null)
  const [crChecking, setCrChecking] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p) {
        setProfile(p)
        setCompanyAr(p.company_name_ar || '')
        setCompanyEn(p.company_name_en || '')
        setPhone(p.phone || '')
        setRegion(p.region || '')
        setCity(p.city || '')
        setVatNumber(p.vat_number || '')
        setDistrict(p.district || '')
        setPrefLang(p.preferred_language || 'ar')
        setSupplierTier(p.supplier_tier || 'local')
        setMinOrderValue(p.min_order_value ? String(p.min_order_value) : '')
        setContractorGrade(p.contractor_grade || '')
        // رقم تواصل مختلف عن الواتساب فقط إذا كان مُخزّناً ومختلفاً عن رقم الجوال
        const cp = p.contact_phone || ''
        if (cp && cp !== (p.phone || '')) { setUseDiffContact(true); setContactPhone(cp) }
        else { setUseDiffContact(false); setContactPhone('') }
      }
      const { data: reqs } = await supabase.from('profile_change_requests').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
      setMyRequests(reqs || [])
      setLoading(false)
    }
    init()
  }, [])

  // Locked-field change requests (name / classification)
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [crqModal, setCrqModal] = useState<any>(null) // 'name' | 'classification'
  const [crqValue, setCrqValue] = useState('')
  const [crqReason, setCrqReason] = useState('')
  const [crqSaving, setCrqSaving] = useState(false)
  const [crqMsg, setCrqMsg] = useState('')
  const pendingFor = (field: any) => myRequests.find((r: any) => r.field === field && r.status === 'pending')

  async function submitChangeRequest() {
    if (!crqValue.trim()) { setCrqMsg(locale === 'en' ? 'Enter the new value' : 'اكتب القيمة الجديدة'); return }
    setCrqSaving(true); setCrqMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('request_profile_change', {
      p_field: crqModal, p_new_value: crqValue.trim(), p_reason: crqReason.trim() || null, p_document_url: null,
    })
    setCrqSaving(false)
    if (error || !data?.ok) {
      const map = {
        pending_exists: 'لديك طلب قيد المراجعة لنفس الحقل بالفعل.',
        cooldown: 'لا يمكن طلب تغيير هذا الحقل إلا بعد ٩٠ يوم من آخر تغيير معتمد.',
        empty: 'القيمة فارغة.',
        unauthorized: 'سجّل الدخول أولاً.',
      }
      setCrqMsg((map as any)[data?.error] || 'تعذّر إرسال الطلب. حاول مرة ثانية.')
      return
    }
    const { data: reqs } = await supabase.from('profile_change_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setMyRequests(reqs || [])
    setCrqModal(null); setCrqValue(''); setCrqReason('')
    setProfileMsg(locale === 'en' ? '✓ Request sent to admin' : '✓ تم إرسال الطلب للإدارة')
    setTimeout(() => setProfileMsg(''), 4000)
  }

  async function saveProfile(e: any) {
    e.preventDefault()
    setProfileSaving(true); setProfileMsg('')
    const supabase = createClient()
    // Note: name (company_name_*) and classification (supplier_tier / contractor_grade)
    // are LOCKED — they change only via an approved request, enforced by a DB trigger.
    const updateData: any = { phone, region, city, vat_number: vatNumber || null, district: district || null, preferred_language: prefLang }
    // اسم الشركة قابل للتعديل حتى التوثيق (المُشغّل يقفله بعده)
    if (!(profile?.verification_status === 'verified' || profile?.cr_verification_source === 'wathq') && companyAr.trim()) {
      updateData.company_name_ar = companyAr.trim()
    }
    if (profile?.role === 'supplier') {
      updateData.min_order_value = minOrderValue ? parseFloat(minOrderValue) : 0
      // إذا اختار رقم مختلف نخزّنه، وإلا نُفرّغه ليُستخدم رقم الجوال تلقائياً بعد الترسية
      updateData.contact_phone = useDiffContact ? (contactPhone.trim() || null) : null
    }
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)
    setProfileSaving(false)
    setProfileMsg(error ? t.error : t.saved)
    setTimeout(() => setProfileMsg(''), 3000)
  }

  async function changePassword(e: any) {
    e.preventDefault()
    setPassMsg('')
    if (newPass.length < 8) { setPassMsg(t.passMin); return }
    if (newPass !== confirmPass) { setPassMsg(t.passMatch); return }
    setPassSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassSaving(false)
    if (error) { setPassMsg(t.error); return }
    setPassMsg(t.passChanged)
    setNewPass(''); setConfirmPass('')
    setTimeout(() => setPassMsg(''), 3000)
  }

  async function uploadDocs(e: any) {
    e.preventDefault()
    if (!licenseFile && !crFile) return
    setDocsSaving(true); setDocsMsg('')
    const supabase = createClient()

    let licenseUrl = profile?.license_url
    let crUrl = profile?.cr_url

    // رفع عبر مسار خادمي يفحص المحتوى (magic-byte) قبل التخزين — لا رفع مباشر من المتصفح
    async function up(file: any, kind: string): Promise<string | null> {
      const fd = new FormData(); fd.append('file', file); fd.append('kind', kind)
      const res = await fetch('/api/upload-verification', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) { setDocsMsg(j?.message || t.error); return null }
      return j.path as string
    }

    if (licenseFile) {
      const p = await up(licenseFile, 'license')
      if (p === null) { setDocsSaving(false); return }
      licenseUrl = p
    }

    if (crFile) {
      const p = await up(crFile, 'cr')
      if (p === null) { setDocsSaving(false); return }
      crUrl = p
    }

    // license_url/cr_url aren't locked and persist directly; verification_status IS locked,
    // so reset it to 'pending' via a trusted RPC — otherwise a rejected supplier's re-upload
    // never re-enters admin review (the client write was silently reverted) (B7).
    const { error } = await supabase.from('profiles').update({
      license_url: licenseUrl,
      cr_url: crUrl,
    }).eq('id', user.id)
    if (!error) await supabase.rpc('request_reverification')

    setDocsSaving(false)
    if (error) { setDocsMsg(t.error); return }
    setDocsMsg(t.uploaded)
    setProfile({ ...profile, license_url: licenseUrl, cr_url: crUrl, verification_status: profile?.verification_status === 'verified' ? 'verified' : 'pending' })
    setLicenseFile(null); setCrFile(null)
    setTimeout(() => setDocsMsg(''), 4000)
  }

  // Verify existing profile's CR against the official source (Wathq)
  async function verifyCRSettings() {
    const cr = (profile?.commercial_registration || '').toString()
    if (!/^[0-9]{10}$/.test(cr)) { setCrCheck({ ok: false, message: cv.noCr }); return }
    setCrChecking(true); setCrCheck(null)
    try {
      const res = await fetch('/api/verify-cr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr }),
      })
      const j = await res.json()
      setCrCheck(j)
      // NOTE (B7/security): account verification is NOT granted from here. verification_status
      // and cr_* are locked against client writes (the old update was silently reverted), and a
      // CR being active is not sufficient on its own — full verification requires the two-factor
      // owner match via /api/verify-identity (which persists server-side) or admin approval.
      // This flow only shows the official CR status to the user.
    } catch {
      setCrCheck({ ok: false, message: t.error })
    }
    setCrChecking(false)
  }

  // open a sensitive doc via a short-lived signed URL (private bucket).
  // legacy values stored as full public URLs still open directly.
  async function openDoc(val: any) {
    if (!val) return
    if (typeof val === 'string' && val.startsWith('http')) { window.open(val, '_blank'); return }
    const supabase = createClient()
    const { data } = await supabase.storage.from('verification').createSignedUrl(val, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const backHref = profile?.role === 'supplier' ? '/supplier/dashboard' : '/contractor'

  if (loading) return <PageLoader />

  return (
    <AppShell title={t.title} company={companyAr} userId={user?.id} nav={getNav(profile?.role, locale, '/settings')} onSignOut={handleSignOut} dir={dir}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-8" style={{ color: '#1B2D5B' }}>{t.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
              {/* Avatar */}
              <div className="text-center p-4 border-b border-gray-50 mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-3 font-bold"
                  style={{ background: '#1B2D5B' }}>
                  {companyAr?.[0] || '?'}
                </div>
                <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{companyAr}</div>
                <div className="text-xs text-gray-400 mt-0.5">{user?.email}</div>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                  profile?.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                  profile?.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {profile?.verification_status === 'verified' ? t.verified : profile?.verification_status === 'rejected' ? t.rejected : t.pending}
                </span>
              </div>

              {[
                { key: 'profile', icon: '🏢', label: t.profileTab },
                { key: 'docs', icon: '📄', label: t.docsTab },
                { key: 'support', icon: '💬', label: locale === 'en' ? 'Support' : locale === 'ur' ? 'سپورٹ' : 'الدعم والرسائل' },
                { key: 'password', icon: '🔒', label: t.passwordTab },
                { key: 'language', icon: '🌐', label: t.langTab },
              ].map(item => (
                <button key={item.key} onClick={() => setTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-right ${
                    tab === item.key ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={tab === item.key ? { background: '#1B2D5B' } : {}}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {tab === 'profile' && (
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-6" style={{ color: '#1B2D5B' }}>{t.profileTab}</h2>

                {/* Read-only info */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#f4f6f9] rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.email}</label>
                    <div className="text-sm text-gray-700">{user?.email}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{t.emailNote}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.role}</label>
                    <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                      {profile?.role === 'contractor' ? t.contractor : t.supplier}
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-5">
                  <div className={companyEn ? 'grid grid-cols-2 gap-4' : ''}>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.companyAr} {(profile?.verification_status === 'verified' || profile?.cr_verification_source === 'wathq') ? '🔒' : ''}</label>
                      {(profile?.verification_status === 'verified' || profile?.cr_verification_source === 'wathq') ? (
                        <div className="input-field bg-gray-50 text-gray-700 flex items-center min-h-[44px]">{companyAr || '—'}</div>
                      ) : (
                        <input value={companyAr} onChange={e => setCompanyAr(e.target.value)} className="input-field" placeholder={locale === 'en' ? 'Company / business name' : 'اسم الشركة أو النشاط'} />
                      )}
                    </div>
                    {companyEn && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.companyEn} 🔒</label>
                        <div className="input-field bg-gray-50 text-gray-500 flex items-center min-h-[44px]" dir="ltr">{companyEn}</div>
                      </div>
                    )}
                  </div>
                  <div className="-mt-3">
                    {(profile?.verification_status === 'verified' || profile?.cr_verification_source === 'wathq') ? (
                      pendingFor('name')
                        ? <p className="text-[11px] text-amber-600">⏳ طلب تغيير الاسم قيد مراجعة الإدارة (إلى «{pendingFor('name').new_value}»).</p>
                        : <button type="button" onClick={() => { setCrqModal('name'); setCrqValue(companyAr); setCrqReason(''); setCrqMsg('') }} className="text-[11px] font-semibold underline" style={{ color: '#1B2D5B' }}>🔒 الاسم ثابت لارتباطه بالسجل التجاري — اطلب تعديله</button>
                    ) : (
                      <p className="text-[11px] text-gray-400">✏️ {locale === 'en' ? 'You can edit your company name until your account is verified.' : 'يمكنك تعديل اسم الشركة حتى يتم توثيق حسابك، ثم يُقفل.'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.phone}{profile?.role === 'supplier' ? ' (واتساب)' : ''}</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      className="input-field" placeholder="+966 5X XXX XXXX" />
                    {profile?.role === 'supplier' && (
                      <p className="text-[10px] text-gray-400 mt-1">🔒 رقم الواتساب للمنصة والإشعارات فقط — لا يظهر للمقاول.</p>
                    )}
                  </div>

                  {/* رقم التواصل الرسمي — يظهر للمقاول بعد الترسية فقط (المورد فقط) */}
                  {profile?.role === 'supplier' && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                      <label className="block text-xs font-bold text-gray-600 mb-2">📞 رقم التواصل الرسمي مع المقاول</label>
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={!useDiffContact} onChange={e => setUseDiffContact(!e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                        <span className="text-xs text-gray-700">نفس رقم الواتساب</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={useDiffContact} onChange={e => setUseDiffContact(e.target.checked)} className="w-4 h-4 accent-[#0F6E56]" />
                        <span className="text-xs text-gray-700">رقم آخر للتواصل</span>
                      </label>
                      {useDiffContact && (
                        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                          className="input-field" dir="ltr" placeholder="+966 1X XXX XXXX" />
                      )}
                      <p className="text-[10px] text-gray-400 mt-1.5">يظهر هذا الرقم للمقاول <b>بعد الترسية فقط</b>. قبلها يكون التواصل عبر الدردشة الداخلية.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      {locale === 'en' ? 'VAT Number' : locale === 'ur' ? 'ٹیکس نمبر' : 'الرقم الضريبي (ضريبة القيمة المضافة)'}
                    </label>
                    <input value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                      className="input-field font-mono" dir="ltr" placeholder="3XXXXXXXXXXXXX3" maxLength={15} />
                    <p className="text-[10px] text-gray-400 mt-1">
                      {locale === 'en' ? 'Required to issue ZATCA tax invoices.' : locale === 'ur' ? 'ٹیکس انوائس کے لیے ضروری۔' : 'يلزم لإصدار الفواتير الضريبية المتوافقة مع هيئة الزكاة والضريبة.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.region}</label>
                      <select value={region} onChange={e => setRegion(e.target.value)} className="input-field">
                        <option value="">{t.selectRegion}</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.city}</label>
                      <input value={city} onChange={e => setCity(e.target.value)} className="input-field" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'District' : locale === 'ur' ? 'علاقہ' : 'الحي'}</label>
                      <DistrictField city={city} value={district} onChange={setDistrict} locale={locale} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{locale === 'en' ? 'Notification language' : locale === 'ur' ? 'اطلاعات کی زبان' : 'لغة الإشعارات'}</label>
                      <select value={prefLang} onChange={e => setPrefLang(e.target.value)} className="input-field">
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                        <option value="ur">اردو</option>
                      </select>
                    </div>
                  </div>

                  {/* إشعارات المتصفح (Web Push) */}
                  <div className="border-t border-gray-100 pt-5">
                    <EnablePush variant="card" />
                  </div>

                  {/* Supplier Tier — locked */}
                  {profile?.role === 'supplier' && (
                    <div className="border-t border-gray-100 pt-5">
                      <label className="block text-xs font-bold text-gray-500 mb-2">تصنيف شركتك 🔒</label>
                      <div className="mb-1">
                        <span className="inline-block px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                          {supplierTier === 'manufacturer' ? '🏭 مصنع / مورد رئيسي' : supplierTier === 'commercial' ? '🏪 مورد تجاري' : '🏬 مورد محلي'}
                        </span>
                      </div>
                      {pendingFor('classification')
                        ? <p className="text-[11px] text-amber-600 mb-3">⏳ طلب تغيير التصنيف قيد مراجعة الإدارة.</p>
                        : <button type="button" onClick={() => { setCrqModal('classification'); setCrqValue(supplierTier || 'local'); setCrqReason(''); setCrqMsg('') }} className="text-[11px] font-semibold underline mb-3 inline-block" style={{ color: '#1B2D5B' }}>🔒 التصنيف ثابت — اطلب تعديله</button>}
                      <label className="block text-xs font-bold text-gray-500 mb-1 mt-2">الحد الأدنى لقيمة الطلب (ر.س)</label>
                      <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
                        className="input-field" placeholder="0 = بدون حد أدنى" min="0" />
                      <p className="text-[10px] text-gray-400 mt-1">التصنيف يُعتمد من الإدارة — لتعديله قدّم طلباً.</p>
                    </div>
                  )}

                  {/* Contractor Grade — locked */}
                  {profile?.role === 'contractor' && (
                    <div className="border-t border-gray-100 pt-5">
                      <label className="block text-xs font-bold text-gray-500 mb-2">درجة تصنيف شركتك — وزارة الشؤون البلدية 🔒</label>
                      <div className="mb-1">
                        <span className="inline-block px-5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-black text-gray-700">
                          {contractorGrade ? `درجة ${({ A: 'أ', B: 'ب', C: 'ج', D: 'د' })[contractorGrade] || contractorGrade}` : '— غير محدّدة —'}
                        </span>
                      </div>
                      {pendingFor('classification')
                        ? <p className="text-[11px] text-amber-600">⏳ طلب تغيير الدرجة قيد مراجعة الإدارة.</p>
                        : <button type="button" onClick={() => { setCrqModal('classification'); setCrqValue(contractorGrade || 'C'); setCrqReason(''); setCrqMsg('') }} className="text-[11px] font-semibold underline" style={{ color: '#1B2D5B' }}>🔒 الدرجة ثابتة — اطلب تعديلها</button>}
                    </div>
                  )}

                  {profileMsg && (
                    <div className={`text-sm rounded-xl p-3 ${profileMsg.includes('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      {profileMsg}
                    </div>
                  )}

                  <button type="submit" disabled={profileSaving}
                    className="px-8 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg"
                    style={{ background: '#F5831F' }}>
                    {profileSaving ? t.saving : t.saveProfile}
                  </button>
                </form>

                {/* Locked-field change request modal */}
                {crqModal && (
                  <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => !crqSaving && setCrqModal(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" dir="rtl" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>
                        {crqModal === 'name' ? '🔒 طلب تعديل اسم الشركة' : '🔒 طلب تعديل التصنيف'}
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">يُرسل الطلب للإدارة للمراجعة — لا يتغيّر شيء قبل الموافقة.</p>

                      {crqModal === 'name' ? (
                        <>
                          <label className="block text-xs font-bold text-gray-500 mb-1">الاسم الجديد</label>
                          <input value={crqValue} onChange={e => setCrqValue(e.target.value)} className="input-field mb-3" />
                        </>
                      ) : profile?.role === 'supplier' ? (
                        <>
                          <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف الجديد</label>
                          <select value={crqValue} onChange={e => setCrqValue(e.target.value)} className="input-field mb-3">
                            <option value="manufacturer">🏭 مصنع / مورد رئيسي</option>
                            <option value="commercial">🏪 مورد تجاري</option>
                            <option value="local">🏬 مورد محلي</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة الجديدة</label>
                          <select value={crqValue} onChange={e => setCrqValue(e.target.value)} className="input-field mb-3">
                            <option value="A">درجة أ</option>
                            <option value="B">درجة ب</option>
                            <option value="C">درجة ج</option>
                            <option value="D">درجة د</option>
                          </select>
                        </>
                      )}

                      <label className="block text-xs font-bold text-gray-500 mb-1">سبب التغيير{crqModal === 'name' ? ' (قد تطلب الإدارة سجلاً تجارياً محدّثاً)' : ''}</label>
                      <textarea value={crqReason} onChange={e => setCrqReason(e.target.value)} rows={3} className="input-field mb-3" placeholder="وضّح سبب التعديل..." />

                      {crqMsg && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">{crqMsg}</div>}

                      <div className="flex gap-2">
                        <button type="button" disabled={crqSaving} onClick={submitChangeRequest} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#1B2D5B' }}>
                          {crqSaving ? 'جارٍ الإرسال...' : 'إرسال الطلب للإدارة'}
                        </button>
                        <button type="button" onClick={() => setCrqModal(null)} className="px-5 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">إلغاء</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Tab */}
            {tab === 'password' && (
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-6" style={{ color: '#1B2D5B' }}>{t.passwordTab}</h2>

                <form onSubmit={changePassword} className="space-y-5 max-w-md">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    💡 {locale === 'en' ? 'Enter your new password and confirm it below' : locale === 'ur' ? 'نیچے اپنا نیا پاسورڈ درج کریں اور تصدیق کریں' : 'أدخل كلمة المرور الجديدة وأكدها'}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.newPass}</label>
                    <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                      className="input-field" placeholder="••••••••" required minLength={8} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.confirmPass}</label>
                    <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                      className="input-field" placeholder="••••••••" required />
                  </div>

                  {passMsg && (
                    <div className={`text-sm rounded-xl p-3 ${passMsg.includes('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      {passMsg}
                    </div>
                  )}

                  <button type="submit" disabled={passSaving}
                    className="px-8 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg"
                    style={{ background: '#1B2D5B' }}>
                    {passSaving ? t.saving : t.changePass}
                  </button>
                </form>
              </div>
            )}

            {/* Docs Tab */}
            {tab === 'docs' && (
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>{t.docsTitle}</h2>
                <p className="text-sm text-gray-500 mb-6">{t.docsSub}</p>

                {profile?.verification_status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-2">
                    <span>❌</span>
                    <div className="text-sm text-red-600 font-medium">{t.rejectedBanner}</div>
                  </div>
                )}

                <form onSubmit={uploadDocs} className="space-y-5">
                  {/* License */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">{t.licenseLabel}</label>
                    {profile?.license_url && !licenseFile && (
                      <div className="flex items-center gap-3 mb-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-600 text-sm">✓ {t.currentDoc}</span>
                        <button type="button" onClick={() => openDoc(profile.license_url)}
                          className="text-xs text-[#d96f15] hover:underline font-semibold">{t.viewDoc}</button>
                      </div>
                    )}
                    <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                      licenseFile ? 'border-[#1B2D5B] bg-[#1B2D5B]/5' : 'border-gray-200 hover:border-[#F5831F]/50'
                    }`}>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setLicenseFile(e.target.files?.[0] ?? null)} />
                      <span className="text-2xl">{licenseFile ? '📎' : '📄'}</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-700">
                          {licenseFile ? licenseFile.name : t.uploadDoc}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{t.docHint}</div>
                      </div>
                    </label>
                  </div>

                  {/* Official CR verification via Wathq */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#0F6E56' }}>
                          🛡 {cv.card}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{cv.sub}</div>
                        {profile?.commercial_registration && (
                          <div className="text-[11px] text-gray-400 mt-1 font-mono" dir="ltr">CR: {profile.commercial_registration}</div>
                        )}
                      </div>
                      {profile?.verification_status === 'verified' && profile?.cr_verification_source === 'wathq' ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg font-bold text-white" style={{ background: '#0F6E56' }}>🛡 {t.verified}</span>
                      ) : (
                        <button type="button" onClick={verifyCRSettings} disabled={crChecking}
                          className="text-xs px-4 py-2 rounded-xl font-bold text-white whitespace-nowrap disabled:opacity-50 transition-all hover:shadow"
                          style={{ background: '#0F6E56' }}>
                          {crChecking ? cv.checking : `🛡 ${cv.btn}`}
                        </button>
                      )}
                    </div>
                    {crCheck && (
                      <div className={`text-xs rounded-lg p-2.5 mt-3 flex items-start gap-2 ${
                        crCheck.verified ? 'bg-emerald-100 text-emerald-800'
                        : crCheck.mode === 'manual' ? 'bg-[#F5831F]/5 text-[#d96f15] border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span>{crCheck.verified ? '🛡' : crCheck.mode === 'manual' ? 'ℹ️' : '⚠️'}</span>
                        <div>
                          {crCheck.name && <div className="font-bold">{crCheck.name}</div>}
                          {crCheck.activity && <div className="opacity-80">{crCheck.activity}</div>}
                          <div>{crCheck.message}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CR */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">{t.crLabel}</label>
                    {profile?.cr_url && !crFile && (
                      <div className="flex items-center gap-3 mb-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-600 text-sm">✓ {t.currentDoc}</span>
                        <button type="button" onClick={() => openDoc(profile.cr_url)}
                          className="text-xs text-[#d96f15] hover:underline font-semibold">{t.viewDoc}</button>
                      </div>
                    )}
                    <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                      crFile ? 'border-[#1B2D5B] bg-[#1B2D5B]/5' : 'border-gray-200 hover:border-[#F5831F]/50'
                    }`}>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setCrFile(e.target.files?.[0] ?? null)} />
                      <span className="text-2xl">{crFile ? '📎' : '📋'}</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-700">
                          {crFile ? crFile.name : t.uploadDoc}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{t.docHint}</div>
                      </div>
                    </label>
                  </div>

                  {docsMsg && (
                    <div className={`text-sm rounded-xl p-3 ${docsMsg.includes('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      {docsMsg}
                    </div>
                  )}

                  <button type="submit" disabled={docsSaving || (!licenseFile && !crFile)}
                    className="px-8 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:shadow-lg"
                    style={{ background: '#F5831F' }}>
                    {docsSaving ? t.saving : t.uploadBtn}
                  </button>
                </form>
              </div>
            )}

            {/* Support / Messages Tab */}
            {tab === 'support' && (
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>
                  {locale === 'en' ? 'Support & Messages' : locale === 'ur' ? 'سپورٹ اور پیغامات' : 'الدعم والرسائل'}
                </h2>
                <p className="text-sm text-gray-500 mb-5">
                  {locale === 'en' ? 'Message the admin team directly about any issue — they will reply here.'
                    : locale === 'ur' ? 'کسی بھی مسئلے پر انتظامیہ کو پیغام بھیجیں — وہ یہیں جواب دیں گے۔'
                    : 'راسل فريق الإدارة مباشرة حول أي مشكلة — وسيردّون عليك هنا.'}
                </p>
                {user && <SupportThread userId={user.id} viewerRole="user" />}
              </div>
            )}

            {/* Language Tab */}
            {tab === 'language' && (
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm animate-fade-in">
                <h2 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>{t.langTab}</h2>
                <p className="text-sm text-gray-500 mb-6">{t.langTitle}</p>

                <div className="grid grid-cols-3 gap-4">
                  {langOptions.map(lang => (
                    <button key={lang.key} onClick={() => setLocale(lang.key as any)}
                      className={`p-6 rounded-2xl border-2 text-center transition-all hover:-translate-y-0.5 ${
                        locale === lang.key ? 'border-[#F5831F] bg-[#F5831F]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="text-4xl mb-3">{lang.flag}</div>
                      <div className={`font-bold text-sm ${locale === lang.key ? 'text-[#F5831F]' : 'text-gray-800'}`}>{lang.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{lang.nameLocal}</div>
                      {locale === lang.key && (
                        <div className="mt-2 text-xs font-bold" style={{ color: '#F5831F' }}>✓ {t.langSaved}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
