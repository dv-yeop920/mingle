'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { GroupTypeSelector } from '@/features/test-flow';

import { StepHeader } from '@/widgets/step-header';

import type { GroupTypeViewProps } from './types';

const GroupTypeView = ({ selfMemberSeed, className }: GroupTypeViewProps) => {
  const router = useRouter();

  return (
    <div className={cn('flex flex-col gap-6 px-5 pt-4', className)}>
      <StepHeader currentStep={1} totalSteps={3} onBack={() => router.push('/')} />

      <div className="flex flex-col gap-[7px]">
        <h2 className="whitespace-pre-line text-[27px] font-black leading-[1.34] tracking-title text-foreground">
          {'어떤 사이를\n분석해볼까요?'}
        </h2>
        <p className="text-[14px] font-semibold text-subtitle">
          관계에 따라 분석 내용이 달라져요.
        </p>
      </div>

      <GroupTypeSelector
        selfMemberSeed={selfMemberSeed}
        onNext={() => router.push('/members')}
      />
    </div>
  );
};

export { GroupTypeView };
