import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
const clerk = clerkMiddleware();
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return new NextResponse('Authentication is not configured. Set the Clerk keys in your local environment.', {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
  return clerk(request, event);
}
export const config = { matcher: ['/admin/:path*', '/sign-in/:path*'] };
