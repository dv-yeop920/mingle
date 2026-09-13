'use client';

import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';

import { RecentTestsSkeleton, RecentTestsSection } from './recent-tests-section';

const HomeRecentTests = () => {
  const { userId, isPending } = useAuthUserId();

  if (isPending) {
    return (
      <section aria-busy>
        <RecentTestsSkeleton />
      </section>
    );
  }

  if (!userId) return null;

  return <RecentTestsSection userId={userId} />;
};

export { HomeRecentTests };
