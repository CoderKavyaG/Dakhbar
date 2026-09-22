import { db } from './db';
import { createQueue } from './queue';
import { ingestionHealth } from './ingestion-health';
import { pulseHealth } from './pulse-health';
import { previousCompletedDay, utcDay } from './pulse';

export const INGESTION_SUCCESS_KEY='dakhbar:health:hn:last-success';
export const PULSE_SUCCESS_KEY='dakhbar:health:pulse:last-success';
export const WORKER_HEARTBEAT_KEY='dakhbar:health:worker';

export async function getOperationalHealth(){
 const queue=createQueue(true);queue.on('error',()=>{});
 try{
  const client=await queue.client;
  const [lastSuccess,heartbeat,paused,counts,workers]=await Promise.all([client.get(INGESTION_SUCCESS_KEY),client.get(WORKER_HEARTBEAT_KEY),queue.isPaused(),queue.getJobCounts('active','waiting','delayed','failed'),queue.getWorkersCount()]);
  return {...ingestionHealth(lastSuccess,Boolean(heartbeat)&&workers>0,paused),counts,workers,error:null};
 }catch{return {...ingestionHealth(null,false,false),counts:{} as Record<string,number>,workers:0,error:'Queue health unavailable. Check Redis connectivity.'};}
 finally{await queue.close();}
}

export async function getPulseSnapshotHealth(now = new Date()) {
 const queue=createQueue(true);queue.on('error',()=>{});
 try {
  const client=await queue.client;
  const raw=await client.get(PULSE_SUCCESS_KEY);
  const saved=raw ? JSON.parse(raw) as { completedAt?: string; entitiesCovered?: number; snapshotsWritten?: number; through?: string } : {};
  const [entities, documents, snapshots] = await Promise.all([
    db.entity.findMany({ select: { id: true, created_at: true } }),
    db.rawDocument.aggregate({ _min: { published_at: true } }),
    db.entityMetricSnapshot.findMany({ select: { entity_id: true, snapshot_at: true } }),
  ]);
  const firstDocumentAt=documents._min.published_at;
  const through=previousCompletedDay(now);
  const firstDay=firstDocumentAt ? utcDay(firstDocumentAt) : null;
  const expected=firstDay && firstDay <= through ? entities.length * (Math.floor((through.getTime()-firstDay.getTime())/86400000)+1) : 0;
  const job=pulseHealth(saved.completedAt ?? null,now);
  const gaps=Math.max(0,expected-snapshots.length);
  return { ...job, entitiesCovered:saved.entitiesCovered ?? 0, snapshotsWritten:saved.snapshotsWritten ?? 0, historyStart:firstDay, historyThrough:through, snapshotCount:snapshots.length, expectedSnapshotCount:expected, gaps, alert:job.stale||gaps>0, error:null };
 } catch {
  return { ...pulseHealth(null,now), entitiesCovered:0,snapshotsWritten:0,historyStart:null,historyThrough:previousCompletedDay(now),snapshotCount:0,expectedSnapshotCount:0,gaps:0,alert:true,error:'Pulse health unavailable. Check Redis and PostgreSQL connectivity.' };
 } finally { await queue.close(); }
}
