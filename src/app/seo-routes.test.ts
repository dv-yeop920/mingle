import { describe, expect, it } from 'vitest';

import { SEO_METADATA_ROUTES } from '@/shared/config/seo';

import manifest from './manifest';
import robots from './robots';
import sitemap from './sitemap';

describe('SEO metadata routes', () => {
  it('검색봇이 인증 없이 메타데이터 라우트에 접근할 수 있다', () => {
    expect(SEO_METADATA_ROUTES).toEqual([
      '/manifest.webmanifest',
      '/opengraph-image',
      '/robots.txt',
      '/sitemap.xml',
    ]);
  });

  it('공개 홈은 허용하고 개인·API 경로는 크롤링에서 제외한다', () => {
    const metadata = robots();
    const rule = Array.isArray(metadata.rules)
      ? metadata.rules[0]
      : metadata.rules;

    expect(rule).toMatchObject({
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/history', '/mypage'],
    });
    expect(metadata.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('사이트맵에는 색인 가능한 대표 홈만 포함한다', () => {
    const entries = sitemap();

    expect(entries).toHaveLength(1);
    expect(new URL(entries[0].url).pathname).toBe('/');
    expect(entries[0]).toMatchObject({
      changeFrequency: 'monthly',
      priority: 1,
    });
  });

  it('한국어 모바일 웹앱 manifest를 제공한다', () => {
    expect(manifest()).toMatchObject({
      short_name: 'MIXTI',
      start_url: '/',
      display: 'standalone',
      lang: 'ko-KR',
    });
  });
});
