import type {DocumentInput, IngestionStore} from './hn';
export type IngestionSummary = {inserted:number;skipped:number;failed:number;deferred:number;retryAt?:string;configuration?:string};
export const summary = ():IngestionSummary => ({inserted:0,skipped:0,failed:0,deferred:0});
export function httpUrl(value:unknown):string|null {try{const u=new URL(String(value));return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function text(value:unknown):string {return typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim():'';}
export function documentRow(source:string,id:unknown,title:unknown,url:unknown,published:unknown,raw:Record<string,unknown>,content:unknown=null,image:unknown=null,author:unknown=null):DocumentInput|null{
 const date=new Date(String(published));const link=httpUrl(url);const headline=text(title);
 if(!id||!headline||!link||!Number.isFinite(date.getTime())||date.getTime()>Date.now()+3600000)return null;
 const excerpt=text(content).slice(0,500)||null;
 return {source_id:source,external_id:String(id),title:headline,url:link,published_at:date,content:excerpt,og_description:excerpt,og_image_url:httpUrl(image),author:text(author)||null,raw_json:raw};
}
export async function insertRows(store:IngestionStore,rows:(DocumentInput|null)[],result:IngestionSummary){
 const valid=rows.filter((r):r is DocumentInput=>Boolean(r));result.skipped+=rows.length-valid.length;
 if(!valid.length)return;
 const known=new Set(await store.existingIds(valid[0].source_id,valid.map(r=>r.external_id)));
 for(const row of valid){if(known.has(row.external_id)){result.skipped++;continue;}try{if(await store.insert(row)){result.inserted++;known.add(row.external_id);}else result.skipped++;}catch{result.failed++;}}
}
export class RateLimited extends Error {constructor(public retryAt:Date){super('Source rate limited until '+retryAt.toISOString());}}
export async function apiJson(url:string,request:typeof fetch,headers:Record<string,string>={}){
 const r=await request(url,{headers:{Accept:'application/json','User-Agent':'Dakhbar/0.1',...headers},signal:AbortSignal.timeout(15000)});
 if(r.status===429||(r.status===403&&(r.headers.get('x-ratelimit-remaining')==='0'||r.headers.has('retry-after')))){
  const retry=r.headers.get('retry-after');const reset=Number(r.headers.get('x-ratelimit-reset'))*1000;
  const delay=retry?(Number.isFinite(Number(retry))?Date.now()+Number(retry)*1000:Date.parse(retry)):reset;
  throw new RateLimited(new Date(Math.max(Date.now()+60000,Number.isFinite(delay)&&delay>0?delay:Date.now()+300000)));
 }
 if(!r.ok)throw new Error(`Source HTTP ${r.status}`);
 return r.json();
}
