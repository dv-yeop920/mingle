import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import type { ResultSummaryCardProps } from './types';

const ResultSummaryCard = ({
  groupName,
  groupType,
  memberCount,
  chemistryScore,
  date,
  representativeMbtis,
  onClick,
  className,
}: ResultSummaryCardProps) => {
  const clamped = Math.max(0, Math.min(100, chemistryScore));

  return (
    <div
      className={cn(
        'flex gap-4 rounded-[24px] bg-surface p-4 shadow-md',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <div
        className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-green-200) 0% ${clamped}%, var(--color-neutral-100) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-surface">
          <span className="font-nunito text-[11px] font-black text-primary-deep">
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-1 text-section font-black text-foreground">{groupName}</h3>
        <p className="text-caption text-muted">
          {groupType} · {memberCount}명
        </p>
        {representativeMbtis && representativeMbtis.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {representativeMbtis.map((mbti) => {
              const styles = getTemperamentStyles(mbti);
              return (
                <span
                  key={mbti}
                  className={cn(
                    'rounded-pill px-[6px] py-[2px] font-nunito text-[10px] font-black',
                    styles.bg,
                    styles.fg,
                  )}
                >
                  {mbti}
                </span>
              );
            })}
          </div>
        )}
        <span className="font-nunito text-caption text-hint">{date}</span>
      </div>
    </div>
  );
};

export { ResultSummaryCard };
