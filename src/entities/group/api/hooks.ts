'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const useGroups = () => {
  return useQuery({
    queryKey: queryKeys.groups.list(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('groups')
        .select('*, members(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export { useGroups };
