'use client'

import Link from 'next/link'
import PublicFooter from '@/components/public/PublicFooter'
import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import PublicTopBar from '@/components/public/PublicTopBar'
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
      ['1. قبل الصفقة', 'تعرف من تتعامل معه: شارة التوثيق بالسجل التجاري، والتقييم العام للمورد، وعدد الطلبات التي فاز بها على المنصة، وشارة «يُصدر فاتورة ضريبية» لمن تحقّق فريق تسعيرك من رقمه الضريبي. وكل عرض مكتوب بسعره وكميته وموعد توصيله وشروط دفعه، وعند اختيارك له يصدر مستند صفقة موثّق يحفظ ما اتفقتما عليه.'],
      ['2. عند الاستلام', 'افحص المادة قبل تأكيد الاستلام، وقارنها بمستند الصفقة (النوع والمقاس والكمية والماركة إن حددتها). يُستحسن تصوير الحمولة عند وصولها. ثم أكّد الاستلام من صفحة الصفقة؛ تأكيدك يعني أن المادة وصلت كما طلبت. وفي عروض وسيط التسعير لا يمكن تأكيد الاستلام قبل أن يرفع الوسيط فاتورة المحل.'],
      ['3. إذا وصلت مادة مخالفة أو ناقصة', 'لا تؤكّد الاستلام. افتح صفحة الصفقة واضغط «واجهت مشكلة؟ أبلغ عنها»، واكتب ما حدث بوضوح (مثلاً: 40 كيساً بدلاً من 50، أو مقاس مختلف)، وأرسل الصور في محادثة الصفقة. يصل البلاغ إلى المورد وإلى فريق تسعيرك فوراً، وتظهر الصفقة للطرفين بحالة «بلاغ عن مشكلة».'],
      ['4. كيف نتابع البلاغ', 'يراجع فريق تسعيرك البلاغ ويتواصل مع الطرفين لتوثيق ما حدث ومساعدتهما على الوصول إلى حل، مثل إكمال النقص أو استبدال المادة أو تخفيض السعر بالاتفاق. ويُسجَّل ما انتهى إليه البلاغ في الصفقة ويُشعَر به الطرفان. ويمكن لفريق تسعيرك إغلاق الصفقة على المنصة مع إبلاغ الطرفين بالسبب.'],
      ['5. أثر ذلك على المورد', 'البلاغات التي تثبت صحتها تؤثر في تقييم المورد العام، وقد يؤدي تكرارها إلى تعليق حسابه. لذلك يحرص الموردون على مطابقة ما يوردونه لما سعّروه.'],
      ['6. حدود دور المنصة', 'يتم الدفع والتسليم مباشرة بين المشتري والمورد. لا تحتفظ تسعيرك بالمبالغ ولا تضمن السداد أو التسليم، ولا تكون طرفاً في عقد البيع، لكنها توثّق الصفقة وتساعد في التواصل وحلّ المشكلة. وللطرفين في كل الأحوال اللجوء إلى الجهات المختصة. التفاصيل في الشروط والأحكام.'],
    ],
    terms: 'الشروط والأحكام', privacy: 'سياسة الخصوصية',
    readyH: 'جاهز؟ اطلب أسعار موادك الآن', readyP: 'أرسل طلباً واحداً ويتنافس عليه الموردون، أو انضم مورداً واستقبل طلبات التسعير.', request: 'ابدأ الآن مجاناً', join: 'انضم كمورد',
  },
  en: {
    title: 'How we protect your deal',
    home: 'Home',
    intro: 'Taseerak gathers suppliers’ offers for you and helps you close the deal clearly. This page explains what to do if a material arrives wrong or short, and how a report is handled.',
    sections: [
      ['1. Before the deal', 'Know who you deal with: the commercial-registration badge, the supplier’s overall score, the number of requests it won on the platform, and the «Issues a tax invoice» badge for sellers whose VAT number the Taseerak team checked. Every offer states its price, quantity, delivery date and payment terms, and choosing it issues a deal document that records what you agreed.'],
      ['2. On delivery', 'Inspect the material before confirming receipt and compare it with the deal document (type, size, quantity and brand if you set one). Photographing the load on arrival is recommended. Then confirm receipt on the deal page; confirming means the material arrived as ordered. On a pricing agent’s offer, receipt cannot be confirmed before the agent uploads the shop’s invoice.'],
      ['3. If a material arrives wrong or short', 'Do not confirm receipt. Open the deal page, tap «Had a problem? Report it», describe what happened clearly (e.g. 40 bags instead of 50, or a different size) and send the photos in the deal’s chat. The report reaches the supplier and the Taseerak team at once, and the deal shows «Problem reported» to both sides.'],
      ['4. How we follow up', 'The Taseerak team reviews the report and contacts both sides to document what happened and help them reach a solution, such as completing the shortfall, replacing the material or an agreed price reduction. The outcome is recorded on the deal and both sides are notified. The Taseerak team can close the deal on the platform, telling both sides the reason.'],
      ['5. Effect on the supplier', 'Reports found to be valid affect the supplier’s overall rating, and repeated ones may lead to the account being suspended. So suppliers take care to deliver what they priced.'],
      ['6. The platform’s role', 'Payment and delivery take place directly between buyer and supplier. Taseerak does not hold money, does not guarantee payment or delivery and is not a party to the sale, but it records the deal and helps with communication and resolving the problem. Either side may always turn to the competent authorities. Details are in the Terms.'],
    ],
    terms: 'Terms and Conditions', privacy: 'Privacy policy',
    readyH: 'Ready? Request prices for your materials now', readyP: 'Send one request and suppliers compete for it, or join as a supplier and receive price requests.', request: 'Start now for free', join: 'Join as a supplier',
  },
  ur: {
    title: 'ہم آپ کے سودے کی حفاظت کیسے کرتے ہیں',
    home: 'مرکزی صفحہ',
    intro: 'تسعیرک آپ کے لیے سپلائرز کی پیشکشیں جمع کرتا ہے اور سودا واضح طریقے سے مکمل کرنے میں مدد دیتا ہے۔ یہ صفحہ بتاتا ہے کہ غلط یا کم مال آنے پر کیا کریں اور شکایت کیسے نمٹائی جاتی ہے۔',
    sections: [
      ['1. سودے سے پہلے', 'جانیے کس سے معاملہ کر رہے ہیں: تجارتی رجسٹریشن کا بیج، سپلائر کا مجموعی اسکور، پلیٹ فارم پر جیتی گئی درخواستوں کی تعداد، اور «ٹیکس انوائس جاری کرتا ہے» کا بیج اُن کے لیے جن کا ٹیکس نمبر تسعیرک ٹیم نے چیک کیا ہو۔ ہر پیشکش میں قیمت، مقدار، ڈیلیوری کی تاریخ اور ادائیگی کی شرائط درج ہوتی ہیں، اور منتخب کرنے پر ڈیل کی دستاویز بنتا ہے۔'],
      ['2. وصولی پر', 'وصولی کی تصدیق سے پہلے مال چیک کریں اور ڈیل کی دستاویز سے ملائیں (قسم، سائز، مقدار اور برانڈ)۔ مال پہنچنے پر تصویر لینا بہتر ہے۔ پھر سودے کے صفحے سے وصولی کی تصدیق کریں۔ قیمت ایجنٹ کی آفر میں ایجنٹ کے دکان کی انوائس اپ لوڈ کرنے سے پہلے وصولی کی تصدیق نہیں ہو سکتی۔'],
      ['3. اگر مال غلط یا کم آئے', 'وصولی کی تصدیق نہ کریں۔ سودے کا صفحہ کھولیں، «کوئی مسئلہ ہوا؟ شکایت درج کریں» دبائیں، واضح لکھیں کیا ہوا (مثلاً 50 کی جگہ 40 بوریاں، یا مختلف سائز)، اور تصاویر سودے کی گفتگو میں بھیجیں۔ رپورٹ فوراً سپلائر اور تسعیرک ٹیم تک پہنچتی ہے۔'],
      ['4. ہم کیسے پیروی کرتے ہیں', 'تسعیرک ٹیم رپورٹ دیکھ کر دونوں فریقوں سے رابطہ کرتی ہے اور حل تک پہنچنے میں مدد دیتی ہے، جیسے کمی پوری کرنا، مال بدلنا یا باہمی رضامندی سے قیمت کم کرنا۔ نتیجہ سودے میں درج ہوتا ہے اور دونوں کو اطلاع دی جاتی ہے۔ تسعیرک ٹیم دونوں فریقوں کو وجہ بتا کر پلیٹ فارم پر سودا بند کر سکتی ہے۔'],
      ['5. سپلائر پر اثر', 'درست ثابت ہونے والی شکایات سپلائر کی مجموعی ریٹنگ پر اثر ڈالتی ہیں، اور بار بار ہونے پر اکاؤنٹ معطل ہو سکتا ہے۔'],
      ['6. پلیٹ فارم کا کردار', 'ادائیگی اور ڈیلیوری براہِ راست خریدار اور سپلائر کے درمیان ہوتی ہے۔ تسعیرک رقم اپنے پاس نہیں رکھتا، ادائیگی یا ڈیلیوری کی ضمانت نہیں دیتا اور فروخت کے معاہدے کا فریق نہیں، لیکن سودا دستاویز کرتا ہے اور مسئلہ حل کرنے میں مدد دیتا ہے۔ تفصیل شرائط میں ہے۔'],
    ],
    terms: 'شرائط و ضوابط', privacy: 'رازداری کی پالیسی',
    readyH: 'تیار ہیں؟ ابھی اپنے سامان کی قیمتیں منگوائیں', readyP: 'ایک درخواست بھیجیں اور سپلائرز اس پر مقابلہ کریں، یا سپلائر بن کر قیمت کی درخواستیں وصول کریں۔', request: 'ابھی مفت شروع کریں', join: 'سپلائر کے طور پر شامل ہوں',
  },
}

