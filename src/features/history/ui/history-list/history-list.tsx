'use client';

import { cn } from '@/shared/lib/utils';

import { ResultSummaryCard, useAnalyses } from '@/entities/analysis';

import { GROUP_TYPE_LABELS } from './constants';
import type { HistoryListProps } from './types';

const HistoryList = ({ filterType, className }: HistoryListProps) => {
  const groupType = filterType === 'all' ? undefined : filterType;
  const { data: analyses, isLoading } = useAnalyses(groupType);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-body text-muted">불러오는 중...</p>
      </div>
    );
  }

  const items = analyses ?? [];

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-body text-muted">테스트 기록이 없습니다</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => {
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

export { HistoryList, type HistoryListProps };
