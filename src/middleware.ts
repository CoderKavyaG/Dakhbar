import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isReaderProtectedPath } from './lib/reader-access';

export default clerkMiddleware(async (auth, request) => {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return new NextResponse('Authentication is not configured. Set the Clerk keys in your local environment.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  if (isReaderProtectedPath(request.nextUrl.pathname)) {
    const session = await auth();
    if (!session.userId) return session.redirectToSignIn({ returnBackUrl: request.url });
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
