'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { HistoryFilter, HistoryList } from '@/features/history';

import type { HistoryViewProps } from './types';

const HistoryView = ({ className }: HistoryViewProps) => {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <h1 className="text-title1 font-black text-foreground">
        테스트 히스토리
      </h1>
      <HistoryFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <HistoryList filterType={activeFilter} />
    </div>
  );
};

export { HistoryView, type HistoryViewProps };
