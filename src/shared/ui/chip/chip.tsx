import { cn } from '@/shared/lib/utils';

import type { ChipProps } from './types';

const Chip = ({ label, isActive = false, onClick, className }: ChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-pill px-4 py-[9px] text-caption font-bold btn-press',
        'transition-colors duration-200 ease-out',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-surface border border-border text-foreground',
        className,
      )}
    >
      {label}
    </button>
  );
};

export { Chip };
