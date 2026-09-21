import Image from 'next/image';

export function BrandMark({
  size = 48,
  className = '',
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return <Image
    src="/brand/dakhbar-reporter.png"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    sizes={size + 'px'}
    className={`brand-mark ${className}`}
    priority={priority}
  />;
}
