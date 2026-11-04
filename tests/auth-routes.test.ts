import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.ts';
import { POST as login } from '../app/api/auth/login/route.ts';
import { POST as register } from '../app/api/auth/register/route.ts';
import { POST as logout } from '../app/api/auth/logout/route.ts';
import { readSession, SESSION_COOKIE } from '../lib/session-token.ts';
import { verifyPassword } from '../lib/passwords.ts';
process.env.SESSION_SECRET = 'route-test-only-secret'.repeat(3);
const post = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
test('auth routes issue cookies, hash registration passwords and enforce origin boundaries', async () => {
  const find = prisma.user.findMany, create = prisma.user.create, update = prisma.user.updateMany;
  try {
    prisma.user.findMany = (async () => [{ id: 'user-1', name: 'User', password: 'demo password', role: 'TRAVELER' }]) as any;
    prisma.user.updateMany = (async () => ({ count: 1 })) as any;
    const response = await login(post({ email: 'user@example.com', password: 'demo password' }));
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=lax/i);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    const token = cookie.split(';')[0].slice(SESSION_COOKIE.length + 1);
    assert.equal(readSession(token, process.env.SESSION_SECRET!)?.sub, 'user-1');
    assert.equal((await login(post({}, 'https://evil.example'))).status, 403);
    assert.equal((await logout(post({}, 'https://evil.example'))).status, 403);
    assert.match((await logout(post({}))).headers.get('set-cookie')!, /Max-Age=0/);
    prisma.user.create = (async (args: any) => {
      assert.equal(await verifyPassword('long testing password', args.data.password), true);
      assert.equal('role' in args.data, false);
      assert.equal(args.data.email, 'new@example.com');
      return { id: 'new-user', name: args.data.name, role: 'TRAVELER' };
    }) as any;
    assert.equal((await register(post({ name: 'New User', email: 'NEW@example.com', phone: '+966500000001', password: 'long testing password', dateOfBirth: '2000-01-01', role: 'ADMIN' }))).status, 201);
    assert.equal((await register(post({}))).status, 400);
    prisma.user.create = (async () => { throw { code: 'P2002' }; }) as any;
    assert.equal((await register(post({ name: 'New User', email: 'new@example.com', phone: '+966500000001', password: 'long testing password', dateOfBirth: '2000-01-01' }))).status, 409);
  } finally { prisma.user.findMany = find; prisma.user.create = create; prisma.user.updateMany = update; await prisma.$disconnect(); }
});
