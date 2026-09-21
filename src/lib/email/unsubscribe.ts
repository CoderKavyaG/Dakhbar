import { createHmac, timingSafeEqual } from 'node:crypto';

function encode(value: string) { return Buffer.from(value, 'utf8').toString('base64url'); }

export function createUnsubscribeToken(userId: string, secret: string) {
  const payload = encode(userId);
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyUnsubscribeToken(token: string, secret: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try { return Buffer.from(payload, 'base64url').toString('utf8'); } catch { return null; }
}
