import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_SEO_DESCRIPTION,
  ANALYSIS_SEO_TITLE,
  HOME_OPEN_GRAPH_IMAGE_ALT,
  HOME_OPEN_GRAPH_IMAGE_PATH,
  HOME_SEO_DESCRIPTION,
  HOME_SEO_TITLE,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  WEB_APPLICATION_JSON_LD,
} from './seo';

describe('SEO config', () => {
  it('홈과 분석 허브에 서로 다른 검색 의도를 제공한다', () => {
    expect(HOME_SEO_TITLE).toContain('MBTI 그룹 궁합 테스트');
    expect(HOME_SEO_DESCRIPTION).toContain('그룹 궁합');
    expect(HOME_OPEN_GRAPH_IMAGE_PATH).toBe('/opengraph-image');
    expect(HOME_OPEN_GRAPH_IMAGE_ALT).toContain('MBTI 그룹 궁합');

    expect(ANALYSIS_SEO_TITLE).toContain('MBTI 분석');
    expect(ANALYSIS_SEO_DESCRIPTION).toContain('1:1 MBTI 궁합');

    expect(ANALYSIS_SEO_TITLE).not.toBe(HOME_SEO_TITLE);
    expect(ANALYSIS_SEO_DESCRIPTION).not.toBe(HOME_SEO_DESCRIPTION);
    expect(SEO_KEYWORDS).toContain('MBTI 케미');
    expect(SITE_URL).toBeInstanceOf(URL);
  });

  it('무료 한국어 웹 애플리케이션 구조화 데이터를 제공한다', () => {
    expect(WEB_APPLICATION_JSON_LD).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL.toString(),
      description: HOME_SEO_DESCRIPTION,
      inLanguage: 'ko-KR',
      isAccessibleForFree: true,
      offers: {
        price: '0',
        priceCurrency: 'KRW',
      },
    });
  });
});
