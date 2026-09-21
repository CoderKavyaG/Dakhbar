import {randomUUID} from 'node:crypto';
import {db} from './db';
import {createQueue} from './queue';
import {assembleCachedBrief,digest,type CachedCopy} from './brief-cache';
import {buildGroundedFacts,generateBriefStoryCopy,groundedOrFallback,type BriefGenerationStory} from './brief-generation';
import {storyDek} from './story-evidence';
import {completeWithFallback,providerConfig,type LlmAttempt} from './llm/provider';
import {getModelHealth} from './llm/catalog';

function fallback(story:BriefGenerationStory):CachedCopy{return {text:story.documents[0]?storyDek(story.documents[0].raw_document).text:story.title,generated:false};}
export async function generateBriefEdition(stories:BriefGenerationStory[],userId:string){
 if(!stories.length)return {copies:{} as Record<string,CachedCopy>,fullHit:false,storyHits:0};
 const queue=createQueue(true);queue.on('error',()=>{});const token=randomUUID();const lock='dakhbar:brief:generation-lock';let acquired=false;let renewal:ReturnType<typeof setInterval>|undefined;
 try{
  const redis=await queue.client;
  redis.defineCommand('briefAcquire',{numberOfKeys:1,lua:"return redis.call('set',KEYS[1],ARGV[1],'EX',90,'NX')"});
  redis.defineCommand('briefRenew',{numberOfKeys:1,lua:"if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('expire',KEYS[1],90) end"});
  redis.defineCommand('briefRelease',{numberOfKeys:1,lua:"if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) end"});
  for(let i=0;i<80;i++){if(await redis.runCommand('briefAcquire',[lock,token])){acquired=true;break;}await new Promise(resolve=>setTimeout(resolve,250));}
  if(!acquired)return {copies:Object.fromEntries(stories.map(s=>[s.id,fallback(s)])),fullHit:false,storyHits:0};
  renewal=setInterval(()=>{void redis.runCommand('briefRenew',[lock,token]).catch(()=>{});},30000);
  const cache={get:(key:string)=>redis.get(key),set:(key:string,value:string,ttl:number)=>redis.set(key,value,{EX:ttl})};
  return await assembleCachedBrief(stories,cache,(story,index)=>{
   const facts=buildGroundedFacts(story);
   // Ranking decay cannot change the rewrite; source facts and the editorial role can.
   const stable={...facts,significance:undefined};
   const config=providerConfig(index===0?'lead':'standard');
   return 'dakhbar:brief:story:'+digest({version:4,id:story.id,role:index===0?'lead':'standard',facts:stable,models:[config?.primary.model,config?.fallback?.model]});
  },async (batch,lead)=>{
   if(lead){const result=await generateBriefStoryCopy(batch[0],userId,true);return {[batch[0].id]:result};}
   const config=providerConfig('standard');
   if(!config)return Object.fromEntries(batch.map(s=>[s.id,fallback(s)]));
   const health=await getModelHealth();
   if(!health.some(row=>row.provider===config.primary.name&&row.model===config.primary.model&&row.available))return Object.fromEntries(batch.map(s=>[s.id,fallback(s)]));
   const input=batch.map(story=>({id:story.id,facts:buildGroundedFacts(story)}));
   let attempts:LlmAttempt[]=[];
   const copies:Record<string,CachedCopy>={};
   try{
    const result=await completeWithFallback({...config,fallback:health.some(row=>row.provider===config.fallback?.name&&row.model===config.fallback?.model&&row.available)?config.fallback:undefined,maxTokens:1600,messages:[
     {role:'system',content:'Rewrite only supplied facts. Never add outside knowledge, implications, causes, names or quantities. Return a JSON object mapping each supplied id to one concise sentence. No markdown. Never expose scores, significance, raw timestamps or JSON field names in sentences.'},
     {role:'user',content:JSON.stringify(input)}
    ]});
    attempts=result.attempts;
    const parsed=JSON.parse(result.content) as Record<string,unknown>;
    for(const story of batch)copies[story.id]=typeof parsed[story.id]==='string'?groundedOrFallback(parsed[story.id] as string,buildGroundedFacts(story),fallback(story).text):fallback(story);
   }catch(error){attempts=(error as Error&{attempts?:LlmAttempt[]}).attempts??attempts;for(const story of batch)copies[story.id]=fallback(story);}
   // One row per actual provider request, even when a batch rewrites five stories.
   if(attempts.length)await db.llmCall.createMany({data:attempts.map(attempt=>({user_id:userId,input_hash:digest(input),provider:attempt.provider,model:attempt.model,input_tokens:attempt.inputTokens,output_tokens:attempt.outputTokens,fallback_triggered:attempt.fallbackTriggered,accepted:Boolean(attempt.content)&&Object.values(copies).some(c=>c.generated),error_code:attempt.errorCode}))});
   return copies;
  });
 }catch(error){console.error('brief_cache_unavailable',error instanceof Error?error.name:'unknown');return {copies:Object.fromEntries(stories.map(s=>[s.id,fallback(s)])),fullHit:false,storyHits:0};}
 finally{if(renewal)clearInterval(renewal);try{if(acquired){const redis=await queue.client;await redis.runCommand('briefRelease',[lock,token]);}}catch{console.error('brief_lock_release_failed');}finally{await queue.close();}}
}
