import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ingestGithub,normalizeRelease} from '../src/lib/ingestion/github';
import {ingestDevto,normalizeDevto} from '../src/lib/ingestion/devto';
import type {DocumentInput,IngestionStore} from '../src/lib/ingestion/hn';
import {extractEntityIds} from '../src/lib/clustering/entities';
import {createEmbedding,cosineSimilarity} from '../src/lib/clustering/embedding';
import {decideCluster} from '../src/lib/clustering/decision';
function memory(){const rows:DocumentInput[]=[];const store:IngestionStore={ensureSource:async()=>'source',existingIds:async()=>rows.map(r=>r.external_id),insert:async row=>{rows.push(row);return true;}};return {rows,store};}
const now=new Date();const date=now.toISOString();
test('GitHub official search and releases insert idempotently with authenticated requests',async()=>{
 const {store,rows}=memory();const urls:string[]=[];
 const request:typeof fetch=async(input,init)=>{const url=String(input);urls.push(url);assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-token');return Response.json(url.includes('/search/')?{items:[{id:1,full_name:'facebook/react',html_url:'https://github.com/facebook/react',pushed_at:date,description:'React framework'}]}:[{id:2,name:'React 20',html_url:'https://github.com/facebook/react/releases/tag/v20',published_at:date,body:'React update'}]);};
 assert.equal((await ingestGithub(store,['React'],'test-token',request,now)).inserted,2);
 assert.equal((await ingestGithub(store,['React'],'test-token',request,now)).inserted,0);
 assert.equal(rows.length,2);assert.ok(urls.every(url=>url.startsWith('https://api.github.com/')));assert.ok(urls.some(url=>url.includes('sort=stars')));
 assert.equal(normalizeRelease({draft:true},'s','r'),null);
});
test('GitHub backs off without making remaining requests; missing credentials never silently use anonymous quota',async()=>{
 let calls=0;const {store}=memory();const request:typeof fetch=async()=>{calls++;return new Response('',{status:403,headers:{'x-ratelimit-remaining':'0','retry-after':'120'}});};
 const result=await ingestGithub(store,['React'],'test',request,now);assert.equal(calls,1);assert.equal(result.deferred,1);assert.ok(result.retryAt);assert.equal(result.failed,0);
 await ingestGithub(store,['React'],undefined,request);assert.equal(calls,1);
});
test('Dev.to tag overlap deduplicates and uses the canonical URL and real timestamp',async()=>{
 const {rows,store}=memory();const article={id:7,title:'React TypeScript compiler released',url:'https://dev.to/a/post',canonical_url:'https://example.com/release',published_at:date,description:'React TypeScript compiler released',cover_image:'https://example.com/image.png'};
 const result=await ingestDevto(store,['React','TypeScript'],async()=>Response.json([article]),now);
 assert.equal(result.inserted,1);assert.equal(result.skipped,1);assert.equal(rows[0].url,article.canonical_url);assert.equal(rows[0].published_at.toISOString(),date);
 const normalized=normalizeDevto(article,'devto')!;
 const dictionary=[{id:'react',name:'React',aliases:[]},{id:'ts',name:'TypeScript',aliases:[]}];
 const ids=extractEntityIds(normalized.title,normalized.content,dictionary);assert.equal(ids.length,2);
 const vector=createEmbedding(normalized.title+'\n'+normalized.content);
 const similarity=cosineSimilarity(vector,createEmbedding(article.title+'\n'+article.description));
 const resultCluster=decideCluster([{storyId:'existing-hn-story',similarity,sharedEntityCount:ids.length,titleSimilarity:1}]);
 assert.equal(resultCluster.kind,'merge');
});
