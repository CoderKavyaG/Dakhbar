import {createHash} from 'node:crypto';
export type CachedCopy={text:string;generated:boolean};
export interface CopyCache {get(key:string):Promise<string|null>;set(key:string,value:string,ttl:number):Promise<unknown>;}
export function digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export async function assembleCachedBrief<T extends {id:string}>(stories:T[],cache:CopyCache,keyFor:(story:T,index:number)=>string,generate:(stories:T[],lead:boolean)=>Promise<Record<string,CachedCopy>>){
 const keys=stories.map(keyFor);const fullKey='dakhbar:brief:full:'+digest(keys);
 const full=await cache.get(fullKey);
 if(full)return {copies:JSON.parse(full) as Record<string,CachedCopy>,fullHit:true,storyHits:stories.length};
 const copies:Record<string,CachedCopy>={};const missing:{story:T;index:number;key:string}[]=[];
 for(const [index,story] of stories.entries()){const hit=await cache.get(keys[index]);if(hit)copies[story.id]=JSON.parse(hit);else missing.push({story,index,key:keys[index]});}
 const lead=missing.filter(item=>item.index===0);const standard=missing.filter(item=>item.index>0);
 const groups=[...(lead.length?[lead]:[]),...Array.from({length:Math.ceil(standard.length/5)},(_,i)=>standard.slice(i*5,i*5+5))];
 for(const group of groups){
  const results=await generate(group.map(item=>item.story),group[0].index===0);
  for(const item of group){const result=results[item.story.id];if(!result)throw new Error('missing_batch_result');copies[item.story.id]=result;await cache.set(item.key,JSON.stringify(result),result.generated?86400:300);}
 }
 await cache.set(fullKey,JSON.stringify(copies),Object.values(copies).every(copy=>copy.generated)?86400:300);
 return {copies,fullHit:false,storyHits:stories.length-missing.length};
}
