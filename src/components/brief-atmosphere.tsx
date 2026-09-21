import type {CSSProperties} from 'react';
import {BrandMark} from './brand-mark';
export function BriefAtmosphere({names}:{names:string[]}){
 const labels=[...new Set(names)].slice(0,8);
 return <div className="brief-atmosphere" aria-hidden="true"><div className="brief-reporter"><BrandMark size={84}/></div>{labels.map((name,i)=><span key={name} style={{'--fall-delay':i*.42+'s','--fall-left':8+i*12+'%','--fall-depth':i%2?'.65':'1'} as CSSProperties}>{name}</span>)}</div>;
}
