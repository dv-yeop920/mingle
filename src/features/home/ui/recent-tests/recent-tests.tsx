'use client';

import { cn } from '@/shared/lib/utils';

import { ResultSummaryCard, useAnalyses } from '@/entities/analysis';

import { GROUP_TYPE_LABELS } from './constants';
import type { RecentTestsProps } from './types';

const RecentTests = ({ className }: RecentTestsProps) => {
  const { data: analyses, isLoading } = useAnalyses();

  const recentItems = (analyses ?? []).slice(0, 3);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <h3 className="text-section font-black text-foreground">최근 테스트</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-body text-muted">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (recentItems.length === 0) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <h3 className="text-section font-black text-foreground">최근 테스트</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-body text-muted">아직 테스트 기록이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-section font-black text-foreground">최근 테스트</h3>
        <span className="cursor-pointer text-caption text-hint">전체 보기</span>
      </div>

      {recentItems.map((item) => {
        const group = item.groups as {
          type: string;
          custom_name: string | null;
          members: { nickname: string; mbti: string; is_self: boolean }[];
        } | null;
        const groupName =
          group?.type === 'custom'
            ? (group.custom_name ?? '기타')
            : (GROUP_TYPE_LABELS[group?.type ?? ''] ?? '');
        const members = group?.members ?? [];

        return (
          <ResultSummaryCard
            key={item.id}
            groupName={groupName}
            groupType={GROUP_TYPE_LABELS[group?.type ?? ''] ?? ''}
            memberCount={members.length}
            chemistryScore={item.chemistry_score}
            date={new Date(item.created_at).toLocaleDateString('ko-KR')}
            representativeMbtis={
              members.slice(0, 4).map((m) => m.mbti) as import('@/shared/types/mbti').MbtiType[]
            }
          />
        );
      })}
    </div>
  );
};

export { RecentTests, type RecentTestsProps };
