import { publisherDomain } from './story-evidence';

export type CorroborationInput = {
  url: string;
  sourceName: string;
  publishedAt: Date;
};

export type CorroborationSource = {
  domain: string;
  publishedAt: Date;
};

export type TimelinePoint = CorroborationSource & {
  position: number;
  elapsedLabel: string;
};

export function distinctCorroborationSources(documents: CorroborationInput[]) {
  const sources = new Map<string, CorroborationSource>();
  for (const document of documents) {
    const domain = publisherDomain(document.url) || document.sourceName;
    const existing = sources.get(domain);
    if (!existing || document.publishedAt < existing.publishedAt) sources.set(domain, { domain, publishedAt: document.publishedAt });
  }
  return [...sources.values()].sort((left, right) => left.publishedAt.getTime() - right.publishedAt.getTime());
}

function clockTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
}

function elapsed(from: Date, to: Date) {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours + 'h' + (remainder ? ' ' + remainder + 'm' : '');
}

export function sourceTimelinePoints(sources: CorroborationSource[]): TimelinePoint[] {
  const ordered = [...sources].sort((left, right) => left.publishedAt.getTime() - right.publishedAt.getTime());
  if (!ordered.length) return [];
  const first = ordered[0].publishedAt.getTime();
  const span = ordered[ordered.length - 1].publishedAt.getTime() - first;
  return ordered.map((source, index) => ({
    ...source,
    position: span > 0 ? ((source.publishedAt.getTime() - first) / span) * 100 : 0,
    elapsedLabel: index === 0 ? 'first report' : elapsed(ordered[0].publishedAt, source.publishedAt) + ' later',
  }));
}

export function buildCorroborationLead(sources: CorroborationSource[], timeZone = 'Asia/Kolkata') {
  const ordered = [...sources].sort((left, right) => left.publishedAt.getTime() - right.publishedAt.getTime());
  const first = ordered[0];
  if (!first) return 'No source reporting is available yet.';
  if (ordered.length === 1) return 'Reported by ' + first.domain + ' at ' + clockTime(first.publishedAt, timeZone) + '.';
  const second = ordered[1];
  const sentence = 'First reported by ' + first.domain + ' at ' + clockTime(first.publishedAt, timeZone) +
    '; confirmed by ' + second.domain + ' ' + elapsed(first.publishedAt, second.publishedAt) + ' later';
  if (ordered.length === 2) return sentence + '.';
  const additional = ordered.length - 2;
  return sentence + ', with ' + additional + ' additional source' + (additional === 1 ? '' : 's') + ' reporting afterward.';
}
