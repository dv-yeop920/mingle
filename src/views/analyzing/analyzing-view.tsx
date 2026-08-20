'use client';

import { cn } from '@/shared/lib/utils';

import { AnalysisAnimation } from '@/features/test-flow';

import type { AnalyzingViewProps } from './types';

const AnalyzingView = ({ className }: AnalyzingViewProps) => {
  return (
    <div
      className={cn(
        'flex min-h-dvh items-center justify-center bg-background',
        className,
      )}
    >
      <AnalysisAnimation />
    </div>
  );
};

export { AnalyzingView };