import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { isReaderProtectedPath } from './lib/reader-access';

const clerk = clerkMiddleware(async (auth, request) => {
  if (isReaderProtectedPath(request.nextUrl.pathname)) {
    const session = await auth();
    if (!session.userId) return session.redirectToSignIn({ returnBackUrl: request.url });
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return new NextResponse('Authentication is not configured. Set the Clerk keys in your local environment.', {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
  return clerk(request, event);
}
export const config = { matcher: ['/', '/admin/:path*', '/brief/:path*', '/for-you/:path*', '/methodology/:path*', '/search/:path*', '/sign-in/:path*', '/stories/:path*', '/topics/:path*'] };
