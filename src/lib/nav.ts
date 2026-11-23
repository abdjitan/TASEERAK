import type { ShellNavItem } from '@/components/shared/AppShell'
import RequestsTabs from '@/components/buyer/RequestsTabs'
import { FEATURES } from '@/lib/features'
import { createElement, type ReactNode } from 'react'
import Glyph from '@/components/shared/Glyph'

// Build the dashboard sidebar nav for a role. Used by every page that sits on
// AppShell so the navigation is consistent across the app.
// Business-only tools carry only:'business'; AppShell drops them for a home buyer after mount
// (reading localStorage here, during render, caused a hydration mismatch, UX-144).

export function getNav(role: string | undefined, locale: string, active: string): ShellNavItem[] {
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const secTools = L('Tools', 'اوزار', 'الأدوات')
  const secAccount = L('Account', 'اکاؤنٹ', 'الحساب')
  let items: { href: string; icon: string | ReactNode; label: string; mobileLabel?: string; section?: string; mobile?: number; only?: 'company' | 'business'; off?: boolean }[]
  // every role reaches its notifications from the menu, not only from the bell (UX-100)
  const notifItem = { href: '/notifications', icon: createElement(Glyph, { e: '🔔' }), label: L('Notifications', 'اطلاعات', 'الإشعارات'), section: secAccount }
  if (role === 'admin') {
    const sec = L('Admin', 'ایڈمن', 'الإدارة')
    items = [
      { href: '/admin', icon: '🛡️', label: L('Dashboard', 'ڈیش بورڈ', 'لوحة الإدارة'), section: sec, mobile: 1 },
      { href: '/admin/overview', icon: createElement(Glyph, { e: '📊' }), label: L('Owner dashboard', 'مالک ڈیش بورڈ', 'لوحة المالك'), section: sec },
      { href: '/admin/report', icon: createElement(Glyph, { e: '📄' }), label: L('Performance report', 'کارکردگی رپورٹ', 'تقرير الأداء'), section: sec },
      { href: '/admin/discover', icon: '🔍', label: L('Discover suppliers', 'سپلائرز تلاش', 'اكتشاف موردين'), section: sec, mobile: 2 },
      { href: '/admin/taxonomy', icon: '🗂️', label: L('Taxonomy', 'درجہ بندی', 'شجرة التصنيفات'), section: sec, mobile: 3 },
      { href: '/admin/learning', icon: '🧠', label: L('Search learning', 'سرچ لرننگ', 'تعلّم البحث'), section: sec },
      { href: '/admin/ai-lab', icon: createElement(Glyph, { e: '🤖' }), label: L('AI lab', 'AI لیب', 'مختبر الذكاء الاصطناعي'), section: sec },
      { href: '/admin/suggestions', icon: '💡', label: L('Suggestions', 'تجاویز', 'اقتراحات المستخدمين'), section: sec },
      { href: '/admin/reports', icon: '🚩', label: L('User reports', 'رپورٹس', 'البلاغات'), section: sec },
      { href: '/admin/invites', icon: '💬', label: L('Supplier invites', 'سپلائر دعوتیں', 'دعوات الموردين'), section: sec },
      { href: '/admin/whatsapp', icon: '💬', label: L('WhatsApp support', 'واٹس ایپ سپورٹ', 'واتساب الدعم'), section: sec },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools, mobile: 4 },
      notifItem,
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  } else if (role === 'supplier') {
    const sec = L('Supplier', 'سپلائر', 'المورّد')
    items = [
      { href: '/supplier/dashboard', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية'), section: sec, mobile: 1 },
      { href: '/supplier/deals', icon: '📦', label: L('My offers and deals', 'آفرز اور ڈیلز', 'عروضي وصفقاتي'), mobileLabel: L('My offers', 'میری آفرز', 'عروضي'), section: sec, mobile: 2 },
      { href: '/supplier/specialties', icon: '🎯', label: L('Specialties', 'مہارتیں', 'تخصصاتي'), section: sec },
      // «أسعاري» is private since migration 160 and the only place to save pack prices: always in the menu (UX-031)
      { href: '/supplier/prices', icon: '📈', label: L('My prices', 'میری قیمتیں', 'أسعاري'), section: sec },
      { href: '/supplier/analytics', icon: '🏆', label: L('Performance', 'کارکردگی', 'أدائي'), section: sec, off: !FEATURES.analyticsNav },
      { href: '/supplier/branches', icon: '🏢', label: L('Branches', 'شاخیں', 'فروع الشركة'), section: sec, only: 'company' },
      { href: '/supplier/team', icon: '👥', label: L('Team', 'ٹیم', 'فريق العمل'), section: sec, only: 'company' },
      { href: '/supplier/subscription', icon: '⭐', label: L('Subscription', 'سبسکرپشن', 'الاشتراك'), section: sec, off: !FEATURES.subscription },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools, mobile: 4 },
      { href: '/market', icon: '📊', label: L('Price Index', 'انڈیکس', 'البورصة'), section: secTools, off: !FEATURES.priceBoard },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع'), section: secTools, off: !FEATURES.locationNav },
      { href: '/invite-friends', icon: '🤝', label: L('Invite someone', 'دعوت دیں', 'ادعُ من تعرفه'), section: secAccount },
      { href: '/suggestions', icon: '💡', label: L('Your suggestions', 'آپ کی تجاویز', 'اقتراحاتك'), section: secAccount },
      notifItem,
      { href: '/support', icon: '💬', label: L('Support', 'سپورٹ', 'الدعم'), section: secAccount },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  } else {
    const sec = L('Buyer', 'خریدار', 'المشتري')
    items = [
      { href: '/contractor', icon: '🏠', label: L('Dashboard', 'ڈیش بورڈ', 'الرئيسية'), section: sec, mobile: 1 },
      { href: '/contractor/rfq/quick', icon: '📝', label: L('Request a price', 'قیمت معلوم کریں', 'اطلب سعراً'), section: sec, mobile: 3 },
      { href: '/contractor/rfqs', icon: '🧾', label: L('My requests and deals', 'درخواستیں اور ڈیلز', 'طلباتي وصفقاتي'), mobileLabel: L('My requests', 'میری درخواستیں', 'طلباتي'), section: sec, mobile: 2 },
      // a home buyer («لبيتي») does not see the business tools (UX study 2026-11-22); still reachable by URL.
      // One name for each tool everywhere (UX-144): «جدول الكميات» and «تسعير مناقصة».
      { href: '/contractor/project/new', icon: '📋', label: L('Bill of quantities', 'مقداروں کا جدول', 'جدول الكميات'), section: sec, only: 'business' },
      { href: '/contractor/tender', icon: '📑', label: L('Tender pricing', 'ٹینڈر کی قیمت', 'تسعير مناقصة'), section: sec, only: 'business' },
      { href: '/messages', icon: '💬', label: L('Messages', 'پیغامات', 'الرسائل'), section: secTools, mobile: 4 },
      { href: '/market', icon: '📈', label: L('Price Index', 'بورس', 'البورصة'), section: secTools, off: !FEATURES.priceBoard },
      { href: '/location', icon: '📍', label: L('Location', 'مقام', 'الموقع'), section: secTools, off: !FEATURES.locationNav },
      { href: '/invite-friends', icon: '🤝', label: L('Invite someone', 'دعوت دیں', 'ادعُ من تعرفه'), section: secAccount },
      { href: '/suggestions', icon: '💡', label: L('Your suggestions', 'آپ کی تجاویز', 'اقتراحاتك'), section: secAccount },
      notifItem,
      { href: '/support', icon: '💬', label: L('Support', 'سپورٹ', 'الدعم'), section: secAccount },
      { href: '/settings', icon: '⚙️', label: L('Settings', 'ترتیبات', 'الإعدادات'), section: secAccount },
    ]
  }
  // switched-off items leave the menu, except the page you are on (so it stays highlighted)
  return items.filter((i) => !i.off || i.href === active).map(({ off, ...i }) => ({ ...i, active: i.href === active }))
}
