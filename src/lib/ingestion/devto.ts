import type {IngestionStore} from './hn';
import {apiJson,documentRow,insertRows,RateLimited,summary} from './common';
import {DEVTO_TAGS} from './sources';
export function normalizeDevto(item:Record<string,unknown>,source:string){
 const user=item.user as Record<string,unknown>|undefined;
 return documentRow(source,item.id,item.title,item.canonical_url||item.url,item.published_at,{...item,ingestion_api:'https://dev.to/api/articles'},item.description,item.cover_image,user?.username);
}
export async function ingestDevto(store:IngestionStore,entities:string[],request:typeof fetch=fetch,now=new Date()){
 const result=summary();const source=await store.ensureSource();
 for(const {tag} of DEVTO_TAGS.filter(t=>entities.includes(t.entity))){try{
  const items=await apiJson(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=20`,request,{Accept:'application/vnd.forem.api-v1+json'});
  if(!Array.isArray(items))throw new Error('Invalid Dev.to response');
  await insertRows(store,items.map(item=>normalizeDevto(item,source)).filter(row=>!row||row.published_at>=new Date(now.getTime()-7*86400000)),result);
 }catch(error){if(error instanceof RateLimited){result.deferred++;result.retryAt=error.retryAt.toISOString();break;}result.failed++;console.error(JSON.stringify({event:'source_error',source:'devto',tag,error:error instanceof Error?error.message:'Unknown error'}));}}
 return result;
}
