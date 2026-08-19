'use client';

import { cn } from '@/shared/lib/utils';

import { MemberSetupForm } from '@/features/test-flow';

import { StepHeader } from '@/widgets/step-header';

import type { MemberSetupViewProps } from './types';

const MemberSetupView = ({ className }: MemberSetupViewProps) => {
  return (
    <div className={cn('flex flex-col gap-6 px-5 pt-4', className)}>
      <StepHeader currentStep={2} totalSteps={3} onBack={() => {}} />

      <div className="flex flex-col gap-2">
        <h2 className="text-title1 font-black text-foreground">멤버 설정</h2>
        <p className="text-body text-muted">그룹 멤버의 MBTI를 입력하세요</p>
      </div>

      <MemberSetupForm />
    </div>
  );
};

export { MemberSetupView, type MemberSetupViewProps };