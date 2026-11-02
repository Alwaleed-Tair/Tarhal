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
