'use client';

import { useEffect, useRef, useState } from 'react';

const steps = [
  { title: 'What reaches the Front Page', body: 'A story must name at least one known developer technology, company, product, or project. Stories without a matched entity remain searchable in the archive but are not promoted or labeled as developer news.' },
  { title: 'How stories are grouped', body: 'Literal entity overlap remains the hard gate. Deterministic semantic similarity groups close reports, while a narrow title-overlap check catches near-identical headlines just below the primary merge threshold. Ambiguous matches remain separate for administrator review.' },
  { title: 'How stories are ordered', body: 'Recent reporting, corroboration from independent linked domains, and the number of source documents determine ordering. The Front Page selects a small edition from the larger searchable archive.' },
  { title: 'What is not generated', body: 'This phase does not use an LLM to write summaries or claims. Self-post excerpts and Open Graph descriptions come directly from source material; link posts fall back to their linked domain.' },
];

export function MethodologyTimeline() {
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [reducedMotion, setReducedMotion] = useState(false);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      setReducedMotion(query.matches);
      if (query.matches) setVisible(new Set(steps.map((_, index) => index)));
    };
    updateMotion();
    query.addEventListener('change', updateMotion);
    if (query.matches) return () => query.removeEventListener('change', updateMotion);
    const observer = new IntersectionObserver(entries => {
      setVisible(current => {
        const next = new Set(current);
        for (const entry of entries) if (entry.isIntersecting) next.add(Number((entry.target as HTMLElement).dataset.step));
        return next;
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -12% 0px' });
    for (const element of refs.current) if (element) observer.observe(element);
    return () => { observer.disconnect(); query.removeEventListener('change', updateMotion); };
  }, []);

  return <div className={'methodology-timeline' + (reducedMotion ? ' methodology-timeline-static' : '')}>
    {steps.map((step, index) => <section
      className={'methodology-step' + (visible.has(index) ? ' methodology-step-visible' : '')}
      data-step={index}
      key={step.title}
      ref={element => { refs.current[index] = element; }}
    >
      <span className="methodology-dot" aria-hidden="true" />
      <p className="methodology-step-index data-type">0{index + 1}</p>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
    </section>)}
  </div>;
}
