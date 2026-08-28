import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';


import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { PairDetailView } from '@/views/result';

const PairDetailPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; pair?: string }>;
}) => {
  const { id, pair } = await searchParams;
  const queryClient = getQueryClient();

  if (id) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.detail(id),
      queryFn: () => fetchAnalysisById(id),
    });
  }

  const pairIndex = pair ? Number(pair) : undefined;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PairDetailView analysisId={id} pairIndex={pairIndex} />
    </HydrationBoundary>
  );
};

export const instant = false;
export const metadata: Metadata = { title: '둘 사이의 케미' };
export default PairDetailPage;
