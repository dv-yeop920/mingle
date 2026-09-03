'use client';

import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const analysesQueryOptions = (userId: string | null, groupType?: string) =>
  queryOptions({
    queryKey: queryKeys.analyses.list(userId, groupType),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== userId) return [];

      let query = supabase
        .from('analyses')
        .select(
          '*, groups!inner(type, custom_name, members(nickname, mbti, is_self))',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (groupType) {
        query = query.eq('groups.type', groupType);
      }

      const { data, error } = await query.abortSignal(signal);

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });

const analysisQueryOptions = (userId: string | null, id: string) =>
  queryOptions({
    queryKey: queryKeys.analyses.detail(userId, id),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('analyses')
        .select(
          '*, groups(type, custom_name, members(nickname, mbti, is_self, gender, order))',
        )
        .eq('id', id)
        .abortSignal(signal)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

export { analysesQueryOptions, analysisQueryOptions };
