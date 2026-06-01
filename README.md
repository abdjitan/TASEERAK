# Buildora — منصة المقاولين والموردين

منصة ذكية تربط المقاولين بالموردين في جميع قطاعات البناء والإنشاء.

## 🛠 التقنيات المستخدمة

- **Next.js 14** — إطار العمل الرئيسي (App Router)
- **Supabase** — قاعدة البيانات + المصادقة + الـ Real-time + تخزين الملفات
- **TypeScript** — لأمان الأنواع
- **Tailwind CSS** — التصميم
- **React Hook Form + Zod** — النماذج والتحقق
- **Zustand** — إدارة الحالة
- **Sonner** — الإشعارات

---

## 🚀 خطوات التشغيل

### 1. استنساخ المشروع
```bash
git clone https://github.com/yourname/buildora.git
cd buildora
npm install
```

### 2. إعداد Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً
2. في **SQL Editor**، شغّل ملف:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. في **Storage**، أنشئ bucket اسمه `licenses` واجعله **Public**

### 3. متغيرات البيئة
```bash
cp .env.example .env.local
```
افتح `.env.local` وأضف:
- `NEXT_PUBLIC_SUPABASE_URL` من Settings > API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` من Settings > API
- `SUPABASE_SERVICE_ROLE_KEY` من Settings > API (سري — لا تشاركه)

### 4. تشغيل المشروع
```bash
npm run dev
```
افتح [http://localhost:3000](http://localhost:3000)

---

## 📁 هيكل المشروع

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # صفحة تسجيل الدخول
│   │   └── register/       # صفحة التسجيل (4 خطوات)
│   ├── (dashboard)/
│   │   ├── contractor/     # لوحة تحكم المقاول
│   │   ├── supplier/       # لوحة تحكم المورد
│   │   └── admin/          # لوحة الإدارة
│   ├── api/
│   │   ├── rfq/            # API طلبات التسعير
│   │   ├── offers/         # API العروض
│   │   ├── messages/       # API الرسائل
│   │   ├── products/       # API المنتجات
│   │   └── users/          # API المستخدمين
│   └── supplier/[id]/      # ملف المورد العام
├── components/
│   ├── ui/                 # مكونات قابلة للإعادة
│   ├── contractor/         # مكونات المقاول
│   ├── supplier/           # مكونات المورد
│   └── admin/              # مكونات الإدارة
├── hooks/
│   ├── useAuth.tsx         # المصادقة والمستخدم الحالي
│   ├── useRFQ.ts           # طلبات التسعير والعروض
│   ├── useMessages.ts      # الرسائل Real-time
│   └── useNotifications.ts # الإشعارات Real-time
├── lib/
│   └── supabase/
│       ├── client.ts       # Supabase browser client
│       └── server.ts       # Supabase server client
├── types/
│   └── index.ts            # كل أنواع TypeScript
└── styles/
    └── globals.css
supabase/
└── migrations/
    └── 001_initial_schema.sql   # كل الجداول والـ RLS
```

---

## 🗄 جداول قاعدة البيانات

| الجدول | الوصف |
|--------|-------|
| `profiles` | بيانات المستخدمين (مقاول/مورد/مدير) |
| `profile_sectors` | القطاعات لكل مستخدم |
| `products` | منتجات الموردين |
| `rfqs` | طلبات التسعير |
| `offers` | عروض الموردين على الطلبات |
| `conversations` | المحادثات بين المقاولين والموردين |
| `messages` | الرسائل داخل المحادثات |
| `notifications` | إشعارات المستخدمين |
| `reviews` | تقييمات الطرفين |
| `license_reviews` | سجل مراجعة الرخص من الإدارة |

---

## 🔐 الأمان (Row Level Security)

- كل مستخدم يرى بياناته فقط
- الموردون الموثقون يظهرون للعموم
- الموردون يرون الطلبات المفتوحة في قطاعاتهم فقط
- المقاولون يرون العروض على طلباتهم فقط
- المحادثات محمية — فقط الطرفان يرونها

---

## 💰 نموذج الإيرادات

1. **اشتراك مجاني**: 5 طلبات/شهر، 10 منتجات
2. **اشتراك احترافي**: SAR 299/شهر — غير محدود
3. **عمولة صفقات**: 1.5% على كل صفقة مكتملة
4. **ظهور مميز**: SAR 150-300/شهر للموردين

---

## 📱 الإشعارات (WhatsApp)

المنصة مصممة لإرسال إشعارات WhatsApp عند:
- وصول عرض سعر جديد
- قبول عرض المورد
- انتهاء طلب التسعير قريباً
- تحقق الحساب

لتفعيل WhatsApp، أضف بيانات [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp) في `.env.local`.

---

## 🚢 النشر على Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard
```

---

## 📞 التواصل

للاستفسارات والدعم التقني: info@buildora.sa
