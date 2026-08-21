'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import { MemberSetupForm, useTestFlowStore } from '@/features/test-flow';

import { StepHeader } from '@/widgets/step-header';

import type { MemberSetupViewProps } from './types';

const MemberSetupView = ({ className }: MemberSetupViewProps) => {
  const router = useRouter();
  const members = useTestFlowStore((s) => s.members);

  const hasEmptyNickname = members.some((m) => m.nickname.trim() === '');
  const isDisabled = members.length < 2 || hasEmptyNickname;

  return (
    <div className={cn('flex h-dvh flex-col', className)}>
      <div className="shrink-0 px-5 pt-4">
        <StepHeader currentStep={2} totalSteps={3} onBack={() => router.push('/group-type')} />
        <div className="flex flex-col gap-2 pt-6">
          <h2 className="text-title1 font-black text-foreground">멤버 설정</h2>
          <p className="text-body text-muted">그룹 멤버의 MBTI를 입력하세요</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-6">
        <MemberSetupForm />
      </div>

      <div className="shrink-0 px-5 pb-8 pt-3">
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
