import Link from 'next/link';
import { Search } from 'lucide-react';
import { StoryCard } from '@/components/story-card';
import { TopicSummary } from '@/components/topic-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { searchStories } from '@/lib/search-data';
import { getFrontPageStories } from '@/lib/front-page';
import { storyCountLabel } from '@/lib/story-count';
export const dynamic='force-dynamic';
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
 const query=((await searchParams).q??'').trim();const results=await searchStories(query);const entity=results.intent==='navigational'?results.entityMatches[0]:undefined;const stories=query?results.stories:await getFrontPageStories();
 const topicCount=entity?await db.story.count({where:{entities:{some:{entity_id:entity.id}}}}):0;
 return <main className="paper-shell search-page"><section className="search-hero"><div><span className="section-note">The searchable edition</span><h1>Find your next read.</h1><p>Follow a technology, a company, or the story behind a headline.</p></div><form action="/search" className="search-form"><label htmlFor="search-q">Search stories and topics</label><div><input id="search-q" name="q" defaultValue={query} placeholder="Try React, databases, OpenAI…"/><Button aria-label="Search archive"><Search size={18}/> Search</Button></div></form></section><div className="search-workspace"><aside className="search-sidebar"><h2>{entity?'Matched topic':'Browse a sector'}</h2>{entity&&<div className="topic-result"><TopicSummary entity={entity} storyCount={topicCount} returnTo={'/search?q='+encodeURIComponent(query)}/></div>}<nav aria-label="Browse topics">{['OpenAI','React','PostgreSQL','Rust','GitHub'].map(topic=><Link key={topic} href={'/search?q='+topic}>{topic}<span>→</span></Link>)}</nav><p>Results lead to the original source or a collection of related reporting.</p></aside><section className="search-results"><header className="section-heading"><h2>{query?'Stories for “'+query+'”':'From the current edition'}</h2><Badge>{storyCountLabel(stories.length)}</Badge></header><div className="search-story-grid">{stories.map(story=><StoryCard story={story} key={story.id}/>)}</div>{!stories.length&&<div className="empty-results"><h3>No stories found yet.</h3><p>Try a broader term or browse one of the topics.</p><Button asChild variant="outline"><Link href="/search">Browse the edition</Link></Button></div>}</section></div></main>;
}
