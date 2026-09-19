import { ClerkProvider, SignIn } from '@clerk/nextjs';
export default function SignInPage() {
  return <ClerkProvider><main className="p-8"><SignIn /></main></ClerkProvider>;
}
