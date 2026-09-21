import {getFrontPageStories} from '@/lib/front-page';
import {digest} from '@/lib/brief-cache';
export async function GET(){
 const stories=await getFrontPageStories();
 return Response.json({latest:digest(stories.map(story=>[story.id,story.updated_at.toISOString()]))},{headers:{'Cache-Control':'no-store'}});
}
