import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import type { RoleCardProps } from './types';

const RoleCard = ({ nickname, mbti, role, description, className }: RoleCardProps) => {
  const styles = getTemperamentStyles(mbti);
  const initials = nickname.slice(0, 2);

  return (
    <div className={cn('flex items-center gap-[13px]', className)}>
      <div
        className={cn(
          'flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[17px]',
          styles.bg,
        )}
      >
        <span className={cn('font-nunito text-[17px] font-black', styles.fg)}>
          {initials}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-section font-black text-foreground">{role}</span>
          <span
            className={cn(
              'rounded-pill px-[9px] py-[3px] font-nunito text-label-sm font-black',
              styles.bg,
              styles.fg,
            )}
          >
            {mbti}
          </span>
        </div>
        <p className="line-clamp-1 text-body text-muted">{description}</p>
      </div>
    </div>
  );
};

export { RoleCard };
