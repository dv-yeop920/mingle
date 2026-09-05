import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';
import { PageSpinner } from '@/shared/ui';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { ResultView } from '@/views/result';

const ResultPageContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id: analysisId } = await searchParams;
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
      <ResultView userId={user?.id ?? null} analysisId={analysisId} />
    </HydrationBoundary>
  );
};

const ResultPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResultPageContent searchParams={searchParams} />
    </Suspense>
  );
};

export const metadata: Metadata = { title: 'MBTI 그룹 케미 결과' };
export default ResultPage;
