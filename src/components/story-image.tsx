'use client';
import {usableArticleImage} from '@/lib/article-image';
import {useEffect,useRef,useState,type ReactNode} from 'react';
type Props={src:string|null|undefined;alt:string;className?:string;fallback?:ReactNode};
function ImageAttempt({src,alt,className='',fallback=null}:Props&{src:string}){
 const [status,setStatus]=useState<'loading'|'loaded'|'failed'>('loading');const image=useRef<HTMLImageElement>(null);
 useEffect(()=>{
  if(image.current?.complete&&image.current.naturalWidth){setStatus(usableArticleImage(image.current.naturalWidth,image.current.naturalHeight)?'loaded':'failed');return;}
  const timer=window.setTimeout(()=>setStatus(current=>current==='loading'?'failed':current),20000);
  return()=>window.clearTimeout(timer);
 },[]);
 if(status==='failed')return <>{fallback}</>;
 return <>{status==='loading'&&fallback}<div className={`story-image ${status==='loading'?'story-image-pending ':''}${className}`}>
 {/* Eager loading is intentional: display:none pending images cannot use native lazy loading. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img ref={image} src={src} alt={alt} loading="eager" decoding="async" onLoad={event=>setStatus(usableArticleImage(event.currentTarget.naturalWidth,event.currentTarget.naturalHeight)?'loaded':'failed')} onError={()=>setStatus('failed')}/>
 </div></>;
}
export function StoryImage(props:Props){return props.src?<ImageAttempt key={props.src} {...props} src={props.src}/>:<>{props.fallback??null}</>;}
