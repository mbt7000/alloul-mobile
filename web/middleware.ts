import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FEATURES } from './src/config/features';

// Media-related routes that should be hidden when FEATURES.MEDIA_WORLD is false
const MEDIA_ROUTES = [
  '/explore',
  '/compose',
  '/messages',
  '/bookmarks',
  '/notifications',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If media world is disabled and user tries to access media route
  if (!FEATURES.MEDIA_WORLD) {
    if (MEDIA_ROUTES.some(route => pathname.startsWith(route))) {
      // Redirect to workspace
      return NextResponse.redirect(new URL('/workspace', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
