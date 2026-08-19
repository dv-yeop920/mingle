import { cn } from '@/shared/lib/utils';

import type { GroupTypeCardProps } from './types';

const GroupTypeCard = ({
  icon,
  title,
  description,
  isSelected = false,
  onClick,
  className,
}: GroupTypeCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-4 rounded-card-lg p-5',
        'bg-surface transition-all duration-200',
        isSelected
          ? 'border-2 border-border-focus'
          : 'border border-border',
        className,
      )}
    >
      <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[19px] bg-primary-tonal text-[24px]">
        {icon}
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="text-section font-black text-foreground">{title}</span>
        <span className="text-body text-muted">{description}</span>
      </div>

      {isSelected && (
        <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">
          ✓
        </div>
      )}
    </button>
  );
};

export { GroupTypeCard };
