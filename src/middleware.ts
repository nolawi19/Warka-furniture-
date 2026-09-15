import { NextResponse, type NextRequest } from 'next/server';

/**
 * Passes the request's path down to the server components as a header.
 *
 * A root layout is not given the pathname, and the layout needs it for exactly
 * one decision: whether the maintenance screen should cover this request. It
 * must not cover /login, or closing the shop would lock the shopkeeper out of
 * the only door back in.
 *
 * Nothing about authentication happens here. Middleware runs at the edge with
 * no database, so it cannot verify a session, and a check it cannot make is a
 * check it must not pretend to make. The real gate stays in admin-guard.ts.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the files in /public.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|woff2?)$).*)',
  ],
};
