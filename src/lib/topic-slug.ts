export function topicSlug(name: string) {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function topicPath(entity: { name: string }) {
  const slug = topicSlug(entity.name);
  return '/topics/' + encodeURIComponent(slug || entity.name.toLowerCase());
}
