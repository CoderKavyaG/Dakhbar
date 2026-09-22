'use client';
import { Children, useEffect, useRef, type ReactNode } from 'react';

/** Measure natural card heights so the next article fills the available row space. */
export function ArticleGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const update = () => {
      grid.dataset.packed = "true";
      const style = getComputedStyle(grid);
      const row = parseFloat(style.gridAutoRows);
      const gap = parseFloat(style.rowGap);
      for (const cell of Array.from(grid.children) as HTMLElement[]) {
        const card = cell.firstElementChild as HTMLElement | null;
        if (card && row > 0) cell.style.gridRowEnd = `span ${Math.ceil((card.getBoundingClientRect().height + gap) / (row + gap))}`;
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    for (const cell of Array.from(grid.children)) if (cell.firstElementChild) observer.observe(cell.firstElementChild);
    void document.fonts.ready.then(update);
    update();
    return () => observer.disconnect();
  }, [children]);
  return <div ref={ref} className={`article-grid ${className}`}>{Children.map(children, child => child && <div className="article-cell">{child}</div>)}</div>;
}
