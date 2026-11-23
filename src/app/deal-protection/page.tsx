'use client'

import Link from 'next/link'
import PublicFooter from '@/components/public/PublicFooter'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import HomeOrAccountLink from '@/components/public/HomeOrAccountLink'
import Glyph from '@/components/shared/Glyph'
import { useSignedIn } from '@/components/public/useSignedIn'
import { OPERATOR } from '@/lib/legal'
import { Search, PackageCheck, AlertTriangle, Headset, Star, Scale, MessageCircle } from 'lucide-react'

const SECTION_ICONS = [Search, PackageCheck, AlertTriangle, Headset, Star, Scale]
const SUPPORT_WHATSAPP = '12135614366'

// «كيف نحمي صفقتك» (owner's decisions file, 2026-10-31): what happens when a material arrives wrong
// or short, and how a problem is handled. It describes what the platform really does (receipt
// record, «أبلغ عن مشكلة», admin follow-up, effect on the supplier's record) and stays within the
// terms (§7: payment and delivery are between the parties; the platform helps, it does not hold money).
const C: Record<string, any> = {
  ar: {
    title: 'كيف نحمي صفقتك',
    home: 'الرئيسية',
    intro: 'تسعيرك تجمع لك عروض الموردين وتساعدك على إتمام الصفقة بوضوح. هذه الصفحة تشرح ما تفعله إذا وصلتك مادة مخالفة أو ناقصة، وكيف نتعامل مع البلاغ.',
    sections: [
      ['1. قبل الصفقة', 'تعرف من تتعامل معه: شارة التوثيق بالسجل التجاري، والتقييم العام للمورد، وعدد صفقاته على المنصة. وكل عرض مكتوب بسعره وكميته وموعد توصيله وشروط دفعه، وعند اختيارك له يصدر مستند صفقة موثّق يحفظ ما اتفقتما عليه.'],
      ['2. عند الاستلام', 'افحص المادة قبل تأكيد الاستلام، وقارنها بمستند الصفقة (النوع والمقاس والكمية والماركة إن حددتها). يُستحسن تصوير الحمولة عند وصولها. ثم أكّد الاستلام من صفحة الصفقة؛ تأكيدك يعني أن المادة وصلت كما طلبت.'],
      ['3. إذا وصلت مادة مخالفة أو ناقصة', 'لا تؤكّد الاستلام. افتح صفحة الصفقة واضغط «واجهت مشكلة؟ أبلغ عنها»، واكتب ما حدث بوضوح (مثلاً: 40 كيساً بدلاً من 50، أو مقاس مختلف)، وأرسل الصور في محادثة الصفقة. يصل البلاغ إلى المورد وإلى فريق تسعيرك فوراً، وتظهر الصفقة للطرفين بحالة «بلاغ عن مشكلة».'],
      ['4. كيف نتابع البلاغ', 'يراجع فريق تسعيرك البلاغ ويتواصل مع الطرفين لتوثيق ما حدث ومساعدتهما على الوصول إلى حل، مثل إكمال النقص أو استبدال المادة أو تخفيض السعر بالاتفاق. ويُسجَّل ما انتهى إليه البلاغ في الصفقة ويُشعَر به الطرفان.'],
      ['5. أثر ذلك على المورد', 'البلاغات التي تثبت صحتها تؤثر في تقييم المورد العام، وقد يؤدي تكرارها إلى تعليق حسابه. لذلك يحرص الموردون على مطابقة ما يوردونه لما سعّروه.'],
      ['6. حدود دور المنصة', 'يتم الدفع والتسليم مباشرة بين المشتري والمورد. لا تحتفظ تسعيرك بالمبالغ ولا تضمن السداد أو التسليم، ولا تكون طرفاً في عقد البيع، لكنها توثّق الصفقة وتساعد في التواصل وحلّ المشكلة. وللطرفين في كل الأحوال اللجوء إلى الجهات المختصة. التفاصيل في الشروط والأحكام.'],
    ],
    terms: 'الشروط والأحكام', privacy: 'سياسة الخصوصية',
    readyH: 'جاهز؟ اطلب أسعار موادك الآن', readyP: 'أرسل طلباً واحداً ويتنافس عليه الموردون، أو انضم مورداً واستقبل طلبات التسعير.', request: 'اطلب تسعيرة', join: 'انضم كمورد',
  },
  en: {
    title: 'How we protect your deal',
    home: 'Home',
    intro: 'Taseerak gathers suppliers’ offers for you and helps you close the deal clearly. This page explains what to do if a material arrives wrong or short, and how a report is handled.',
    sections: [
      ['1. Before the deal', 'Know who you deal with: the commercial-registration badge, the supplier’s overall score and number of deals on the platform. Every offer states its price, quantity, delivery date and payment terms, and choosing it issues a deal document that records what you agreed.'],
      ['2. On delivery', 'Inspect the material before confirming receipt and compare it with the deal document (type, size, quantity and brand if you set one). Photographing the load on arrival is recommended. Then confirm receipt on the deal page; confirming means the material arrived as ordered.'],
      ['3. If a material arrives wrong or short', 'Do not confirm receipt. Open the deal page, tap «Had a problem? Report it», describe what happened clearly (e.g. 40 bags instead of 50, or a different size) and send the photos in the deal’s chat. The report reaches the supplier and the Taseerak team at once, and the deal shows «Problem reported» to both sides.'],
      ['4. How we follow up', 'The Taseerak team reviews the report and contacts both sides to document what happened and help them reach a solution, such as completing the shortfall, replacing the material or an agreed price reduction. The outcome is recorded on the deal and both sides are notified.'],
      ['5. Effect on the supplier', 'Reports found to be valid affect the supplier’s overall rating, and repeated ones may lead to the account being suspended. So suppliers take care to deliver what they priced.'],
      ['6. The platform’s role', 'Payment and delivery take place directly between buyer and supplier. Taseerak does not hold money, does not guarantee payment or delivery and is not a party to the sale, but it records the deal and helps with communication and resolving the problem. Either side may always turn to the competent authorities. Details are in the Terms.'],
    ],
    terms: 'Terms and Conditions', privacy: 'Privacy policy',
    readyH: 'Ready? Request prices for your materials now', readyP: 'Send one request and suppliers compete for it, or join as a supplier and receive price requests.', request: 'Request a price', join: 'Join as a supplier',
  },
  ur: {
    title: 'ہم آپ کے سودے کی حفاظت کیسے کرتے ہیں',
    home: 'مرکزی صفحہ',
    intro: 'تسعیرک آپ کے لیے سپلائرز کی پیشکشیں جمع کرتا ہے اور سودا واضح طریقے سے مکمل کرنے میں مدد دیتا ہے۔ یہ صفحہ بتاتا ہے کہ غلط یا کم مال آنے پر کیا کریں اور شکایت کیسے نمٹائی جاتی ہے۔',
    sections: [
      ['1. سودے سے پہلے', 'جانیے کس سے معاملہ کر رہے ہیں: تجارتی رجسٹریشن کا بیج، سپلائر کا مجموعی اسکور اور پلیٹ فارم پر سودوں کی تعداد۔ ہر پیشکش میں قیمت، مقدار، ڈیلیوری کی تاریخ اور ادائیگی کی شرائط درج ہوتی ہیں، اور منتخب کرنے پر ڈیل کی دستاویز بنتا ہے۔'],
      ['2. وصولی پر', 'وصولی کی تصدیق سے پہلے مال چیک کریں اور ڈیل کی دستاویز سے ملائیں (قسم، سائز، مقدار اور برانڈ)۔ مال پہنچنے پر تصویر لینا بہتر ہے۔ پھر سودے کے صفحے سے وصولی کی تصدیق کریں۔'],
      ['3. اگر مال غلط یا کم آئے', 'وصولی کی تصدیق نہ کریں۔ سودے کا صفحہ کھولیں، «مسئلہ پیش آیا؟ رپورٹ کریں» دبائیں، واضح لکھیں کیا ہوا (مثلاً 50 کی جگہ 40 بوریاں، یا مختلف سائز)، اور تصاویر سودے کی گفتگو میں بھیجیں۔ رپورٹ فوراً سپلائر اور تسعیرک ٹیم تک پہنچتی ہے۔'],
      ['4. ہم کیسے پیروی کرتے ہیں', 'تسعیرک ٹیم رپورٹ دیکھ کر دونوں فریقوں سے رابطہ کرتی ہے اور حل تک پہنچنے میں مدد دیتی ہے، جیسے کمی پوری کرنا، مال بدلنا یا باہمی رضامندی سے قیمت کم کرنا۔ نتیجہ سودے میں درج ہوتا ہے اور دونوں کو اطلاع دی جاتی ہے۔'],
      ['5. سپلائر پر اثر', 'درست ثابت ہونے والی شکایات سپلائر کی مجموعی ریٹنگ پر اثر ڈالتی ہیں، اور بار بار ہونے پر اکاؤنٹ معطل ہو سکتا ہے۔'],
      ['6. پلیٹ فارم کا کردار', 'ادائیگی اور ڈیلیوری براہِ راست خریدار اور سپلائر کے درمیان ہوتی ہے۔ تسعیرک رقم اپنے پاس نہیں رکھتا، ادائیگی یا ڈیلیوری کی ضمانت نہیں دیتا اور فروخت کے معاہدے کا فریق نہیں، لیکن سودا دستاویز کرتا ہے اور مسئلہ حل کرنے میں مدد دیتا ہے۔ تفصیل شرائط میں ہے۔'],
    ],
    terms: 'شرائط و ضوابط', privacy: 'رازداری کی پالیسی',
    readyH: 'تیار ہیں؟ ابھی اپنے سامان کی قیمتیں منگوائیں', readyP: 'ایک درخواست بھیجیں اور سپلائرز اس پر مقابلہ کریں، یا سپلائر بن کر قیمت کی درخواستیں وصول کریں۔', request: 'قیمت معلوم کریں', join: 'سپلائر کے طور پر شامل ہوں',
  },
}

