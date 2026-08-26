'use client';

import { cn } from '@/shared/lib/utils';

import type { HeroCardProps } from './types';

const HeroCard = ({ onClick, className }: HeroCardProps) => {
  return (
    <section
      className={cn(
        'btn-press relative min-h-[180px] w-full overflow-hidden rounded-hero bg-primary-hero px-6 py-[26px] shadow-hero',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="새로운 MBTI 그룹 케미 테스트 시작"
        className="absolute inset-0 z-10 cursor-pointer rounded-hero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-deep focus-visible:ring-inset"
      />

      <div
        aria-hidden="true"
        className="absolute right-[-18px] top-[22px] h-[98px] w-[78px] rotate-12 rounded-field bg-surface/55"
      />
      <div
        aria-hidden="true"
        className="absolute right-[26px] top-[44px] flex h-[98px] w-[78px] -rotate-6 items-center justify-center rounded-field bg-surface"
      >
        <span className="font-nunito text-[17px] font-black text-primary-deep">MIX</span>
      </div>

      <div className="relative flex max-w-[210px] flex-col gap-[10px]">
        <h1 className="text-left text-[25px] font-black leading-[1.32] text-primary-deep">
          MBTI로 알아보는{' '}
          <br />
          우리 그룹 케미
        </h1>
        <p className="text-left text-[13px] font-bold text-primary-deep opacity-85">
          친구·가족·팀의 MBTI 케미를{' '}
          <br />
          한눈에 확인해보세요.
        </p>
      </div>

      <div
        aria-hidden="true"
        className="relative mt-[22px] flex h-[54px] items-center justify-center gap-2 rounded-[18px] bg-surface text-[16px] font-black text-primary-deep shadow-md"
      >
        ＋ 새로운 케미 테스트
      </div>
    </section>
  );
};

export { HeroCard };
