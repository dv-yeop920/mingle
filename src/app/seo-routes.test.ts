import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_SEO_DESCRIPTION,
  ANALYSIS_SEO_TITLE,
  SEO_METADATA_ROUTES,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/seo';

import { metadata as characterMatchMetadata } from './(main)/analysis/character-match/page';
import { metadata as mbtiProfileMetadata } from './(main)/analysis/mbti-profile/page';
import { metadata as analysisMetadata } from './(main)/analysis/page';
import { metadata as testLayoutMetadata } from './(test)/layout';
import manifest from './manifest';
import robots from './robots';
import sitemap from './sitemap';

describe('SEO metadata routes', () => {
  it('프록시 공개 allowlist에 SEO metadata 경로를 제공한다', () => {
    expect(SEO_METADATA_ROUTES).toEqual([
      '/manifest.webmanifest',
      '/opengraph-image',
      '/robots.txt',
      '/sitemap.xml',
    ]);
  });

  it('분석 허브에 canonical과 완전한 공유 metadata를 제공한다', () => {
    expect(analysisMetadata).toEqual({
      title: { absolute: ANALYSIS_SEO_TITLE },
      description: ANALYSIS_SEO_DESCRIPTION,
      alternates: {
        canonical: '/analysis',
      },
      openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: '/analysis',
        siteName: SITE_NAME,
        title: ANALYSIS_SEO_TITLE,
        description: ANALYSIS_SEO_DESCRIPTION,
      },
      twitter: {
        card: 'summary_large_image',
        title: ANALYSIS_SEO_TITLE,
        description: ANALYSIS_SEO_DESCRIPTION,
      },
    });
  });

  it.each([
    ['MBTI 성격 분석', mbtiProfileMetadata],
    ['캐릭터 매칭', characterMatchMetadata],
    ['테스트 흐름', testLayoutMetadata],
  ])('%s 경로는 색인과 링크 추적을 허용하지 않는다', (_name, metadata) => {
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('공개 홈은 허용하고 개인·API 경로는 크롤링에서 제외한다', () => {
    const metadata = robots();
    const rule = Array.isArray(metadata.rules)
      ? metadata.rules[0]
      : metadata.rules;
    const disallowedPaths = Array.isArray(rule.disallow)
      ? rule.disallow
      : rule.disallow
        ? [rule.disallow]
        : [];

    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    expect(disallowedPaths).toEqual(['/api/', '/history', '/mypage']);
    expect(
      disallowedPaths.some(
        (path) => path === '/analysis' || path.startsWith('/analysis/'),
      ),
    ).toBe(false);
    expect(metadata.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('사이트맵에는 홈과 분석 허브 canonical URL만 포함한다', () => {
    const entries = sitemap();

    expect(entries.map(({ url }) => new URL(url).pathname)).toEqual([
      '/',
      '/analysis',
    ]);
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map(({ url }) => url)).size).toBe(2);
    expect(entries).toEqual([
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
    ]);
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
