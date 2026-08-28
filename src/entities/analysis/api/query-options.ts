'use client';

import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const analysesQueryOptions = (groupType?: string) =>
  queryOptions({
    queryKey: groupType
      ? [...queryKeys.analyses.list(), groupType]
      : queryKeys.analyses.list(),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('analyses')
        .select(
          '*, groups!inner(type, custom_name, members(nickname, mbti, is_self))',
        )
        .order('created_at', { ascending: false });

      if (groupType) {
        query = query.eq('groups.type', groupType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

const analysisQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.analyses.detail(id),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('analyses')
        .select(
          '*, groups(type, custom_name, members(nickname, mbti, is_self, gender, order))',
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

export { analysesQueryOptions, analysisQueryOptions };
