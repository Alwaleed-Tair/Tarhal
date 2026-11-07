// Decides when the model MUST search the web. Prompt rules alone were not enough: in a live
// 21-question run the model never called webSearch (and once claimed it had). So the route
// forces the tool in two cases, and leaves everything else to the model.
const TARHAL_DATA = /(رحل[ةه]|رحلات|طيران|حجز|flight|fly\b|فندق|فنادق|hotel|سيار[ةه]|سيارات|تأجير|ايجار|إيجار|rental|\bcar\b|\bcars\b)/i;
const NEEDS_WEB = /(visa|فيز[اة]|تأشير|تاشير|شروط (?:ال)?دخول|entry requirement|vaccin|تطعيم|restaurant|مطعم|مطاعم|مقهى|مقاهي|كافيه|cafe|weather|طقس|حالة الجو|أحوال الجو|temperature|حرار[ةه]|event|فعالي|festival|مهرجان|opening hours|ساعات (?:العمل|الدوام)|entry fee|ticket price|سعر (?:ال)?(?:تذكر|دخول)|تذكرة دخول|best time|أفضل وقت|افضل وقت|attraction|أماكن سياحية|اماكن سياحية|معالم|things to do|baggage|أمتعة|امتعة|شنط|حقيب|نسك|nusuk|عمرة|umrah|hajj|الحج)/i;

export const wantsTarhalData = (text: string) => TARHAL_DATA.test(text);
export const needsWebFirst = (text: string) => NEEDS_WEB.test(text) && !TARHAL_DATA.test(text);

type Step = { toolResults?: Array<{ toolName: string; output?: any }> };

// Hotels/cars that came back empty or failed -> the web is the fallback. (Flights are not
// searched on the web: "no flights that day" is a real answer.)
export function tarhalCameBackEmpty(steps: Step[]) {
  const results = steps.flatMap((s) => s.toolResults ?? []);
  if (results.some((r) => r.toolName === 'webSearch')) return false;
  return results.some((r) => (r.toolName === 'searchHotels' || r.toolName === 'searchCars') && (r.output?.error || r.output?.count === 0));
}

export function forceWebSearch(opts: { stepNumber: number; userText: string; steps: Step[]; enabled: boolean }) {
  if (!opts.enabled) return undefined;
  const force = opts.stepNumber === 0 ? needsWebFirst(opts.userText) : tarhalCameBackEmpty(opts.steps);
  return force ? ({ toolChoice: { type: 'tool', toolName: 'webSearch' } } as const) : undefined;
}
