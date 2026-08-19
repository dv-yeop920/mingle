import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import type { PairCardProps } from './types';

const PairCard = ({ memberA, memberB, score, summary, onClick, className }: PairCardProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const stylesA = getTemperamentStyles(memberA.mbti);
  const stylesB = getTemperamentStyles(memberB.mbti);
  const initialsA = memberA.nickname.slice(0, 2);
  const initialsB = memberB.nickname.slice(0, 2);

  return (
    <div
      className={cn(
        'rounded-[24px] bg-surface p-4 shadow-sm',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-[36px] w-[36px] items-center justify-center rounded-[12px]',
              stylesA.bg,
            )}
          >
            <span className={cn('font-nunito text-[13px] font-black', stylesA.fg)}>
              {initialsA}
            </span>
          </div>
          <span className="text-caption font-bold text-hint">×</span>
          <div
            className={cn(
              'flex h-[36px] w-[36px] items-center justify-center rounded-[12px]',
              stylesB.bg,
            )}
          >
            <span className={cn('font-nunito text-[13px] font-black', stylesB.fg)}>
              {initialsB}
            </span>
          </div>
        </div>
        <span className="font-nunito text-section font-black text-primary-deep">
          {Math.round(clamped)}%
        </span>
      </div>
      <p className="mt-2 text-body text-muted">{summary}</p>
      <div className="mt-3 flex items-center">
        <div className="h-[6px] flex-1 rounded-pill bg-border-inner">
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        {onClick && <span className="ml-3 text-section text-hint">›</span>}
      </div>
    </div>
  );
};

export { PairCard };
