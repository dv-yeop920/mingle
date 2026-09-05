import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';
import { PageSpinner } from '@/shared/ui';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { PairDetailView } from '@/views/result';

const PairDetailPageContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; pair?: string }>;
}) => {
  const { id: analysisId, pair } = await searchParams;
  const pairIndex = pair ? Number(pair) : undefined;
  const { user } = await getAuthenticatedClient();
  const queryClient = getQueryClient();

  if (analysisId) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.detail(user?.id ?? null, analysisId),
      queryFn: () => fetchAnalysisById(analysisId),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PairDetailView
        userId={user?.id ?? null}
        analysisId={analysisId}
        pairIndex={pairIndex}
      />
    </HydrationBoundary>
  );
};

const PairDetailPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; pair?: string }>;
}) => {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PairDetailPageContent searchParams={searchParams} />
    </Suspense>
  );
};

export const metadata: Metadata = { title: '둘 사이의 케미' };
export default PairDetailPage;
