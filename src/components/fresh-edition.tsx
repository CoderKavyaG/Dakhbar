'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TabloidZap } from './pop-tabloid-icons';

export function FreshEdition() {
  const router = useRouter();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let baseline: string | null = null;
    let alive = true;
    const check = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch('/api/edition-status');
        if (!response.ok) return;
        const data = await response.json();
        if (baseline && data.latest !== baseline && alive) setAvailable(true);
        baseline = data.latest;
      } catch {}
    };
    void check();
    const timer = setInterval(check, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="fresh-edition-banner-wrap">
      <button
        type="button"
        className="fresh-edition-btn tabloid-dispatch-sticker"
        onClick={() => {
          setAvailable(false);
          router.refresh();
        }}
      >
        <TabloidZap size={14} className="inline-icon" />
        <span className="sticker-label">FRESH REPORTING HAS ARRIVED • UPDATE YOUR EDITION ↗</span>
      </button>
    </div>
  );
}
