import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchProfile, fetchUserStats } from '@/entities/user/api/queries';

import { MyPageContainerView } from '@/views/mypage';

const MyPage = async () => {
  const { user } = await getAuthenticatedClient();
  if (!user) redirect('/login');

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(user.id),
      queryFn: fetchProfile,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.stats(user.id),
      queryFn: fetchUserStats,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyPageContainerView userId={user.id} />
    </HydrationBoundary>
  );
};

export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};

export default MyPage;
