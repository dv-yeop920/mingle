import { cn } from '@/shared/lib/utils';

import { ResultSummaryCard } from '@/entities/analysis';

import { MOCK_RECENT_TESTS } from './constants';
import type { RecentTestsProps } from './types';

const RecentTests = ({ className }: RecentTestsProps) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-section font-black text-foreground">최근 테스트</h3>
        <span className="cursor-pointer text-caption text-hint">전체 보기</span>
      </div>

      {MOCK_RECENT_TESTS.map((test) => (
        <ResultSummaryCard
          key={test.id}
          groupName={test.groupName}
          groupType={test.groupType}
          memberCount={test.memberCount}
          chemistryScore={test.chemistryScore}
          date={test.date}
          representativeMbtis={test.representativeMbtis}
        />
      ))}
    </div>
  );
};

export { RecentTests };
export type { RecentTestsProps } from './types';
