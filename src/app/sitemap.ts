import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { topicSlug } from '@/lib/topic-slug';
import { CATEGORIES } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://dakhbar.com';

  // 1. Core Editorial & Information Routes
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
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/partner`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // 2. Category Hub Routes
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map(category => ({
    url: `${baseUrl}/category/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  // 3. Dynamic Stories (all active coverage across full corpus)
  const stories = await db.story.findMany({
    where: { status: 'active' },
    orderBy: { updated_at: 'desc' },
    select: { id: true, updated_at: true },
  });

  const storyRoutes: MetadataRoute.Sitemap = stories.map(story => ({
    url: `${baseUrl}/stories/${story.id}`,
    lastModified: story.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 4. Dynamic Topic Pages (all entities with active story coverage)
  const entities = await db.entity.findMany({
    where: { stories: { some: {} } },
    select: { name: true },
    orderBy: { name: 'asc' },
  });

  const topicRoutes: MetadataRoute.Sitemap = entities.map(entity => ({
    url: `${baseUrl}/topics/${topicSlug(entity.name)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  return [...staticRoutes, ...categoryRoutes, ...storyRoutes, ...topicRoutes];
}
