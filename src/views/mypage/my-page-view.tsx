'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { useProfile, useUserStats } from '@/entities/user';

import { MyPageView } from '@/features/profile';

import type { MyPageContainerViewProps } from './types';

const MyPageContainerView = ({ className }: MyPageContainerViewProps) => {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: userStats } = useUserStats();

  const stats = [
    { icon: '🧪', label: '총 테스트 수', value: userStats?.totalTests ?? 0 },
    { icon: '👥', label: '분석한 그룹', value: userStats?.totalGroups ?? 0 },
    {
      icon: '⭐',
      label: '평균 케미 점수',
      value: userStats?.averageChemistry
        ? `${userStats.averageChemistry}%`
        : '-',
    },
  ];

  return (
    <div className={cn('flex flex-col', className)}>
      <MyPageView
        nickname={profile?.nickname ?? ''}
        mbti={profile?.mbti ?? null}
        stats={stats}
        onSettingsClick={() => router.push('/mypage/settings')}
      />
    </div>
  );
};

export { MyPageContainerView };
