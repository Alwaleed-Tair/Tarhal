/**
 * ADDITION FOR TARIQ'S REVIEW (not in his original): the real place for each of his place photos, with its location,
 * so the city page can name it and open it in Hudhud. His cities.ts stays as he wrote it.
 *
 * - Where his photo shows a place we could name for sure, it keeps his photo (no `photo` here).
 * - Where his photo showed no nameable place (open sea, a mountain view, a shop front, a park), the place is a real,
 *   well-known one in that city or region, with a free photo from Wikimedia Commons (`photo`). Source, author and licence
 *   of each new photo: public/images/cities/CREDITS.md.
 * - Coordinates: checked on OpenStreetMap (Nominatim), plus Wikipedia, Visit Saudi or the photo's own GPS where noted.
 *   A place whose exact location could not be checked has no lat/lng: it shows its name, but no Hudhud button.
 * - `area`: for a place outside the city itself, where it is (so nobody expects it in the city centre).
 */
export type CityPlace = { name: string; nameAr: string; lat?: number; lng?: number; photo?: string; area?: string; areaAr?: string };

const img = (city: string, file: string) => `/images/cities/${city}/places/${file}.webp`;

export const cityPlaces: Record<string, CityPlace> = {
  // Riyadh: names and photos are Tariq's; only the locations are added.
  'riyadh-place-1': { name: 'Al Bujairi', nameAr: 'البجيري', lat: 24.73579, lng: 46.57586 },
  'riyadh-place-2': { name: 'Kingdom Tower', nameAr: 'برج المملكة', lat: 24.71138, lng: 46.67435 },
  'riyadh-place-3': { name: 'King Abdullah Financial District', nameAr: 'مركز الملك عبدالله المالي', lat: 24.7657, lng: 46.64071 },
  'riyadh-place-4': { name: 'Boulevard World', nameAr: 'بوليفارد وورلد', lat: 24.77665, lng: 46.60037 },

  'jeddah-place-1': { name: 'Al-Balad (Historic Jeddah)', nameAr: 'البلد (جدة التاريخية)', lat: 21.48604, lng: 39.1877 },
  'jeddah-place-2': { name: 'Jeddah Waterfront', nameAr: 'الواجهة البحرية بجدة', lat: 21.59892, lng: 39.10638 },
  'jeddah-place-3': { name: 'Jeddah Yacht Club', nameAr: 'نادي جدة لليخوت', lat: 21.65296, lng: 39.10155 },
  'jeddah-place-4': { name: 'Al-Rahma Mosque', nameAr: 'مسجد الرحمة', lat: 21.64871, lng: 39.10083 }, // Wikipedia: 21.6486, 39.1008

  'abha-place-1': { name: 'Jabal Sawda', nameAr: 'جبل السودة', lat: 18.26559, lng: 42.36756, photo: img('abha', 'al-sawda') },
  'abha-place-2': { name: 'Al Habala Village', nameAr: 'قرية الحبلة', lat: 18.03478, lng: 42.87407, photo: img('abha', 'al-habala'), area: 'Ahad Rufaydah, Asir', areaAr: 'أحد رفيدة، عسير' },
  'abha-place-3': { name: 'Rijal Almaa Heritage Village', nameAr: 'قرية رجال ألمع التراثية', lat: 18.2125, lng: 42.27361 }, // Wikipedia
  'abha-place-4': { name: 'Abha Dam Lake', nameAr: 'بحيرة سد أبها', lat: 18.21187, lng: 42.48821, photo: img('abha', 'abha-dam-lake') },

  'al-khobar-place-1': { name: 'Al Khobar Corniche', nameAr: 'كورنيش الخبر', lat: 26.30571, lng: 50.22734 },
  'al-khobar-place-2': { name: 'Khobar Water Tower', nameAr: 'برج المياه بالخبر', lat: 26.30778, lng: 50.23189 },
  'al-khobar-place-3': { name: 'King Fahd Causeway', nameAr: 'جسر الملك فهد', lat: 26.21708, lng: 50.24916, photo: img('al-khobar', 'king-fahd-causeway') },
  'al-khobar-place-4': { name: 'Scitech (Sultan bin Abdulaziz Science and Technology Center)', nameAr: 'مركز الأمير سلطان للعلوم والتقنية (سايتك)', lat: 26.31917, lng: 50.22799 },

  'al-bahah-place-1': { name: 'Dhee Ain Village', nameAr: 'قرية ذي عين', lat: 19.93062, lng: 41.4428 },
  'al-bahah-place-2': { name: 'Raghadan Forest Park', nameAr: 'غابة رغدان', lat: 20.02298, lng: 41.43581 }, // its Cloud Walk, per raghadanforest.com
  'al-bahah-place-3': { name: 'Baljurashi Old Town', nameAr: 'بلجرشي القديمة', lat: 19.85982, lng: 41.55926, photo: img('al-bahah', 'baljurashi-old-town'), area: 'Baljurashi, Al Bahah Region', areaAr: 'بلجرشي، منطقة الباحة' }, // photo GPS; OSM town 19.85944, 41.55722
  'al-bahah-place-4': { name: 'Al Mandaq', nameAr: 'المندق', lat: 20.11051, lng: 41.28285, photo: img('al-bahah', 'al-mandaq'), area: 'Al Bahah Region', areaAr: 'منطقة الباحة' },

  'al-taif-place-1': { name: 'Al Hada', nameAr: 'الهدا', lat: 21.36861, lng: 40.28472 },
  'al-taif-place-2': { name: 'Al Shafa', nameAr: 'الشفا', lat: 21.06944, lng: 40.31194, photo: img('al-taif', 'al-shafa') },
  'al-taif-place-3': { name: 'Al Hada Cable Car', nameAr: 'تلفريك الهدا', lat: 21.36026, lng: 40.24842 },
  'al-taif-place-4': { name: 'Shubra Palace', nameAr: 'قصر شبرا', lat: 21.2859, lng: 40.41508 },

  'dammam-place-1': { name: 'Dammam Corniche', nameAr: 'كورنيش الدمام', lat: 26.46284, lng: 50.11307, photo: img('dammam', 'dammam-corniche') },
  'dammam-place-2': { name: 'Marjan Island', nameAr: 'جزيرة المرجان', lat: 26.48367, lng: 50.10545 }, // its spiral Al-Malwiya Tower
  'dammam-place-3': { name: 'Heritage Village', nameAr: 'القرية الشعبية', lat: 26.492, lng: 50.12058 }, // Visit Saudi
  'dammam-place-4': { name: 'Tarout Castle', nameAr: 'قلعة تاروت', lat: 26.56929, lng: 50.06596, photo: img('dammam', 'tarout-castle'), area: 'Tarout Island, Qatif', areaAr: 'جزيرة تاروت، القطيف' },

  'alula-place-1': { name: 'Maraya', nameAr: 'مرايا', lat: 26.74315, lng: 37.86528 },
  'alula-place-2': { name: 'Hegra', nameAr: 'الحجر', lat: 26.79167, lng: 37.95278 }, // Wikipedia; the photo is its Qasr al-Farid tomb
  'alula-place-3': { name: 'AlUla Old Town', nameAr: 'البلدة القديمة بالعلا', lat: 26.62558, lng: 37.91479 },
  'alula-place-4': { name: 'Elephant Rock', nameAr: 'صخرة الفيل', lat: 26.68934, lng: 37.98155, photo: img('alula', 'elephant-rock') },

  // Umluj: OpenStreetMap, Wikipedia and Wikidata have no point for the Emirate Palace or Northern Harrat Beach, and
  // Commons has no other free photos of Umluj places, so the last two are in Al Wajh, the next town north on the coast.
  'umluj-place-1': { name: 'Umluj Emirate Palace', nameAr: 'قصر الإمارة بأملج', photo: img('umluj', 'umluj-emirate-palace') },
  'umluj-place-2': { name: 'Northern Harrat Beach', nameAr: 'شاطئ الحرة الشمالية', photo: img('umluj', 'northern-harrat-beach') },
  'umluj-place-3': { name: 'Al Wajh Old Town', nameAr: 'البلدة القديمة بالوجه', lat: 26.22722, lng: 36.45804, photo: img('umluj', 'al-wajh-old-town'), area: 'Al Wajh, north of Umluj', areaAr: 'الوجه، شمال أملج' }, // photo GPS = "Al Balad, Al Wajh" on OSM
  'umluj-place-4': { name: 'Al Wajh Beach', nameAr: 'شاطئ الوجه', photo: img('umluj', 'al-wajh-beach'), area: 'Al Wajh, north of Umluj', areaAr: 'الوجه، شمال أملج' },
};

/**
 * Hudhud has no published link format for places. Its web app (web.hudhud.sa) reads `lat` and `lng`
 * on its /preview page and drops a pin there; on a phone the page offers to open or install the app.
 */
export const hudhudLink = (place: CityPlace) => `https://web.hudhud.sa/preview?lat=${place.lat}&lng=${place.lng}`;
