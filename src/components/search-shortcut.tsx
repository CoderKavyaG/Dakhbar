'use client';

import { useEffect } from 'react';

export function SearchShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>('#q');
        if (input) input.focus();
        else window.location.assign('/search');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return <span className="search-hint" aria-hidden="true">⌘K</span>;
}
