'use client';

import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { Button } from './ui/button';

export function UpgradeDialog({ open, onOpenChange, limit }: { open: boolean; onOpenChange(open: boolean): void; limit: number }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="upgrade-overlay"/>
      <Dialog.Content className="upgrade-dialog" aria-describedby="upgrade-description">
        <Dialog.Close className="upgrade-close" aria-label="Close upgrade prompt"><X size={18}/></Dialog.Close>
        <div className="upgrade-brand"><BrandMark size={72}/><div><p className="section-note">Dअख़बार Desk</p><Dialog.Title>You’ve reached {limit} followed topics.</Dialog.Title></div></div>
        <Dialog.Description id="upgrade-description">Desk removes the follow limit and delivers your deterministic Brief by email every morning.</Dialog.Description>
        <ul><li>Unlimited Following</li><li>Morning Brief email</li><li>Manage or cancel through Stripe</li></ul>
        <div className="upgrade-actions">
          <form method="post" action="/api/billing/checkout"><Button type="submit">Upgrade for $5/month</Button></form>
          <Button asChild variant="outline"><Link href="/pricing">See plan and policies</Link></Button>
        </div>
        <p className="upgrade-legal">Stripe test mode. No real charge is processed. <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link>.</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
