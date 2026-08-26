import { describe, expect, it } from 'vitest';

import {
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_NAME,
  SITE_URL,
  WEB_APPLICATION_JSON_LD,
} from './seo';

describe('SEO config', () => {
  it('핵심 검색 의도와 유효한 사이트 URL을 제공한다', () => {
    expect(SEO_TITLE).toContain('MBTI 궁합 테스트');
    expect(SEO_DESCRIPTION).toContain('그룹 궁합');
    expect(SEO_KEYWORDS).toContain('MBTI 케미');
    expect(SITE_URL).toBeInstanceOf(URL);
  });

  it('무료 한국어 웹 애플리케이션 구조화 데이터를 제공한다', () => {
    expect(WEB_APPLICATION_JSON_LD).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      inLanguage: 'ko-KR',
      isAccessibleForFree: true,
      offers: {
        price: '0',
        priceCurrency: 'KRW',
      },
    });
  });
});
