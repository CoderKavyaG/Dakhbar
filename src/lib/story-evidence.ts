export type EvidenceDocument = {
  url: string;
  content: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
};

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

export function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      return ENTITY_MAP[lower] ?? ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateAtWord(value: string, limit = 120) {
  const text = cleanText(value);
  if (text.length <= limit) return text;
  const candidate = text.slice(0, limit + 1);
  const boundary = candidate.lastIndexOf(' ');
  return candidate.slice(0, boundary >= Math.floor(limit * 0.65) ? boundary : limit).trimEnd() + '…';
}

export function publisherDomain(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function storyDek(document: EvidenceDocument, limit = 240) {
  const openGraph = document.og_description ? truncateAtWord(document.og_description, limit) : '';
  if (openGraph) return { kind: 'excerpt' as const, text: openGraph };
  const content = document.content ? truncateAtWord(document.content, limit) : '';
  if (content) return { kind: 'excerpt' as const, text: content };
  const domain = publisherDomain(document.url);
  return { kind: 'domain' as const, text: domain || 'source link' };
}

export function countIndependentSources(documents: EvidenceDocument[]) {
  return new Set(documents.map(document => publisherDomain(document.url)).filter(Boolean)).size;
}

export function storyDestination(storyId: string, documents: EvidenceDocument[]) {
  const sourceCount = countIndependentSources(documents);
  const original = documents[0]?.url;
  return sourceCount < 2 && original
    ? { href: original, external: true as const }
    : { href: '/stories/' + storyId, external: false as const };
}
