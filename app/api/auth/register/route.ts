import { prisma } from '../../../../lib/prisma.ts';
import { hashPassword } from '../../../../lib/passwords.ts';
import { registrationError } from '../../../../lib/registration.ts';
import { authOptions, authError, authResponse, jsonObject, rejectCrossOrigin } from '../../../../lib/auth-http.ts';
export const OPTIONS = authOptions;
export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  const body = await jsonObject(request);
  if (!body) return authError('INVALID_BODY', 'Send a valid JSON object.', 400);
  const field = registrationError(body);
  if (field) return authError('INVALID_FIELD', field === 'password' ? 'Use a password between 12 and 128 characters.' : `Enter a valid ${field}.`, 400, field);
  try {
    const user = await prisma.user.create({ data: {
      name: (body.name as string).trim(), email: (body.email as string).toLowerCase(),
      phoneNumber: body.phone as string, password: await hashPassword(body.password as string),
      dateOfBirth: new Date(body.dateOfBirth as string),
    }, select: { id: true, name: true, email: true, role: true } });
    return authResponse({ success: true, user }, 201);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return authError('ACCOUNT_EXISTS', 'An account already uses this email or phone.', 409);
    return authError('REGISTER_UNAVAILABLE', 'Unable to register right now.', 500);
  }
}
