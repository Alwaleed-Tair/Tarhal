import test from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV4 } from 'ai/test';
import { checkItinerary, generateGuide, generateItinerary, guideRequest, itineraryRequest, saudiCity, GuideInputError, GuideOutputError } from '../lib/ai/guides.ts';
import { aiRequester, resetAiLimits, takeAiRequest } from '../lib/ai/limits.ts';

// MOCKED: these tests never call DeepSeek. The SDK's mock model returns the JSON a real model would.
const usage = { inputTokens: { total: 120, noCache: 120, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 80, text: 80, reasoning: 0 } };
const mockModel = (output: unknown) => new MockLanguageModelV4({
  doGenerate: async () => ({ content: [{ type: 'text', text: JSON.stringify(output) }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] }) as any,
});
const guide = {
  summary: 'Jeddah is the gateway to Makkah and a lively Red Sea city.',
  bestTime: 'November to February, when it is cooler.',
  places: [{ name: 'Al-Balad', description: 'Historic old town with coral houses.' }, { name: 'Jeddah Corniche', description: 'Long seafront for evening walks.' }, { name: 'King Fahd Fountain', description: 'One of the tallest fountains in the world.' }],
  tips: ['Dress modestly in the old town.', 'Plan outdoor visits for the evening.'],
};
const day = (n: number) => ({ day: n, title: `Day ${n} in Jeddah`, morning: 'Walk through Al-Balad.', afternoon: 'Lunch and a museum.', evening: 'Sunset at the Corniche.' });

test('Saudi city names, aliases and Arabic map to one English name; others are refused', () => {
  assert.equal(saudiCity(' jeddah '), 'Jeddah');
  assert.equal(saudiCity('Al-Dammam'), 'Dammam');
  assert.equal(saudiCity('العلا'), 'AlUla');
  assert.equal(saudiCity('Medina'), 'Madinah');
  for (const bad of ['Paris', '', 'x'.repeat(61), 5, null]) assert.equal(saudiCity(bad), null);
});

test('guide and itinerary requests are checked before any model call', () => {
  assert.deepEqual(guideRequest({ city: 'abha', language: 'ar' }), { city: 'Abha', language: 'ar' });
  assert.deepEqual(itineraryRequest({ city: 'Riyadh', days: 3, interests: ['food', 'food', 'history'] }), { city: 'Riyadh', days: 3, interests: ['food', 'history'], language: 'en' });
  for (const body of [null, {}, { city: 'London' }, { city: 'Riyadh', language: 'fr' }]) assert.throws(() => guideRequest(body as any), GuideInputError);
  for (const body of [{ city: 'Riyadh' }, { city: 'Riyadh', days: 0 }, { city: 'Riyadh', days: 8 }, { city: 'Riyadh', days: 2.5 }, { city: 'Riyadh', days: 2, interests: ['hacking'] }, { city: 'Riyadh', days: 2, interests: 'food' }]) {
    assert.throws(() => itineraryRequest(body as any), GuideInputError, JSON.stringify(body));
  }
});

test('MOCKED guide: valid JSON passes, usage is returned', async () => {
  const { guide: out, usage: u } = await generateGuide({ city: 'Jeddah', language: 'en' }, { model: mockModel(guide) });
  assert.equal(out.places.length, 3);
  assert.equal(u?.inputTokens, 120);
});

test('MOCKED guide: output that breaks the schema is rejected', async () => {
  await assert.rejects(generateGuide({ city: 'Jeddah', language: 'en' }, { model: mockModel({ ...guide, places: [] }) }));
  await assert.rejects(generateGuide({ city: 'Jeddah', language: 'en' }, { model: mockModel({ summary: 'too short' }) }));
});

test('MOCKED itinerary: exactly the requested days, numbered in order', async () => {
  const { itinerary } = await generateItinerary({ city: 'Jeddah', days: 3, interests: ['food'], language: 'en' }, { model: mockModel({ days: [day(1), day(2), day(3)] }) });
  assert.deepEqual(itinerary.days.map((d) => d.day), [1, 2, 3]);
  await assert.rejects(generateItinerary({ city: 'Jeddah', days: 3, interests: [], language: 'en' }, { model: mockModel({ days: [day(1), day(2)] }) }), GuideOutputError);
  assert.throws(() => checkItinerary({ days: [day(2), day(1)] }, 2), GuideOutputError);
});

test('AI request limit: guests by IP, users by id, 429 after the limit, window resets', () => {
  resetAiLimits();
  process.env.TARHAL_AI_LIMIT_GUEST = '2';
  process.env.TARHAL_AI_LIMIT_WINDOW_MS = '1000';
  const guest = aiRequester(new Request('http://x', { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } }), null);
  assert.deepEqual(guest, { key: 'ip:10.0.0.1', kind: 'guest' });
  assert.deepEqual(aiRequester(new Request('http://x'), 'u1'), { key: 'user:u1', kind: 'user' });
  assert.equal(takeAiRequest(guest.key, 'guest', 0), null);
  assert.equal(takeAiRequest(guest.key, 'guest', 10), null);
  assert.equal(takeAiRequest(guest.key, 'guest', 20), 1);
  assert.equal(takeAiRequest('ip:other', 'guest', 20), null);
  assert.equal(takeAiRequest(guest.key, 'guest', 1001), null);
  delete process.env.TARHAL_AI_LIMIT_GUEST; delete process.env.TARHAL_AI_LIMIT_WINDOW_MS;
  resetAiLimits();
});
