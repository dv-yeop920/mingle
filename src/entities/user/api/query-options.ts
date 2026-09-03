'use client';

import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

type UserStats = {
  totalTests: number;
  totalGroups: number;
  averageChemistry: number;
};

const profileQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: queryKeys.profile.detail(userId),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .abortSignal(signal)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });

const userStatsQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: queryKeys.profile.stats(userId),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== userId) return null;

      const [analysesResult, groupsResult] = await Promise.all([
        supabase
          .from('analyses')
          .select('chemistry_score')
          .eq('user_id', user.id)
          .abortSignal(signal),
        supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .abortSignal(signal),
      ]);

      const analyses = analysesResult.data ?? [];
      const totalTests = analyses.length;
      const totalGroups = groupsResult.count ?? 0;
      const averageChemistry =
        totalTests > 0
          ? Math.round(
              analyses.reduce((sum, a) => sum + a.chemistry_score, 0) /
                totalTests,
            )
          : 0;

      const stats: UserStats = { totalTests, totalGroups, averageChemistry };
      return stats;
    },
    enabled: Boolean(userId),
  });

export { profileQueryOptions, userStatsQueryOptions, type UserStats };
