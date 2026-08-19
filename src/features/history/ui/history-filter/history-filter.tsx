'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Chip } from '@/shared/ui/chip';

import { FILTER_OPTIONS } from './constants';
import type { HistoryFilterProps } from './types';

const HistoryFilter = ({ className }: HistoryFilterProps) => {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className={cn('flex gap-2 overflow-x-auto', className)}>
      {FILTER_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          isActive={activeFilter === option.value}
          onClick={() => setActiveFilter(option.value)}
        />
      ))}
    </div>
  );
};

export { HistoryFilter, type HistoryFilterProps };