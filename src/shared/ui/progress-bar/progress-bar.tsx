import { cn } from '@/shared/lib/utils';

import type { ProgressBarProps } from './types';

const ProgressBar = ({ value, className }: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-[10px] flex-1 rounded-pill bg-border-inner">
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="font-nunito text-label font-black text-foreground">
        {Math.round(clamped)}%
      </span>
    </div>
  );
};

export { ProgressBar };
