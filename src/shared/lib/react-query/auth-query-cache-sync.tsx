'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { createClient } from '@/shared/lib/supabase/client';

import { clearAuthQueryCache } from './clear-auth-query-cache';

const AuthQueryCacheSync = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const userIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;

      if (event === 'INITIAL_SESSION') {
        userIdRef.current = nextUserId;
        return;
      }

      const previousUserId = userIdRef.current;
      userIdRef.current = nextUserId;

      if (previousUserId === nextUserId) return;

      void clearAuthQueryCache(queryClient).then(() => {
        router.refresh();
      });
    });

    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  return null;
};

export { AuthQueryCacheSync };
