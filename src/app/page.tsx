// @ts-nocheck
'use client'

import Logo from '@/components/shared/Logo'
import { useTranslation } from '@/i18n'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { SECTOR_LABELS } from '@/types'

const txt = {
  ar: {
    hero: 'أرسل طلب تسعير واحد — واستقبل عروض من عشرات الموردين',
    heroSub: 'منصة تسعيرك تربط المقاولين بالموردين المعتمدين في جميع قطاعات البناء والإنشاء',
    ctaContractor: 'أنا مقاول — أبحث عن موردين',
    ctaSupplier: 'أنا مورد — أريد استقبال طلبات',
    login: 'تسجيل الدخول',
    howTitle: 'كيف تعمل المنصة؟',
    step1: 'أرسل طلب تسعير', step1d: 'حدد المادة والكمية والمنطقة — يصل الطلب لجميع الموردين المعتمدين',
    step2: 'استقبل العروض', step2d: 'الموردين يتنافسون ويقدمون أفضل الأسعار وشروط التوصيل',
    step3: 'قارن واختر', step3d: 'قارن العروض واختر الأفضل — نصدر أمر الشراء تلقائياً',
    sectorsTitle: 'القطاعات المدعومة',
    statsTitle: 'أرقام المنصة',
    s1: 'مورد معتمد', s2: 'طلب تسعير', s3: 'ريال صفقات', s4: 'منطقة مغطاة',
    trustTitle: 'لماذا تسعيرك؟',
    t1: 'موردين معتمدين', t1d: 'جميع الموردين يتم التحقق من رخصهم وسجلاتهم التجارية',
    t2: 'إشعارات فورية', t2d: 'إشعارات واتساب فورية عند وصول عرض أو قبوله',
    t3: 'أمان كامل', t3d: 'بياناتك محمية ومشفرة بأعلى المعايير',
    t4: 'دعم 24/7', t4d: 'فريق دعم متخصص لمساعدتك في أي وقت',
    copyright: '© 2026 تسعيرك — جميع الحقوق محفوظة',
  },
  en: {
    hero: 'Send one RFQ — receive offers from dozens of suppliers',
    heroSub: 'Taseerak connects contractors with verified suppliers across all construction sectors',
    ctaContractor: "I'm a Contractor — Find Suppliers",
    ctaSupplier: "I'm a Supplier — Receive Requests",
    login: 'Sign In',
    howTitle: 'How It Works',
    step1: 'Send an RFQ', step1d: 'Select material, quantity and region — it reaches all verified suppliers',
    step2: 'Receive Offers', step2d: 'Suppliers compete and submit their best prices and delivery terms',
    step3: 'Compare & Choose', step3d: 'Compare all offers and select the best — we issue the PO automatically',
    sectorsTitle: 'Supported Sectors',
    statsTitle: 'Platform Numbers',
    s1: 'Verified Suppliers', s2: 'RFQs Sent', s3: 'SAR in Deals', s4: 'Regions Covered',
    trustTitle: 'Why Taseerak?',
    t1: 'Verified Suppliers', t1d: 'All suppliers are license-verified and commercially registered',
    t2: 'Instant Notifications', t2d: 'WhatsApp alerts when you receive or accept an offer',
    t3: 'Full Security', t3d: 'Your data is encrypted and protected with highest standards',
    t4: '24/7 Support', t4d: 'Dedicated support team ready to help anytime',
    copyright: '© 2026 Taseerak — All rights reserved',
  },
  ur: {
    hero: 'ایک درخواست بھیجیں — درجنوں سپلائرز سے پیشکشیں حاصل کریں',
    heroSub: 'Taseerak ٹھیکیداروں کو تمام تعمیراتی شعبوں میں تصدیق شدہ سپلائرز سے جوڑتا ہے',
    ctaContractor: 'میں ٹھیکیدار ہوں — سپلائرز تلاش کریں',
    ctaSupplier: 'میں سپلائر ہوں — درخواستیں وصول کریں',
    login: 'سائن ان',
    howTitle: 'یہ کیسے کام کرتا ہے؟',
    step1: 'درخواست بھیجیں', step1d: 'مواد، مقدار اور علاقہ منتخب کریں — تمام تصدیق شدہ سپلائرز تک پہنچتا ہے',
    step2: 'پیشکشیں وصول کریں', step2d: 'سپلائرز مقابلہ کرتے ہیں اور بہترین قیمتیں پیش کرتے ہیں',
    step3: 'موازنہ کریں اور منتخب کریں', step3d: 'تمام پیشکشوں کا موازنہ کریں اور بہترین منتخب کریں',
    sectorsTitle: 'معاون شعبے',
    statsTitle: 'پلیٹ فارم کے اعداد و شمار',
    s1: 'تصدیق شدہ سپلائرز', s2: 'قیمت کی درخواستیں', s3: 'ریال سودے', s4: 'علاقے شامل',
    trustTitle: 'Taseerak کیوں؟',
    t1: 'تصدیق شدہ سپلائرز', t1d: 'تمام سپلائرز کے لائسنس اور تجارتی رجسٹریشن کی تصدیق ہوتی ہے',
    t2: 'فوری اطلاعات', t2d: 'پیشکش آنے یا قبول ہونے پر واٹس ایپ الرٹس',
    t3: 'مکمل سیکورٹی', t3d: 'آپ کا ڈیٹا اعلیٰ ترین معیارات کے ساتھ محفوظ ہے',
    t4: '24/7 سپورٹ', t4d: 'کسی بھی وقت مدد کے لیے مخصوص سپورٹ ٹیم',
    copyright: '© 2026 Taseerak — جملہ حقوق محفوظ ہیں',
  },
}

