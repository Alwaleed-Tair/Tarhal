import test from 'node:test';
import assert from 'node:assert/strict';
import { issueSession, readSession, sessionMatchesPassword, SESSION_SECONDS } from '../lib/session-token.ts';
import { ageOn, registrationError } from '../lib/registration.ts';
const secret = 'test-only-secret'.repeat(4);
test('signed sessions expire and reject tampering, wrong keys and password changes', () => {
  const now = 1800000000000;
  const user = { id: 'user-1', password: 'hash' };
  const token = issueSession(user, secret, now);
  const payload = readSession(token, secret, now)!;
  assert.equal(payload.sub, user.id);
  assert.equal(sessionMatchesPassword(payload.version, user.password, secret), true);
  assert.equal(sessionMatchesPassword(payload.version, 'new hash', secret), false);
  assert.equal(readSession(token, secret, now + SESSION_SECONDS * 1000), null);
  for (const bad of ['x' + token, token + '.extra', 'garbage', '']) assert.equal(readSession(bad, secret, now), null);
  assert.equal(readSession(token, secret + 'wrong', now), null);
});
test('registration validates names, email, phone, password and real calendar dates', () => {
  const body = { name: 'Test User', email: 'user@example.com', phone: '+966500000001', password: 'long password example', dateOfBirth: '2000-02-29' };
  assert.equal(registrationError(body), null);
  for (const [field, value] of Object.entries({ name: ' ', email: 'bad', phone: 'abc', password: 'short', dateOfBirth: '2001-02-29' })) {
    assert.equal(registrationError({ ...body, [field]: value }), field);
  }
  assert.equal(registrationError({ ...body, dateOfBirth: '2999-01-01' }), 'dateOfBirth');
  // Account holders must be 21 or older (Riyadh calendar day); 21 on the birthday itself counts.
  const now = new Date('2026-11-10T12:00:00Z');
  assert.equal(registrationError({ ...body, dateOfBirth: '2005-11-10' }, now), null);
  assert.equal(registrationError({ ...body, dateOfBirth: '2005-11-11' }, now), 'underage');
  assert.equal(registrationError({ ...body, dateOfBirth: '2015-01-01' }, now), 'underage');
  assert.equal(ageOn('2005-11-11', new Date('2026-11-10T21:30:00Z')), 21); // already the 11th in Riyadh
});
