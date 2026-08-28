import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';


import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { ResultView } from '@/views/result';

const ResultPage = async ({
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
      <ResultView analysisId={id} />
    </HydrationBoundary>
  );
};

export const instant = false;
export const metadata: Metadata = { title: 'MBTI 그룹 케미 결과' };
export default ResultPage;
