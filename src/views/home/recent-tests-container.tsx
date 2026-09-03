import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchAnalyses } from '@/entities/analysis/api/queries';

import { RecentTestsSection } from './recent-tests-section';

const RecentTestsSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col">
    <div className="px-[24px] pt-[26px] pb-[10px]">
      <div className="h-[20px] w-[80px] animate-pulse rounded-[6px] bg-muted/30" />
    </div>
    <div className="flex flex-col gap-[11px] px-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-[80px] animate-pulse rounded-[16px] bg-muted/30"
        />
      ))}
    </div>
  </div>
);

const RecentTestsDataContainer = async () => {
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

const RecentTestsContainer = async () => {
  const { user } = await getAuthenticatedClient();

  if (!user) {
    return null;
  }

  return (
    <Suspense fallback={<RecentTestsSkeleton />}>
      <RecentTestsDataContainer />
    </Suspense>
  );
};

export { RecentTestsContainer };
