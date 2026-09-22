import {documentRow,insertRows,summary} from './common';
import {parseFeedXml,localName,nodeText,type XmlNode} from './feed-xml';
import {BLOG_FEEDS} from './sources';
import type {IngestionStore} from './hn';
export type FeedConfig={entity:string;name:string;url:string};
const child=(node:XmlNode,name:string)=>node.children.find(c=>localName(c)===name);
export function normalizeFeed(xml:string,source:string,feedUrl:string){
 const root=parseFeedXml(xml);const atom=localName(root)==='feed';
 if(!atom&&localName(root)!=='rss')throw new Error('Expected RSS or Atom');
 const container=atom?root:child(root,'channel');if(!container)throw new Error('Missing RSS channel');
 return container.children.filter(c=>localName(c)===(atom?'entry':'item')).slice(0,40).map(item=>{
  const link=atom?item.children.find(n=>localName(n)==='link'&&(!n.attrs.rel||n.attrs.rel==='alternate'))?.attrs.href:nodeText(child(item,'link'));
  let url:string;try{url=new URL(link||'',feedUrl).href;}catch{return null;}if(!link)return null;
  const date=nodeText(child(item,atom?'published':'pubDate'))||nodeText(child(item,atom?'updated':'date'));
  const title=nodeText(child(item,'title'));const excerpt=nodeText(child(item,atom?'summary':'description'))||nodeText(child(item,'content'))||nodeText(child(item,'encoded'));
  const media=item.children.find(c=>(c.name==='media:content'||c.name==='media:thumbnail'||localName(c)==='enclosure')&&(c.attrs.type?.startsWith('image/')||c.attrs.medium==='image'||c.name==='media:thumbnail'));
  const image=media?.attrs.url;const author=nodeText(child(item,'creator'))||nodeText(child(item,'author'));
  return documentRow(source,nodeText(child(item,atom?'id':'guid'))||url,title,url,date,{feed_url:feedUrl,title,url,published_at:date,excerpt:excerpt.slice(0,500)},excerpt,image,author);
 });
}
async function limitedXml(response:Response){
 if(!response.ok)throw new Error('Feed HTTP '+response.status);
 if(Number(response.headers.get('content-length'))>2*1024*1024||!response.body)throw new Error('Feed body unavailable or too large');
 const reader=response.body.getReader();const parts:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw new Error('Feed too large');}parts.push(value);}
 return Buffer.concat(parts).toString('utf8');
}
export async function ingestFeeds(storeFor:(feed:FeedConfig)=>IngestionStore,entities:string[],request:typeof fetch=fetch,feeds:FeedConfig[]=BLOG_FEEDS,now=new Date()){
 const result=summary();
 for(const feed of feeds.filter(f=>entities.includes(f.entity))){try{
  const response=await request(feed.url,{headers:{Accept:'application/rss+xml, application/atom+xml, application/xml','User-Agent':'Dakhbar/0.1 (official feed reader)'},signal:AbortSignal.timeout(15000)});
  const xml=await limitedXml(response);const store=storeFor(feed);const source=await store.ensureSource();
  await insertRows(store,normalizeFeed(xml,source,feed.url).filter(row=>!row||row.published_at>=new Date(now.getTime()-7*86400000)),result);
 }catch(error){result.failed++;console.error(JSON.stringify({event:'feed_skipped',feed:feed.name,error:error instanceof Error?error.message:'Unknown error'}));}}
 return result;
}
