import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/shared/config/seo';

const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: new URL('/', SITE_URL).toString(),
    changeFrequency: 'monthly',
    priority: 1,
  },
  {
    url: new URL('/analysis', SITE_URL).toString(),
    changeFrequency: 'monthly',
    priority: 0.8,
  },
];

export default sitemap;
