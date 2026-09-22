export type SourceConfig = {name:string;type:'github'|'rss';base_url:string};
export const RELEASE_REPOSITORIES = [
 {entity:'React',repo:'facebook/react'}, {entity:'Next.js',repo:'vercel/next.js'},
 {entity:'Vue.js',repo:'vuejs/core'}, {entity:'Svelte',repo:'sveltejs/svelte'},
 {entity:'Node.js',repo:'nodejs/node'}, {entity:'Deno',repo:'denoland/deno'},
 {entity:'Bun',repo:'oven-sh/bun'}, {entity:'TypeScript',repo:'microsoft/TypeScript'},
 {entity:'Rust',repo:'rust-lang/rust'}, {entity:'Go',repo:'golang/go'},
 {entity:'Prisma',repo:'prisma/prisma'}, {entity:'Tailwind CSS',repo:'tailwindlabs/tailwindcss'},
];
export const DEVTO_TAGS = [
 {entity:'JavaScript',tag:'javascript'}, {entity:'TypeScript',tag:'typescript'},
 {entity:'Python',tag:'python'}, {entity:'Rust',tag:'rust'}, {entity:'Go',tag:'go'},
 {entity:'React',tag:'react'}, {entity:'Next.js',tag:'nextjs'},
 {entity:'PostgreSQL',tag:'postgres'}, {entity:'Docker',tag:'docker'}, {entity:'Kubernetes',tag:'kubernetes'},
];
// Official publisher feeds; additions are reviewed here, never discovered by scraping.
export const BLOG_FEEDS = [
 {entity:'Cloudflare',name:'Cloudflare Blog',url:'https://blog.cloudflare.com/rss/'},
 {entity:'GitHub',name:'GitHub Blog',url:'https://github.blog/feed/'},
 {entity:'Google',name:'Google Developers',url:'https://developers.googleblog.com/feeds/posts/default'},
 {entity:'Microsoft',name:'Microsoft Developer Blogs',url:'https://devblogs.microsoft.com/feed/'},
 {entity:'Amazon Web Services',name:'AWS News',url:'https://aws.amazon.com/blogs/aws/feed/'},
 {entity:'Rust',name:'Rust Blog',url:'https://blog.rust-lang.org/feed.xml'},
 {entity:'Go',name:'Go Blog',url:'https://go.dev/blog/feed.atom'},
 {entity:'Kubernetes',name:'Kubernetes Blog',url:'https://kubernetes.io/feed.xml'},
 {entity:'Docker',name:'Docker Blog',url:'https://www.docker.com/blog/feed/'},
 {entity:'Hugging Face',name:'Hugging Face Blog',url:'https://huggingface.co/blog/feed.xml'},
];
