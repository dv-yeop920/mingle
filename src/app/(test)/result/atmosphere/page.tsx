import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { AtmosphereView } from '@/views/result';

const AtmospherePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;
  const { user } = await getAuthenticatedClient();
  const queryClient = getQueryClient();

  if (id) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.detail(user?.id ?? null, id),
      queryFn: () => fetchAnalysisById(id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AtmosphereView userId={user?.id ?? null} analysisId={id} />
    </HydrationBoundary>
  );
};

export const instant = false;
export const metadata: Metadata = { title: '그룹 분위기 분석' };
export default AtmospherePage;
