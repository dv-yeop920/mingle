import { cn } from '@/shared/lib/utils';

import { ResultReport, ShareButton } from '@/features/analysis-result';

import type { ResultViewProps } from './types';

const ResultView = ({ className }: ResultViewProps) => {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <ResultReport />
      <ShareButton />
    </div>
  );
};

export { ResultView, type ResultViewProps };