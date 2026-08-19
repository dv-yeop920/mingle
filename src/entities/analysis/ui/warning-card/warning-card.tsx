import { cn } from '@/shared/lib/utils';

import type { WarningCardProps } from './types';

const WarningCard = ({ title, description, className }: WarningCardProps) => {
  return (
    <div className={cn('rounded-card-lg bg-caution-surface p-5', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-caution/10">
          <span className="text-[18px]" role="img" aria-label="warning">⚠️</span>
        </div>
        <h3 className="text-section font-black text-caution-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-body text-caution-foreground/80">{description}</p>
    </div>
  );
};

export { WarningCard };
