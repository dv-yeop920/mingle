import { cn } from '@/shared/lib/utils';

import type { StatRowProps } from './types';

const StatRow = ({ icon, label, value, className }: StatRowProps) => {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <span className="text-[20px]">{icon}</span>
      <span className="flex-1 text-body text-foreground">{label}</span>
      <span className="font-nunito text-section font-black text-primary-deep">{value}</span>
    </div>
  );
};

export { StatRow };
export type { StatRowProps } from './types';
