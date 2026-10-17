import type { ShellNavItem } from '@/components/shared/AppShell'
import RequestsTabs from '@/components/buyer/RequestsTabs'
import { FEATURES } from '@/lib/features'

// Build the dashboard sidebar nav for a role. Used by every page that sits on
// AppShell so the navigation is consistent across the app.
export function getNav(role: string | undefined, locale: string, active: string): ShellNavItem[] {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const secTools = L('Tools', 'اوزار', 'الأدوات')
  const secAccount = L('Account', 'اکاؤنٹ', 'الحساب')
  let items: { href: string; icon: string; label: string; section?: string; mobile?: number; only?: 'company'; off?: boolean }[]
  if (role === 'admin') {
    const sec = L('Admin', 'ایڈمن', 'الإدارة')
    items = [
      { href: '/admin', icon: '🛡️', label: L('Dashboard', 'ڈیش بورڈ', 'لوحة الإدارة'), section: sec, mobile: 1 },
      { href: '/admin/discover', icon: '🔍', label: L('Discover suppliers', 'سپلائرز تلاش', 'اكتشاف موردين'), section: sec, mobile: 2 },
      { href: '/admin/taxonomy', icon: '🗂️', label: L('Taxonomy', 'درجہ بندی', 'شجرة التصنيفات'), section: sec, mobile: 3 },
      { href: '/admin/learning', icon: '🧠', label: L('Search learning', 'سرچ لرننگ', 'تعلّم البحث'), section: sec },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools, mobile: 4 },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  } else if (role === 'supplier') {
    const sec = L('Supplier', 'سپلائر', 'المورّد')
    items = [
      { href: '/supplier/dashboard', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية'), section: sec, mobile: 1 },
      { href: '/supplier/deals', icon: '📦', label: L('My offers and deals', 'آفرز اور ڈیلز', 'عروضي وصفقاتي'), section: sec, mobile: 2 },
      { href: '/supplier/specialties', icon: '🎯', label: L('Specialties', 'مہارتیں', 'تخصصاتي'), section: sec },
      { href: '/supplier/prices', icon: '📈', label: L('Live Prices', 'لائیو قیمتیں', 'أسعاري'), section: sec, mobile: 3, off: !FEATURES.livePrices },
      { href: '/supplier/analytics', icon: '🏆', label: L('Performance', 'کارکردگی', 'أدائي'), section: sec, off: !FEATURES.analyticsNav },
      { href: '/supplier/branches', icon: '🏢', label: L('Branches', 'شاخیں', 'فروع الشركة'), section: sec, only: 'company' },
      { href: '/supplier/team', icon: '👥', label: L('Team', 'ٹیم', 'فريق العمل'), section: sec, only: 'company' },
      { href: '/supplier/subscription', icon: '⭐', label: L('Subscription', 'سبسکرپشن', 'الاشتراك'), section: sec, off: !FEATURES.subscription },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools, mobile: 4 },
      { href: '/market', icon: '📊', label: L('Price Index', 'انڈیکس', 'البورصة'), section: secTools, off: !FEATURES.priceBoard },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع'), section: secTools, off: !FEATURES.locationNav },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  } else {
    const sec = L('Buyer', 'خریدار', 'المشتري')
    items = [
      { href: '/contractor', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية'), section: sec, mobile: 1 },
      { href: '/contractor/rfq/quick', icon: '📝', label: L('Price request', 'قیمت کی درخواست', 'طلب تسعير'), section: sec, mobile: 3 },
      { href: '/contractor/rfqs', icon: '🧾', label: L('My requests and deals', 'درخواستیں اور ڈیلز', 'طلباتي وصفقاتي'), section: sec, mobile: 2 },
      { href: '/contractor/project/new', icon: '📋', label: L('Project', 'پراجیکٹ', 'مشروع'), section: sec },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools, mobile: 4 },
      { href: '/market', icon: '📈', label: L('Price Index', 'بورس', 'البورصة'), section: secTools, off: !FEATURES.priceBoard },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع'), section: secTools, off: !FEATURES.locationNav },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  }
  // switched-off items leave the menu, except the page you are on (so it stays highlighted)
  return items.filter((i) => !i.off || i.href === active).map(({ off, ...i }) => ({ ...i, active: i.href === active }))
}
