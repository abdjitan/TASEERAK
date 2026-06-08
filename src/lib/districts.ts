// Curated district (حي) lists per city, bilingual (Arabic + English transliteration)
// so users pick from options instead of free text. The STORED value is always
// the Arabic name (d.ar) for data consistency; only the displayed label changes
// with the UI language. Cities not listed fall back to a free-text input, and
// every listed city also offers "أخرى" to type a district not in the list.
export type District = { ar: string; en: string }

export const DISTRICTS_BY_CITY: Record<string, District[]> = {
  'الرياض': [
    { ar: 'العليا', en: 'Al Olaya' }, { ar: 'الملز', en: 'Al Malaz' }, { ar: 'المروج', en: 'Al Murooj' },
    { ar: 'النخيل', en: 'Al Nakheel' }, { ar: 'الياسمين', en: 'Al Yasmin' }, { ar: 'الورود', en: 'Al Wurud' },
    { ar: 'السليمانية', en: 'Al Sulaimaniyah' }, { ar: 'الربوة', en: 'Al Rabwah' }, { ar: 'النزهة', en: 'Al Nuzhah' },
    { ar: 'الإزدهار', en: 'Al Izdihar' }, { ar: 'الروضة', en: 'Al Rawdah' }, { ar: 'الربيع', en: 'Al Rabi' },
    { ar: 'الصحافة', en: 'Al Sahafah' }, { ar: 'الغدير', en: 'Al Ghadir' }, { ar: 'النرجس', en: 'Al Narjis' },
    { ar: 'الملقا', en: 'Al Malqa' }, { ar: 'حطين', en: 'Hittin' }, { ar: 'الرحمانية', en: 'Al Rahmaniyah' },
    { ar: 'المعذر', en: 'Al Maathar' }, { ar: 'السويدي', en: 'Al Suwaidi' }, { ar: 'العزيزية', en: 'Al Aziziyah' },
    { ar: 'المنصورة', en: 'Al Mansurah' }, { ar: 'الشفا', en: 'Al Shifa' }, { ar: 'الحزم', en: 'Al Hazm' },
    { ar: 'بدر', en: 'Badr' }, { ar: 'اليرموك', en: 'Al Yarmuk' }, { ar: 'قرطبة', en: 'Qurtubah' },
    { ar: 'المغرزات', en: 'Al Mughrizat' }, { ar: 'الفلاح', en: 'Al Falah' }, { ar: 'طويق', en: 'Tuwaiq' },
    { ar: 'ظهرة لبن', en: 'Dhahrat Laban' }, { ar: 'العقيق', en: 'Al Aqiq' }, { ar: 'النفل', en: 'Al Nafal' },
    { ar: 'الواحة', en: 'Al Wahah' }, { ar: 'المصيف', en: 'Al Maseef' }, { ar: 'الوزارات', en: 'Al Wizarat' },
    { ar: 'الديرة', en: 'Al Deerah' }, { ar: 'المرسلات', en: 'Al Mursalat' }, { ar: 'الرمال', en: 'Al Rimal' },
    { ar: 'الخليج', en: 'Al Khaleej' },
  ],
  'جدة': [
    { ar: 'الحمراء', en: 'Al Hamra' }, { ar: 'الروضة', en: 'Al Rawdah' }, { ar: 'السلامة', en: 'Al Salamah' },
    { ar: 'الشاطئ', en: 'Al Shati' }, { ar: 'النعيم', en: 'Al Naeem' }, { ar: 'الصفا', en: 'Al Safa' },
    { ar: 'المروة', en: 'Al Marwah' }, { ar: 'النزهة', en: 'Al Nuzhah' }, { ar: 'البوادي', en: 'Al Bawadi' },
    { ar: 'الفيصلية', en: 'Al Faisaliyah' }, { ar: 'الزهراء', en: 'Al Zahra' }, { ar: 'الرحاب', en: 'Al Rehab' },
    { ar: 'أبحر الشمالية', en: 'Obhur Al Shamaliyah' }, { ar: 'أبحر الجنوبية', en: 'Obhur Al Janubiyah' },
    { ar: 'البغدادية', en: 'Al Baghdadiyah' }, { ar: 'السبيل', en: 'Al Sabil' }, { ar: 'النسيم', en: 'Al Naseem' },
    { ar: 'الأندلس', en: 'Al Andalus' }, { ar: 'بني مالك', en: 'Bani Malik' }, { ar: 'مشرفة', en: 'Mishrifah' },
    { ar: 'الثغر', en: 'Al Thaghr' }, { ar: 'البساتين', en: 'Al Basateen' }, { ar: 'الواحة', en: 'Al Wahah' },
    { ar: 'الفيحاء', en: 'Al Faihaa' }, { ar: 'السامر', en: 'Al Samer' }, { ar: 'المنتزهات', en: 'Al Muntazahat' },
    { ar: 'الحرازات', en: 'Al Harazat' }, { ar: 'الكندرة', en: 'Al Kandarah' },
  ],
  'مكة المكرمة': [
    { ar: 'العزيزية', en: 'Al Aziziyah' }, { ar: 'الششة', en: 'Al Shisha' }, { ar: 'النسيم', en: 'Al Naseem' },
    { ar: 'الزاهر', en: 'Al Zahir' }, { ar: 'الرصيفة', en: 'Al Rusaifah' }, { ar: 'العوالي', en: 'Al Awali' },
    { ar: 'الهجرة', en: 'Al Hijrah' }, { ar: 'المسفلة', en: 'Al Masfalah' }, { ar: 'الكعكية', en: 'Al Kakiyah' },
    { ar: 'النوارية', en: 'Al Nawariyah' }, { ar: 'بطحاء قريش', en: 'Batha Quraish' }, { ar: 'الخالدية', en: 'Al Khalidiyah' },
    { ar: 'الشوقية', en: 'Al Shawqiyah' }, { ar: 'جرول', en: 'Jarwal' }, { ar: 'الزايدي', en: 'Al Zaidi' },
  ],
  'المدينة المنورة': [
    { ar: 'العنابس', en: 'Al Anabis' }, { ar: 'قباء', en: 'Quba' }, { ar: 'العوالي', en: 'Al Awali' },
    { ar: 'الدفاع', en: 'Al Difa' }, { ar: 'الحرة الشرقية', en: 'Al Harrah Al Sharqiyah' },
    { ar: 'الحرة الغربية', en: 'Al Harrah Al Gharbiyah' }, { ar: 'شظاة', en: 'Shadha' }, { ar: 'العزيزية', en: 'Al Aziziyah' },
    { ar: 'الإسكان', en: 'Al Iskan' }, { ar: 'بني معاوية', en: 'Bani Muawiyah' }, { ar: 'الرانوناء', en: 'Al Ranuna' },
    { ar: 'العاقول', en: 'Al Aqul' }, { ar: 'سيد الشهداء', en: 'Sayyid Al Shuhada' }, { ar: 'قربان', en: 'Qurban' },
  ],
  'الدمام': [
    { ar: 'الفيصلية', en: 'Al Faisaliyah' }, { ar: 'الشاطئ', en: 'Al Shati' }, { ar: 'الجلوية', en: 'Al Jalawiyah' },
    { ar: 'الريان', en: 'Al Rayyan' }, { ar: 'النور', en: 'Al Noor' }, { ar: 'الأمل', en: 'Al Amal' },
    { ar: 'البديع', en: 'Al Badi' }, { ar: 'الفنار', en: 'Al Fanar' }, { ar: 'الروضة', en: 'Al Rawdah' },
    { ar: 'أحد', en: 'Uhud' }, { ar: 'النزهة', en: 'Al Nuzhah' }, { ar: 'المنار', en: 'Al Manar' },
    { ar: 'الأنوار', en: 'Al Anwar' }, { ar: 'الجامعيين', en: 'Al Jamiyeen' }, { ar: 'بدر', en: 'Badr' },
    { ar: 'الخليج', en: 'Al Khaleej' }, { ar: 'طيبة', en: 'Taibah' },
  ],
  'الخبر': [
    { ar: 'العليا', en: 'Al Olaya' }, { ar: 'الراكة', en: 'Al Rakah' }, { ar: 'الثقبة', en: 'Al Thuqbah' },
    { ar: 'العقربية', en: 'Al Aqrabiyah' }, { ar: 'الخزامى', en: 'Al Khuzama' }, { ar: 'الحزام الذهبي', en: 'Al Hizam Al Dhahabi' },
    { ar: 'اليرموك', en: 'Al Yarmuk' }, { ar: 'الجسر', en: 'Al Jisr' }, { ar: 'الكورنيش', en: 'Al Corniche' },
    { ar: 'البندرية', en: 'Al Bandariyah' }, { ar: 'الروابي', en: 'Al Rawabi' }, { ar: 'الهدا', en: 'Al Hada' },
    { ar: 'الصواري', en: 'Al Sawari' }, { ar: 'اللؤلؤ', en: 'Al Lulu' },
  ],
  'الظهران': [
    { ar: 'الدوحة', en: 'Al Doha' }, { ar: 'القشلة', en: 'Al Qashlah' }, { ar: 'هجر', en: 'Hajar' },
    { ar: 'تهامة', en: 'Tihamah' }, { ar: 'الجامعة', en: 'Al Jamiah' }, { ar: 'الدانة', en: 'Al Danah' },
  ],
  'الطائف': [
    { ar: 'الفيصلية', en: 'Al Faisaliyah' }, { ar: 'شهار', en: 'Shahar' }, { ar: 'الحوية', en: 'Al Hawiyah' },
    { ar: 'الردف', en: 'Al Radf' }, { ar: 'القمرية', en: 'Al Qamariyah' }, { ar: 'معشي', en: 'Mashi' },
    { ar: 'النزهة', en: 'Al Nuzhah' }, { ar: 'السلامة', en: 'Al Salamah' },
  ],
  'بريدة': [
    { ar: 'الصفراء', en: 'Al Safra' }, { ar: 'الريان', en: 'Al Rayyan' }, { ar: 'الإسكان', en: 'Al Iskan' },
    { ar: 'الفايزية', en: 'Al Fayziyah' }, { ar: 'الرحمانية', en: 'Al Rahmaniyah' }, { ar: 'النهضة', en: 'Al Nahdah' },
    { ar: 'الخليج', en: 'Al Khaleej' },
  ],
  'عنيزة': [
    { ar: 'المنتزه', en: 'Al Muntazah' }, { ar: 'الإسكان', en: 'Al Iskan' }, { ar: 'الفهد', en: 'Al Fahd' },
    { ar: 'النصبة', en: 'Al Nasbah' }, { ar: 'الخريزة', en: 'Al Khuraiza' },
  ],
  'تبوك': [
    { ar: 'المروج', en: 'Al Murooj' }, { ar: 'العزيزية', en: 'Al Aziziyah' }, { ar: 'السليمانية', en: 'Al Sulaimaniyah' },
    { ar: 'الورود', en: 'Al Wurud' }, { ar: 'الفيصلية', en: 'Al Faisaliyah' }, { ar: 'الروضة', en: 'Al Rawdah' },
    { ar: 'النهضة', en: 'Al Nahdah' },
  ],
  'أبها': [
    { ar: 'المنسك', en: 'Al Mansak' }, { ar: 'النميص', en: 'Al Namis' }, { ar: 'الموظفين', en: 'Al Muwazzafin' },
    { ar: 'السد', en: 'Al Sad' }, { ar: 'الخالدية', en: 'Al Khalidiyah' }, { ar: 'المحالة', en: 'Al Mahalah' },
    { ar: 'الربوة', en: 'Al Rabwah' },
  ],
  'خميس مشيط': [
    { ar: 'الأندلس', en: 'Al Andalus' }, { ar: 'الراقي', en: 'Al Raqi' }, { ar: 'تندحة', en: 'Tindaha' },
    { ar: 'الواحة', en: 'Al Wahah' }, { ar: 'الموسى', en: 'Al Musa' }, { ar: 'النزهة', en: 'Al Nuzhah' },
  ],
  'حائل': [
    { ar: 'النقرة', en: 'Al Nuqrah' }, { ar: 'المطار', en: 'Al Matar' }, { ar: 'بقعاء', en: 'Baqaa' },
    { ar: 'الزبارة', en: 'Al Zubarah' }, { ar: 'صبابة', en: 'Sababah' }, { ar: 'الخزامى', en: 'Al Khuzama' },
  ],
  'نجران': [
    { ar: 'الفهد', en: 'Al Fahd' }, { ar: 'الفيصلية', en: 'Al Faisaliyah' }, { ar: 'الضباط', en: 'Al Dubbat' },
    { ar: 'شرورة', en: 'Sharurah' }, { ar: 'الغويلة', en: 'Al Ghuwaila' },
  ],
  'جازان': [
    { ar: 'الروضة', en: 'Al Rawdah' }, { ar: 'الصفا', en: 'Al Safa' }, { ar: 'المطار', en: 'Al Matar' },
    { ar: 'الشاطئ', en: 'Al Shati' }, { ar: 'الرواد', en: 'Al Ruwwad' },
  ],
  'ينبع': [
    { ar: 'الهيئة الملكية', en: 'Royal Commission' }, { ar: 'البلد', en: 'Al Balad' }, { ar: 'النواة', en: 'Al Nawah' },
    { ar: 'الناصفة', en: 'Al Nasifah' }, { ar: 'الشربتلي', en: 'Al Sharbatli' },
  ],
  'الجبيل': [
    { ar: 'الفناتير', en: 'Al Fanateer' }, { ar: 'الدفي', en: 'Al Daffi' }, { ar: 'الحويلات', en: 'Al Huwailat' },
    { ar: 'الهيئة الملكية', en: 'Royal Commission' }, { ar: 'البلد', en: 'Al Balad' }, { ar: 'مدينة العمال', en: 'Workers City' },
  ],
  'القطيف': [
    { ar: 'الناصرة', en: 'Al Nasirah' }, { ar: 'القلعة', en: 'Al Qalah' }, { ar: 'الشويكة', en: 'Al Shuwaikah' },
    { ar: 'الخويلدية', en: 'Al Khuwaildiyah' }, { ar: 'الجارودية', en: 'Al Jarudiyah' },
  ],
  'الأحساء': [
    { ar: 'الهفوف', en: 'Al Hofuf' }, { ar: 'المبرز', en: 'Al Mubarraz' }, { ar: 'النعاثل', en: 'Al Naathil' },
    { ar: 'الصالحية', en: 'Al Salhiyah' }, { ar: 'محاسن', en: 'Mahasin' }, { ar: 'الراشدية', en: 'Al Rashidiyah' },
    { ar: 'الطرف', en: 'Al Tarf' },
  ],
  'الخرج': [
    { ar: 'السيح', en: 'Al Sayh' }, { ar: 'نعجان', en: 'Najan' }, { ar: 'الناصرية', en: 'Al Nasiriyah' },
    { ar: 'اليمامة', en: 'Al Yamamah' },
  ],
}

export function districtsFor(city?: string): District[] {
  return (city && DISTRICTS_BY_CITY[city]) || []
}

// Label to show for a district given the UI locale (English transliteration for
// 'en', Arabic otherwise — Urdu reads the Arabic script fine).
export function districtLabel(d: District, locale?: string): string {
  return locale === 'en' ? (d.en || d.ar) : d.ar
}
