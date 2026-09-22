'use server';
import { db } from '@/lib/db';
import { requireReader } from '@/lib/reader-auth';
export async function acknowledgeBrief(renderedAt:string) {
 const userId=await requireReader();const date=new Date(renderedAt);
 if(!Number.isFinite(date.getTime())||date>new Date()||date<new Date(Date.now()-3600000))return;
 // A late tab must never move the read cursor backwards.
 await db.$executeRaw`INSERT INTO "UserVisit" (user_id,last_seen_at) VALUES (${userId},${date}) ON CONFLICT (user_id) DO UPDATE SET last_seen_at = GREATEST("UserVisit".last_seen_at, EXCLUDED.last_seen_at)`;
}
