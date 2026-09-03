import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchAnalyses } from '@/entities/analysis/api/queries';

import { SplashOverlay } from '@/widgets/splash-overlay';

import { HistoryView } from '@/views/history';

const HistoryPage = async () => {
  const { user } = await getAuthenticatedClient();
  if (!user) redirect('/login');

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.analyses.list(user.id),
    queryFn: () => fetchAnalyses(),
  });

  return (
    <Suspense fallback={<SplashOverlay />}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HistoryView userId={user.id} />
      </HydrationBoundary>
    </Suspense>
  );
};

export const metadata: Metadata = {
  title: '테스트 기록',
  robots: { index: false, follow: false },
};

export default HistoryPage;
