'use client';

import { cn } from '@/shared/lib/utils';

import type { HeroCardProps } from './types';

const HeroCard = ({ onClick, className }: HeroCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[180px] w-full cursor-pointer flex-col justify-between rounded-hero bg-primary p-6 shadow-hero',
        'transition-transform duration-[120ms] active:scale-[.97]',
        className,
      )}
    >
      <div className="flex flex-col items-start gap-2">
        <h2 className="text-title2 font-black text-primary-foreground">새로운 케미 테스트</h2>
        <p className="text-body text-primary-foreground/80">우리 사이의 케미를 알아보세요</p>
      </div>

      <div className="flex justify-end">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};

export { HeroCard };