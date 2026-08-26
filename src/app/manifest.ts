import type { MetadataRoute } from 'next';

import {
  BRAND_BACKGROUND_COLOR,
  BRAND_THEME_COLOR,
  SEO_DESCRIPTION,
  SITE_NAME,
} from '@/shared/config/seo';

const manifest = (): MetadataRoute.Manifest => ({
  name: `${SITE_NAME} - MBTI 그룹 케미 테스트`,
  short_name: SITE_NAME,
  description: SEO_DESCRIPTION,
  start_url: '/',
  display: 'standalone',
  background_color: BRAND_BACKGROUND_COLOR,
  theme_color: BRAND_THEME_COLOR,
  lang: 'ko-KR',
  categories: ['lifestyle', 'social'],
  icons: [
    {
      src: '/favicon.ico',
      sizes: 'any',
      type: 'image/x-icon',
    },
  ],
});

export default manifest;
