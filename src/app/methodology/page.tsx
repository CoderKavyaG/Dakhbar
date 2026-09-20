import { MethodologyTimeline } from '@/components/methodology-timeline';

export default function MethodologyPage() {
  return <main className="paper-shell methodology-page">
    <article className="methodology-copy">
      <div className="methodology-intro">
        <h1>How stories earn a place.</h1>
        <p>Dअख़बार ingests source documents through official APIs and keeps a link to the original evidence.</p>
      </div>
      <MethodologyTimeline />
    </article>
  </main>;
}
