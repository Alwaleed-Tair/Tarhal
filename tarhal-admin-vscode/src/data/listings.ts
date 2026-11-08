// FRONTEND MOCK DATA for the public listing pages. Swap for API results when the backend is ready.
// Hotel images: drop files into `public/images/hotels/` (hotel-1.jpg ...). Until they exist the cards
// show a gradient placeholder automatically.

export type Hotel = { id: string; name: string; nameAr: string; address: string; addressAr: string; rating: number; image: string; city?: string; pricePerNight?: number };

// TODO / INTEGRATION POINT
// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
export const hotelListings: Hotel[] = [
  { id: 'h1', name: 'Hilton Garden Riyadh', nameAr: 'هيلتون جاردن الرياض', address: 'King Fahd Road, Al Olaya, Riyadh', addressAr: 'طريق الملك فهد، العليا، الرياض', rating: 4.5, image: '/images/hotels/hotel-1.jpg' },
  { id: 'h2', name: 'The Boulevard', nameAr: 'ذا بوليفارد', address: 'Sheikh Zayed Road, Downtown, Dubai', addressAr: 'شارع الشيخ زايد، وسط المدينة، دبي', rating: 4.7, image: '/images/hotels/hotel-2.jpg' },
  { id: 'h3', name: 'Mövenpick Amman', nameAr: 'موفنبيك عمّان', address: 'Abdoun Circle, Amman', addressAr: 'دوار عبدون، عمّان', rating: 4.3, image: '/images/hotels/hotel-3.jpg' },
  { id: 'h4', name: 'Rosewood Corniche', nameAr: 'روزوود الكورنيش', address: 'Corniche Road, Jeddah', addressAr: 'طريق الكورنيش، جدة', rating: 4.8, image: '/images/hotels/hotel-4.jpg' },
  { id: 'h5', name: 'Palm Court Hotel', nameAr: 'فندق بالم كورت', address: 'West Bay, Doha', addressAr: 'الخليج الغربي، الدوحة', rating: 4.2, image: '/images/hotels/hotel-5.jpg' },
  { id: 'h6', name: 'Nile View Suites', nameAr: 'نايل فيو للأجنحة', address: 'Corniche El Nil, Cairo', addressAr: 'كورنيش النيل، القاهرة', rating: 4.1, image: '/images/hotels/hotel-6.jpg' },
  { id: 'h7', name: 'Desert Rose Resort', nameAr: 'منتجع وردة الصحراء', address: 'Diriyah Road, Riyadh', addressAr: 'طريق الدرعية، الرياض', rating: 4.6, image: '/images/hotels/hotel-7.jpg' },
  { id: 'h8', name: 'Marina Bay Hotel', nameAr: 'فندق مارينا باي', address: 'Dubai Marina, Dubai', addressAr: 'مرسى دبي، دبي', rating: 4.4, image: '/images/hotels/hotel-8.jpg' },
  { id: 'h9', name: 'Faisaliah Suites', nameAr: 'أجنحة الفيصلية', address: 'Al Urubah Road, Riyadh', addressAr: 'طريق العروبة، الرياض', rating: 4.0, image: '/images/hotels/hotel-9.jpg' },
  { id: 'h10', name: 'Old Town Inn', nameAr: 'نزل البلدة القديمة', address: 'Al Balad, Jeddah', addressAr: 'البلد، جدة', rating: 3.9, image: '/images/hotels/hotel-10.jpg' },
  { id: 'h11', name: 'Gulf Pearl Hotel', nameAr: 'فندق لؤلؤة الخليج', address: 'Corniche Street, Doha', addressAr: 'شارع الكورنيش، الدوحة', rating: 4.3, image: '/images/hotels/hotel-11.jpg' },
  { id: 'h12', name: 'Skyline Tower Hotel', nameAr: 'فندق سكاي لاين تاور', address: 'Rainbow Street, Amman', addressAr: 'شارع الرينبو، عمّان', rating: 4.2, image: '/images/hotels/hotel-12.jpg' },
];

export type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  seats: number;
  transmission: 'Automatic' | 'Manual';
  city?: string;
  pricePerDay: number;
  insurancePerDay: number;
};

// TODO / INTEGRATION POINT
// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
export const carListings: Car[] = [
  { id: 'c1', make: 'Toyota', model: 'Camry', year: 2024, seats: 5, transmission: 'Automatic', pricePerDay: 55, insurancePerDay: 12 },
  { id: 'c2', make: 'Hyundai', model: 'Sonata', year: 2023, seats: 5, transmission: 'Automatic', pricePerDay: 50, insurancePerDay: 11 },
  { id: 'c3', make: 'Kia', model: 'Carnival', year: 2024, seats: 8, transmission: 'Automatic', pricePerDay: 95, insurancePerDay: 20 },
  { id: 'c4', make: 'Nissan', model: 'Patrol', year: 2023, seats: 7, transmission: 'Automatic', pricePerDay: 120, insurancePerDay: 25 },
  { id: 'c5', make: 'BMW', model: '3 Series', year: 2024, seats: 5, transmission: 'Automatic', pricePerDay: 130, insurancePerDay: 28 },
  { id: 'c6', make: 'Toyota', model: 'Corolla', year: 2022, seats: 5, transmission: 'Manual', pricePerDay: 35, insurancePerDay: 8 },
  { id: 'c7', make: 'Hyundai', model: 'Accent', year: 2022, seats: 5, transmission: 'Manual', pricePerDay: 30, insurancePerDay: 7 },
  { id: 'c8', make: 'Kia', model: 'Sportage', year: 2024, seats: 5, transmission: 'Automatic', pricePerDay: 70, insurancePerDay: 15 },
  { id: 'c9', make: 'Ford', model: 'Explorer', year: 2023, seats: 7, transmission: 'Automatic', pricePerDay: 110, insurancePerDay: 22 },
  { id: 'c10', make: 'Honda', model: 'Accord', year: 2023, seats: 5, transmission: 'Automatic', pricePerDay: 60, insurancePerDay: 13 },
  { id: 'c11', make: 'Chevrolet', model: 'Tahoe', year: 2024, seats: 7, transmission: 'Automatic', pricePerDay: 140, insurancePerDay: 30 },
  { id: 'c12', make: 'Mazda', model: 'CX-5', year: 2022, seats: 5, transmission: 'Automatic', pricePerDay: 65, insurancePerDay: 14 },
];
