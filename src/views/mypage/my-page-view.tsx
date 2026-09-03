'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { clearAuthQueryCache } from '@/shared/lib/react-query/clear-auth-query-cache';
import { useGuardedAction } from '@/shared/lib/use-guarded-action';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/ui/toast';

import { useProfile, useUserStats } from '@/entities/user';

import { logout } from '@/features/auth/api/actions';
import { MyPageView } from '@/features/profile';

import type { MyPageContainerViewProps } from './types';

const MyPageContainerView = ({
  userId,
  className,
}: MyPageContainerViewProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: profile } = useProfile(userId);
  const { data: userStats } = useUserStats(userId);
  const [guardedLogout] = useGuardedAction(async () => {
    const result = await logout();
    if ('error' in result) {
      showToast({ message: result.error ?? '로그아웃에 실패했습니다', variant: 'error' });
      return;
    }

    await clearAuthQueryCache(queryClient);
    router.replace('/login');
  });

  const stats = [
    { label: '테스트', value: userStats?.totalTests ?? 0 },
    { label: '내 그룹', value: userStats?.totalGroups ?? 0 },
    {
      label: '평균 케미',
      value: userStats?.averageChemistry ?? '-',
    },
  ];

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="px-6 pt-[10px] pb-[20px]">
        <h1 className="text-[23px] font-black tracking-title text-foreground">
          My
        </h1>
      </div>
      <div className="px-5">
        <MyPageView
          nickname={profile?.nickname ?? ''}
          mbti={profile?.mbti ?? null}
          stats={stats}
          onSettingsClick={() => router.push('/mypage/settings')}
          onLogout={guardedLogout}
        />
      </div>
    </div>
  );
};

export { MyPageContainerView };
