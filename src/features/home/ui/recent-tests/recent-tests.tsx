'use client';

import { cn } from '@/shared/lib/utils';

import { useAnalyses } from '@/entities/analysis';

import { GROUP_TYPE_LABELS } from './constants';
import type { RecentTestsProps } from './types';

const GROUP_TYPE_ICONS: Record<string, string> = {
  friends: '🧑‍🤝‍🧑',
  work: '💼',
  family: '🏠',
  custom: '✏️',
};

const RecentTests = ({ className }: RecentTestsProps) => {
  const { data: analyses, isLoading } = useAnalyses();

  const recentItems = (analyses ?? []).slice(0, 3);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <h3 className="text-[16px] font-black text-foreground">최근 테스트</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-body text-muted">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (recentItems.length === 0) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <h3 className="text-[16px] font-black text-foreground">최근 테스트</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-body text-muted">아직 테스트 기록이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-[10px]', className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[16px] font-black text-foreground">최근 테스트</h3>
        <span className="cursor-pointer text-[13px] font-extrabold text-primary">전체보기</span>
      </div>

      {recentItems.map((item) => {
        const group = item.groups as {
          type: string;
          custom_name: string | null;
          members: { nickname: string; mbti: string; is_self: boolean }[];
        } | null;
        const groupType = group?.type ?? '';
        const groupName =
          groupType === 'custom'
            ? (group?.custom_name ?? '기타')
            : (GROUP_TYPE_LABELS[groupType] ?? '');
        const members = group?.members ?? [];
        const icon = GROUP_TYPE_ICONS[groupType] ?? '✏️';
        const mbtiStr = members
          .slice(0, 5)
          .map((m) => m.mbti)
          .join(' · ');
        const dateStr = new Date(item.created_at)
          .toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
          .replace('. ', '.')
          .replace('.', '');

        return (
          <div
            key={item.id}
            className="flex items-center gap-[14px] rounded-[24px] bg-surface p-[16px_18px] shadow-md"
          >
            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[17px] bg-[#F0F7F0] text-[19px]">
              {icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div className="flex items-center gap-[7px]">
                <span className="text-[15px] font-black text-foreground">{groupName}</span>
                <span className="text-[11px] font-extrabold text-hint">
                  {GROUP_TYPE_LABELS[groupType] ?? '기타'} · {members.length}명
                </span>
              </div>
              <span className="truncate font-nunito text-[11px] font-extrabold text-[#9AAB9F] tracking-[.02em]">
                {mbtiStr}
              </span>
            </div>
            <div className="flex flex-col items-end gap-[3px]">
              <span className="font-nunito text-[19px] font-black text-primary">
                {item.chemistry_score}%
              </span>
              <span className="font-nunito text-[10px] font-bold text-[#AFBDB3]">{dateStr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { RecentTests };