const sectorIcons = { civil: '🏗', architectural: '🏛', electrical: '⚡', mechanical: '⚙️', equipment: '🚜', supply_store: '🏪' }

export default function LandingPage() {
  const { locale, dir } = useTranslation()
  const t = txt[locale] || txt.ar

  return (
    <div className="min-h-screen bg-[#f4f6f9]" dir={dir}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="md" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/login" className="btn-navy text-xs px-4 py-2">{t.login}</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1D3A 0%, #1B2D5B 50%, #2a4a8a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] bg-[#F5831F]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28 text-center">
          <img src="/logo-outlined.png" alt="" className="w-24 h-24 mx-auto mb-8 animate-float" />
          <h1 className="text-3xl lg:text-5xl font-bold text-white mb-5 leading-tight max-w-3xl mx-auto">{t.hero}</h1>
          <p className="text-blue-200 text-base lg:text-lg max-w-xl mx-auto mb-10">{t.heroSub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="btn-orange px-8 py-4 text-base rounded-2xl shadow-lg shadow-[#F5831F]/30">{t.ctaContractor}</a>
            <a href="/register" className="bg-white/10 backdrop-blur text-white border border-white/20 px-8 py-4 rounded-2xl text-base font-semibold hover:bg-white/20 transition-all">{t.ctaSupplier}</a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-[#1B2D5B] text-center mb-12">{t.howTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger">
          {[
            { num: '1', icon: '📤', title: t.step1, desc: t.step1d },
            { num: '2', icon: '📨', title: t.step2, desc: t.step2d },
            { num: '3', icon: '✅', title: t.step3, desc: t.step3d },
          ].map(s => (
            <div key={s.num} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: '#1B2D5B' }}>
                <span>{s.icon}</span>
              </div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold mb-3" style={{ background: '#F5831F' }}>{s.num}</div>
              <h3 className="text-lg font-bold text-[#1B2D5B] mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1B2D5B] text-center mb-12">{t.sectorsTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 stagger">
            {(Object.keys(SECTOR_LABELS) as any[]).map(s => (
              <div key={s} className="bg-[#f4f6f9] rounded-2xl p-6 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-gray-100">
                <div className="text-4xl mb-3">{sectorIcons[s]}</div>
                <div className="font-bold text-[#1B2D5B]">{SECTOR_LABELS[s]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: 'linear-gradient(135deg, #1B2D5B 0%, #2a4a8a 100%)' }} className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-10">{t.statsTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 stagger">
            {[
              { val: '+500', label: t.s1, icon: '🏪' },
              { val: '+1000', label: t.s2, icon: '📋' },
              { val: '+50M', label: t.s3, icon: '💰' },
              { val: '12', label: t.s4, icon: '📍' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-3xl font-bold text-white">{s.val}</div>
                <div className="text-sm text-blue-200 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-[#1B2D5B] text-center mb-12">{t.trustTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger">
          {[
            { icon: '✅', title: t.t1, desc: t.t1d },
            { icon: '📱', title: t.t2, desc: t.t2d },
            { icon: '🔒', title: t.t3, desc: t.t3d },
            { icon: '💬', title: t.t4, desc: t.t4d },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 bg-[#f4f6f9]">{f.icon}</div>
              <h3 className="font-bold text-[#1B2D5B] mb-2">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F5831F] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {locale === 'en' ? 'Ready to get started?' : locale === 'ur' ? 'شروع کرنے کے لیے تیار ہیں؟' : 'جاهز تبدأ؟'}
          </h2>
          <p className="text-orange-100 mb-8">
            {locale === 'en' ? 'Join hundreds of contractors and suppliers on Taseerak' : locale === 'ur' ? 'Taseerak پر سینکڑوں ٹھیکیداروں اور سپلائرز میں شامل ہوں' : 'انضم لمئات المقاولين والموردين على تسعيرك'}
          </p>
          <a href="/register" className="inline-block bg-white text-[#F5831F] px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition-all">
            {locale === 'en' ? 'Create Free Account' : locale === 'ur' ? 'مفت اکاؤنٹ بنائیں' : 'أنشئ حساب مجاني'}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo theme="dark" size="sm" />
            <div className="text-sm">{t.copyright}</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
