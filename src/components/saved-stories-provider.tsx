'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
type State=Record<string,boolean>;
const Context=createContext<{stories:State;update:(id:string,saved:boolean,brief:boolean)=>void}>({stories:{},update:()=>{}});
export function SavedStoriesProvider({initial,children}:{initial:State;children:ReactNode}){
 const [stories,setStories]=useState(initial);
 return <Context.Provider value={{stories,update:(id,saved,brief)=>setStories(current=>{const next={...current};if(saved)next[id]=brief;else delete next[id];return next;})}}>{children}</Context.Provider>;
}
export const useSavedStories=()=>useContext(Context);
