import { createQueue } from './queue';
import { ingestionHealth } from './ingestion-health';
export const INGESTION_SUCCESS_KEY='dakhbar:health:hn:last-success';
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
