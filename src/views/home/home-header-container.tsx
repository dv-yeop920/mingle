import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchProfile } from '@/entities/user/api/queries';

import { HomeHeader } from './home-header';

const HeaderSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex items-center justify-between px-[24px] pt-[8px]"
  >
    <div className="flex gap-[5px]">
      <div className="h-[28px] w-[72px] animate-pulse rounded-[8px] bg-muted/30" />
      <div className="h-[28px] w-[80px] animate-pulse rounded-[8px] bg-muted/30" />
    </div>
    <div className="h-[44px] w-[44px] animate-pulse rounded-[16px] bg-muted/30" />
  </div>
);

const HomeHeaderDataContainer = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: fetchProfile,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeHeader />
    </HydrationBoundary>
  );
};

const HomeHeaderContainer = async () => {
  const { user } = await getAuthenticatedClient();

  if (!user) {
    const queryClient = getQueryClient();

    queryClient.setQueryData(queryKeys.profile.detail(), null);

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeHeader />
      </HydrationBoundary>
    );
  }

  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <HomeHeaderDataContainer />
    </Suspense>
  );
};

export { HomeHeaderContainer };
