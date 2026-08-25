'use client';

import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import type { RoleCardProps } from './types';

const RoleCard = ({
  nickname,
  mbti,
  role,
  description,
  onClick,
  className,
}: RoleCardProps) => {
  const styles = getTemperamentStyles(mbti);
  const initials = nickname.slice(0, 2);
  const content = (
    <>
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
      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
      {onClick ? (
        <svg
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-hint"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m9 18 6-6-6-6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label={`${nickname}님의 ${role} 역할 상세 보기`}
        className={cn(
          'btn-press flex min-h-[48px] w-full cursor-pointer items-center gap-[13px] text-left',
          className,
        )}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-[13px]', className)}>
      {content}
    </div>
  );
};

export { RoleCard };
