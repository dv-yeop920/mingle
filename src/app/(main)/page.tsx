import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { queryKeys } from '@/shared/config/query-keys';
import {
  SEO_DESCRIPTION,
  SEO_TITLE,
  WEB_APPLICATION_JSON_LD,
} from '@/shared/config/seo';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchAnalyses } from '@/entities/analysis/api/queries';
import { fetchProfile } from '@/entities/user/api/queries';

import { HomeView } from '@/views/home';

const HomePage = async () => {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(),
      queryFn: fetchProfile,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.list(),
      queryFn: () => fetchAnalyses(),
    }),
  ]);

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(WEB_APPLICATION_JSON_LD)}
      </script>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeView />
      </HydrationBoundary>
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
