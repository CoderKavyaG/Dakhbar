import type {IngestionStore} from './hn';
import {apiJson,documentRow,insertRows,RateLimited,summary} from './common';
import {RELEASE_REPOSITORIES} from './sources';
type Json = Record<string,unknown>;
export function normalizeRepository(item:Json,source:string){
 // A repository is discovered once, not re-published as news on every push.
 return documentRow(source,'repo:'+item.id,item.full_name,item.html_url,item.pushed_at,{...item,ingestion_kind:'recently_pushed_repository',timestamp_kind:'last_push'},item.description,null,(item.owner as Json)?.login);
}
export function normalizeRelease(item:Json,source:string,repo:string){
 if(item.draft||item.prerelease)return null;
 return documentRow(source,'release:'+item.id,`${repo}: ${item.name||item.tag_name}`,item.html_url,item.published_at,{...item,repository:repo,ingestion_kind:'release'},item.body,null,(item.author as Json)?.login);
}
export async function ingestGithub(store:IngestionStore,entities:string[],token:string|undefined,request:typeof fetch=fetch,now=new Date()){
 const result=summary();if(!token){result.configuration='GITHUB_TOKEN missing';result.deferred=1;return result;}
 const source=await store.ensureSource();const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 const since=new Date(now.getTime()-7*86400000).toISOString().slice(0,10);
 const tasks=[{url:`https://api.github.com/search/repositories?q=${encodeURIComponent('pushed:>='+since+' stars:>=100 archived:false fork:false')}&sort=stars&order=desc&per_page=30`,repo:null as string|null},...RELEASE_REPOSITORIES.filter(r=>entities.includes(r.entity)).map(r=>({url:`https://api.github.com/repos/${r.repo}/releases?per_page=5`,repo:r.repo}))];
 for(const task of tasks){try{
  const payload=await apiJson(task.url,request,headers);const items=task.repo?payload:payload.items;
  if(!Array.isArray(items))throw new Error('Invalid GitHub response');
  await insertRows(store,items.map((item:Json)=>task.repo?normalizeRelease(item,source,task.repo):normalizeRepository(item,source)).filter(row=>!row||row.published_at>=new Date(now.getTime()-7*86400000)),result);
 }catch(error){if(error instanceof RateLimited){result.deferred++;result.retryAt=error.retryAt.toISOString();break;}result.failed++;console.error(JSON.stringify({event:'source_error',source:'github',endpoint:task.url,error:error instanceof Error?error.message:'Unknown error'}));}}
 return result;
}
