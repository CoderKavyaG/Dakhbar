import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleCachedBrief,type CachedCopy} from '../src/lib/brief-cache';
test('six uncached stories use two batches; repeat and overlapping readers reuse copy',async()=>{
 const values=new Map<string,string>();const cache={get:async(k:string)=>values.get(k)??null,set:async(k:string,v:string)=>{values.set(k,v);}};
 let calls=0;const generate=async(stories:{id:string}[])=>{calls++;return Object.fromEntries(stories.map(s=>[s.id,{text:s.id,generated:true}])) as Record<string,CachedCopy>;};
 const stories=Array.from({length:6},(_,i)=>({id:'story-'+i}));const key=(s:{id:string},i:number)=>(i===0?'lead:':'standard:')+s.id;
 const first=await assembleCachedBrief(stories,cache,key,generate);assert.equal(calls,2);assert.equal(first.fullHit,false);
 const repeat=await assembleCachedBrief(stories,cache,key,generate);assert.equal(repeat.fullHit,true);assert.equal(calls,2);
 const overlap=await assembleCachedBrief([stories[0],stories[2],stories[4]],cache,key,generate);assert.equal(overlap.storyHits,3);assert.equal(calls,2);
});
test('new source facts invalidate just the changed story, and roles never share the wrong prompt',async()=>{
 const values=new Map<string,string>();const cache={get:async(k:string)=>values.get(k)??null,set:async(k:string,v:string)=>{values.set(k,v);}};let calls=0;
 const gen=async(stories:{id:string;version:number}[])=>{calls++;return Object.fromEntries(stories.map(s=>[s.id,{text:'v'+s.version,generated:true}]))};
 const key=(s:{id:string;version:number},i:number)=>JSON.stringify([s.id,s.version,i===0]);
 await assembleCachedBrief([{id:'a',version:1},{id:'b',version:1}],cache,key,gen);
 await assembleCachedBrief([{id:'a',version:1},{id:'b',version:2}],cache,key,gen);assert.equal(calls,3);
 await assembleCachedBrief([{id:'b',version:2}],cache,key,gen);assert.equal(calls,4);
});
