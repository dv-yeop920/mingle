import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchAnalyses } from '@/entities/analysis/api/queries';

import { RecentTestsSection } from './recent-tests-section';

const RecentTestsContainer = async () => {
  const { user } = await getAuthenticatedClient();

  if (!user) {
    return null;
  }

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.analyses.list(),
    queryFn: () => fetchAnalyses(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecentTestsSection />
    </HydrationBoundary>
  );
};

export { RecentTestsContainer };
