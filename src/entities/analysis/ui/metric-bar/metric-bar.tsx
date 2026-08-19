import { cn } from '@/shared/lib/utils';

import type { MetricBarProps } from './types';

const MetricBar = ({ label, value, isCaution = false, className }: MetricBarProps) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-body font-bold text-foreground">{label}</span>
        <span className="font-nunito text-label font-black text-foreground">
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="h-[10px] rounded-pill bg-border-inner">
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-500 ease-out',
            isCaution ? 'bg-caution' : 'bg-primary',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export { MetricBar };
