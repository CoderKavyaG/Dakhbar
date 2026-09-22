import {ingestGithub} from './github';
import {ingestDevto} from './devto';
import {ingestFeeds} from './rss';
import {sourceStore} from './store';
import {db} from '../db';
export type AdditionalSource='github'|'devto'|'rss';
export async function ingestAdditionalSource(source:AdditionalSource){
 const entities=(await db.entity.findMany({select:{name:true}})).map(e=>e.name);
 if(source==='github')return ingestGithub(sourceStore({name:'github',type:'github',base_url:'https://github.com'}),entities,process.env.GITHUB_TOKEN);
 // Schema has no devto enum. Keep the existing feed bucket and explicit API provenance/name.
 if(source==='devto')return ingestDevto(sourceStore({name:'devto',type:'rss',base_url:'https://dev.to'}),entities);
 return ingestFeeds(feed=>sourceStore({name:feed.name,type:'rss',base_url:feed.url}),entities);
}
