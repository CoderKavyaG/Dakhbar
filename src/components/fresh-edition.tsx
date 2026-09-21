'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
export function FreshEdition(){
 const router=useRouter();const [available,setAvailable]=useState(false);
 useEffect(()=>{let baseline:string|null=null;let alive=true;const check=async()=>{if(document.hidden)return;try{const response=await fetch('/api/edition-status');if(!response.ok)return;const data=await response.json();if(baseline&&data.latest!==baseline&&alive)setAvailable(true);baseline=data.latest;}catch{}};void check();const timer=setInterval(check,60000);return()=>{alive=false;clearInterval(timer);};},[]);
 if(!available)return null;
 return <button className="fresh-edition" onClick={()=>{setAvailable(false);router.refresh();}}>Fresh reporting has arrived. Update your edition →</button>;
}
