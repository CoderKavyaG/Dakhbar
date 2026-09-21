import { sendDailyBriefEmails } from '../src/lib/email/delivery';
import { requireEnvironment } from '../src/lib/billing/config';

async function main() {
  const result = await sendDailyBriefEmails(new Date(), {
    recipientOverride: requireEnvironment('RESEND_TEST_RECIPIENT'),
    idempotencyNamespace: 'daily-brief-sandbox-preview',
  });
  console.log(JSON.stringify({ event: 'daily_brief_sandbox_preview', ...result }));
  if (result.failed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
