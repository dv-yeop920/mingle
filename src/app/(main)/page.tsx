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

import { SeoIntro } from '@/features/home';

import { SplashOverlay } from '@/widgets/splash-overlay';

import { HomeView } from '@/views/home';

const HomePage = async () => {
  const queryClient = getQueryClient();
  const profile = await fetchProfile();

  queryClient.setQueryData(queryKeys.profile.detail(), profile);
  await queryClient.prefetchQuery({
    queryKey: queryKeys.analyses.list(),
    queryFn: () => fetchAnalyses(),
  });

  const nickname = profile?.nickname ?? null;
  const isMbtiSetupRequired = Boolean(profile && !profile.mbti);

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(WEB_APPLICATION_JSON_LD)}
      </script>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeView
          nickname={nickname}
          isMbtiSetupRequired={isMbtiSetupRequired}
        />
      </HydrationBoundary>
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
