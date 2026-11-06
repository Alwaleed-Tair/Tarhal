import { NextResponse } from 'next/server.js';

const headers = { 'Cache-Control': 'no-store' };

export function authResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export function authOptions() { return authResponse({}); }

export async function jsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

export function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && !/[\u0000-\u001f\u007f]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function authError(code: string, error: string, status: number, field?: string) {
  return authResponse({ success: false, error, code, ...(field && { field }) }, status);
}

// Same-origin mutations only; non-browser clients may omit Origin.
export function rejectCrossOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) {
    return authError('INVALID_ORIGIN', 'Cross-origin requests are not allowed.', 403);
  }
  return null;
}
