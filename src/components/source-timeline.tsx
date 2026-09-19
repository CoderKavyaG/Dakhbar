import { buildCorroborationLead, distinctCorroborationSources, sourceTimelinePoints, type CorroborationInput } from '@/lib/corroboration';

export function SourceTimeline({ documents }: { documents: CorroborationInput[] }) {
  const sources = distinctCorroborationSources(documents);
  const points = sourceTimelinePoints(sources);
  const label = sources.length + ' independent ' + (sources.length === 1 ? 'source' : 'sources');
  return <section className={'source-timeline' + (points.length === 1 ? ' source-timeline-single' : '')} aria-label="Reporting timeline">
    <div className="source-timeline-heading">
      <span>Reported by {label}</span>
      <span className="data-type">reporting sequence</span>
    </div>
    <div className="source-timeline-track" aria-label="Sources positioned by elapsed reporting time">
      {points.length > 1 && <span className="source-timeline-line" aria-hidden="true" />}
      {points.map((point, index) => <div
        className={'source-timeline-point source-timeline-point-' + (index === 0 ? 'first' : index === points.length - 1 ? 'last' : 'middle')}
        key={point.domain}
        style={{ left: points.length === 1 ? '0%' : point.position + '%' }}
      >
        <span className="source-timeline-dot" aria-hidden="true" />
        <strong>{point.domain}</strong>
        <span className="data-type">{point.elapsedLabel}</span>
      </div>)}
    </div>
    <p className="corroboration-lead">{buildCorroborationLead(sources)}</p>
  </section>;
}
