/** Bounded XML reader for RSS/Atom only. No DTD, entities, network resolution or executable markup. */
export type XmlNode={name:string;attrs:Record<string,string>;children:XmlNode[];text:string};
export function decodeXml(value:string){return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,key:string)=>{
 if(key[0]==='#'){const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);if(code<=0||code>0x10ffff||(code>=0xd800&&code<=0xdfff))throw new Error('Invalid XML character');return String.fromCodePoint(code);}
 return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[key]??'';
});}
export function parseFeedXml(xml:string):XmlNode{
 if(xml.length>2*1024*1024)throw new Error('Feed exceeds safe XML limits');
 const root:XmlNode={name:'#document',attrs:{},children:[],text:''};const stack=[root];
 const tokens=/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/(?:[\w:.-]+)\s*>|<(?:[\w:.-]+)(?:\s+[^<>]*?)?\s*\/?>|[^<]+/g;
 let end=0,count=0;
 for(const token of xml.matchAll(tokens)){
  if(token.index!==end||++count>150000)throw new Error('Malformed XML');end=token.index+token[0].length;
  const part=token[0];const parent=stack[stack.length-1];
  if(part.startsWith('<!--')||part.startsWith('<?'))continue;
  if(part.startsWith('<![CDATA[')){parent.text+=part.slice(9,-3);continue;}
  if(part.startsWith('</')){if(stack.length===1||part.slice(2,-1).trim()!==parent.name)throw new Error('Mismatched XML element');stack.pop();continue;}
  if(part.startsWith('<')){
   const tag=part.match(/^<([\w:.-]+)/)!;const attrs:Record<string,string>={};const rest=part.slice(tag[0].length).replace(/\/?\s*>$/,'');
   let consumed=0;for(const a of rest.matchAll(/\s+([\w:.-]+)\s*=\s*("[^"]*"|'[^']*')/g)){if(rest.slice(consumed,a.index).trim())throw new Error('Invalid XML attribute');if(Object.hasOwn(attrs,a[1]))throw new Error('Duplicate XML attribute');attrs[a[1]]=decodeXml(a[2].slice(1,-1));consumed=a.index+a[0].length;}
   if(rest.slice(consumed).trim())throw new Error('Invalid XML attributes');
   const node:XmlNode={name:tag[1],attrs,children:[],text:''};parent.children.push(node);
   if(!/\/\s*>$/.test(part)){stack.push(node);if(stack.length>64)throw new Error('XML nesting limit');}
  }else parent.text+=decodeXml(part);
 }
 if(end!==xml.length||stack.length!==1||root.children.length!==1||root.text.trim())throw new Error('Malformed XML document');
 return root.children[0];
}
export const localName=(node:XmlNode)=>node.name.split(':').pop();
export const nodeText=(node?:XmlNode):string=>node?node.text+node.children.map(nodeText).join(' '):'';
