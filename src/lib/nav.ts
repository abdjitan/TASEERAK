import type { ShellNavItem } from '@/components/shared/AppShell'

// Build the dashboard sidebar nav for a role. Used by every page that sits on
// AppShell so the navigation is consistent across the app.
export function getNav(role: string | undefined, locale: string, active: string): ShellNavItem[] {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  let items: { href: string; icon: string; label: string }[]
  if (role === 'admin') {
    items = [
      { href: '/admin', icon: '🛡️', label: L('Dashboard', 'ڈیش بورڈ', 'لوحة الإدارة') },
      { href: '/admin/discover', icon: '🔍', label: L('Discover suppliers', 'سپلائرز تلاش', 'اكتشاف موردين') },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات') },
    ]
  } else if (role === 'supplier') {
    items = [
      { href: '/supplier/dashboard', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية') },
      { href: '/supplier/specialties', icon: '🎯', label: L('Specialties', 'مہارتیں', 'تخصصاتي') },
      { href: '/supplier/prices', icon: '📈', label: L('Live Prices', 'لائیو قیمتیں', 'أسعاري') },
      { href: '/supplier/branches', icon: '🏢', label: L('Branches', 'شاخیں', 'فروعي') },
      { href: '/market', icon: '📊', label: L('Price Index', 'انڈیکس', 'البورصة') },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع') },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات') },
    ]
  } else {
    items = [
      { href: '/contractor', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية') },
      { href: '/contractor/rfq/new', icon: '📝', label: L('New RFQ', 'نئی درخواست', 'طلب تسعير') },
      { href: '/contractor/project/new', icon: '📋', label: L('Project (BOQ)', 'پراجیکٹ BOQ', 'مشروع BOQ') },
      { href: '/market', icon: '📈', label: L('Price Index', 'بورس', 'البورصة') },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع') },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات') },
    ]
  }
  return items.map((i) => ({ ...i, active: i.href === active }))
}
