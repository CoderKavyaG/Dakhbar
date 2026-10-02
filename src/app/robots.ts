import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://dakhbar.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/stories/',
          '/topics/',
          '/category/',
          '/methodology',
          '/why-this-isnt-ai-slop',
          '/pricing',
          '/partner',
          '/legal',
          '/terms',
          '/privacy',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/saved',
          '/for-you',
          '/brief',
          '/?tab=following',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
