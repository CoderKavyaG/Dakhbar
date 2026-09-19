import Link from 'next/link';

export function Wordmark({ href = '/' }: { href?: string }) {
  return <Link href={href} className="wordmark" aria-label="D Akhbar">
    <span className="wordmark-latin">D</span><span className="wordmark-devanagari">अख़बार</span>
  </Link>;
}
