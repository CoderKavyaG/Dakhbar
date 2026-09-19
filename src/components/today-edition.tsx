'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { clampRotation, rotationFromPointer } from '@/lib/edition-motion';
import { StoryImage } from '@/components/story-image';
import { Wordmark } from '@/components/wordmark';

type Rotation = { rotateX: number; rotateY: number };
const RESTING: Rotation = { rotateX: -4, rotateY: 6 };

export function TodayEdition({ title, href, external, image, date }: { title: string; href: string; external: boolean; image?: string | null; date: string }) {
  const [rotation, setRotation] = useState<Rotation>(RESTING);
  const [reducedMotion, setReducedMotion] = useState(false);
  const drag = useRef<{ x: number; y: number; rotation: Rotation } | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(query.matches); if (query.matches) setRotation(RESTING); };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    if (drag.current && event.pointerType !== 'mouse') {
      setRotation({
        rotateX: clampRotation(drag.current.rotation.rotateX - (event.clientY - drag.current.y) / 12),
        rotateY: clampRotation(drag.current.rotation.rotateY + (event.clientX - drag.current.x) / 12),
      });
      return;
    }
    if (event.pointerType === 'mouse') {
      const bounds = event.currentTarget.getBoundingClientRect();
      setRotation(rotationFromPointer(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height));
    }
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType === 'mouse') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, rotation };
  }

  function end() { drag.current = null; }

  const style = {
    '--edition-rotate-x': rotation.rotateX + 'deg',
    '--edition-rotate-y': rotation.rotateY + 'deg',
  } as CSSProperties;

  return <div
    className="edition-scene"
    style={style}
    onPointerMove={move}
    onPointerDown={start}
    onPointerUp={end}
    onPointerCancel={end}
    onPointerLeave={(event) => { end(); if (!reducedMotion && event.pointerType === 'mouse') setRotation(RESTING); }}
    aria-label="Interactive miniature of today's edition"
  >
    <div className="edition-stack">
      <span className="edition-sheet edition-sheet-back" aria-hidden="true" />
      <span className="edition-sheet edition-sheet-middle" aria-hidden="true" />
      <a className="edition-sheet edition-sheet-front" href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        <div className="edition-mini-masthead"><Wordmark /><span className="data-type">TODAY</span></div>
        <StoryImage src={image} alt="" className="edition-mini-image" />
        <p className="edition-mini-date data-type">{date}</p>
        <h2>{title}</h2>
        <span className="edition-mini-rule" />
        <span className="edition-mini-copy">Open today’s lead report</span>
      </a>
    </div>
  </div>;
}
