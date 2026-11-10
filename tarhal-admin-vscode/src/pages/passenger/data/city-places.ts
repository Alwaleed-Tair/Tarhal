/**
 * ADDITION FOR TARIQ'S REVIEW (not in his original): the real place shown in each of his place photos,
 * with its location, so the city page can name it and open it in Hudhud. His cities.ts stays as he wrote it.
 *
 * Every entry was matched to its photo by eye and its coordinates checked against OpenStreetMap
 * (and Wikipedia or Visit Saudi where noted). A photo that shows no place we could name for sure
 * (open sea, a generic mountain view, a shop front) has no entry, so it shows without a name or a link.
 */
export type CityPlace = { name: string; nameAr: string; lat: number; lng: number };

export const cityPlaces: Record<string, CityPlace> = {
  // Riyadh: names are Tariq's; only the locations are added.
  'riyadh-place-1': { name: 'Al Bujairi', nameAr: 'البجيري', lat: 24.73579, lng: 46.57586 },
  'riyadh-place-2': { name: 'Kingdom Tower', nameAr: 'برج المملكة', lat: 24.71138, lng: 46.67435 },
  'riyadh-place-3': { name: 'King Abdullah Financial District', nameAr: 'مركز الملك عبدالله المالي', lat: 24.7657, lng: 46.64071 },
  'riyadh-place-4': { name: 'Boulevard World', nameAr: 'بوليفارد وورلد', lat: 24.77665, lng: 46.60037 },

  'jeddah-place-1': { name: 'Al-Balad (Historic Jeddah)', nameAr: 'البلد (جدة التاريخية)', lat: 21.48604, lng: 39.1877 },
  'jeddah-place-2': { name: 'Jeddah Waterfront', nameAr: 'الواجهة البحرية بجدة', lat: 21.59892, lng: 39.10638 },
  'jeddah-place-3': { name: 'Jeddah Yacht Club', nameAr: 'نادي جدة لليخوت', lat: 21.65296, lng: 39.10155 },
  'jeddah-place-4': { name: 'Al-Rahma Mosque', nameAr: 'مسجد الرحمة', lat: 21.64871, lng: 39.10083 }, // Wikipedia: 21.6486, 39.1008

  'abha-place-3': { name: 'Rijal Almaa Heritage Village', nameAr: 'قرية رجال ألمع التراثية', lat: 18.2125, lng: 42.27361 }, // Wikipedia

  'al-khobar-place-1': { name: 'Al Khobar Corniche', nameAr: 'كورنيش الخبر', lat: 26.30571, lng: 50.22734 },
  'al-khobar-place-2': { name: 'Khobar Water Tower', nameAr: 'برج المياه بالخبر', lat: 26.30778, lng: 50.23189 },
  'al-khobar-place-4': { name: 'Scitech (Sultan bin Abdulaziz Science and Technology Center)', nameAr: 'مركز الأمير سلطان للعلوم والتقنية (سايتك)', lat: 26.31917, lng: 50.22799 },

  'al-bahah-place-1': { name: 'Dhee Ain Village', nameAr: 'قرية ذي عين', lat: 19.93062, lng: 41.4428 },
  'al-bahah-place-2': { name: 'Raghadan Forest Park', nameAr: 'غابة رغدان', lat: 20.02298, lng: 41.43581 }, // its Cloud Walk, per raghadanforest.com

  'al-taif-place-1': { name: 'Al Hada', nameAr: 'الهدا', lat: 21.36861, lng: 40.28472 },
  'al-taif-place-3': { name: 'Al Hada Cable Car', nameAr: 'تلفريك الهدا', lat: 21.36026, lng: 40.24842 },
  'al-taif-place-4': { name: 'Shubra Palace', nameAr: 'قصر شبرا', lat: 21.2859, lng: 40.41508 },

  'dammam-place-1': { name: 'Ithra (King Abdulaziz Center for World Culture)', nameAr: 'إثراء (مركز الملك عبدالعزيز الثقافي العالمي)', lat: 26.33541, lng: 50.12058 },
  'dammam-place-2': { name: 'Marjan Island', nameAr: 'جزيرة المرجان', lat: 26.48367, lng: 50.10545 }, // its spiral Al-Malwiya Tower
  'dammam-place-3': { name: 'Heritage Village', nameAr: 'القرية الشعبية', lat: 26.492, lng: 50.12058 }, // Visit Saudi

  'alula-place-1': { name: 'Maraya', nameAr: 'مرايا', lat: 26.74315, lng: 37.86528 },
  'alula-place-2': { name: 'Hegra', nameAr: 'الحجر', lat: 26.79167, lng: 37.95278 }, // Wikipedia; the photo is its Qasr al-Farid tomb
  'alula-place-3': { name: 'AlUla Old Town', nameAr: 'البلدة القديمة بالعلا', lat: 26.62558, lng: 37.91479 },
};

/**
 * Hudhud has no published link format for places. Its web app (web.hudhud.sa) reads `lat` and `lng`
 * on its /preview page and drops a pin there; on a phone the page offers to open or install the app.
 */
export const hudhudLink = (place: CityPlace) => `https://web.hudhud.sa/preview?lat=${place.lat}&lng=${place.lng}`;
