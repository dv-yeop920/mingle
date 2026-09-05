import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';
import { PageSpinner } from '@/shared/ui';

import { fetchProfile } from '@/entities/user/api/queries';

import { GroupTypeView } from '@/views/group-type';

export const metadata: Metadata = { title: '그룹 유형 선택' };

const GroupTypePageContent = async () => {
  const { user } = await getAuthenticatedClient();
  const queryClient = getQueryClient();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(user.id),
      queryFn: fetchProfile,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GroupTypeView userId={user?.id ?? null} />
    </HydrationBoundary>
  );
};

const GroupTypePage = () => {
  return (
    <Suspense fallback={<PageSpinner />}>
      <GroupTypePageContent />
    </Suspense>
  );
};

export default GroupTypePage;
