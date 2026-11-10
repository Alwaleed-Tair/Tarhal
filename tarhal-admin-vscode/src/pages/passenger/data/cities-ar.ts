/**
 * Arabic for the real content in Tariq's cities.ts (his file stays as he wrote it). Keyed by city slug and place id.
 * Placeholder text ("Add …'s description here.", "First place") has no Arabic: the page hides it.
 */
export const cityDescriptionAr: Record<string, string> = {
  riyadh: 'الرياض هي العاصمة السياسية والاقتصادية والإدارية للمملكة العربية السعودية، تقع في وسط هضبة نجد على مساحة تقارب 1,554 كيلومتراً مربعاً، ويزيد عدد سكانها على 7.6 مليون نسمة.',
};

export const placeTitleAr: Record<string, string> = {
  'riyadh-place-1': 'البجيري',
  'riyadh-place-2': 'برج المملكة',
  'riyadh-place-3': 'مركز الملك عبدالله المالي',
  'riyadh-place-4': 'بوليفارد وورلد',
};

/** Tariq's sample text that is not real content yet: hidden on the page, listed for him to fill in. */
export const isPlaceholderDescription = (text: string) => /^Add .+ description here\.?$/i.test(text.trim());
export const isPlaceholderTitle = (text: string) => /^(First|Second|Third|Fourth|Fifth) place$/i.test(text.trim());
