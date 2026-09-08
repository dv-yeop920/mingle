'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from './client';

const useAuthUserId = () => {
  const { data, isPending } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user.id ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return { userId: data ?? null, isPending };
};

export { useAuthUserId };
