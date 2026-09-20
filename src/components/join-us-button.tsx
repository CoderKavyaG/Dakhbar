'use client';

import { SignInButton } from '@clerk/nextjs';
import { Button } from './ui/button';

export function JoinUsButton() {
  return <SignInButton mode="modal">
    <Button type="button" size="default">Join us</Button>
  </SignInButton>;
}
