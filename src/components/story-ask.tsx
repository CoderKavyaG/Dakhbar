'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Send } from 'lucide-react';
import { JoinUsButton } from './join-us-button';
import { Button } from './ui/button';

type AskSource={citation:number;title:string;domain:string;reportedAt:string;excerpt:string;url:string};
type AskPayload={upgradeUrl?:string;answer:string|null;generated:boolean;cached:boolean;reason?:string;evidence?:AskSource[];message?:string};
function answerWithCitations(answer:string,evidence:AskSource[]){return answer.split(/(\[\d+\])/g).map((part,index)=>{const match=part.match(/^\[(\d+)\]$/);if(!match)return part;const source=evidence.find(item=>item.citation===Number(match[1]));return source?<a key={index} className="ask-citation" href={'#ask-source-'+source.citation} aria-label={'Jump to source '+source.citation}>[{source.citation}]</a>:part;});}
export function StoryAsk({storyId,subscriber,signedIn}:{storyId:string;subscriber:boolean;signedIn:boolean}){
 const [question,setQuestion]=useState('');const [result,setResult]=useState<AskPayload|null>(null);const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!question.trim()||busy)return;
  setBusy(true);
  setResult(null);
  try{
    const response=await fetch(`/api/stories/${encodeURIComponent(storyId)}/ask`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({question:question.trim()})
    });
    const payload=await response.json() as AskPayload;
    if(response.status===401){
      setResult({...payload,message:'Please sign in to ask questions about this story.'});
      return;
    }
    if(response.status===403&&payload.upgradeUrl){
      setResult({...payload,message:payload.message??'Ask this story is included with Desk membership.'});
      return;
    }
    if(!response.ok){
      setResult({...payload,message:payload.message??'A grounded answer was not available from the linked reports. Read the original coverage below.'});
      return;
    }
    setResult(payload);
  }catch{
    setResult({answer:null,generated:false,cached:false,reason:'network_error',message:'The story question service is temporarily unavailable. The original reports remain below.'});
  }finally{
    setBusy(false);
  }
 }
 return <section className="story-ask" aria-labelledby="story-ask-title"><header><div><span className="section-note">Desk member feature</span><h2 id="story-ask-title">Ask this story</h2><p>Ask about this reporting only. Answers need a source citation for each sentence.</p></div></header>
 {!signedIn?<div className="ask-gate"><p>Join to check your Desk access and ask about this story.</p><JoinUsButton/></div>:!subscriber?<div className="ask-gate"><p>Story questions are part of Desk. Your original sources stay open to everyone.</p><Button asChild><Link href="/pricing">Explore Desk <ArrowUpRight size={16}/></Link></Button></div>:<form className="story-ask-form" onSubmit={submit}><label htmlFor="story-question">Your question</label><div><input id="story-question" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={500} placeholder="What did the reports confirm?"/><Button type="submit" disabled={busy||!question.trim()}>{busy?'Checking…':<>Ask <Send size={15}/></>}</Button></div><small>Scoped to this story’s linked reports. Up to 500 characters.</small></form>}
 {result&&<div className="ask-result" aria-live="polite">{result.answer&&result.generated?<><p className="ask-answer">{answerWithCitations(result.answer,result.evidence??[])}</p><small>{result.cached?'Cached from this story’s evidence.':'Answer checked against this story’s evidence.'}</small></>:<p className="ask-fallback" role="status">{result.message??'A grounded answer was not available. Read the original reports below.'}{result.upgradeUrl&&<Link href={result.upgradeUrl}>Explore Desk →</Link>}</p>}{result.evidence&&result.evidence.length>0&&<ol className="ask-evidence-list" aria-label="Evidence used for this story question">{result.evidence.map(source=><li id={'ask-source-'+source.citation} key={source.citation}><span>[{source.citation}] {source.domain} · {new Date(source.reportedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span><h3>{source.title}</h3><p>{source.excerpt}</p><a href={source.url} target="_blank" rel="noopener noreferrer">Read original <ArrowUpRight size={14}/></a></li>)}</ol>}</div>}
 </section>;
}
