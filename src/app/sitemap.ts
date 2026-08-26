import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/shared/config/seo';

const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: new URL('/', SITE_URL).toString(),
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
  },
];

export default sitemap;
