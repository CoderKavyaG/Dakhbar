export type NavItem={href:string;label:string;icon:'newspaper'|'search'|'heart'|'book'|'bookmark'|'compass'|'gem'};
export function navigationItems(signedIn:boolean):NavItem[]{return [
 {href:'/',label:'Today',icon:'newspaper'},{href:'/search',label:'Archive',icon:'search'},
 ...(signedIn?[{href:'/for-you',label:'Following',icon:'heart'},{href:'/brief',label:'Brief',icon:'book'},{href:'/saved',label:'Saved',icon:'bookmark'}] as NavItem[]:[]),
 {href:'/methodology',label:'Methodology',icon:'compass'},{href:'/pricing',label:'Desk',icon:'gem'},
];}
export function mobileNavigationItems(signedIn: boolean) {
 const items = navigationItems(signedIn);
 const primary = items.filter(item => ['/', '/search', '/brief', '/saved'].includes(item.href));
 return { primary, more: items.filter(item => !primary.includes(item)) };
}
