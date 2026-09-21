import { readFile } from 'node:fs/promises';
import { stripeClient } from '../src/lib/billing/config';

async function main() {
  const file = await stripeClient().files.create({
    purpose: 'business_logo',
    file: {
      data: await readFile('public/brand/dakhbar-reporter.png'),
      name: 'dakhbar-reporter.png',
      type: 'image/png',
    },
  });
  console.log(JSON.stringify({ fileId: file.id, purpose: file.purpose, size: file.size }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
