'use client';

import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';

import { RecentTestsSection } from './recent-tests-section';

const HomeRecentTests = () => {
  const { userId } = useAuthUserId();

  if (!userId) return null;

  return <RecentTestsSection userId={userId} />;
};

export { HomeRecentTests };
