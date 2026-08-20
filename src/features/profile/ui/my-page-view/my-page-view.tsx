import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';

import { MbtiBadge } from '@/entities/mbti';

import { StatRow } from '../stat-row';

import { MENU_ITEMS } from './constants';
import type { MyPageViewProps } from './types';

const MyPageView = ({
  nickname,
  mbti,
  stats,
  onSettingsClick,
  className,
}: MyPageViewProps) => {
  const displayMbti = (mbti ?? 'ENFP') as MbtiType;
  const styles = getTemperamentStyles(displayMbti);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[20px]',
            styles.bg,
          )}
        >
          <span
            className={cn('font-nunito text-[22px] font-black', styles.fg)}
          >
            {nickname.slice(0, 2)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-title2 font-black text-foreground">
            {nickname}
          </span>
          {mbti && <MbtiBadge mbti={mbti as MbtiType} />}
        </div>
      </div>

      <div className="rounded-card-lg bg-surface p-4">
        {stats.map((stat) => (
          <StatRow
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>

      <div className="flex flex-col">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.label === '설정' ? onSettingsClick : undefined}
            className="flex cursor-pointer items-center justify-between border-b border-border-inner px-1 py-4 text-body text-foreground"
          >
            {item.label}
            <span className="text-hint">›</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export { MyPageView };
