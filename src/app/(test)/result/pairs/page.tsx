import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';


import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { PairsView } from '@/views/result';

const PairsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;
  const queryClient = getQueryClient();

  if (id) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.detail(id),
      queryFn: () => fetchAnalysisById(id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PairsView analysisId={id} />
    </HydrationBoundary>
  );
};

export const instant = false;
export const metadata: Metadata = { title: '전체 멤버 케미' };
export default PairsPage;
