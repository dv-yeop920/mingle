import type { Metadata } from 'next';

import {
  HOME_OPEN_GRAPH_IMAGE_ALT,
  HOME_OPEN_GRAPH_IMAGE_PATH,
  HOME_SEO_DESCRIPTION,
  HOME_SEO_TITLE,
  SITE_NAME,
  WEB_APPLICATION_JSON_LD,
} from '@/shared/config/seo';

import { HomeView } from '@/views/home';

export const metadata: Metadata = {
  title: { absolute: HOME_SEO_TITLE },
  description: HOME_SEO_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: SITE_NAME,
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    images: [
      {
        url: HOME_OPEN_GRAPH_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: HOME_OPEN_GRAPH_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    images: [
      {
        url: HOME_OPEN_GRAPH_IMAGE_PATH,
        alt: HOME_OPEN_GRAPH_IMAGE_ALT,
      },
    ],
  },
};

const HomePage = () => {
  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(WEB_APPLICATION_JSON_LD)}
      </script>

      <HomeView />
    </>
  );
};

export default HomePage;
