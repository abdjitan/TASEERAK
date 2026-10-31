'use client'

import { useTranslation } from '@/i18n'
import Logo from '@/components/shared/Logo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import Glyph from '@/components/shared/Glyph'

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
      ['1. قبل الصفقة', 'تعرف من تتعامل معه: شارة التوثيق بالسجل التجاري، والتقييم العام للمورد، ونسبة تسليمه في الموعد، وعدد صفقاته على المنصة. وكل عرض مكتوب بسعره وكميته وموعد توصيله وشروط دفعه، وعند اختيارك له يصدر أمر شراء موثّق يحفظ ما اتفقتما عليه.'],
      ['2. عند الاستلام', 'افحص المادة قبل تأكيد الاستلام، وقارنها بأمر الشراء (النوع والمقاس والكمية والماركة إن حددتها). يُستحسن تصوير الحمولة عند وصولها. ثم أكّد الاستلام من صفحة الصفقة؛ تأكيدك يعني أن المادة وصلت كما طلبت.'],
      ['3. إذا وصلت مادة مخالفة أو ناقصة', 'لا تؤكّد الاستلام. افتح صفحة الصفقة واضغط «أبلغ عن مشكلة»، واكتب ما حدث بوضوح (مثلاً: ٤٠ كيساً بدلاً من ٥٠، أو مقاس مختلف)، وأرفق الصور إن وُجدت. يصل البلاغ إلى المورد وإلى فريق تسعيرك فوراً، وتظهر الصفقة للطرفين بحالة «بلاغ عن مشكلة».'],
      ['4. كيف نتابع البلاغ', 'يراجع فريق تسعيرك البلاغ ويتواصل مع الطرفين لتوثيق ما حدث ومساعدتهما على الوصول إلى حل، مثل إكمال النقص أو استبدال المادة أو تخفيض السعر بالاتفاق. ويُسجَّل ما انتهى إليه البلاغ في الصفقة ويُشعَر به الطرفان.'],
      ['5. أثر ذلك على المورد', 'البلاغات التي تثبت صحتها تؤثر في تقييم المورد العام وترتيبه أمام المشترين، وتكرارها قد يؤدي إلى تعليق حسابه. لذلك يحرص الموردون على مطابقة ما يوردونه لما سعّروه.'],
      ['6. حدود دور المنصة', 'يتم الدفع والتسليم مباشرة بين المشتري والمورد. لا تحتفظ تسعيرك بالمبالغ ولا تضمن السداد أو التسليم، ولا تكون طرفاً في عقد البيع، لكنها توثّق الصفقة وتساعد في التواصل وحلّ المشكلة. وللطرفين في كل الأحوال اللجوء إلى الجهات المختصة. التفاصيل في الشروط والأحكام.'],
    ],
    terms: 'الشروط والأحكام',
  },
  en: {
    title: 'How we protect your deal',
    home: 'Home',
    intro: 'Taseerak gathers suppliers’ offers for you and helps you close the deal clearly. This page explains what to do if a material arrives wrong or short, and how a report is handled.',
    sections: [
      ['1. Before the deal', 'Know who you deal with: the commercial-registration badge, the supplier’s overall score, on-time delivery rate and number of deals on the platform. Every offer states its price, quantity, delivery date and payment terms, and choosing it issues a purchase order that records what you agreed.'],
      ['2. On delivery', 'Inspect the material before confirming receipt and compare it with the purchase order (type, size, quantity and brand if you set one). Photographing the load on arrival is recommended. Then confirm receipt on the deal page; confirming means the material arrived as ordered.'],
      ['3. If a material arrives wrong or short', 'Do not confirm receipt. Open the deal page, tap «Report a problem», describe what happened clearly (e.g. 40 bags instead of 50, or a different size) and attach photos if you have them. The report reaches the supplier and the Taseerak team at once, and the deal shows «Problem reported» to both sides.'],
      ['4. How we follow up', 'The Taseerak team reviews the report and contacts both sides to document what happened and help them reach a solution, such as completing the shortfall, replacing the material or an agreed price reduction. The outcome is recorded on the deal and both sides are notified.'],
      ['5. Effect on the supplier', 'Reports found to be valid lower the supplier’s overall score and ranking with buyers, and repeated ones may lead to the account being suspended. So suppliers take care to deliver what they priced.'],
      ['6. The platform’s role', 'Payment and delivery take place directly between buyer and supplier. Taseerak does not hold money, does not guarantee payment or delivery and is not a party to the sale, but it records the deal and helps with communication and resolving the problem. Either side may always turn to the competent authorities. Details are in the Terms.'],
    ],
    terms: 'Terms and Conditions',
  },
  ur: {
    title: 'ہم آپ کے سودے کی حفاظت کیسے کرتے ہیں',
    home: 'مرکزی صفحہ',
    intro: 'تسعیرک آپ کے لیے سپلائرز کی پیشکشیں جمع کرتا ہے اور سودا واضح طریقے سے مکمل کرنے میں مدد دیتا ہے۔ یہ صفحہ بتاتا ہے کہ غلط یا کم مال آنے پر کیا کریں اور شکایت کیسے نمٹائی جاتی ہے۔',
    sections: [
      ['1. سودے سے پہلے', 'جانیے کس سے معاملہ کر رہے ہیں: تجارتی رجسٹریشن کا بیج، سپلائر کا مجموعی اسکور، وقت پر ڈیلیوری کی شرح اور پلیٹ فارم پر سودوں کی تعداد۔ ہر پیشکش میں قیمت، مقدار، ڈیلیوری کی تاریخ اور ادائیگی کی شرائط درج ہوتی ہیں، اور منتخب کرنے پر پرچیز آرڈر بنتا ہے۔'],
      ['2. وصولی پر', 'وصولی کی تصدیق سے پہلے مال چیک کریں اور پرچیز آرڈر سے ملائیں (قسم، سائز، مقدار اور برانڈ)۔ مال پہنچنے پر تصویر لینا بہتر ہے۔ پھر سودے کے صفحے سے وصولی کی تصدیق کریں۔'],
      ['3. اگر مال غلط یا کم آئے', 'وصولی کی تصدیق نہ کریں۔ سودے کا صفحہ کھولیں، «مسئلہ رپورٹ کریں» دبائیں، واضح لکھیں کیا ہوا اور تصاویر لگائیں۔ رپورٹ فوراً سپلائر اور تسعیرک ٹیم تک پہنچتی ہے۔'],
      ['4. ہم کیسے پیروی کرتے ہیں', 'تسعیرک ٹیم رپورٹ دیکھ کر دونوں فریقوں سے رابطہ کرتی ہے اور حل تک پہنچنے میں مدد دیتی ہے، جیسے کمی پوری کرنا، مال بدلنا یا باہمی رضامندی سے قیمت کم کرنا۔ نتیجہ سودے میں درج ہوتا ہے اور دونوں کو اطلاع دی جاتی ہے۔'],
      ['5. سپلائر پر اثر', 'درست ثابت ہونے والی شکایات سپلائر کے اسکور اور درجہ بندی کو کم کرتی ہیں، اور بار بار ہونے پر اکاؤنٹ معطل ہو سکتا ہے۔'],
      ['6. پلیٹ فارم کا کردار', 'ادائیگی اور ڈیلیوری براہِ راست خریدار اور سپلائر کے درمیان ہوتی ہے۔ تسعیرک رقم اپنے پاس نہیں رکھتا، ادائیگی یا ڈیلیوری کی ضمانت نہیں دیتا اور فروخت کے معاہدے کا فریق نہیں، لیکن سودا دستاویز کرتا ہے اور مسئلہ حل کرنے میں مدد دیتا ہے۔ تفصیل شرائط میں ہے۔'],
    ],
    terms: 'شرائط و ضوابط',
  },
}

export default function DealProtectionPage() {
  const { locale, dir } = useTranslation()
  const t = C[locale] || C.ar
  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo theme="light" size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="minimal" />
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600">{t.home}</a>
          </div>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#0B2438' }}><Glyph e="🛡" /> {t.title}</h1>
        <p className="text-sm text-gray-700 leading-relaxed mb-6">{t.intro}</p>
        <div className="space-y-5">
          {t.sections.map(([h, body]: string[], i: number) => (
            <section key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <h2 className="text-base font-bold mb-1.5" style={{ color: '#0B2438' }}>{h}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mt-8"><a href="/terms" className="underline hover:text-gray-700">{t.terms}</a></p>
        <p className="text-center text-xs text-gray-400 mt-4">© 2026 تسعيرك — Taseerak</p>
      </div>
    </div>
  )
}
