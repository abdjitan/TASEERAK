import type { ShellNavItem } from '@/components/shared/AppShell'

// Build the dashboard sidebar nav for a role. Used by every page that sits on
// AppShell so the navigation is consistent across the app.
export function getNav(role: string | undefined, locale: string, active: string): ShellNavItem[] {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const secTools = L('Tools', 'اوزار', 'الأدوات')
  const secAccount = L('Account', 'اکاؤنٹ', 'الحساب')
  let items: { href: string; icon: string; label: string; section?: string }[]
  if (role === 'admin') {
    const sec = L('Admin', 'ایڈمن', 'الإدارة')
    items = [
      { href: '/admin', icon: '🛡️', label: L('Dashboard', 'ڈیش بورڈ', 'لوحة الإدارة'), section: sec },
      { href: '/admin/discover', icon: '🔍', label: L('Discover suppliers', 'سپلائرز تلاش', 'اكتشاف موردين'), section: sec },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  } else if (role === 'supplier') {
    const sec = L('Supplier', 'سپلائر', 'المورّد')
    items = [
      { href: '/supplier/dashboard', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية'), section: sec },
      { href: '/supplier/specialties', icon: '🎯', label: L('Specialties', 'مہارتیں', 'تخصصاتي'), section: sec },
      { href: '/supplier/prices', icon: '📈', label: L('Live Prices', 'لائیو قیمتیں', 'أسعاري'), section: sec },
      { href: '/supplier/branches', icon: '🏢', label: L('Branches', 'شاخیں', 'فروع الشركة'), section: sec },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools },
      { href: '/market', icon: '📊', label: L('Price Index', 'انڈیکس', 'البورصة'), section: secTools },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع'), section: secTools },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  } else {
    const sec = L('Contractor', 'ٹھیکیدار', 'المقاول')
    items = [
      { href: '/contractor', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية'), section: sec },
      { href: '/contractor/rfq/new', icon: '📝', label: L('New RFQ', 'نئی درخواست', 'طلب تسعير'), section: sec },
      { href: '/contractor/project/new', icon: '📋', label: L('Project (BOQ)', 'پراجیکٹ BOQ', 'مشروع BOQ'), section: sec },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools },
      { href: '/market', icon: '📈', label: L('Price Index', 'بورس', 'البورصة'), section: secTools },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع'), section: secTools },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  }
  return items.map((i) => ({ ...i, active: i.href === active }))
}
