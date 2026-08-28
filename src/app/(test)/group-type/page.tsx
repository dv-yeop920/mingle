import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchProfile } from '@/entities/user/api/queries';

import { GroupTypeView } from '@/views/group-type';

export const metadata: Metadata = { title: '그룹 유형 선택' };

const GroupTypePage = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: fetchProfile,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GroupTypeView />
    </HydrationBoundary>
  );
};

export default GroupTypePage;
