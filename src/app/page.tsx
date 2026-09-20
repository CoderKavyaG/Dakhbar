import Link from 'next/link';
import { FollowToggle } from '@/components/follow-toggle';
import { StoryCard } from '@/components/story-card';
import { TodayEdition } from '@/components/today-edition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getFrontPageStories } from '@/lib/front-page';
import { countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
export const dynamic='force-dynamic';
export default async function FrontPage(){
 const stories=await getFrontPageStories();const [lead,...rest]=stories;
 const date=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());
 if(!lead)return <main className="paper-shell"><section className="empty-edition"><h1>The next edition is taking shape.</h1><p>Browse the archive while new stories arrive.</p><Link href="/search">Read the archive →</Link></section></main>;
 const documents=lead.documents.map(m=>m.raw_document);const destination=storyDestination(lead.id,documents);const evidence=documents.find(d=>d.og_description)??documents[0];const image=documents.find(d=>d.og_image_url)?.og_image_url;const dek=storyDek(evidence,360);const count=countIndependentSources(documents);
 return <main className="paper-shell"><div className="edition-intro"><p>{date}</p><Badge>{stories.length} selected stories</Badge></div><section className="lead-stage"><article className="lead-copy"><div className="lead-meta">{lead.entities.slice(0,3).map(e=><Link key={e.entity_id} href={topicPath(e.entity)}>{e.entity.name}</Link>)}</div><h1><a href={destination.href}>{lead.title}</a></h1><p className="lead-dek">{dek.kind==='domain'?'Reporting from ':''}{dek.text}</p><div className="lead-actions"><FollowToggle entityIds={lead.entities.map(e=>e.entity_id)} returnTo="/" followLabel="Follow the story" followingLabel="Following this story"/><Button asChild variant="outline"><a href={destination.href}>{destination.external?'Read original':'Read coverage'} ↗</a></Button>{count>1&&<span>{count} reporting sources</span>}</div></article><TodayEdition title={lead.title} href={destination.href} external={destination.external} image={image} date={date}/></section>
 <section className="top-stories"><header className="section-heading"><div><span className="section-note">The main edition</span><h2>Worth your attention</h2></div><span>Four stories to start with</span></header><div className="top-story-grid">{rest.slice(0,4).map((story,i)=><StoryCard story={story} featured={i===0} key={story.id}/>)}</div></section>
 <section className="story-section"><header className="section-heading"><div><span className="section-note">Across the developer world</span><h2>More from today</h2></div><Link href="/search">Explore the archive →</Link></header><div className="story-grid">{rest.slice(4).map(story=><StoryCard story={story} key={story.id}/>)}</div></section></main>;
}
