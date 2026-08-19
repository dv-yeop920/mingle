import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import { MbtiBadge } from '@/entities/mbti';

import { StatRow } from '../stat-row';

import { MOCK_MENU_ITEMS, MOCK_STATS } from './constants';
import type { MyPageViewProps } from './types';

const MyPageView = ({ onSettingsClick, className }: MyPageViewProps) => {
  const styles = getTemperamentStyles('ENFP');

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[20px]',
            styles.bg,
          )}
        >
          <span className={cn('font-nunito text-[22px] font-black', styles.fg)}>
            민지
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-title2 font-black text-foreground">민지</span>
          <MbtiBadge mbti="ENFP" />
        </div>
      </div>

      <div className="rounded-card-lg bg-surface p-4">
        {MOCK_STATS.map((stat) => (
          <StatRow
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>

      <div className="flex flex-col">
        {MOCK_MENU_ITEMS.map((item) => (
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
export type { MyPageViewProps } from './types';
