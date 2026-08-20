'use client';

import { cn } from '@/shared/lib/utils';

import { GroupTypeSelector } from '@/features/test-flow';

import { StepHeader } from '@/widgets/step-header';

import type { GroupTypeViewProps } from './types';

const GroupTypeView = ({ className }: GroupTypeViewProps) => {
  return (
    <div className={cn('flex flex-col gap-6 px-5 pt-4', className)}>
      <StepHeader currentStep={1} totalSteps={3} onBack={() => {}} />

      <div className="flex flex-col gap-2">
        <h2 className="text-title1 font-black text-foreground">그룹 유형 선택</h2>
        <p className="text-body text-muted">어떤 모임의 케미를 분석할까요?</p>
      </div>

      <GroupTypeSelector />
    </div>
  );
};

export { GroupTypeView };