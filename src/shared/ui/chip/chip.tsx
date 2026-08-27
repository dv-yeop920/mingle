import { cn } from '@/shared/lib/utils';

import type { ChipProps } from './types';

const Chip = ({ label, isActive = false, onClick, className }: ChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-pill px-4 py-[9px] text-caption font-bold btn-press',
        'border',
        isActive
          ? 'border-primary bg-primary-tonal text-primary-deep shadow-sm'
          : 'border-border bg-surface text-foreground',
        className,
      )}
    >
      {label}
    </button>
  );
};

export { Chip };
