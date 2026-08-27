import { cn } from '@/shared/lib/utils';

import type { GroupTypeCardProps } from './types';

const GroupTypeCard = ({
  icon,
  title,
  description,
  iconBg,
  isDashed = false,
  isSelected = false,
  onClick,
  className,
}: GroupTypeCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-[15px] rounded-card-lg p-[18px] btn-press',
        'bg-surface',
        isSelected
          ? 'border-2 border-border-focus shadow-[0_10px_22px_rgba(76,120,90,.10)]'
          : isDashed
            ? 'border-2 border-dashed border-disabled'
            : 'border-2 border-border-inner',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[19px] text-[23px]',
          iconBg ?? 'bg-primary-tonal',
        )}
      >
        {icon}
      </div>

      <div className="flex flex-1 flex-col items-start gap-1">
        <span className="text-[17px] font-black text-foreground">{title}</span>
        <span className="whitespace-pre-line text-left text-[12.5px] font-semibold leading-[1.45] text-subtitle">
          {description}
        </span>
      </div>

      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-black transition-opacity duration-200',
          isSelected ? 'bg-primary text-primary-foreground opacity-100' : 'opacity-0',
        )}
      >
        ✓
      </div>
    </button>
  );
};

export { GroupTypeCard };
