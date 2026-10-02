import React from 'react';

// ============================================================================
// DIRECTION A: Pop Tabloid Symbols (Thick, sticker-cut, punchy, hard drop-shadow)
// ============================================================================

export function TabloidTrendUp({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 18L14 8M14 8H7M14 8V15" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function TabloidTrendDown({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 6L14 16M14 16H7M14 16V9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function TabloidConfirmed({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" stroke="#000" strokeWidth="2.5" />
      <path d="M6 12L10 16L18 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="square" />
    </svg>
  );
}

export function TabloidUnclear({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M12 7V12M12 16V17" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

export function TabloidSource({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="3" />
      <path d="M4 10H20M10 4V20" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function TabloidFollow({ active = false, size = 14 }: { active?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {active ? (
        <path d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
      ) : (
        <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
      )}
    </svg>
  );
}

// ============================================================================
// DIRECTION B: Data as Editorial Illustration (Hairline, subway nodes, coordinates)
// ============================================================================

export function MetroTrendUp({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <line x1="3" y1="17" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="12,4 20,4 20,12" fill="currentColor" />
      <circle cx="4" cy="17" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function MetroTrendDown({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <line x1="3" y1="7" x2="16" y2="20" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="20,12 20,20 12,20" fill="currentColor" />
      <circle cx="4" cy="7" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function MetroConfirmed({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    </svg>
  );
}

export function MetroUnclear({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="15.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function MetroSource({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.25" />
      <line x1="15" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.25" />
      <line x1="12" y1="2" x2="12" y2="9" stroke="currentColor" strokeWidth="1.25" />
      <line x1="12" y1="15" x2="12" y2="22" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function MetroFollow({ active = false, size = 14 }: { active?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {active ? (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.25" />
          <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.25" />
          <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.25" />
          <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.25" />
        </>
      )}
    </svg>
  );
}

// ============================================================================
// DIRECTION C: Wire Dispatch / Typewriter (Dot-matrix, teletype, monospace)
// ============================================================================

export function WireTrendUp({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center font-mono font-bold ${className}`} style={{ fontSize: size }}>
      ▲
    </span>
  );
}

export function WireTrendDown({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center font-mono font-bold ${className}`} style={{ fontSize: size }}>
      ▼
    </span>
  );
}

export function WireConfirmed({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-mono font-bold text-xs ${className}`}>
      [VERIFIED]
    </span>
  );
}

export function WireUnclear({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-mono text-xs ${className}`}>
      [UNCERTAIN]
    </span>
  );
}

export function WireSource({ domain }: { domain: string }) {
  return (
    <span className="font-mono text-xs tracking-wider">
      // SRC: {domain} //
    </span>
  );
}

export function WireFollow({ active = false }: { active?: boolean }) {
  return (
    <span className="font-mono text-xs font-semibold">
      {active ? '[TRACKING]' : '[+ TRACK]'}
    </span>
  );
}
