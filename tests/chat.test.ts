import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMessages, ChatInputError, MAX_MESSAGE_CHARS, MAX_HISTORY_MESSAGES } from '../lib/ai/chat-core.ts';
import { normalizeFlight, makeFlightTool } from '../lib/ai/flight-tool.ts';

test('validateMessages accepts a normal conversation and trims', () => {
  const out = validateMessages({ messages: [{ role: 'user', content: ' hi ' }] });
  assert.deepEqual(out, [{ role: 'user', content: 'hi' }]);
});
for (const [name, body] of [
  ['no body', null], ['empty array', { messages: [] }], ['bad role', { messages: [{ role: 'system', content: 'x' }] }],
  ['non-string content', { messages: [{ role: 'user', content: 5 }] }],
  ['last is assistant', { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }],
  ['too long', { messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }] }],
] as const) {
  test(`validateMessages rejects: ${name}`, () => assert.throws(() => validateMessages(body), ChatInputError));
}
test('history is capped to the latest messages', () => {
  const messages = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  messages.push({ role: 'user', content: 'last' });
  const out = validateMessages({ messages });
  assert.equal(out.length, MAX_HISTORY_MESSAGES);
  assert.equal(out.at(-1)!.content, 'last');
});

const row = { id: 'f1', flightNumber: 'SV1021', from: 'RUH', to: 'JED', departureTime: new Date('2099-01-01T08:00:00Z'),
  arrivalTime: new Date('2099-01-01T09:50:00Z'), basePrice: '350.00', seats: [{}, {}, {}] };
test('normalizeFlight maps the Prisma flight shape to a card', () => {
  assert.deepEqual(normalizeFlight(row), { id: 'f1', flightNumber: 'SV1021', from: 'RUH', to: 'JED',
    departureTime: '2099-01-01T08:00:00.000Z', arrivalTime: '2099-01-01T09:50:00.000Z', priceSar: 350, availableSeats: 3 });
});
test('flight tool upper-cases codes, returns cards, rejects past dates', async () => {
  let seen: any;
  const t: any = makeFlightTool(async (q) => { seen = q; return [row]; });
  const ok = await t.execute({ from: 'ruh', to: 'jed', date: '2099-01-01' }, {});
  assert.deepEqual(seen, { from: 'RUH', to: 'JED', date: '2099-01-01' });
  assert.equal(ok.flights[0].priceSar, 350);
  seen = undefined;
  const past = await t.execute({ from: 'RUH', to: 'JED', date: '2000-01-01' }, {});
  assert.equal(seen, undefined);
  assert.equal(past.flights.length, 0);
});
