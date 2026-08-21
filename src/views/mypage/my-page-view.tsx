'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { useProfile, useUserStats } from '@/entities/user';

import { logout } from '@/features/auth/api/actions';
import { MyPageView } from '@/features/profile';

import type { MyPageContainerViewProps } from './types';

const MyPageContainerView = ({ className }: MyPageContainerViewProps) => {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: userStats } = useUserStats();

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
        <h1 className="text-[23px] font-black tracking-title text-foreground">My</h1>
      </div>
      <div className="px-5">
        <MyPageView
          nickname={profile?.nickname ?? ''}
          mbti={profile?.mbti ?? null}
          stats={stats}
          onSettingsClick={() => router.push('/mypage/settings')}
          onLogout={() => logout()}
        />
      </div>
    </div>
  );
};

export { MyPageContainerView };
