'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const useGroups = (userId: string | null) => {
  return useQuery({
    queryKey: queryKeys.groups.list(userId),
    queryFn: async ({ signal }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== userId) return [];

      const { data, error } = await supabase
        .from('groups')
        .select('*, members(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
};

export { useGroups };
