import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMessages } from '../lib/ai/messages.ts';
import { MAX_MESSAGE_CHARS, MAX_HISTORY_MESSAGES } from '../lib/ai/prompt.ts';

test('accepts a single message and the history format', () => {
  assert.deepEqual(parseMessages({ message: ' hi ' }), [{ role: 'user', content: 'hi' }]);
  const h = parseMessages({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }] });
  assert.equal((h as any[]).length, 3);
});
test('rejects bad shapes, empty, too long and non-user last message', () => {
  for (const b of [null, {}, { messages: [] }, { message: '  ' }, { messages: [{ role: 'system', content: 'x' }] }, { messages: [{ role: 'user', content: 1 }] },
    { message: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }, { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }]) {
    assert.equal(typeof parseMessages(b), 'string', JSON.stringify(b)?.slice(0, 60));
  }
});
test('keeps only the most recent history, starting with a user turn', () => {
  const many = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i) }));
  many.push({ role: 'user', content: 'last' });
  const out = parseMessages({ messages: many }) as any[];
  assert.ok(out.length <= MAX_HISTORY_MESSAGES);
  assert.equal(out[0].role, 'user');
  assert.equal(out.at(-1).content, 'last');
});

import { isArabicOrEnglish } from '../lib/ai/language.ts';
test('only Arabic and English replies pass the language guard', () => {
  for (const ok of ['هلا والله! 👋 ميزانية 6,000–9,000 ريال', 'Hello! RUH → JED, SAR 420 ✈️', 'مرحباً Tarhal 123 (50%)', '']) assert.equal(isArabicOrEnglish(ok), true, ok);
  for (const bad of ['こんにちは！', 'Привет! Я помогаю', 'नमस्ते', '안녕하세요', '你好', 'Hello สวัสดี', 'مرحبا שלום', 'Γειά σου']) assert.equal(isArabicOrEnglish(bad), false, bad);
});

import { formatReply } from '../components/formatReply.ts';
test('light markdown becomes clean blocks (no stray # ** | symbols)', () => {
  const blocks = formatReply('# جدول يومين\n(الافتراض: مسافر)\n\n**اليوم الأول – الدمام**\n- صباحًا: كورنيش\n* عصرًا: جزيرة\n---\n| الوقت | النشاط |\n|---|---|\n| ١٠ | قهوة |\n\nنص **مهم** وسط الجملة `code`');
  assert.deepEqual(blocks.map((b) => b.type), ['h', 'p', 'gap', 'h'.replace('h', 'p'), 'li', 'li', 'li', 'li', 'gap', 'p']);
  const all = blocks.flatMap((b) => b.parts.map((p) => p.text)).join('');
  assert.doesNotMatch(all, /[#*|`]/);
  assert.equal(blocks[0].parts[0].bold, true);
  assert.equal(blocks[3].parts[0].bold, true); // **title** line
  assert.equal(blocks.at(-1)!.parts.some((p) => p.bold && p.text === 'مهم'), true);
  assert.equal(blocks[6].parts.map((p) => p.text).join(''), 'الوقت · النشاط');
});

import { needsWebFirst, tarhalCameBackEmpty } from '../lib/ai/policy.ts';
test('web search is forced only for live-info questions', () => {
  for (const q of ['وش احلى مطاعم بجده البلد؟', 'Do Saudis need a visa for Japan?', 'What is the weather in Abha in August?', 'هل أحتاج تطعيمات للسفر إلى أفريقيا؟', 'كم الحد المسموح للشنطة؟', 'Best time to visit AlUla?']) assert.equal(needsWebFirst(q), true, q);
  for (const q of ['هلا', 'شكراً', 'ابي فندق في الدمام', 'Cheap car rental in Riyadh', 'ابي رحلة من الرياض إلى جدة', 'اكتب لي كود بايثون', 'ميزانية أسبوع في دبي']) assert.equal(needsWebFirst(q), false, q);
});
test('empty or failed Tarhal hotels/cars trigger the web fallback once', () => {
  const r = (toolName: string, output: any) => ({ toolResults: [{ toolName, output }] });
  assert.equal(tarhalCameBackEmpty([r('searchHotels', { count: 0, hotels: [] })]), true);
  assert.equal(tarhalCameBackEmpty([r('searchCars', { error: 'x' })]), true);
  assert.equal(tarhalCameBackEmpty([r('searchHotels', { count: 2 })]), false);
  assert.equal(tarhalCameBackEmpty([r('searchFlights', { count: 0 })]), false);
  assert.equal(tarhalCameBackEmpty([r('searchHotels', { count: 0 }), r('webSearch', { notes: 'ok' })]), false);
});
