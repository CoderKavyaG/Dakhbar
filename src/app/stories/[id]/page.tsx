import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { StoryImage } from '@/components/story-image';
import { StoryCard } from '@/components/story-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReadingAccordion } from '@/components/ui/accordion';
import { getRelatedStories } from '@/lib/related-stories';
import { countIndependentSources,publisherDomain,storyDek } from '@/lib/story-evidence';
export const dynamic='force-dynamic';
export default async function StoryPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const story=await db.story.findUnique({where:{id},include:{entities:{include:{entity:true}},documents:{orderBy:{raw_document:{published_at:'asc'}},include:{raw_document:{include:{source:true}}}}}});
 if(!story||!story.documents.length)notFound();const documents=story.documents.map(m=>m.raw_document);if(countIndependentSources(documents)<2)redirect(documents[0].url);
 const related=await getRelatedStories(story.id,story.entities.map(e=>e.entity_id));
 const reports=documents.filter((d,i,all)=>all.findIndex(other=>other.url===d.url)===i);const evidence=documents.find(d=>d.og_description)??documents[0];const dek=storyDek(evidence,420);const image=documents.find(d=>d.og_image_url)?.og_image_url;
 return <main className="paper-shell story-page"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Today</Link><span>/</span><span>Story & sources</span></nav><article className="story-detail"><header className="story-detail-header"><div><div className="story-context">{story.entities.map(e=><Link key={e.entity_id} href={'/search?q='+encodeURIComponent(e.entity.name)}>{e.entity.name}</Link>)}</div><h1>{story.title}</h1><p className="detail-dek">{dek.kind==='domain'?'Reporting from ':''}{dek.text}</p><Badge>{countIndependentSources(documents)} reporting sources</Badge></div><StoryImage src={image} alt="" className="story-detail-image"/></header>
 <section className="source-section"><header className="section-heading"><div><span className="section-note">Follow the evidence</span><h2>Original reporting</h2></div><p>In the order shared on Hacker News</p></header><ol className="reporting-timeline">{reports.map((document,index)=><li key={document.id}><div className="reporting-time"><span className="reporting-dot"/><time dateTime={document.published_at.toISOString()}>{document.published_at.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time><span>{index===0?'First indexed report':'Further reporting'}</span></div><article className="source-card"><StoryImage src={document.og_image_url} alt="" className="source-card-image"/><div className="source-card-content"><Badge>{publisherDomain(document.url)}</Badge><h3>{document.title}</h3>{(document.og_description||document.content)&&<p>{storyDek(document,320).text}</p>}<Button asChild variant="outline"><a href={document.url} target="_blank" rel="noopener noreferrer">Read original ↗</a></Button></div></article></li>)}</ol><ReadingAccordion title="What does this timeline represent?"><p>These timestamps record when each link was shared on Hacker News. They do not establish when the publisher first reported the news. Reports are grouped by matching topics and text; read the original sources to assess their claims.</p></ReadingAccordion></section>
 <aside className="source-disclaimer">
        <p>TheDailyDev indexes and links to original reporting. We don’t host or claim ownership of this content — click through to read the full piece.</p>
        <Link href="/methodology">Learn how we source and rank →</Link>
      </aside>
 </article>{related.length>0&&<section className="related-section"><header className="section-heading"><div><span className="section-note">Continue reading</span><h2>More in this sector</h2></div><p>Shared topics, related coverage</p></header><div className="related-grid">{related.map(item=><StoryCard story={item} key={item.id}/>)}</div></section>}</main>;
}
