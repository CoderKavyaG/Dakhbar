import { db } from './db';
export function relatedStoryWhere(storyId:string,entityIds:string[]){return {id:{not:storyId},entities:{some:{entity_id:{in:entityIds}}}};}
export async function getRelatedStories(storyId:string,entityIds:string[]){if(!entityIds.length)return [];return db.story.findMany({where:relatedStoryWhere(storyId,entityIds),orderBy:[{updated_at:'desc'},{significance_score:'desc'}],take:4,include:{entities:{include:{entity:true}},documents:{orderBy:{is_primary:'desc'},include:{raw_document:true}}}});}
