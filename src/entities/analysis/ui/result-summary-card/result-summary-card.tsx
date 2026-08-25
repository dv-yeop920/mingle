import Link from 'next/link';

import { cn } from '@/shared/lib/utils';

import type { ResultSummaryCardProps } from './types';

const ResultSummaryCard = ({
  title,
  groupType,
  memberCount,
  chemistryScore,
  date,
  representativeMbtis,
  icon,
  href,
  className,
}: ResultSummaryCardProps) => {
  return (
    <Link
      href={href}
      aria-label={`${title} 결과 보기`}
      className={cn(
        'flex items-start gap-[14px] rounded-[24px] bg-surface p-[18px] shadow-md btn-press focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[17px] bg-border-inner text-[19px]"
      >
        {icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
        <div className="flex min-w-0 items-start justify-between gap-[10px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
            <h3 className="truncate text-[16px] font-black text-foreground">
              {title}
            </h3>
            <p className="flex min-w-0 items-center gap-[5px] text-[11px] font-bold text-hint">
              <span className="shrink-0 font-nunito">{date}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {groupType} · {memberCount}명
              </span>
            </p>
          </div>
          <span className="shrink-0 font-nunito text-[20px] font-black text-primary">
            {chemistryScore}%
          </span>
        </div>

        {representativeMbtis && representativeMbtis.length > 0 && (
          <div className="flex flex-wrap gap-[5px]">
            {representativeMbtis.map((mbti, index) => (
              <span
                key={`${mbti}-${index}`}
                className="rounded-pill bg-border-inner px-[9px] py-[4px] font-nunito text-[10.5px] font-black text-muted"
              >
                {mbti}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export { ResultSummaryCard };
