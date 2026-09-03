'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { useAnalyses } from '@/entities/analysis';

import { HistoryFilter, HistoryList } from '@/features/history';

import type { HistoryViewProps } from './types';

const HistoryView = ({ userId, className }: HistoryViewProps) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const { data: analyses } = useAnalyses(userId);
  const totalCount = analyses?.length ?? 0;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-[24px] pt-[10px]">
        <h1 className="text-[23px] font-black tracking-title text-foreground">
          테스트 기록
        </h1>
        <span className="font-nunito text-[13px] font-extrabold text-hint">
          {totalCount}
        </span>
      </div>
      <div className="px-[24px] pt-[16px]">
        <HistoryFilter
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>
      <div className="px-5 pt-[18px]">
        <HistoryList userId={userId} filterType={activeFilter} />
      </div>
    </div>
  );
};

export { HistoryView };
