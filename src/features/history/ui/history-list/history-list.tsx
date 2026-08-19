import { cn } from '@/shared/lib/utils';

import { ResultSummaryCard } from '@/entities/analysis';

import { MOCK_HISTORY_ITEMS } from './constants';
import type { HistoryListProps } from './types';

const HistoryList = ({ className }: HistoryListProps) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {MOCK_HISTORY_ITEMS.map((item) => (
        <ResultSummaryCard
          key={item.id}
          groupName={item.groupName}
          groupType={item.groupType}
          memberCount={item.memberCount}
          chemistryScore={item.chemistryScore}
          date={item.date}
          representativeMbtis={item.representativeMbtis}
        />
      ))}
    </div>
  );
};

export { HistoryList };
export type { HistoryListProps } from './types';
