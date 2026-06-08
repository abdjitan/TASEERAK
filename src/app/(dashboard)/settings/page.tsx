// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import SupportThread from '@/components/shared/SupportThread'
import { REGIONS } from '@/types'

const txt = {
  ar: {
    title: 'إعدادات الحساب', back: '← رجوع', logout: 'خروج',
    profileTab: 'معلومات الشركة', passwordTab: 'كلمة المرور', langTab: 'اللغة', docsTab: 'المستندات',
    companyAr: 'اسم الشركة (عربي)', companyEn: 'اسم الشركة (إنجليزي)',
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
    companyAr: 'Company Name (Arabic)', companyEn: 'Company Name (English)',
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
    companyAr: 'کمپنی کا نام (عربی)', companyEn: 'کمپنی کا نام (انگریزی)',
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

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')

  // Profile fields
  const [companyAr, setCompanyAr] = useState('')
  const [companyEn, setCompanyEn] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [vatNumber, setVatNumber] = useState('')
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

  // Docs
  const [licenseFile, setLicenseFile] = useState(null)
  const [crFile, setCrFile] = useState(null)
  const [docsMsg, setDocsMsg] = useState('')
  const [docsSaving, setDocsSaving] = useState(false)
  const [crCheck, setCrCheck] = useState(null)
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
        setSupplierTier(p.supplier_tier || 'local')
        setMinOrderValue(p.min_order_value ? String(p.min_order_value) : '')
        setContractorGrade(p.contractor_grade || '')
      }
      setLoading(false)
    }
    init()
  }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setProfileSaving(true); setProfileMsg('')
    const supabase = createClient()
    const updateData: any = { company_name_ar: companyAr, company_name_en: companyEn, phone, region, city, vat_number: vatNumber || null }
    if (profile?.role === 'supplier') {
      updateData.supplier_tier = supplierTier
      updateData.min_order_value = minOrderValue ? parseFloat(minOrderValue) : 0
    }
    if (profile?.role === 'contractor' && contractorGrade) {
      updateData.contractor_grade = contractorGrade
    }
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)
    setProfileSaving(false)
    setProfileMsg(error ? t.error : t.saved)
    setTimeout(() => setProfileMsg(''), 3000)
  }

  async function changePassword(e) {
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

  async function uploadDocs(e) {
    e.preventDefault()
    if (!licenseFile && !crFile) return
    setDocsSaving(true); setDocsMsg('')
    const supabase = createClient()

    let licenseUrl = profile?.license_url
    let crUrl = profile?.cr_url

    if (licenseFile) {
      const ext = licenseFile.name.split('.').pop()
      const path = `${user.id}/license.${ext}`
      const { data } = await supabase.storage.from('verification').upload(path, licenseFile, { upsert: true })
      if (data) licenseUrl = data.path
    }

    if (crFile) {
      const ext = crFile.name.split('.').pop()
      const path = `${user.id}/cr.${ext}`
      const { data } = await supabase.storage.from('verification').upload(path, crFile, { upsert: true })
      if (data) crUrl = data.path
    }

    const { error } = await supabase.from('profiles').update({
      license_url: licenseUrl,
      cr_url: crUrl,
      verification_status: 'pending',
    }).eq('id', user.id)

    setDocsSaving(false)
    if (error) { setDocsMsg(t.error); return }
    setDocsMsg(t.uploaded)
    setProfile({ ...profile, license_url: licenseUrl, cr_url: crUrl, verification_status: 'pending' })
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
      if (j?.mode === 'wathq' && j?.verified) {
        const supabase = createClient()
        const upd = {
          cr_verification_source: 'wathq',
          cr_verified_at: new Date().toISOString(),
          cr_official_name: j.name || null,
          cr_activity: j.activity || null,
          cr_status: j.status || null,
          cr_expiry_date: j.expiryDate || null,
          cr_issue_date: j.issueDate || null,
          cr_data: j.raw || null,
          verification_status: 'verified',
        }
        await supabase.from('profiles').update(upd).eq('id', user.id)
        setProfile({ ...profile, ...upd })
      }
    } catch {
      setCrCheck({ ok: false, message: t.error })
    }
    setCrChecking(false)
  }

  // open a sensitive doc via a short-lived signed URL (private bucket).
  // legacy values stored as full public URLs still open directly.
  async function openDoc(val) {
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>{t.loading}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" dir={dir} style={{ background: '#f4f6f9' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />

      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href={backHref} className="text-xs text-gray-400 hover:text-gray-600">{t.back}</a>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500">{t.logout}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 relative z-10">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.companyAr}</label>
                      <input value={companyAr} onChange={e => setCompanyAr(e.target.value)}
                        className="input-field" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.companyEn}</label>
                      <input value={companyEn} onChange={e => setCompanyEn(e.target.value)}
                        className="input-field" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t.phone}</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      className="input-field" placeholder="+966 5X XXX XXXX" />
                  </div>

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

                  {/* Supplier Tier */}
                  {profile?.role === 'supplier' && (
                    <div className="border-t border-gray-100 pt-5">
                      <label className="block text-xs font-bold text-gray-500 mb-2">تصنيف شركتك</label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { key: 'manufacturer', icon: '🏭', label: 'مصنع / مورد رئيسي' },
                          { key: 'commercial', icon: '🏪', label: 'مورد تجاري' },
                          { key: 'local', icon: '🏬', label: 'مورد محلي' },
                        ].map(t => (
                          <button key={t.key} type="button" onClick={() => setSupplierTier(t.key)}
                            className={`p-3 rounded-xl border-2 text-center text-xs font-semibold transition-all ${
                              supplierTier === t.key ? 'border-[#F5831F] bg-[#F5831F]/5 text-[#F5831F]' : 'border-gray-200 text-gray-600'
                            }`}>
                            <div className="text-lg mb-1">{t.icon}</div>{t.label}
                          </button>
                        ))}
                      </div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">الحد الأدنى لقيمة الطلب (ر.س)</label>
                      <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
                        className="input-field" placeholder="0 = بدون حد أدنى" min="0" />
                      <p className="text-[10px] text-gray-400 mt-1">سيتم تأكيد التصنيف النهائي من الإدارة عند مراجعة رخصتك</p>
                    </div>
                  )}

                  {/* Contractor Grade */}
                  {profile?.role === 'contractor' && (
                    <div className="border-t border-gray-100 pt-5">
                      <label className="block text-xs font-bold text-gray-500 mb-2">درجة تصنيف شركتك — وزارة الشؤون البلدية</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { g: 'A', label: 'أ', desc: '> 100M', color: '#F5831F' },
                          { g: 'B', label: 'ب', desc: '30–100M', color: '#1B2D5B' },
                          { g: 'C', label: 'ج', desc: '5–30M', color: '#0F6E56' },
                          { g: 'D', label: 'د', desc: '< 5M', color: '#888780' },
                        ].map(g => (
                          <button key={g.g} type="button" onClick={() => setContractorGrade(g.g)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${contractorGrade === g.g ? '' : 'border-gray-200'}`}
                            style={contractorGrade === g.g ? { borderColor: g.color, background: g.color + '12' } : {}}>
                            <div className="text-xl font-black" style={{ color: g.color }}>{g.label}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{g.desc}</div>
                          </button>
                        ))}
                      </div>
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
                          className="text-xs text-blue-600 hover:underline font-semibold">{t.viewDoc}</button>
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
                        : crCheck.mode === 'manual' ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
                          className="text-xs text-blue-600 hover:underline font-semibold">{t.viewDoc}</button>
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
    </div>
  )
}
