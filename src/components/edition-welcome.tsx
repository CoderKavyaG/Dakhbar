'use client';
import {useEffect,useState} from 'react';
import {editionGreeting} from '@/lib/edition-greeting';
import {BrandMark} from './brand-mark';
export function EditionWelcome(){
 const [greeting,setGreeting]=useState({title:'A fresh perspective, whenever you arrive.',body:'Your developer newspaper. A few minutes, a little more context.',drink:'coffee'});
 useEffect(()=>{const update=()=>setGreeting(editionGreeting(new Date().getHours()));update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[]);
 return <section className={'edition-welcome welcome-'+greeting.drink} aria-label="Welcome to your edition"><div className="coffee-scene" aria-hidden="true"><span className="coffee-steam"/><span className="coffee-stream"/><span className="coffee-cup"><i/></span><span className="coffee-saucer"/></div><div><h2>{greeting.title}</h2><p>{greeting.body}</p></div><div className="reporter-delivery" aria-hidden="true"><BrandMark size={76}/><span className="thrown-paper">D<span>Today’s news</span></span></div></section>;
}
