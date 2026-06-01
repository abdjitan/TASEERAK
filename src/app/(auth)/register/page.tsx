// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { REGIONS, SECTOR_LABELS, type UserRole, type Sector } from '@/types'

const schema = z.object({
  role: z.enum(['contractor', 'supplier'] as const),
  company_name_ar: z.string().min(3, 'اسم الشركة مطلوب'),
  company_name_en: z.string().optional(),
  commercial_registration: z.string().min(10, 'رقم السجل التجاري غير صحيح'),
  vat_number: z.string().optional(),
  phone: z.string().min(10, 'رقم الجوال غير صحيح'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  region: z.string().min(1, 'اختر المنطقة'),
  city: z.string().min(2, 'المدينة مطلوبة'),
  sectors: z.array(z.string()).min(1, 'اختر قطاعاً واحداً على الأقل'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<'contractor' | 'supplier' | null>(null)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [crFile, setCrFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sectors: [] },
  })

  const sectors = watch('sectors') as Sector[]

  function toggleSector(sector: Sector) {
    const current = sectors || []
    const updated = current.includes(sector)
      ? current.filter(s => s !== sector)
      : [...current, sector]
    setValue('sectors', updated)
  }

  async function uploadFile(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('licenses')
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(data.path)
    return publicUrl
  }

  async function onSubmit(data: FormData) {
    setUploading(true)
    setFormError('')
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            company_name_ar: data.company_name_ar,
            phone: data.phone,
          }
        }
      })

      if (authError) throw new Error(authError.message)
      const userId = authData.user!.id

      // 2. Upload license files
      let licenseUrl = null, crUrl = null
      if (licenseFile) {
        licenseUrl = await uploadFile(licenseFile, `${userId}/license.${licenseFile.name.split('.').pop()}`)
      }
      if (crFile) {
        crUrl = await uploadFile(crFile, `${userId}/cr.${crFile.name.split('.').pop()}`)
      }

      // 3. Update profile with full data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_name_en: data.company_name_en,
          commercial_registration: data.commercial_registration,
          vat_number: data.vat_number,
          region: data.region,
          city: data.city,
          license_url: licenseUrl,
          cr_url: crUrl,
        } as any)
        .eq('id', userId)

      if (profileError) throw new Error(profileError.message)

      // 4. Insert sectors
      const sectorsToInsert = data.sectors.map(sector => ({
        profile_id: userId,
        sector,
      }))
      await supabase.from('profile_sectors').insert(sectorsToInsert as any)

      window.location.href = data.role === 'contractor' ? '/contractor' : '/supplier/dashboard'

    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء التسجيل')
    } finally {
      setUploading(false)
    }
  }

  // Step 1: Choose type
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/logo-outlined.png" alt="Taseerak" className="w-12 h-12" />
              <span className="text-2xl font-bold">Taseerak</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">أهلاً بك</h1>
            <p className="text-gray-500 mt-2">اختر نوع حسابك للبدء</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { type: 'contractor' as 'contractor', icon: '👷', title: 'مقاول', desc: 'أبحث عن موردين وأطلب تسعيرات' },
              { type: 'supplier' as 'supplier', icon: '🏪', title: 'مورد', desc: 'أعرض منتجاتي وأستقبل طلبات' },
            ].map(({ type, icon, title, desc }) => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setValue('role', type) }}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  selectedType === type
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">{icon}</div>
                <div className="font-semibold text-gray-900">{title}</div>
                <div className="text-xs text-gray-500 mt-1">{desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => selectedType && setStep(2)}
            disabled={!selectedType}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            التالي ←
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            لديك حساب؟{' '}
            <a href="/login" className="text-blue-600 font-medium hover:underline">تسجيل الدخول</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-6 mb-2">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 2: Company info */}
          {step === 2 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">بيانات الشركة</h2>
              <p className="text-sm text-gray-500 mb-5">أدخل المعلومات الأساسية لشركتك</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">اسم الشركة (عربي) *</label>
                    <input {...register('company_name_ar')} className="input-field" placeholder="شركة الصخر للمقاولات"/>
                    {errors.company_name_ar && <p className="text-red-500 text-xs mt-1">{errors.company_name_ar.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">الاسم (إنجليزي)</label>
                    <input {...register('company_name_en')} className="input-field" placeholder="Al Sakhr Contracting"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">رقم السجل التجاري *</label>
                    <input {...register('commercial_registration')} className="input-field" placeholder="1010XXXXXXX"/>
                    {errors.commercial_registration && <p className="text-red-500 text-xs mt-1">{errors.commercial_registration.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">رقم الضريبة (VAT)</label>
                    <input {...register('vat_number')} className="input-field" placeholder="3XXXXXXXXXXXXXXX"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">المنطقة *</label>
                    <select {...register('region')} className="input-field">
                      <option value="">-- اختر --</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">المدينة *</label>
                    <input {...register('city')} className="input-field" placeholder="اسم المدينة"/>
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">رقم الجوال (واتساب) *</label>
                  <input {...register('phone')} className="input-field" placeholder="+966 5X XXX XXXX" type="tel"/>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">البريد الإلكتروني *</label>
                  <input {...register('email')} className="input-field" placeholder="info@company.com" type="email"/>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">كلمة المرور *</label>
                  <input {...register('password')} className="input-field" type="password" placeholder="8 أحرف على الأقل"/>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">← رجوع</button>
                <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">التالي ←</button>
              </div>
            </div>
          )}

          {/* Step 3: License upload */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">رفع رخصة العمل</h2>
              <p className="text-sm text-gray-500 mb-5">يتم التحقق خلال 24 ساعة — حسابك يعمل فوراً</p>

              <div className="space-y-4">
                {[
                  { label: 'رخصة العمل *', state: licenseFile, setter: setLicenseFile, required: true },
                  { label: 'السجل التجاري', state: crFile, setter: setCrFile, required: false },
                ].map(({ label, state, setter }) => (
                  <label key={label} className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    state ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400'
                  }`}>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setter(e.target.files?.[0] ?? null)}
                    />
                    {state ? (
                      <div className="text-green-600 font-medium">✓ {state.name}</div>
                    ) : (
                      <>
                        <div className="text-2xl mb-1">📄</div>
                        <div className="font-medium text-gray-700">{label}</div>
                        <div className="text-xs text-gray-400 mt-1">PDF أو صورة — حجم أقصى 5MB</div>
                      </>
                    )}
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">← رجوع</button>
                <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1">التالي ←</button>
              </div>
            </div>
          )}

          {/* Step 4: Sectors */}
          {step === 4 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-1">التخصصات</h2>
              <p className="text-sm text-gray-500 mb-5">اختر القطاعات التي تعمل فيها</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {(Object.keys(SECTOR_LABELS) as Sector[]).map(sector => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => toggleSector(sector)}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      sectors?.includes(sector)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-sm text-gray-900">{SECTOR_LABELS[sector]}</div>
                  </button>
                ))}
              </div>

              {errors.sectors && (
                <p className="text-red-500 text-sm mb-4">{errors.sectors.message}</p>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="btn-ghost flex-1">← رجوع</button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploading}
                  className="btn-primary flex-2 flex-1 disabled:opacity-50"
                >
                  {isSubmitting || uploading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب ←'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
