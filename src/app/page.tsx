import Link from 'next/link';
export default function Home() {
  return <main className="p-8 space-y-4"><h1 className="text-2xl font-semibold">Dअख़बार</h1><p>Phase 1: Foundation</p><Link className="underline" href="/admin">Admin dashboard</Link></main>;
}
