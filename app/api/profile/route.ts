import { getCurrentUser } from '../../../lib/auth.ts';
import { authError, authOptions, authResponse, jsonObject, rejectCrossOrigin } from '../../../lib/auth-http.ts';
import { prisma } from '../../../lib/prisma.ts';

export const OPTIONS = authOptions;

// Never the password hash.
const select = { id: true, name: true, email: true, phoneNumber: true, dateOfBirth: true, role: true, createdAt: true } as const;
const CONTROL = /[\u0000-\u001f\u007f]/;

// GET /api/profile — the logged-in user's own profile.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return authError('UNAUTHORIZED', 'Login required', 401);
  try {
    const profile = await prisma.user.findUnique({ where: { id: user.id }, select });
    if (!profile) return authError('NOT_FOUND', 'Account not found', 404);
    return authResponse({ success: true, user: profile });
  } catch {
    return authError('PROFILE_UNAVAILABLE', 'Unable to load your profile right now.', 500);
  }
}

// PATCH /api/profile { name?, phone?, dateOfBirth? } — same rules as registration. Email, role and password cannot be changed here.
export async function PATCH(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  const user = await getCurrentUser();
  if (!user) return authError('UNAUTHORIZED', 'Login required', 401);
  const body = await jsonObject(request);
  if (!body) return authError('INVALID_BODY', 'Send a valid JSON object.', 400);
  const unknown = Object.keys(body).find((key) => !['name', 'phone', 'dateOfBirth'].includes(key));
  if (unknown) return authError('INVALID_FIELD', `${unknown} cannot be changed here.`, 400, unknown);
  const data: { name?: string; phoneNumber?: string; dateOfBirth?: Date } = {};
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || CONTROL.test(body.name)) return authError('INVALID_FIELD', 'Enter a valid name.', 400, 'name');
    data.name = body.name.trim();
  }
  if ('phone' in body) {
    const phone = typeof body.phone === 'string' ? body.phone.replace(/[\s-]/g, '') : '';
    if (!/^\+?[0-9]{8,15}$/.test(phone)) return authError('INVALID_FIELD', 'Enter a valid phone.', 400, 'phone');
    data.phoneNumber = phone;
  }
  if ('dateOfBirth' in body) {
    const value = body.dateOfBirth, dob = new Date(String(value));
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== value || dob > new Date() || dob.getUTCFullYear() < 1900) {
      return authError('INVALID_FIELD', 'Enter a valid dateOfBirth.', 400, 'dateOfBirth');
    }
    data.dateOfBirth = dob;
  }
  if (!Object.keys(data).length) return authError('INVALID_FIELD', 'Send at least one of name, phone or dateOfBirth.', 400);
  try {
    return authResponse({ success: true, user: await prisma.user.update({ where: { id: user.id }, data, select }) });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return authError('PHONE_IN_USE', 'Another account already uses this phone.', 409, 'phone');
    return authError('PROFILE_UNAVAILABLE', 'Unable to update your profile right now.', 500);
  }
}
