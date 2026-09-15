import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/shared/config/seo';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/api/', '/history', '/mypage'],
  },
  sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  host: SITE_URL.origin,
});

export default robots;
