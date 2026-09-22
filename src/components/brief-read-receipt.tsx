'use client';
import {useEffect} from 'react';
import {acknowledgeBrief} from '@/app/actions/brief';
export function BriefReadReceipt({at}:{at:string}) {
 useEffect(()=>{void acknowledgeBrief(at).catch(()=>{/* Keep unread state if acknowledgement fails. */});},[at]);
 return null;
}
