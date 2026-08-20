import { cn } from '@/shared/lib/utils';

import { PairDetail } from '@/features/analysis-result';

import type { PairDetailViewProps } from './types';

const PairDetailView = ({ className }: PairDetailViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <PairDetail />
    </div>
  );
};

export { PairDetailView };