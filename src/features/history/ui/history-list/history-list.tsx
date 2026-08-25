'use client';

import { GROUP_TYPE_ICONS, GROUP_TYPE_LABELS } from '@/shared/config/group-types';
import { cn } from '@/shared/lib/utils';

import { ResultSummaryCard, useAnalyses } from '@/entities/analysis';

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
    <div className={cn('flex flex-col gap-[11px]', className)}>
      {items.map((item) => {
        const group = item.groups as {
          type: string;
          custom_name: string | null;
          members: { nickname: string; mbti: string; is_self: boolean }[];
        } | null;
        const groupType = group?.type ?? '';
        const members = group?.members ?? [];
        const icon = GROUP_TYPE_ICONS[groupType] ?? '✏️';
        const representativeMbtis = members.map((member) => member.mbti);
        const dateStr = new Date(item.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

        return (
          <ResultSummaryCard
            key={item.id}
            title={item.title}
            groupType={GROUP_TYPE_LABELS[groupType] ?? '기타'}
            memberCount={members.length}
            chemistryScore={item.chemistry_score}
            date={dateStr}
            representativeMbtis={representativeMbtis}
            icon={icon}
            href={`/result?id=${encodeURIComponent(item.id)}`}
          />
        );
      })}
    </div>
  );
};

export { HistoryList };
