import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';
import { PageSpinner } from '@/shared/ui';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { RoleDetailView } from '@/views/result';

const RoleDetailPageContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; role?: string }>;
}) => {
  const { id: analysisId, role } = await searchParams;
  const roleIndex = role ? Number(role) : undefined;
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
      <RoleDetailView
        userId={user?.id ?? null}
        analysisId={analysisId}
        roleIndex={roleIndex}
      />
    </HydrationBoundary>
  );
};

const RoleDetailPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; role?: string }>;
}) => {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RoleDetailPageContent searchParams={searchParams} />
    </Suspense>
  );
};

export const metadata: Metadata = { title: '멤버 역할 분석' };
export default RoleDetailPage;
