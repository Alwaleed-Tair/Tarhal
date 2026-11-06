// End-to-end: real route + real AI SDK + real PostgreSQL, with a fake OpenAI-compatible
// model server (no API key, no cost). Run: TEST_DATABASE_URL=... npm run test:ai
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';

if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a dedicated local PostgreSQL test database');
const connection = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname)) throw new Error('Local test database only');
const schema = 'tarhal_ai_test_' + randomUUID().replaceAll('-', '');
connection.searchParams.set('schema', schema);
process.env.DATABASE_URL = connection.toString();

const requests: any[] = [];
const webRequests: any[] = [];
let webMode = 'ok'; // 'ok' | 'fail'
let finish = 'stop';
let textOverride = '';
let mode = 'flight'; // 'flight' | 'text' | 'fail' | 'hotels' | 'fallback' | 'cars'
const toolCall = (id: string, name: string, args: unknown) => ({ role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
const fake: Server = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = JSON.parse(raw || '{}');
    if (req.url?.startsWith('/anthropic/')) { // DeepSeek's Anthropic-shaped web search
      webRequests.push({ headers: req.headers, body });
      if (webMode === 'fail') { res.writeHead(500); return res.end('{}'); }
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [
        { type: 'text', text: 'let me look' }, { type: 'server_tool_use', id: 's', name: 'web_search', input: { query: 'q' } },
        { type: 'web_search_tool_result', tool_use_id: 's', content: [{ type: 'web_search_result', url: 'https://example.com/a', title: 'Example A' }, { type: 'web_search_result', url: 'https://example.com/a', title: 'dup' }] },
        { type: 'text', text: 'Al-Balad: try Al-Baik and Hijazi cafes.' }] }));
    }
    requests.push(body);
    if (mode === 'fail') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"boom"}}'); }
    const last = body.messages.at(-1);
    const base = { id: 'x', object: 'chat.completion', created: 1, model: 'fake', usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    let message: any;
    const forced = body.tool_choice?.function?.name;
    if (forced === 'webSearch' && mode !== 'ignoreforce') message = toolCall('call_w', 'webSearch', { query: body.messages.findLast((m: any) => m.role === 'user').content });
    else if (mode === 'flight' && last.role !== 'tool') message = toolCall('call_1', 'searchFlights', { from: 'ruh', to: 'JED', date: flightDate });
    else if (mode === 'hotels' && last.role !== 'tool') message = toolCall('call_h', 'searchHotels', { city: 'dammam' });
    else if (mode === 'cars' && last.role !== 'tool') message = toolCall('call_c', 'searchCars', { city: 'Riyadh', maxPricePerDay: 200 });
    else if (mode === 'fallback' && last.role !== 'tool') message = toolCall('call_h', 'searchHotels', { city: 'Atlantis' });
    else message = { role: 'assistant', content: textOverride || (last.role === 'tool' ? 'Found it.' : 'Hello from the fake model') };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ...base, choices: [{ index: 0, finish_reason: message.tool_calls ? 'tool_calls' : finish, message }] }));
  });
});

