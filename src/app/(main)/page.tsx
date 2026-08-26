import type { Metadata } from 'next';

import {
  SEO_DESCRIPTION,
  SEO_TITLE,
  WEB_APPLICATION_JSON_LD,
} from '@/shared/config/seo';

import { SeoIntro } from '@/features/home';

import { SplashOverlay } from '@/widgets/splash-overlay';

import { HomeView } from '@/views/home';

const HomePage = () => {
  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(WEB_APPLICATION_JSON_LD)}
      </script>
      <HomeView />
      <SeoIntro />
      <SplashOverlay />
    </>
  );
};

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description: SEO_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
};

export default HomePage;
