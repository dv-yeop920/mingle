const SITE_NAME = 'MINGLE';
const SEO_TITLE = 'MBTI 궁합 테스트 | 친구·가족·팀 케미 분석 MINGLE';
const SEO_DESCRIPTION =
  '친구, 가족, 회사·팀 멤버의 MBTI를 조합하면 AI가 그룹 궁합과 대화 케미, 역할, 분위기, 갈등 포인트를 따뜻하게 분석해 드려요.';
const SEO_KEYWORDS = [
  'MBTI 궁합',
  'MBTI 궁합 테스트',
  'MBTI 케미',
  '그룹 MBTI',
  '친구 궁합',
  '팀 궁합',
  'MBTI 관계 분석',
];
const BRAND_THEME_COLOR = '#3FB273';
const BRAND_BACKGROUND_COLOR = '#F5FAF3';
const BRAND_FOREGROUND_COLOR = '#26382C';
const BRAND_DEEP_COLOR = '#2E7A4E';
const BRAND_SURFACE_COLOR = '#FFFFFF';
const SEO_METADATA_ROUTES = [
  '/manifest.webmanifest',
  '/opengraph-image',
  '/robots.txt',
  '/sitemap.xml',
];

const convertSiteUrl = (value: string | undefined) => {
  if (!value) return new URL('http://localhost:3000');

  const url = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;

  try {
    return new URL(url);
  } catch {
    return new URL('http://localhost:3000');
  }
};

const SITE_URL = convertSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
);

const WEB_APPLICATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  alternateName: 'MINGLE MBTI 케미 테스트',
  url: SITE_URL.toString(),
  description: SEO_DESCRIPTION,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
};

export {
  BRAND_BACKGROUND_COLOR,
  BRAND_DEEP_COLOR,
  BRAND_FOREGROUND_COLOR,
  BRAND_SURFACE_COLOR,
  BRAND_THEME_COLOR,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_METADATA_ROUTES,
  SEO_TITLE,
  SITE_NAME,
  SITE_URL,
  WEB_APPLICATION_JSON_LD,
};
