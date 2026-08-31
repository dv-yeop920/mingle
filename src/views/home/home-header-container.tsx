import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchProfile } from '@/entities/user/api/queries';

import { HomeHeader } from './home-header';

const HomeHeaderContainer = async () => {
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

export { HomeHeaderContainer };
