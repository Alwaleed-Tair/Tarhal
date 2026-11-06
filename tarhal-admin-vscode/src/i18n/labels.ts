import type { Language, TranslationKey, TranslationParam } from '@/i18n/translations';

const AIRPORT_AR: Record<string, string> = {
  RUH: 'الرياض', JED: 'جدة', DXB: 'دبي', AMM: 'عمّان', DOH: 'الدوحة', CAI: 'القاهرة',
  DMM: 'الدمام', DDM: 'الدمام', // "DDM" is how the demo data spells Dammam
};

/** Arabic labels for stored English values (cities, rooms, hotels, cars). */
const VALUE_AR: Record<string, string> = {
  Riyadh: 'الرياض', Jeddah: 'جدة', Dubai: 'دبي', Amman: 'عمّان', Doha: 'الدوحة', Cairo: 'القاهرة',
  'King Suite': 'جناح كينج', Deluxe: 'ديلوكس', 'Twin Room': 'غرفة توأم', 'Standard Room': 'غرفة عادية',
  'Hilton Garden': 'هيلتون جاردن', 'The Boulevard': 'ذا بوليفارد', 'Mövenpick': 'موفنبيك',
  'Toyota Camry': 'تويوتا كامري', 'Kia Carnival': 'كيا كرنفال', 'BMW 3 Series': 'بي إم دبليو الفئة الثالثة',
  'Nissan Patrol': 'نيسان باترول', 'Hyundai Sonata': 'هيونداي سوناتا',
  'Available Now': 'متاح الآن', Limited: 'محدود', Booked: 'محجوز',
  Economy: 'الدرجة السياحية', 'Premium Economy': 'السياحية المميزة', Business: 'درجة الأعمال', 'First Class': 'الدرجة الأولى',
  Saudia: 'السعودية', Flynas: 'طيران ناس', Flyadeal: 'طيران أديل', Emirates: 'طيران الإمارات', 'Qatar Airways': 'الخطوط القطرية',
};

/** Translates a stored value for display. English is returned untouched. */
export function translateValue(value: string, language: Language): string {
  if (language !== 'ar' || !value) return value;
  if (VALUE_AR[value]) return VALUE_AR[value];

  // "RUH → JED" becomes "الرياض ← جدة" (the arrow must point the RTL way).
  const route = value.split(' → ');
  if (route.length === 2 && route.every((code) => AIRPORT_AR[code])) return route.map((code) => AIRPORT_AR[code]).join(' ← ');

  const count = /^(\d+) available$/.exec(value);
  return count ? `${count[1]} متاح` : value;
}

const STATUS_KEYS: Record<string, TranslationKey> = {
  Confirmed: 'confirmed', Pending: 'pending', Cancelled: 'cancelled',
  Active: 'active', Inactive: 'inactive', Deleted: 'deleted',
  Available: 'available', Limited: 'limited', Scheduled: 'scheduled', Boarding: 'boarding', Booked: 'booked',
};

export function statusLabel(status: string, t: (key: TranslationKey) => string): string {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
}

/** A status as a notification placeholder, translated when the toast is rendered. */
export function statusParam(status: string): TranslationParam {
  const key = STATUS_KEYS[status];
  return key ? { key } : status;
}
