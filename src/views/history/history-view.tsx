'use client';

import { cn } from '@/shared/lib/utils';

import { HistoryFilter, HistoryList } from '@/features/history';

import type { HistoryViewProps } from './types';

const HistoryView = ({ className }: HistoryViewProps) => {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <h1 className="text-title1 font-black text-foreground">테스트 히스토리</h1>
      <HistoryFilter />
      <HistoryList />
    </div>
  );
};

export { HistoryView, type HistoryViewProps };