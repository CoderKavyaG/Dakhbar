'use client';

import { useState } from 'react';

export function StoryImage({ src, alt, className = '' }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <div className={'story-image ' + className}>
    {/* Open Graph hosts are dynamic; errors remove the image rather than exposing a broken placeholder. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  </div>;
}
