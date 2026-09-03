import type { Metadata } from 'next';

import {
  SEO_DESCRIPTION,
  SEO_TITLE,
  WEB_APPLICATION_JSON_LD,
} from '@/shared/config/seo';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { HomeView } from '@/views/home';

const HomePage = async () => {
  const { user } = await getAuthenticatedClient();

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(WEB_APPLICATION_JSON_LD)}
      </script>

      <HomeView userId={user?.id ?? null} />
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
