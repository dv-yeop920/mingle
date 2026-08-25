'use client';

import { GROUP_TYPE_LABELS } from '@/shared/config/group-types';
import { cn } from '@/shared/lib/utils';

import { useAnalyses } from '@/entities/analysis';

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
        const dateStr = new Date(item.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

        return (
          <div
            key={item.id}
            className="flex flex-col gap-[12px] rounded-[24px] bg-surface p-[18px] shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-[5px]">
                <span className="text-[16px] font-black text-foreground">
                  {item.title}
                </span>
                <span className="text-[12px] font-bold text-hint">
                  {GROUP_TYPE_LABELS[groupType] ?? '기타'} · {members.length}명
                </span>
              </div>
              <div className="flex flex-col items-end gap-[3px]">
                <span className="font-nunito text-[20px] font-black text-primary">
                  {item.chemistry_score}%
                </span>
                <span className="font-nunito text-[10.5px] font-bold text-[#AFBDB3]">
                  {dateStr}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-[5px]">
              {members.map((m) => (
                <span
                  key={m.nickname}
                  className="rounded-pill bg-[#F1F6F1] px-[9px] py-[4px] font-nunito text-[10.5px] font-black text-[#6B8072]"
                >
                  {m.mbti}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { HistoryList };
