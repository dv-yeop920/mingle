import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchProfile, fetchUserStats } from '@/entities/user/api/queries';

import { MyPageContainerView } from '@/views/mypage';

const MyPage = async () => {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(),
      queryFn: fetchProfile,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.stats(),
      queryFn: fetchUserStats,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyPageContainerView />
    </HydrationBoundary>
  );
};

export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};

export default MyPage;
