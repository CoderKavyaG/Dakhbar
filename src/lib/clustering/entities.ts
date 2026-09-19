export type EntityDictionaryEntry = { id: string; name: string; aliases: string[] };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasPattern(alias: string) {
  const escaped = escapeRegExp(alias.trim()).replace(/\s+/g, '\\s+');
  return new RegExp('(?<![\\p{L}\\p{N}_])' + escaped + '(?![\\p{L}\\p{N}_])', 'iu');
}

export function extractEntityIds(
  title: string,
  content: string | null,
  entities: EntityDictionaryEntry[],
): string[] {
  const text = title + '\n' + (content ?? '');
  return entities
    .filter(entity => (entity.name === 'Go' ? entity.aliases : [entity.name, ...entity.aliases])
      .some(alias => alias.trim() && aliasPattern(alias).test(text)))
    .map(entity => entity.id);
}
