'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export function AdminRefresh(){const router=useRouter();useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)router.refresh();},30000);return()=>clearInterval(timer);},[router]);return <small className="data-type">Health refreshes every 30 seconds while this page is open.</small>;}
