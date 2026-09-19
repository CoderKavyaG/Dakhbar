import { publisherDomain } from './story-evidence';

export type CorroborationInput = {
  url: string;
  sourceName: string;
  publishedAt: Date;
  similarity: number;
};

export type CorroborationSource = {
  domain: string;
  publishedAt: Date;
  confidence: number;
};

export function confidencePercent(similarity: number) {
  return Math.round(Math.min(1, Math.max(0, similarity)) * 100);
}

export function distinctCorroborationSources(documents: CorroborationInput[]) {
  const sources = new Map<string, CorroborationSource>();
  for (const document of documents) {
    const domain = publisherDomain(document.url) || document.sourceName;
    const existing = sources.get(domain);
    const candidate = {
      domain,
      publishedAt: document.publishedAt,
      confidence: confidencePercent(document.similarity),
    };
    if (!existing) {
      sources.set(domain, candidate);
      continue;
    }
    sources.set(domain, {
      domain,
      publishedAt: candidate.publishedAt < existing.publishedAt ? candidate.publishedAt : existing.publishedAt,
      confidence: Math.max(candidate.confidence, existing.confidence),
    });
  }
  return [...sources.values()].sort((left, right) => left.publishedAt.getTime() - right.publishedAt.getTime());
}

function clockTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

function elapsed(from: Date, to: Date) {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours + 'h' + (remainder ? ' ' + remainder + 'm' : '');
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
