import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { FIRST_BRIEF_WINDOW_MS } from '@/lib/brief';
import { getBriefSelection } from '@/lib/reader-data';
import { appUrl, requireEnvironment } from '@/lib/billing/config';
import { renderBriefEmail } from './template';
import { createUnsubscribeToken } from './unsubscribe';

export interface BriefDeliveryDependencies<TStory> {
  listActiveSubscribers(): Promise<{ id: string; email: string }[]>;
  selectBrief(userId: string, since: Date): Promise<{ stories: TStory[] }>;
  send(input: { userId: string; deliveryDate: string; to: string; subject: string; html: string; text: string; unsubscribeUrl: string }): Promise<void>;
  render(input: { stories: TStory[]; unsubscribeUrl: string }): { subject: string; html: string; text: string };
  appUrl: string;
  unsubscribeSecret: string;
}

export async function deliverDailyBriefs<TStory>(dependencies: BriefDeliveryDependencies<TStory>, now = new Date()) {
  const subscribers = await dependencies.listActiveSubscribers();
  const since = new Date(now.getTime() - FIRST_BRIEF_WINDOW_MS);
  const deliveryDate = now.toISOString().slice(0, 10);
  let sent = 0;
  const failures: { userId: string; error: string }[] = [];
  for (const subscriber of subscribers) {
    try {
      const { stories } = await dependencies.selectBrief(subscriber.id, since);
      const token = createUnsubscribeToken(subscriber.id, dependencies.unsubscribeSecret);
      const unsubscribeUrl = `${dependencies.appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
      const message = dependencies.render({ stories, unsubscribeUrl });
      await dependencies.send({ userId: subscriber.id, deliveryDate, to: subscriber.email, ...message, unsubscribeUrl });
      sent += 1;
    } catch (error) {
      failures.push({ userId: subscriber.id, error: error instanceof Error ? error.message : 'Unknown delivery error' });
    }
  }
  return { eligible: subscribers.length, sent, failed: failures.length, failures, since };
}

export async function sendDailyBriefEmails(
  now = new Date(),
  options: { recipientOverride?: string; idempotencyNamespace?: string } = {},
) {
  const clerk = await clerkClient();
  const users = await db.user.findMany({ where: { subscription_status: 'active', email_brief_enabled: true }, select: { id: true } });
  const subscribers = (await Promise.all(users.map(async user => {
    const identity = await clerk.users.getUser(user.id);
    const email = identity.primaryEmailAddress?.emailAddress ?? identity.emailAddresses[0]?.emailAddress;
    return email ? { id: user.id, email: options.recipientOverride ?? email } : null;
  }))).filter((item): item is { id: string; email: string } => item !== null);
  const resend = new Resend(requireEnvironment('RESEND_API_KEY'));
  const baseUrl = appUrl();
  const namespace = options.idempotencyNamespace ?? 'daily-brief';
  return deliverDailyBriefs({
    appUrl: baseUrl,
    unsubscribeSecret: requireEnvironment('EMAIL_UNSUBSCRIBE_SECRET'),
    async listActiveSubscribers() { return subscribers; },
    async selectBrief(userId, since) { return getBriefSelection(userId, since); },
    render({ stories, unsubscribeUrl }) { return renderBriefEmail({ stories, appUrl: baseUrl, unsubscribeUrl }); },
    async send(message) {
      const oneClickUrl = message.unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?');
      const result = await resend.emails.send({
        from: requireEnvironment('RESEND_FROM_EMAIL'),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: {
          'List-Unsubscribe': `<${oneClickUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }, { idempotencyKey: `${namespace}/${message.deliveryDate}/${message.userId}` });
      if (result.error) throw new Error(result.error.message);
    },
  }, now);
}
