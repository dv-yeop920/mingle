'use client';

import { cn } from '@/shared/lib/utils';

import type { StepHeaderProps } from './types';

const StepHeader = ({ currentStep, totalSteps, onBack, className }: StepHeaderProps) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        type="button"
        onClick={onBack}
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] border border-border bg-surface"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
      </button>
      <div className="flex items-center gap-[6px]">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-[5px] w-[22px] rounded-pill',
              i < currentStep ? 'bg-primary' : 'bg-border-inner',
            )}
          />
        ))}
      </div>
      <span className="font-nunito text-label font-black text-hint">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
};

export { StepHeader };
export type { StepHeaderProps } from './types';