export default function DealProtectionPage() {
  const { locale, dir } = useTranslation()
  const t = C[locale] || C.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const signedIn = useSignedIn()
  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="shrink-0" aria-label="تسعيرك">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/taseerak-metallic-logo.webp" alt="تسعيرك" className="h-14 w-auto" /></a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" />
            <HomeOrAccountLink homeLabel={t.home} />
          </div>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#0B2438' }}><Glyph e="🛡" /> {t.title}</h1>
        <p className="text-sm text-gray-700 leading-relaxed mb-6">{t.intro}</p>
        <div className="space-y-5">
          {/* a navy medallion with a gold line icon for each point (round-5 UX-221) */}
          {t.sections.map(([h, body]: string[], i: number) => { const Icon = SECTION_ICONS[i] || Search; return (
            <section key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
              <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center" style={{ background: '#0B2438', color: '#F5C55B' }} aria-hidden><Icon className="w-5 h-5" /></span>
              <div className="min-w-0">
                <h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{h}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            </section>
          ) })}
        </div>
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 flex flex-wrap items-center gap-x-3">
          <span className="font-bold text-[#0B2438]">{L('Need help now?', 'ابھی مدد چاہیے؟', 'تحتاج مساعدة الآن؟')}</span>
          <span>{L('Contact the Taseerak team on', 'تسعیرک ٹیم سے رابطہ کریں', 'تواصل مع فريق تسعيرك عبر')}</span>
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] font-bold text-[#8F6820] underline"><MessageCircle className="w-4 h-4" aria-hidden />{L('WhatsApp', 'واٹس ایپ', 'واتساب')}</a>
          <span>{L('or at', 'یا', 'أو على')}</span>
          <a href={`mailto:${OPERATOR.email}`} dir="ltr" className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] underline">{OPERATOR.email}</a>
        </div>
        {/* a next step at the end (UX-095) */}
        <div className="mt-6 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#071827,#0B2438)' }}>
          <h2 className="text-lg font-bold">{t.readyH}</h2>
          <p className="text-sm text-[#C7CED6] mt-1">{t.readyP}</p>
          {/* a signed-in reader gets one way back, not «join as a supplier» (round-5 UX-190) */}
          <div className="mt-4 flex flex-wrap gap-2">
            {signedIn
              ? <a href="/login" className="btn-orange text-sm">{L('Back to my account', 'اپنے اکاؤنٹ پر واپس', 'العودة إلى حسابي')}</a>
              : <>
                <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{t.request}</Link>
                <Link href="/join" className="btn-light text-sm">{t.join}</Link>
              </>}
          </div>
        </div>
        <p className="text-center text-[13px] text-gray-600 mt-8 flex justify-center gap-4">
          <Link href="/terms" className="inline-flex items-center min-h-[44px] underline hover:text-gray-800">{t.terms}</Link>
          <Link href="/privacy" className="inline-flex items-center min-h-[44px] underline hover:text-gray-800">{t.privacy}</Link>
        </p>
        <p className="text-center text-[12px] text-gray-600 mt-4">© 2026 تسعيرك — Taseerak</p>
      </div>
      <PublicFooter />
    </div>
  )
}