export default function DealProtectionPage() {
  const { locale, dir } = useTranslation()
  const t = C[locale] || C.ar
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const signedIn = useSignedIn()
  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* one top bar for the trust and legal pages (round-6 UX-116) */}
      <PublicTopBar />
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
          {/* round-7 UX-204 */}
          <span className="basis-full text-[12px] text-gray-600">{L('WhatsApp: Taseerak’s official WhatsApp Business number (it starts with +1 and shows the name Taseerak).', 'واٹس ایپ: تسعیرک کا سرکاری واٹس ایپ بزنس نمبر (یہ +1 سے شروع ہوتا ہے اور تسعیرک کے نام سے دکھائی دیتا ہے)۔', 'واتساب: رقم تسعيرك الرسمي على واتساب للأعمال (يبدأ بـ ‎+1 ويظهر باسم تسعيرك).')}</span>
        </div>
        {/* a next step at the end (UX-095) */}
        <div className="mt-6 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#071827,#0B2438)' }}>
          <h2 className="text-lg font-bold">{signedIn ? L('Have a question about a deal?', 'کسی سودے کے بارے میں سوال ہے؟', 'لديك سؤال عن صفقة؟') : t.readyH}</h2>
          {signedIn
            ? <p className="text-sm text-[#C7CED6] mt-1">{L('The Taseerak team answers you from the support page.', 'تسعیرک ٹیم سپورٹ کے صفحے سے آپ کو جواب دیتی ہے۔', 'يجيبك فريق تسعيرك من صفحة الدعم.')}</p>
            : <p className="text-sm text-[#C7CED6] mt-1">{t.readyP}</p>}
          {/* a signed-in reader gets one way back, not «join as a supplier» (round-5 UX-190) */}
          <div className="mt-4 flex flex-wrap gap-2">
            {signedIn
              ? <Link href="/support?topic=deal" className="btn-orange text-sm">{L('Support', 'سپورٹ', 'الدعم')}</Link>
              : <>
                <Link href="/contractor/rfq/quick" className="btn-orange text-sm">{t.request}</Link>
                <Link href="/join" className="btn-light text-sm">{t.join}</Link>
              </>}
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
