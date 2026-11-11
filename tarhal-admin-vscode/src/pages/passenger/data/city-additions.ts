/**
 * ADDITIONS FOR TARIQ'S REVIEW (not in his original data/cities.ts, which stays as he wrote it):
 * - a description for every city that has only his placeholder text, in the same length and style as his Riyadh text
 *   (English, and Arabic in a friendly, professional Saudi tone). Only well-known facts; no prices.
 * - photos used instead of his: Dammam's card showed a building like Ithra, which is in Dhahran, so Dammam uses a photo of
 *   Dammam Corniche (source and licence in public/images/cities/CREDITS.md).
 * Riyadh keeps his own description.
 */
export const cityDescriptions: Record<string, { en: string; ar: string }> = {
  jeddah: {
    en: "Jeddah is Saudi Arabia's main city on the Red Sea coast, in the Makkah Region, and the traditional gateway for pilgrims travelling to Makkah. Its historic Al-Balad district, with its coral-stone houses and wooden balconies, is a UNESCO World Heritage Site.",
    ar: 'جدة عروس البحر الأحمر وأكبر مدن الساحل الغربي في منطقة مكة المكرمة، وهي البوابة التاريخية للحجاج والمعتمرين إلى مكة. وفيها حي البلد التاريخي ببيوته المبنية من الحجر المرجاني ورواشينه الخشبية، المسجّل في قائمة التراث العالمي لليونسكو.',
  },
  abha: {
    en: 'Abha is the capital of the Asir Region, high in the Sarawat Mountains of south-western Saudi Arabia. It is known for its mild climate, green mountain slopes and colourful Asiri architecture, with heritage villages such as Rijal Almaa nearby.',
    ar: 'أبها عاصمة منطقة عسير، وتقع فوق جبال السروات في جنوب غرب المملكة. تشتهر بجوّها المعتدل ومرتفعاتها الخضراء وعمارتها العسيرية الملوّنة، وقريب منها قرى تراثية مثل رجال ألمع.',
  },
  'al-khobar': {
    en: 'Al Khobar is a coastal city on the Arabian Gulf in the Eastern Province, part of one metropolitan area with Dammam and Dhahran. Its long corniche and water tower are local landmarks, and the King Fahd Causeway links it to Bahrain.',
    ar: 'الخبر مدينة ساحلية على الخليج العربي في المنطقة الشرقية، وتشكّل مع الدمام والظهران منطقة حضرية واحدة. كورنيشها الطويل وبرج المياه من أشهر معالمها، ومنها يبدأ جسر الملك فهد إلى البحرين.',
  },
  'al-bahah': {
    en: 'Al Bahah is the capital of the Al Bahah Region, in the Sarawat Mountains of south-western Saudi Arabia. It is known for its forests, its cool summers above the clouds and historic stone villages such as Dhee Ain.',
    ar: 'الباحة عاصمة منطقة الباحة، وتقع في جبال السروات جنوب غرب المملكة. تشتهر بغاباتها وصيفها المعتدل فوق السحاب، وبقراها الحجرية التاريخية مثل قرية ذي عين.',
  },
  'al-taif': {
    en: 'Taif is a mountain city in the Makkah Region, on the slopes of the Sarawat Mountains, and a favourite summer retreat for its mild weather. It is famous for its rose farms, its fruit orchards and the winding road up to Al Hada.',
    ar: 'الطائف مدينة جبلية في منطقة مكة المكرمة على سفوح جبال السروات، ومصيف مفضّل بفضل جوّها المعتدل. تشتهر بمزارع الورد الطائفي وبساتين الفاكهة، وبطريق الهدا المتعرّج.',
  },
  'al-dammam': {
    en: 'Dammam is the capital of the Eastern Province, on the Arabian Gulf coast, and forms one metropolitan area with Al Khobar and Dhahran. It grew quickly after oil was found in commercial quantities nearby in 1938, and its corniche runs along the Gulf.',
    ar: 'الدمام عاصمة المنطقة الشرقية على ساحل الخليج العربي، وتشكّل مع الخبر والظهران منطقة حضرية واحدة. توسّعت بسرعة بعد اكتشاف النفط بكميات تجارية بالقرب منها عام 1938، ويمتد كورنيشها على طول الخليج.',
  },
  alula: {
    en: "AlUla is in the Madinah Region of north-western Saudi Arabia, in a valley of desert sandstone landscapes. It is home to Hegra, the Kingdom's first UNESCO World Heritage Site, and to its historic old town.",
    ar: 'العلا في منطقة المدينة المنورة شمال غرب المملكة، وسط وادٍ من التكوينات الصخرية الرملية. فيها الحِجر، أول موقع في المملكة يُسجَّل في قائمة التراث العالمي لليونسكو، وبلدتها القديمة التاريخية.',
  },
  umluj: {
    en: 'Umluj is a coastal town on the Red Sea in the Tabuk Region of north-western Saudi Arabia. It is known for its white beaches, clear turquoise water and the islands off its coast.',
    ar: 'أملج مدينة ساحلية على البحر الأحمر في منطقة تبوك شمال غرب المملكة. تشتهر بشواطئها البيضاء ومياهها الفيروزية الصافية، وبالجزر المنتشرة قبالة ساحلها.',
  },
};

/** Photos used instead of his (city slug -> photo). */
export const cityPhotoOverrides: Record<string, { card?: string; hero?: string }> = {
  'al-dammam': { card: '/images/cities/dammam/dammam-corniche-card.webp', hero: '/images/cities/dammam/dammam-corniche-card.webp' },
};
