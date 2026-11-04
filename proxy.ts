import { Role } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server.js';
import { getCurrentUser } from './lib/auth.ts';
import { rejectCrossOrigin } from './lib/auth-http.ts';
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const api = path.startsWith('/api/');
  if (api && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const denied = rejectCrossOrigin(request); if (denied) return denied;
  }
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      if (api) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
      const url = new URL('/login', request.url); url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    if ((path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin')) && user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication unavailable' }, { status: 503 });
  }
}
export const config = { matcher: ['/bookings/:path*', '/api/bookings/:path*', '/admin/:path*', '/api/admin/:path*'] };
