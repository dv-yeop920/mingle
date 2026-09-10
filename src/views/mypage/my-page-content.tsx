'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { clearAuthQueryCache } from '@/shared/lib/react-query/clear-auth-query-cache';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { useGuardedAction } from '@/shared/lib/use-guarded-action';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/ui/toast';

import { useProfile, useUserStats } from '@/entities/user';

import { logout } from '@/features/auth/api/actions';
import { MyPageView } from '@/features/profile';

const MyPageSkeleton = () => {
  return (
    <div className="flex flex-col gap-[18px] px-5">
      <div className="rounded-[30px] bg-surface p-[24px] shadow-md">
        <div className="flex items-center gap-[15px]">
          <div className="h-[64px] w-[64px] shrink-0 animate-pulse rounded-[22px] bg-muted/20" />
          <div className="flex flex-1 flex-col gap-[6px]">
            <div className="h-[22px] w-[80px] animate-pulse rounded-md bg-muted/20" />
            <div className="h-[18px] w-[100px] animate-pulse rounded-md bg-muted/20" />
          </div>
        </div>
        <div className="mt-[20px] grid grid-cols-3 rounded-[20px] bg-background py-[16px]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center gap-[4px]',
                i === 1 && 'border-l border-r border-border-inner',
              )}
            >
              <div className="h-[24px] w-[30px] animate-pulse rounded-md bg-muted/20" />
              <div className="h-[14px] w-[40px] animate-pulse rounded-md bg-muted/20" />
            </div>
          ))}
        </div>
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-[14px] rounded-card bg-surface p-[18px] shadow-sm"
        >
          <div className="h-[42px] w-[42px] shrink-0 animate-pulse rounded-[15px] bg-muted/20" />
          <div className="flex flex-1 flex-col gap-[3px]">
            <div className="h-[18px] w-[80px] animate-pulse rounded-md bg-muted/20" />
            <div className="h-[14px] w-[120px] animate-pulse rounded-md bg-muted/20" />
          </div>
        </div>
      ))}
    </div>
  );
};

const MyPageContent = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { userId, isPending: isAuthPending } = useAuthUserId();
  const {
    data: profile,
    isPending: isProfilePending,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useProfile(userId);
  const { data: userStats, isPending: isStatsPending } =
    useUserStats(userId);
  const [guardedLogout] = useGuardedAction(async () => {
    const result = await logout();
    if ('error' in result) {
      showToast({
        message: result.error ?? '로그아웃에 실패했습니다',
        variant: 'error',
      });
      return;
    }

    await clearAuthQueryCache(queryClient);
    router.replace('/login');
  });

  useEffect(() => {
    if (!isAuthPending && !userId) {
      router.replace('/login');
    }
  }, [isAuthPending, userId, router]);

  if (isAuthPending || isProfilePending || isStatsPending) {
    return <MyPageSkeleton />;
  }

  if (!userId) return null;

  if (isProfileError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
        <p className="text-body text-muted">
          프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => void refetchProfile()}
          className="text-[13px] font-bold text-primary btn-press"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const stats = [
    { label: '테스트', value: userStats?.totalTests ?? 0 },
    { label: '내 그룹', value: userStats?.totalGroups ?? 0 },
    { label: '평균 케미', value: userStats?.averageChemistry ?? '-' },
  ];

  return (
    <div className="px-5">
      <MyPageView
        nickname={profile?.nickname ?? ''}
        mbti={profile?.mbti ?? null}
        stats={stats}
        onSettingsClick={() => router.push('/mypage/settings')}
        onLogout={guardedLogout}
      />
    </div>
  );
};

export { MyPageContent };
