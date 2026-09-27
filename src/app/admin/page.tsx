import Link from 'next/link';
import { AdminRefresh } from '@/components/admin-refresh';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminData } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  const data = await getAdminData();
  return <main className="admin-shell">
    <header className="admin-header">
      <div>
        <h1>Ingestion dashboard</h1>
      </div>
      <nav>
        <Link href="/admin/clusters">Review clusters</Link>
        <Link href="/">Front Page</Link>
      </nav>
    </header>

    <dl className="admin-stats">
      <div><dt>Total documents</dt><dd>{data.total.toLocaleString()}</dd></div>
      <div><dt>Last hour</dt><dd>{data.lastHour.toLocaleString()}</dd></div>
      <div><dt>Last 24 hours</dt><dd>{data.last24Hours.toLocaleString()}</dd></div>
    </dl>

    <section className={`operations-panel ${data.health.alert ? 'operations-alert' : ''}`} aria-label="Ingestion health">
      <div className="operations-panel-header">
        <h2>{data.health.alert ? 'Ingestion needs attention' : 'Ingestion is healthy'}</h2>
        <AdminRefresh/>
      </div>
      {data.health.alert && <p role="alert">{data.health.stale ? 'No successful HN ingestion within 35 minutes. The Front Page may be stale.' : 'The worker is offline or the queue is paused.'}</p>}
      <p>Last successful run: {data.health.lastSuccess ?? 'not recorded yet'}{data.health.elapsedMinutes !== null && ` (${data.health.elapsedMinutes} minutes ago)`}</p>
      <p>Worker: {data.health.workerAlive ? 'online' : 'offline'} · Queue: {data.health.paused ? 'paused' : 'running'} · Connected workers: {data.health.workers}</p>
      <p>{Object.entries(data.health.counts).map(([name,count])=>`${name}: ${count}`).join(' / ')}</p>
      {data.health.error && <p role="alert">{data.health.error}</p>}
    </section>

    <section className={`operations-panel ${data.pulse.alert ? 'operations-alert' : ''}`} aria-label="Developer Pulse snapshot health">
      <h2>{data.pulse.alert ? 'Developer Pulse needs attention' : 'Developer Pulse is healthy'}</h2>
      {data.pulse.alert && <p role="alert">{data.pulse.stale ? 'No successful daily snapshot job was recorded within 27 hours.' : 'The historical backfill has gaps.'}</p>}
      <p>Last successful snapshot: {data.pulse.lastSuccess ?? 'not recorded yet'}{data.pulse.elapsedHours !== null && (` (${data.pulse.elapsedHours.toFixed(1)} hours ago)`)}</p>
      <p>Coverage: {data.pulse.snapshotCount} / {data.pulse.expectedSnapshotCount} expected entity-days · {data.pulse.gaps} gap{data.pulse.gaps === 1 ? '' : 's'}</p>
      <p>History: {data.pulse.historyStart ? (data.pulse.historyStart.toISOString().slice(0,10) + ' through ' + data.pulse.historyThrough.toISOString().slice(0,10)) : 'No published documents to backfill yet'} · Entities covered by last run: {data.pulse.entitiesCovered}</p>
      {data.pulse.error && <p role="alert">{data.pulse.error}</p>}
    </section>

    <section className="operations-panel">
      <h2>Live model catalog</h2>
      <p>Checked at startup and every 15 minutes. Missing models are blocked before generation.</p>
      <div className="admin-model-catalog-list">
        {data.models.map(model => (
          <p key={model.provider+model.model} role={model.available ? undefined : 'alert'} className="admin-catalog-row">
            <strong>{model.provider} / {model.model}</strong> — <span className={model.available ? 'catalog-available' : 'catalog-error'}>{model.available ? 'available' : model.error}</span> <small>Checked {model.checkedAt}</small>
          </p>
        ))}
      </div>
    </section>

    <section className="admin-quota">
      <header className="admin-quota-header">
        <div>
          <span className="data-type">UTC daily usage</span>
          <h2>LLM quota & feature usage</h2>
        </div>
        <time className="data-type" dateTime={data.dayStart.toISOString()}>{data.dayStart.toISOString().slice(0,10)}</time>
      </header>

      <div className="admin-features-grid">
        {data.llmFeatures.map(feat => (
          <article key={feat.feature} className="admin-feature-card">
            <strong>{feat.label}</strong>
            <span className="data-type">{feat.feature}</span>
            <p className="admin-feature-calls"><b>{feat.calls}</b> call{feat.calls === 1 ? '' : 's'} today</p>
            <p className="admin-token-highlight"><b>{feat.totalTokens.toLocaleString()}</b> tokens</p>
            <small>{feat.inputTokens.toLocaleString()} in · {feat.outputTokens.toLocaleString()} out</small>
          </article>
        ))}
      </div>

      <div className="admin-models-list">
        {data.llmQuota.map(row => (
          <article key={`${row.provider}:${row.model}`} className="admin-model-card">
            <div className="admin-model-header">
              <strong>{row.model}</strong>
              <span className="data-type">{row.provider}</span>
            </div>

            <div className="admin-token-row">
              <span><b>{row.totalTokens.toLocaleString()}</b> / {row.tpdLimit ? row.tpdLimit.toLocaleString() : '∞'} tokens</span>
              <span className="admin-pct-tag">({row.tpdPct}% of TPD ceiling)</span>
            </div>

            <div className="admin-meter-wrap">
              <meter min="0" max={row.tpdLimit ?? Math.max(1, row.totalTokens)} value={row.totalTokens} className="admin-meter">
                {row.totalTokens}
              </meter>
            </div>

            <div className="admin-quota-footer">
              <span>Requests: {row.calls} / {row.rpdLimit ?? '∞'} calls ({row.rpdPct}%)</span>
              {row.bindingConstraint === 'tpd' && (
                <span className="admin-binding-tag">Binding limit: Tokens/day (TPD)</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>

    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption>Last 20 ingested documents <span className="data-type">UTC</span></caption>
        <thead>
          <tr>
            <th>Title</th>
            <th>Source</th>
            <th>Ingested at</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map(item => (
            <tr key={item.id}>
              <td><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></td>
              <td>{item.source.name}</td>
              <td><time dateTime={item.ingested_at.toISOString()}>{item.ingested_at.toISOString()}</time></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.items.length && <p>No documents ingested yet.</p>}
    </div>
  </main>;
}
