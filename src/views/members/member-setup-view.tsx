'use client';

import { useRouter } from 'next/navigation';

import { GROUP_TYPE_LABELS } from '@/shared/config/group-types';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import { MemberSetupForm, useTestFlowStore } from '@/features/test-flow';

import type { MemberSetupViewProps } from './types';

const MemberSetupView = ({ className }: MemberSetupViewProps) => {
  const router = useRouter();
  const members = useTestFlowStore((s) => s.members);
  const groupType = useTestFlowStore((s) => s.groupType);
  const groupTypeLabel = groupType ? (GROUP_TYPE_LABELS[groupType] ?? '기타') : '그룹';

  const hasEmptyNickname = members.some((m) => m.nickname.trim() === '');
  const isDisabled = members.length < 2 || hasEmptyNickname;

  return (
    <div className={cn('flex h-dvh flex-col', className)}>
      <div className="shrink-0 px-[22px] pt-[6px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/group-type')}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] border border-border bg-surface text-[16px] font-extrabold text-[#5B7062] btn-press"
          >
            ‹
          </button>
          <span className="text-[16px] font-extrabold text-foreground">
            {groupTypeLabel} · 멤버 추가
          </span>
        </div>
        <div className="flex flex-col gap-[5px] pt-[22px]">
          <h2 className="text-[24px] font-black tracking-title text-foreground">누구와 함께인가요?</h2>
          <p className="text-[13.5px] font-semibold text-[#7A8E80]">최소 2명부터 분석할 수 있어요.</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-[18px]">
        <MemberSetupForm />
      </div>

      <div className="shrink-0 px-6 pb-[44px] pt-3">
        <Button
          variant="primary"
          disabled={isDisabled}
          onClick={() => router.push('/analyzing')}
        >
          분석 시작
        </Button>
      </div>
    </div>
  );
};

export { MemberSetupView };
