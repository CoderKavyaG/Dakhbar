import { sendDailyBriefEmails } from '../src/lib/email/delivery';

async function main() {
  const result = await sendDailyBriefEmails();
  console.log(JSON.stringify({ event: 'daily_brief_email', ...result }));
  if (result.failed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
