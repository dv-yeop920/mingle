'use client';

import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const characterMatchQueryOptions = (
  userId: string | null,
  mbti: string,
  workId: string,
) =>
  queryOptions({
    queryKey: queryKeys.characterMatch.detail(userId, mbti, workId),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('character_matches')
        .select('*')
        .eq('user_id', userId!)
        .eq('mbti', mbti)
        .eq('work_id', workId)
        .abortSignal(signal)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId) && Boolean(mbti) && Boolean(workId),
  });

export { characterMatchQueryOptions };
