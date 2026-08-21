'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { useAnalyses } from '@/entities/analysis';

import { HistoryFilter, HistoryList } from '@/features/history';

import type { HistoryViewProps } from './types';

const HistoryView = ({ className }: HistoryViewProps) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const { data: analyses } = useAnalyses();
  const totalCount = analyses?.length ?? 0;

  return (
    <div className={cn('flex flex-col gap-4 px-5 pt-[10px]', className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-[23px] font-black tracking-title text-foreground">
          테스트 기록
        </h1>
        <span className="font-nunito text-[13px] font-extrabold text-hint">
          {totalCount}
        </span>
      </div>
      <HistoryFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <HistoryList filterType={activeFilter} />
    </div>
  );
};

export { HistoryView };
