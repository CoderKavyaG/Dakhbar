'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { editionGreeting } from '@/lib/edition-greeting';
import { BrandMark } from './brand-mark';

export function EditionWelcome() {
  const [greeting, setGreeting] = useState({
    title: 'A fresh perspective, whenever you arrive.',
    body: 'Your developer newspaper. A few minutes, a little more context.',
    drink: 'coffee',
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('dakhbar_welcome_dismissed') === 'true') {
      setDismissed(true);
    }
    const update = () => setGreeting(editionGreeting(new Date().getHours()));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dakhbar_welcome_dismissed', 'true');
    }
  };

  return (
    <section className={'edition-welcome welcome-' + greeting.drink} aria-label="Welcome to your edition">
      <div className="coffee-scene" aria-hidden="true">
        <span className="coffee-steam" />
        <span className="coffee-stream" />
        <span className="coffee-cup"><i /></span>
        <span className="coffee-saucer" />
      </div>
      <div className="welcome-text-content">
        <h2>{greeting.title}</h2>
        <p>{greeting.body}</p>
      </div>
      <div className="reporter-delivery" aria-hidden="true">
        <BrandMark size={56} />
      </div>
      <button
        type="button"
        className="welcome-dismiss-btn"
        onClick={handleDismiss}
        aria-label="Dismiss greeting"
      >
        <X size={15} />
      </button>
    </section>
  );
}
