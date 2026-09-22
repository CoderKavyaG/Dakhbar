import { ArticleGrid } from '@/components/article-grid';
import Link from 'next/link';
import {db} from '@/lib/db';
import {requireReader} from '@/lib/reader-auth';
import {readerStoryInclude} from '@/lib/reader-data';
import {StoryCard} from '@/components/story-card';
import {BrandMark} from '@/components/brand-mark';
export const dynamic='force-dynamic';
export default async function SavedPage(){
 const userId=await requireReader();
 const rows=await db.savedStory.findMany({where:{user_id:userId},orderBy:{saved_at:'desc'},include:{story:{include:readerStoryInclude}}});
 return <main className="paper-shell reader-page"><header className="reader-hero"><div><p className="section-note">Your reading desk</p><h1>Saved for later.</h1><p>Stories stay here when the Front Page moves on. Add one to your Brief to keep it beside your latest developments.</p></div><BrandMark size={112}/></header>{rows.length?<ArticleGrid className="article-grid-results">{rows.map(row=><StoryCard story={row.story} key={row.story_id}/>)}</ArticleGrid>:<p>No clippings yet. <Link href="/">Find a story worth keeping →</Link></p>}</main>;
}
