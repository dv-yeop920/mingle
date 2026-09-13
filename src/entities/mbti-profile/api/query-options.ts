'use client';

import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const mbtiProfileQueryOptions = (userId: string | null, mbti: string) =>
  queryOptions({
    queryKey: queryKeys.mbtiProfile.detail(userId, mbti),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('mbti_profiles')
        .select('*')
        .eq('user_id', userId!)
        .eq('mbti', mbti)
        .abortSignal(signal)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId) && Boolean(mbti),
  });

export { mbtiProfileQueryOptions };
