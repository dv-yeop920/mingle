'use client';

import {
  GROUP_TYPE_ICONS,
  GROUP_TYPE_LABELS,
} from '@/shared/config/group-types';
import { cn } from '@/shared/lib/utils';

import { ResultSummaryCard } from '@/entities/analysis';

import type { RecentTestsProps } from './types';

const RecentTests = ({ analyses, className }: RecentTestsProps) => {
  const recentItems = analyses.slice(0, 3);

  if (recentItems.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="px-[24px] pt-[26px] pb-[10px]">
          <h3 className="text-[16px] font-black text-foreground">
            최근 테스트
          </h3>
        </div>
        <div className="flex items-center justify-center px-5 py-8">
          <p className="text-body text-muted">아직 테스트 기록이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-[24px] pt-[26px] pb-[10px]">
        <h3 className="text-[16px] font-black text-foreground">최근 테스트</h3>
        <span className="cursor-pointer text-[13px] font-extrabold text-primary">
          전체보기
        </span>
      </div>

      <div className="flex flex-col gap-[11px] px-5">
        {recentItems.map((item) => {
          const group = item.groups;
          const groupType = group?.type ?? '';
          const members = group?.members ?? [];
          const icon = GROUP_TYPE_ICONS[groupType] ?? '✏️';
          const representativeMbtis = members.map((member) => member.mbti);
          const dateStr = new Date(item.created_at).toLocaleDateString(
            'ko-KR',
            {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            },
          );

          return (
            <ResultSummaryCard
              key={item.id}
              title={item.title}
              groupType={GROUP_TYPE_LABELS[groupType] ?? '그룹'}
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
    </div>
  );
};

export { RecentTests };
