'use client';
import {useCallback,useEffect,useState,useTransition} from 'react';
import {useAuth,useClerk} from '@clerk/nextjs';
import {Bookmark,BookOpen,Check} from 'lucide-react';
import {setSavedStory} from '@/app/actions/saved';
import {useSavedStories} from './saved-stories-provider';
export function SaveStory({id}:{id:string}){
 const {isSignedIn}=useAuth();const clerk=useClerk();const {stories,update}=useSavedStories();
 const saved=Object.hasOwn(stories,id);const inBrief=stories[id]===true;
 const [pending,start]=useTransition();const [intent,setIntent]=useState<'save'|'brief'|'remove'|null>(null);const [error,setError]=useState('');
 const submit=useCallback((mode:'save'|'brief'|'remove')=>start(async()=>{try{setError('');const result=await setSavedStory(id,mode);update(id,result.saved,result.brief);}catch{setError('Could not save. Try again.');}}),[id,update]);
 useEffect(()=>{if(isSignedIn&&intent){setIntent(null);submit(intent);}},[isSignedIn,intent,submit]); // The pending action resumes after the native sign-in modal.
 const act=(mode:'save'|'brief'|'remove')=>{if(isSignedIn)submit(mode);else{setIntent(mode);clerk.openSignIn({fallbackRedirectUrl:'/',signUpFallbackRedirectUrl:'/'});}};
 return <div className="save-story-controls"><button type="button" disabled={pending} aria-pressed={saved} aria-label={saved?'Remove saved story':'Save story'} onClick={()=>act(saved?'remove':'save')}><Bookmark size={14} fill={saved?'currentColor':'none'}/>{saved?'Saved':'Save'}</button><button type="button" disabled={pending} aria-pressed={inBrief} onClick={()=>act(inBrief?'save':'brief')}>{inBrief?<Check size={14}/>:<BookOpen size={14}/>} {inBrief?'In your Brief':'Add to Brief'}</button>{error&&<span role="alert">{error}</span>}</div>;
}
