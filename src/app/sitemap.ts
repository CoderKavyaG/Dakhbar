import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { topicSlug } from '@/lib/topic-slug';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://dakhbar.com';

  // 1. Core Editorial Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/why-this-isnt-ai-slop`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/topics`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/partner`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // 2. Dynamic Stories (recent active coverage)
  const stories = await db.story.findMany({
    where: { status: 'active' },
    orderBy: { updated_at: 'desc' },
    take: 120,
    select: { id: true, updated_at: true },
  });

  const storyRoutes: MetadataRoute.Sitemap = stories.map(story => ({
    url: `${baseUrl}/stories/${story.id}`,
    lastModified: story.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 3. Dynamic Topic Pages
  const entities = await db.entity.findMany({
    where: { stories: { some: {} } },
    select: { name: true },
    orderBy: { name: 'asc' },
    take: 150,
  });

  const topicRoutes: MetadataRoute.Sitemap = entities.map(entity => ({
    url: `${baseUrl}/topics/${topicSlug(entity.name)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticRoutes, ...storyRoutes, ...topicRoutes];
}
