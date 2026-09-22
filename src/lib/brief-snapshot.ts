export type BriefSnapshot={entityIds:string[];storyIds:string[];since:string;createdAt:string};
export function reusableBrief(snapshot:BriefSnapshot|null,entityIds:string[],now:Date){
 if(!snapshot||!Array.isArray(snapshot.entityIds)||!Array.isArray(snapshot.storyIds))return false;
 const age=now.getTime()-Date.parse(snapshot.createdAt);
 return age>=0&&age<24*3600000&&[...snapshot.entityIds].sort().join(',')===[...entityIds].sort().join(',')&&Number.isFinite(Date.parse(snapshot.since));
}
