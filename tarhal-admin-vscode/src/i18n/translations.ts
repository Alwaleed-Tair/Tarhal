export type Language = 'en' | 'ar';
export const translations = {
  en: {
    dashboard: 'Overview Dashboard', flights: 'Flights', hotels: 'Hotels', cars: 'Car Rentals', bookings: 'Bookings', revenue: 'Revenue', users: 'Users', settings: 'Settings',
    search: 'Search', admin: 'Admin User', totalBookings: 'Total Bookings', totalRevenue: 'Total Revenue', activeUsers: 'Active Users',
    recentTransactions: 'Recent Transactions', revenueByService: 'Revenue by Service', actions: 'Actions', add: 'Add', edit: 'Edit', remove: 'Remove', price: 'Price', status: 'Status', save: 'Save', cancel: 'Cancel', close: 'Close',
    flightManagement: 'Flight Management', hotelManagement: 'Hotel Management', carManagement: 'Car Rentals Management', managePrices: 'Manage routes and pricing',
    totalFlights: 'Flight Bookings', flightRevenue: 'Flights Revenue', totalRooms: 'Total Rooms', hotelRevenue: 'Hotel Revenue', guests: 'Guests', totalCars: 'Total Cars', carsRevenue: 'Cars Revenue', availableCars: 'Available Cars',
    allBookings: 'All Bookings', all: 'All', flight: 'Flights', hotel: 'Hotels', car: 'Cars', bookingId: 'Booking ID', customer: 'Customer Name', dateTime: 'Date & Time', totalPrice: 'Total Price',
    revenueOverview: 'Revenue Overview', allServices: 'All Services', usersManagement: 'Users Management', active: 'Active', inactive: 'Inactive', deleted: 'Deleted', userId: 'User ID', fullName: 'Full Name', email: 'Email Address', joinDate: 'Join Date',
    settingsTitle: 'Workspace Settings', language: 'Language', languageHelp: 'Choose the language for the admin workspace.', theme: 'Theme', themeHelp: 'Use a lighter or darker workspace.', accessibility: 'Accessibility', accessibilityHelp: 'Adjust the interface for your team.', largerText: 'Larger text', highContrast: 'High contrast', light: 'Light', dark: 'Dark', english: 'English', arabic: 'العربية', preferencesSaved: 'Preferences are saved on this device.', noResults: 'No records match your filters.',
    confirmRemove: 'Remove this demo record?', demoNote: 'Demo workspace — changes are saved locally only.',
    addRecord: 'Add record', editRecord: 'Edit record', removeRecord: 'Remove record', chooseRecord: 'Choose a record', selectRecord: 'Select a record', saveChanges: 'Save changes', removeRecordConfirm: 'Remove this record?', selectRecordFirst: 'Choose a record first.', requiredField: 'Complete the required fields.', duplicateRecord: 'A record with this name already exists.',
    flightNumber: 'Flight number', hotelName: 'Hotel name', carModel: 'Car model', route: 'Route', cityRoom: 'City / room', locationAvailability: 'Location / availability', city: 'City', roomType: 'Room type', location: 'Location', availability: 'Availability',
    switchToLight: 'Switch to light mode', switchToDark: 'Switch to dark mode',
    chatbot: 'Chatbot', chatTitle: 'Tarhal admin helper', chatDemoNote: 'Demo assistant — replies use guidance for this sample dashboard.',
    chatGreeting: 'Hello. Ask about bookings, revenue, flights, hotels, or rental cars.',
    chatPlaceholder: 'Type your question…', chatSend: 'Send', chatClose: 'Close chat',
    chatBookingHelp: 'Open Bookings to review demo records or filter by flight, hotel, or car.',
    chatRevenueHelp: 'Open Revenue to view demo totals and switch between services.',
    chatFlightsHelp: 'Open Flights to manage sample routes, prices, and statuses.',
    chatHotelsHelp: 'Open Hotels to manage sample properties and prices.',
    chatCarsHelp: 'Open Car Rentals to manage sample vehicles and prices.',
    chatFallback: 'I can help with this dashboard demo. Try asking about bookings, revenue, flights, hotels, or cars.',
    type: 'Type', confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', available: 'Available', limited: 'Limited', scheduled: 'Scheduled', boarding: 'Boarding', booked: 'Booked',
    flightSingular: 'Flight', hotelSingular: 'Hotel', carSingular: 'Car', select: 'Select...', revenueChart: 'Revenue chart',
    filterAny: 'All', filterRating: 'Rating', ratingFrom40: '4.0+ stars', ratingFrom45: '4.5+ stars', filterTransmission: 'Transmission', filterSeats: 'Seats', seats5Plus: '5+ seats', seats7Plus: '7+ seats',
    phone: 'Phone number', errPhoneInvalid: 'Enter a valid phone number', errDobInvalid: 'Enter a valid date of birth',
    airline: 'Airline', cabinClass: 'Cabin Class', newBooking: 'New booking', travelers: 'Travelers', traveler: 'Traveler', seat: 'Seat', passportNumber: 'Passport number', dateOfBirth: 'Date of birth', addTraveler: 'Add traveler', createBooking: 'Create booking',
    seatsUnavailable: 'One or more selected seats are no longer available', bookingCreatedTitle: 'Booking created', bookingCreated: 'Booking {id} was created.', bookingFailed: 'Could not create the booking. Please try again.',
    mainNavigation: 'Main navigation', openNavigation: 'Open navigation', closeNavigation: 'Close navigation',
    notifications: 'Notifications', noNotifications: 'No new notifications', markAllRead: 'Mark all as read', clearAll: 'Clear all',
    actionFailedTitle: 'Could not save', removeFailedTitle: 'Could not remove', actionFailed: '{message}', fieldRequired: 'This field is required.', priceInvalid: 'Enter a valid price of 0 or more.', saving: 'Saving…',
    errBadRequest: 'The server rejected this request. Check the values and try again.', errUnauthorized: 'Your session has expired. Sign in again.', errForbidden: 'You do not have permission to do this.', errNotFound: 'This record no longer exists.', errConflict: 'This record conflicts with an existing one.', errServer: 'The server had a problem. Try again in a moment.', errNetwork: 'Cannot reach the server. Check your connection and try again.', errTimeout: 'The server took too long to respond. Try again.', errGeneric: 'Something went wrong. Please try again.',
    recordAddedTitle: 'Record added', recordAdded: '{noun} {id} was added successfully.',
    recordUpdatedTitle: 'Record updated', recordUpdated: '{noun} {id} was updated.',
    recordRemovedTitle: 'Record removed', recordRemoved: '{noun} {id} was removed.',
    statusUpdatedTitle: 'Status updated', bookingStatusUpdated: 'Booking {id} is now {status}.', userStatusUpdated: 'User {id} is now {status}.',
    seniorMode: 'Senior Accessibility Mode', seniorModeHelp: 'Turns on large text and high contrast together.',
    fullYear: 'Full Year (12 Months)', thisMonth: 'This Month', last3Months: 'Last 3 Months', last6Months: 'Last 6 Months', yearToDate: 'Year to Date (YTD)', period: 'Period', chartLegend: 'Chart legend', total: 'Total', loading: 'Loading…', clearFilters: 'Clear filters', clearSearch: 'Clear search',
    breadcrumb: 'Breadcrumb', breadcrumbAdmin: 'Admin', recordsCount: '{count} records', pendingCount: '{count} pending', activeCount: '{count} active', demoBadge: 'Demo data', currency: 'Currency',
    dashboardSubtitle: 'Bookings, revenue and users at a glance.', flightsSubtitle: 'Manage flights, routes and prices.', hotelsSubtitle: 'Manage hotels, rooms and nightly prices.', carsSubtitle: 'Manage rental cars, locations and daily prices.',
    bookingsSubtitle: 'Review bookings and update their status.', revenueSubtitle: 'Track revenue by service and period.', usersSubtitle: 'Manage customer accounts and their status.',
  },
  ar: {
    dashboard: 'لوحة النظرة العامة', flights: 'الرحلات', hotels: 'الفنادق', cars: 'تأجير السيارات', bookings: 'الحجوزات', revenue: 'الإيرادات', users: 'المستخدمون', settings: 'الإعدادات',
    search: 'بحث', admin: 'المستخدم المسؤول', totalBookings: 'إجمالي الحجوزات', totalRevenue: 'إجمالي الإيرادات', activeUsers: 'المستخدمون النشطون',
    recentTransactions: 'أحدث المعاملات', revenueByService: 'الإيرادات حسب الخدمة', actions: 'الإجراءات', add: 'إضافة', edit: 'تعديل', remove: 'حذف', price: 'السعر', status: 'الحالة', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق',
    flightManagement: 'إدارة الرحلات', hotelManagement: 'إدارة الفنادق', carManagement: 'إدارة تأجير السيارات', managePrices: 'إدارة المسارات والأسعار',
    totalFlights: 'حجوزات الرحلات', flightRevenue: 'إيرادات الرحلات', totalRooms: 'إجمالي الغرف', hotelRevenue: 'إيرادات الفنادق', guests: 'الضيوف', totalCars: 'إجمالي السيارات', carsRevenue: 'إيرادات السيارات', availableCars: 'السيارات المتاحة',
    allBookings: 'كل الحجوزات', all: 'الكل', flight: 'رحلة', hotel: 'فنادق', car: 'سيارات', bookingId: 'رقم الحجز', customer: 'اسم العميل', dateTime: 'التاريخ والوقت', totalPrice: 'السعر الإجمالي',
    revenueOverview: 'نظرة عامة على الإيرادات', allServices: 'كل الخدمات', usersManagement: 'إدارة المستخدمين', active: 'نشط', inactive: 'غير نشط', deleted: 'محذوف', userId: 'معرف المستخدم', fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', joinDate: 'تاريخ الانضمام',
    settingsTitle: 'إعدادات مساحة العمل', language: 'اللغة', languageHelp: 'اختر لغة مساحة عمل الإدارة.', theme: 'المظهر', themeHelp: 'استخدم مساحة عمل فاتحة أو داكنة.', accessibility: 'إمكانية الوصول', accessibilityHelp: 'اضبط الواجهة لفريقك.', largerText: 'نص أكبر', highContrast: 'تباين عالٍ', light: 'فاتح', dark: 'داكن', english: 'English', arabic: 'العربية', preferencesSaved: 'يتم حفظ التفضيلات على هذا الجهاز.', noResults: 'لا توجد سجلات مطابقة للفلاتر.', confirmRemove: 'حذف هذا السجل التجريبي؟', demoNote: 'مساحة تجريبية — التغييرات محفوظة محلياً فقط.',
    addRecord: 'إضافة سجل', editRecord: 'تعديل السجل', removeRecord: 'حذف السجل', chooseRecord: 'اختر سجلاً', selectRecord: 'حدد سجلاً', saveChanges: 'حفظ التغييرات', removeRecordConfirm: 'حذف هذا السجل؟', selectRecordFirst: 'اختر سجلاً أولاً.', requiredField: 'أكمل الحقول المطلوبة.', duplicateRecord: 'يوجد سجل بهذا الاسم بالفعل.',
    flightNumber: 'رقم الرحلة', hotelName: 'اسم الفندق', carModel: 'طراز السيارة', route: 'المسار', cityRoom: 'المدينة / الغرفة', locationAvailability: 'الموقع / التوفر', city: 'المدينة', roomType: 'نوع الغرفة', location: 'الموقع', availability: 'التوفر',
    switchToLight: 'التبديل إلى الوضع الفاتح', switchToDark: 'التبديل إلى الوضع الداكن',
    chatbot: 'المساعد', chatTitle: 'مساعد إدارة ترحال', chatDemoNote: 'مساعد تجريبي — يقدم إرشادات لهذه اللوحة النموذجية.',
    chatGreeting: 'مرحباً. اسأل عن الحجوزات أو الإيرادات أو الرحلات أو الفنادق أو تأجير السيارات.',
    chatPlaceholder: 'اكتب سؤالك…', chatSend: 'إرسال', chatClose: 'إغلاق المحادثة',
    chatBookingHelp: 'افتح الحجوزات لمراجعة السجلات التجريبية أو تصفيتها حسب الرحلة أو الفندق أو السيارة.',
    chatRevenueHelp: 'افتح الإيرادات لعرض الإجماليات التجريبية والتبديل بين الخدمات.',
    chatFlightsHelp: 'افتح الرحلات لإدارة المسارات والأسعار والحالات التجريبية.',
    chatHotelsHelp: 'افتح الفنادق لإدارة أماكن الإقامة والأسعار التجريبية.',
    chatCarsHelp: 'افتح تأجير السيارات لإدارة المركبات والأسعار التجريبية.',
    chatFallback: 'يمكنني المساعدة في هذه اللوحة التجريبية. اسأل عن الحجوزات أو الإيرادات أو الرحلات أو الفنادق أو السيارات.',
    type: 'النوع', confirmed: 'مؤكد', pending: 'قيد الانتظار', cancelled: 'ملغى', available: 'متاح', limited: 'محدود', scheduled: 'مجدول', boarding: 'يستقبل الركاب', booked: 'محجوز',
    flightSingular: 'رحلة', hotelSingular: 'فندق', carSingular: 'سيارة', select: 'اختر...', revenueChart: 'مخطط الإيرادات',
    filterAny: 'الكل', filterRating: 'التقييم', ratingFrom40: '٤٫٠+ نجوم', ratingFrom45: '٤٫٥+ نجوم', filterTransmission: 'ناقل الحركة', filterSeats: 'المقاعد', seats5Plus: '٥+ مقاعد', seats7Plus: '٧+ مقاعد',
    phone: 'رقم الجوال', errPhoneInvalid: 'أدخل رقم جوال صحيحاً', errDobInvalid: 'أدخل تاريخ ميلاد صحيحاً',
    airline: 'شركة الطيران', cabinClass: 'درجة المقصورة', newBooking: 'حجز جديد', travelers: 'المسافرون', traveler: 'مسافر', seat: 'المقعد', passportNumber: 'رقم الجواز', dateOfBirth: 'تاريخ الميلاد', addTraveler: 'إضافة مسافر', createBooking: 'إنشاء حجز',
    seatsUnavailable: 'لم يعد مقعد واحد أو أكثر من المقاعد المحددة متاحاً', bookingCreatedTitle: 'تم إنشاء الحجز', bookingCreated: 'تم إنشاء الحجز {id}.', bookingFailed: 'تعذر إنشاء الحجز. حاول مرة أخرى.',
    mainNavigation: 'التنقل الرئيسي', openNavigation: 'فتح القائمة', closeNavigation: 'إغلاق القائمة',
    notifications: 'الإشعارات', noNotifications: 'لا توجد إشعارات جديدة', markAllRead: 'تعليم الكل كمقروء', clearAll: 'مسح الكل',
    actionFailedTitle: 'تعذّر الحفظ', removeFailedTitle: 'تعذّر الحذف', actionFailed: '{message}', fieldRequired: 'هذا الحقل مطلوب.', priceInvalid: 'أدخل سعراً صحيحاً (صفر أو أكثر).', saving: 'جارٍ الحفظ…',
    errBadRequest: 'رفض الخادم هذا الطلب. راجع القيم وحاول مجدداً.', errUnauthorized: 'انتهت جلستك. سجّل الدخول مرة أخرى.', errForbidden: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.', errNotFound: 'هذا السجل لم يعد موجوداً.', errConflict: 'يتعارض هذا السجل مع سجل موجود.', errServer: 'حدثت مشكلة في الخادم. حاول بعد قليل.', errNetwork: 'تعذّر الوصول إلى الخادم. تحقق من الاتصال وحاول مجدداً.', errTimeout: 'استغرق الخادم وقتاً طويلاً للرد. حاول مجدداً.', errGeneric: 'حدث خطأ ما. حاول مرة أخرى.',
    recordAddedTitle: 'تمت الإضافة', recordAdded: 'تمت إضافة {noun} {id} بنجاح.',
    recordUpdatedTitle: 'تم التحديث', recordUpdated: 'تم تحديث {noun} {id}.',
    recordRemovedTitle: 'تم الحذف', recordRemoved: 'تم حذف {noun} {id}.',
    statusUpdatedTitle: 'تم تحديث الحالة', bookingStatusUpdated: 'أصبحت حالة الحجز {id}: {status}.', userStatusUpdated: 'أصبحت حالة المستخدم {id}: {status}.',
    seniorMode: 'وضع إمكانية الوصول لكبار السن', seniorModeHelp: 'يفعّل النص الكبير والتباين العالي معاً.',
    fullYear: 'السنة كاملة (12 شهراً)', thisMonth: 'هذا الشهر', last3Months: 'آخر 3 أشهر', last6Months: 'آخر 6 أشهر', yearToDate: 'منذ بداية العام', period: 'الفترة', chartLegend: 'دليل ألوان المخطط', total: 'الإجمالي', loading: 'جارٍ التحميل…', clearFilters: 'مسح التصفية', clearSearch: 'مسح البحث',
    breadcrumb: 'مسار التنقل', breadcrumbAdmin: 'الإدارة', recordsCount: '{count} سجل', pendingCount: '{count} قيد الانتظار', activeCount: '{count} نشط', demoBadge: 'بيانات تجريبية', currency: 'العملة',
    dashboardSubtitle: 'الحجوزات والإيرادات والمستخدمون في لمحة.', flightsSubtitle: 'إدارة الرحلات والمسارات والأسعار.', hotelsSubtitle: 'إدارة الفنادق والغرف وأسعار الليلة.', carsSubtitle: 'إدارة السيارات والمواقع والأسعار اليومية.',
    bookingsSubtitle: 'راجع الحجوزات وحدّث حالتها.', revenueSubtitle: 'تابع الإيرادات حسب الخدمة والفترة.', usersSubtitle: 'إدارة حسابات العملاء وحالتها.',
  },
} as const;
export type TranslationKey = keyof typeof translations.en;

/** A placeholder value: plain text/number, or `{ key }` to be translated in the active language. */
export type TranslationParam = string | number | { key: TranslationKey };
export type TranslationParams = Record<string, TranslationParam>;

/** Looks up a key and fills `{placeholders}`. Latin ids are bidi-isolated inside Arabic sentences. */
export function translate(lang: Language, key: TranslationKey, params?: TranslationParams): string {
  const template: string = translations[lang][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) return placeholder;
    if (typeof value === 'object') return translations[lang][value.key];
    const text = String(value);
    return lang === 'ar' ? `\u2068${text}\u2069` : text;
  });
}