'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function StoryImage({
  src,
  alt,
  className = '',
  fallback = null,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(src ? 'loading' : 'failed');

  useEffect(() => {
    setStatus(src ? 'loading' : 'failed');
    if (!src) return;
    const timer = window.setTimeout(() => setStatus(current => current === 'loading' ? 'failed' : current), 6000);
    return () => window.clearTimeout(timer);
  }, [src]);

  if (!src || status === 'failed') return <>{fallback}</>;
  return <div className={`story-image ${status === 'loading' ? 'story-image-pending ' : ''}${className}`}>
    {/* Open Graph hosts are dynamic; failed or stalled requests disappear cleanly. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')} />
  </div>;
}