const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const flightDate = day(3);
let prisma: any, route: any;
const call = (value: unknown) => route.POST(new Request('http://localhost/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof value === 'string' ? value : JSON.stringify(value) }));
const user = (content: string) => ({ messages: [{ role: 'user', content }] });

before(async () => {
  await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
  process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${(fake.address() as any).port}`;
  process.env.DEEPSEEK_ANTHROPIC_BASE_URL = `${process.env.DEEPSEEK_BASE_URL}/anthropic`;
  process.env.DEEPSEEK_API_KEY = 'test-key';
  // db push builds the tables straight from schema.prisma (always in sync, unlike pending migrations).
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate', '--accept-data-loss'], { stdio: 'pipe', env: process.env });
  ({ prisma } = await import('../lib/prisma.ts'));
  route = await import('../app/api/ai/chat/route.ts');
  const airline = await prisma.airline.create({ data: { name: 'Saudia', nameAr: 'السعودية', iataCode: 'SV' } });
  const f = (n: string, from: string, to: string, d: string, price: number, seats: [string, number, string][]) => prisma.flight.create({ data: {
    flightNumber: n, airlineId: airline.id, from, to, departureTime: new Date(`${d}T08:00:00Z`), arrivalTime: new Date(`${d}T09:40:00Z`), basePrice: price,
    seats: { create: seats.map(([seatCode, priceMultiplier, status]) => ({ seatCode, ticketClass: 'ECONOMY', priceMultiplier, status })) } } });
  await f('T-1', 'RUH', 'JED', flightDate, 400, [['1A', 1.8, 'AVAILABLE'], ['2A', 1.0, 'AVAILABLE'], ['3A', 0.5, 'BOOKED']]);
  await f('T-2', 'RUH', 'JED', day(10), 999, [['1A', 1, 'AVAILABLE']]);
  await prisma.hotel.createMany({ data: [
    { id: 'h1', name: 'Corniche Inn', city: 'Dammam', address: 'Corniche Rd', pricePerNight: 300, rating: 4.2, roomType: 'Double' },
    { id: 'h2', name: 'Budget Stay', city: 'Dammam', pricePerNight: 150, rating: 3.5, roomType: 'Single' },
    { id: 'h3', name: 'Riyadh Tower', city: 'Riyadh', pricePerNight: 500, rating: 4.8, roomType: 'Suite' }] });
  await prisma.car.createMany({ data: [
    { id: 'c1', make: 'Toyota', model: 'Yaris', year: 2024, seats: 5, category: 'Economy', city: 'Riyadh', pricePerDay: 120 },
    { id: 'c2', make: 'Toyota', model: 'Land Cruiser', year: 2024, seats: 7, category: 'SUV', city: 'Riyadh', pricePerDay: 450 },
    { id: 'c3', make: 'Kia', model: 'Rio', year: 2023, seats: 5, category: 'Economy', city: 'Riyadh', pricePerDay: 100, isAvailable: false }] });
  await f('T-3', 'DMM', 'JED', flightDate, 300, [['1A', 1, 'AVAILABLE']]);
});
after(async () => {
  fake.close();
  try { await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await prisma?.$disconnect(); }
});

describe('POST /api/ai/chat end to end', () => {
  it('rejects bad input without calling the model', async () => {
    const before = requests.length;
    for (const v of ['not json', {}, { messages: [] }, user('x'.repeat(1001))]) assert.equal((await call(v)).status, 400);
    assert.equal(requests.length, before);
  });
  it('answers plain questions and sends system prompt, history and token cap', async () => {
    mode = 'text';
    const res = await call({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'user', content: 'thanks' }] });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.reply, 'Hello from the fake model');
    assert.deepEqual(body.flights, []);
    const sent = requests.at(-1);
    assert.equal(sent.messages[0].role, 'system');
    assert.match(sent.messages[0].content, /Saudi/);
    assert.deepEqual(sent.messages.slice(1).map((m: any) => m.content), ['hi', 'hello', 'thanks']);
    assert.equal(sent.max_tokens, 1500);
    assert.equal(sent.temperature, 0.5);
    assert.deepEqual(sent.thinking, { type: 'disabled' }); // fast mode
    assert.ok(body.usage);
  });
  it('lets the model search real flights and returns cards (same-day, route-exact, lowest price, seats left)', async () => {
    mode = 'flight';
    const res = await call(user('flights RUH to JED'));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.reply, 'Found it.');
    assert.equal(body.flights.length, 1);
    const [card] = body.flights;
    assert.equal(card.flightNumber, 'T-1');
    assert.equal(card.airline, 'Saudia');
    assert.equal(card.lowestPrice, 400); // 400 x 1.0; the BOOKED 0.5 seat is ignored
    assert.equal(card.availableSeats, 2);
    const toolMsg = requests.at(-1).messages.at(-1);
    assert.equal(toolMsg.role, 'tool');
    assert.match(toolMsg.content, /T-1/);
  });
  it('answers hotel questions from Tarhal data first (cheapest listing order, no web call)', async () => {
    mode = 'hotels'; const w = webRequests.length;
    const body = await (await call(user('hotels in Dammam'))).json();
    assert.equal(body.reply, 'Found it.');
    assert.deepEqual(body.hotels.map((h: any) => h.name).sort(), ['Budget Stay', 'Corniche Inn']);
    assert.equal(body.hotels[0].name, 'Corniche Inn'); // best rating first
    assert.equal(body.searchedWeb, false);
    assert.deepEqual(body.toolsUsed, ['searchHotels']);
    assert.equal(webRequests.length, w);
  });
  it('returns only available cars within the price limit', async () => {
    mode = 'cars';
    const body = await (await call(user('cheap car in Riyadh'))).json();
    assert.deepEqual(body.cars.map((c: any) => c.model), ['Yaris']); // SUV too expensive, Rio unavailable
  });
  it('falls back to the web when Tarhal has nothing, and sends the search tool + key', async () => {
    mode = 'fallback'; webMode = 'ok';
    const body = await (await call(user('hotel in Atlantis'))).json();
    assert.equal(body.hotels.length, 0);
    assert.equal(body.searchedWeb, true);
    assert.deepEqual(body.toolsUsed, ['searchHotels', 'webSearch']);
    assert.deepEqual(requests.at(-2).tool_choice, { type: 'function', function: { name: 'webSearch' } }); // forced by the route, not left to the model
    const w = webRequests.at(-1);
    assert.equal(w.headers['x-api-key'], 'test-key');
    assert.equal(w.body.tools[0].type, 'web_search_20250305');
    assert.equal(w.body.messages[0].content, 'hotel in Atlantis');
    const toolMsg = requests.at(-1).messages.at(-1);
    assert.match(toolMsg.content, /Al-Baik/);
    assert.doesNotMatch(toolMsg.content, /let me look/); // pre-search guessing dropped
    assert.doesNotMatch(toolMsg.content, /https?:\/\//); // no raw URLs pushed at the model by default
  });
  it('forces a web search for visa/restaurant/weather questions before answering', async () => {
    mode = 'text'; const w = webRequests.length;
    const body = await (await call(user('هل السعوديين يحتاجون فيزا لليابان؟ visa'))).json();
    assert.deepEqual(body.toolsUsed, ['webSearch']);
    assert.equal(webRequests.length, w + 1);
    assert.deepEqual(requests.find((r: any) => JSON.stringify(r.messages).includes('visa') && r.tool_choice)?.tool_choice.function.name, 'webSearch');
  });
  it('does not force the web for greetings or for flights, hotels and cars (Tarhal data first)', async () => {
    mode = 'text'; const w = webRequests.length;
    for (const q of ['هلا', 'hi there', 'ابي رحلة من الرياض إلى جدة', 'visa for hotel in Dammam']) {
      const sent = requests.length; await call(user(q));
      assert.notEqual(requests[sent].tool_choice?.function?.name, 'webSearch', q);
    }
    assert.equal(webRequests.length, w);
  });
  it('answers anyway when the model ignores a forced web search (no 502)', async () => {
    mode = 'ignoreforce';
    const res = await call(user('what is the weather in Abha?'));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).reply, 'Hello from the fake model');
  });
  it('still answers when web search fails', async () => {
    mode = 'fallback'; webMode = 'fail';
    const res = await call(user('restaurants in Al-Balad again'));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).reply, 'Found it.');
    assert.match(JSON.stringify(requests.at(-1).messages.at(-1)), /unavailable/);
    webMode = 'ok';
  });
  it('serves a repeated web question from the cache (fast path)', async () => {
    mode = 'fallback'; const w = webRequests.length;
    await call(user('hotel in Atlantis')); // same text as the earlier successful search
    assert.equal(webRequests.length, w);
  });
  it('can be switched off with TARHAL_WEB_SEARCH=false', async () => {
    mode = 'fallback'; process.env.TARHAL_WEB_SEARCH = 'false';
    const sent = requests.length; await call(user('x restaurants'));
    const toolNames = requests[sent].tools.map((t: any) => t.function.name);
    assert.ok(!toolNames.includes('webSearch') && toolNames.includes('searchHotels'));
    delete process.env.TARHAL_WEB_SEARCH;
  });
  it('never returns a reply in a language other than Arabic or English', async () => {
    mode = 'text';
    for (const bad of ['こんにちは！私は旅行アシスタントです。', 'Привет! Я помогаю с поездками']) {
      textOverride = bad;
      const body = await (await call(user('كونيتشيوا'))).json();
      assert.equal(body.languageBlocked, true);
      assert.doesNotMatch(body.reply, /こんにちは|Привет/);
      assert.match(body.reply, /بالعربي أو الإنجليزي/);
    }
    textOverride = 'هلا والله! 👋 جاهز أساعدك';
    assert.equal((await (await call(user('هلا'))).json()).languageBlocked, false);
    textOverride = '';
  });
  it('tells the user when a reply was cut by the token limit', async () => {
    mode = 'text'; finish = 'length';
    const body = await (await call(user('long plan'))).json();
    finish = 'stop';
    assert.equal(body.truncated, true);
    assert.match(body.reply, /^Hello from the fake model\n\n\[/);
    assert.equal((await (await call(user('short'))).json()).truncated, false);
  });
  it('maps provider failures to a safe 502 and a missing key to 503', async () => {
    mode = 'fail';
    const res = await call(user('hi'));
    assert.equal(res.status, 502);
    assert.doesNotMatch(JSON.stringify(await res.json()), /boom|test-key/);
    delete process.env.DEEPSEEK_API_KEY;
    assert.equal((await call(user('hi'))).status, 503);
    process.env.DEEPSEEK_API_KEY = 'test-key';
  });
});
