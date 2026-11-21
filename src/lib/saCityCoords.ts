// Approximate centres of the cities in CITIES_BY_REGION (src/types), so a map pin / GPS fix can fill
// the region and city by itself without a paid geocoding API (owner 2026-11-21). Keys = Arabic names
// exactly as in CITIES_BY_REGION.
export const SA_CITY_COORDS: { region: string; city: string; lat: number; lng: number }[] = [
  { region: 'الرياض', city: 'الرياض', lat: 24.7136, lng: 46.6753 },
  { region: 'الرياض', city: 'الخرج', lat: 24.155, lng: 47.334 },
  { region: 'الرياض', city: 'الدوادمي', lat: 24.507, lng: 44.392 },
  { region: 'الرياض', city: 'المجمعة', lat: 25.904, lng: 45.345 },
  { region: 'الرياض', city: 'الزلفي', lat: 26.299, lng: 44.814 },
  { region: 'الرياض', city: 'وادي الدواسر', lat: 20.463, lng: 44.773 },
  { region: 'الرياض', city: 'عفيف', lat: 23.906, lng: 42.917 },
  { region: 'الرياض', city: 'الأفلاج', lat: 22.29, lng: 46.73 },
  { region: 'مكة المكرمة', city: 'مكة المكرمة', lat: 21.389, lng: 39.858 },
  { region: 'مكة المكرمة', city: 'جدة', lat: 21.543, lng: 39.173 },
  { region: 'مكة المكرمة', city: 'الطائف', lat: 21.27, lng: 40.415 },
  { region: 'مكة المكرمة', city: 'رابغ', lat: 22.799, lng: 39.035 },
  { region: 'مكة المكرمة', city: 'القنفذة', lat: 19.127, lng: 41.079 },
  { region: 'مكة المكرمة', city: 'الليث', lat: 20.15, lng: 40.27 },
  { region: 'المدينة المنورة', city: 'المدينة المنورة', lat: 24.467, lng: 39.611 },
  { region: 'المدينة المنورة', city: 'ينبع', lat: 24.089, lng: 38.064 },
  { region: 'المدينة المنورة', city: 'العلا', lat: 26.608, lng: 37.923 },
  { region: 'المدينة المنورة', city: 'بدر', lat: 23.78, lng: 38.79 },
  { region: 'المدينة المنورة', city: 'خيبر', lat: 25.697, lng: 39.292 },
  { region: 'القصيم', city: 'بريدة', lat: 26.326, lng: 43.975 },
  { region: 'القصيم', city: 'عنيزة', lat: 26.084, lng: 43.994 },
  { region: 'القصيم', city: 'الرس', lat: 25.869, lng: 43.497 },
  { region: 'القصيم', city: 'المذنب', lat: 25.861, lng: 44.222 },
  { region: 'المنطقة الشرقية', city: 'الدمام', lat: 26.392, lng: 49.978 },
  { region: 'المنطقة الشرقية', city: 'الخبر', lat: 26.217, lng: 50.197 },
  { region: 'المنطقة الشرقية', city: 'الظهران', lat: 26.288, lng: 50.114 },
  { region: 'المنطقة الشرقية', city: 'الأحساء', lat: 25.383, lng: 49.586 },
  { region: 'المنطقة الشرقية', city: 'الجبيل', lat: 27.011, lng: 49.658 },
  { region: 'المنطقة الشرقية', city: 'القطيف', lat: 26.565, lng: 50.012 },
  { region: 'المنطقة الشرقية', city: 'حفر الباطن', lat: 28.432, lng: 45.971 },
  { region: 'المنطقة الشرقية', city: 'الخفجي', lat: 28.439, lng: 48.491 },
  { region: 'عسير', city: 'أبها', lat: 18.216, lng: 42.505 },
  { region: 'عسير', city: 'خميس مشيط', lat: 18.306, lng: 42.729 },
  { region: 'عسير', city: 'بيشة', lat: 19.99, lng: 42.59 },
  { region: 'عسير', city: 'النماص', lat: 19.115, lng: 42.13 },
  { region: 'تبوك', city: 'تبوك', lat: 28.383, lng: 36.566 },
  { region: 'تبوك', city: 'ضباء', lat: 27.35, lng: 35.69 },
  { region: 'تبوك', city: 'تيماء', lat: 27.63, lng: 38.548 },
  { region: 'تبوك', city: 'الوجه', lat: 26.245, lng: 36.452 },
  { region: 'تبوك', city: 'نيوم', lat: 27.95, lng: 35.3 },
  { region: 'حائل', city: 'حائل', lat: 27.511, lng: 41.69 },
  { region: 'حائل', city: 'بقعاء', lat: 27.889, lng: 42.403 },
  { region: 'حائل', city: 'الشنان', lat: 27.18, lng: 42.443 },
  { region: 'الحدود الشمالية', city: 'عرعر', lat: 30.975, lng: 41.038 },
  { region: 'الحدود الشمالية', city: 'رفحاء', lat: 29.626, lng: 43.493 },
  { region: 'الحدود الشمالية', city: 'طريف', lat: 31.672, lng: 38.663 },
  { region: 'جازان', city: 'جازان', lat: 16.889, lng: 42.551 },
  { region: 'جازان', city: 'صبيا', lat: 17.15, lng: 42.626 },
  { region: 'جازان', city: 'أبو عريش', lat: 16.968, lng: 42.833 },
  { region: 'جازان', city: 'صامطة', lat: 16.596, lng: 42.944 },
  { region: 'نجران', city: 'نجران', lat: 17.565, lng: 44.228 },
  { region: 'نجران', city: 'شرورة', lat: 17.471, lng: 47.105 },
  { region: 'الباحة', city: 'الباحة', lat: 20.013, lng: 41.465 },
  { region: 'الباحة', city: 'بلجرشي', lat: 19.859, lng: 41.558 },
  { region: 'الباحة', city: 'المخواة', lat: 19.768, lng: 41.433 },
  { region: 'الجوف', city: 'سكاكا', lat: 29.969, lng: 40.206 },
  { region: 'الجوف', city: 'القريات', lat: 31.331, lng: 37.343 },
  { region: 'الجوف', city: 'دومة الجندل', lat: 29.811, lng: 39.868 },
]

/** Great-circle distance in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** The nearest listed city to a point inside Saudi Arabia, or null outside the country's box. */
export function nearestSaCity(lat: number, lng: number): { region: string; city: string; km: number } | null {
  if (!(lat > 16 && lat < 32.6 && lng > 34.4 && lng < 55.8)) return null
  let best: { region: string; city: string; km: number } | null = null
  for (const c of SA_CITY_COORDS) {
    const km = distanceKm(lat, lng, c.lat, c.lng)
    if (!best || km < best.km) best = { region: c.region, city: c.city, km }
  }
  return best
}
