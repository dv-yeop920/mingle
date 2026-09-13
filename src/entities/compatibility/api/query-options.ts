'use client';

import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const compatibilityQueryOptions = (userId: string | null, id: string) =>
  queryOptions({
    queryKey: queryKeys.compatibility.detail(userId, id),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('compatibility_analyses')
        .select('*')
        .eq('id', id)
        .abortSignal(signal)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId) && Boolean(id),
  });

export { compatibilityQueryOptions };
