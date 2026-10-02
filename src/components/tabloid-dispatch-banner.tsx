import React from 'react';
import Link from 'next/link';

interface TabloidDispatchBannerProps {
  label: string;
  subtext?: string;
  tag?: string;
  href?: string;
  className?: string;
}

export function TabloidDispatchBanner({
  label,
  subtext,
  tag,
  href,
  className = '',
}: TabloidDispatchBannerProps) {
  const content = (
    <div className={`tabloid-dispatch-banner-wrap ${className}`}>
      <div className="tabloid-dispatch-sticker">
        <span className="sticker-label">{label}</span>
      </div>
      {subtext && <span className="tabloid-dispatch-subtext">{subtext}</span>}
      {tag && <span className="tabloid-dispatch-tag">{tag}</span>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="tabloid-dispatch-banner-link">
        {content}
      </Link>
    );
  }

  return content;
}
