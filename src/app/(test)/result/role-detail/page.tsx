import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { queryKeys } from '@/shared/config/query-keys';
import { getQueryClient } from '@/shared/lib/react-query/get-query-client';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { fetchAnalysisById } from '@/entities/analysis/api/queries';

import { RoleDetailView } from '@/views/result';

const RoleDetailPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; role?: string }>;
}) => {
  const { id, role } = await searchParams;
  const { user } = await getAuthenticatedClient();
  const queryClient = getQueryClient();

  if (id) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.detail(user?.id ?? null, id),
      queryFn: () => fetchAnalysisById(id),
    });
  }

  const roleIndex = role ? Number(role) : undefined;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RoleDetailView
        userId={user?.id ?? null}
        analysisId={id}
        roleIndex={roleIndex}
      />
    </HydrationBoundary>
  );
};

export const instant = false;
export const metadata: Metadata = { title: '멤버 역할 분석' };
export default RoleDetailPage;
