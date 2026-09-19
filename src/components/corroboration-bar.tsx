import { buildCorroborationLead, distinctCorroborationSources, type CorroborationInput } from '@/lib/corroboration';

export function CorroborationBar({ documents }: { documents: CorroborationInput[] }) {
  const sources = distinctCorroborationSources(documents);
  const label = sources.length + ' independent ' + (sources.length === 1 ? 'source' : 'sources');
  return <section className="corroboration-panel" aria-label="Reporting corroboration">
    <div className="corroboration-heading">
      <span>Reported by {label}</span>
      <span className="data-type">match confidence</span>
    </div>
    <div className="corroboration-bar" aria-hidden="true">
      {sources.map((source, index) => <span
        key={source.domain}
        className={'corroboration-segment segment-' + (index % 4)}
        style={{ flexGrow: Math.max(1, source.confidence) }}
      />)}
    </div>
    <div className="corroboration-legend">
      {sources.map((source, index) => <div key={source.domain}>
        <span className={'source-swatch segment-' + (index % 4)} />
        <span>{source.domain}</span>
        <strong className="data-type">{source.confidence}%</strong>
      </div>)}
    </div>
    <p className="corroboration-lead">{buildCorroborationLead(sources)}</p>
  </section>;
}
