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
let mode = 'flight'; // 'flight' = model calls the tool; 'text' = plain answer; 'fail' = provider error
const fake: Server = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = JSON.parse(raw || '{}');
    requests.push(body);
    if (mode === 'fail') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"boom"}}'); }
    const last = body.messages.at(-1);
    const base = { id: 'x', object: 'chat.completion', created: 1, model: 'fake', usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    const message = mode === 'flight' && last.role !== 'tool'
      ? { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'searchFlights', arguments: JSON.stringify({ from: 'ruh', to: 'JED', date: flightDate }) } }] }
      : { role: 'assistant', content: last.role === 'tool' ? 'Found it.' : 'Hello from the fake model' };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ...base, choices: [{ index: 0, finish_reason: message.tool_calls ? 'tool_calls' : 'stop', message }] }));
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
  process.env.DEEPSEEK_API_KEY = 'test-key';
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'pipe', env: process.env });
  ({ prisma } = await import('../lib/prisma.ts'));
  route = await import('../app/api/ai/chat/route.ts');
  const f = (n: string, from: string, to: string, d: string, price: number, seats: [string, number, string][]) => prisma.flight.create({ data: {
    flightNumber: n, from, to, departureTime: new Date(`${d}T08:00:00Z`), arrivalTime: new Date(`${d}T09:40:00Z`), basePrice: price,
    seats: { create: seats.map(([seatCode, priceMultiplier, status]) => ({ seatCode, ticketClass: 'Economy', priceMultiplier, status })) } } });
  await f('T-1', 'RUH', 'JED', flightDate, 400, [['1A', 1.8, 'AVAILABLE'], ['2A', 1.0, 'AVAILABLE'], ['3A', 0.5, 'BOOKED']]);
  await f('T-2', 'RUH', 'JED', day(10), 999, [['1A', 1, 'AVAILABLE']]);
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
    const res = await call({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'user', content: 'visa?' }] });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.reply, 'Hello from the fake model');
    assert.deepEqual(body.flights, []);
    const sent = requests.at(-1);
    assert.equal(sent.messages[0].role, 'system');
    assert.match(sent.messages[0].content, /Saudi/);
    assert.deepEqual(sent.messages.slice(1).map((m: any) => m.content), ['hi', 'hello', 'visa?']);
    assert.equal(sent.max_tokens, 700);
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
    assert.equal(card.lowestPrice, 400); // 400 x 1.0; the BOOKED 0.5 seat is ignored
    assert.equal(card.availableSeats, 2);
    const toolMsg = requests.at(-1).messages.at(-1);
    assert.equal(toolMsg.role, 'tool');
    assert.match(toolMsg.content, /T-1/);
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
