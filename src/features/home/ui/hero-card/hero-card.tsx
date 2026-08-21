'use client';

import { cn } from '@/shared/lib/utils';

import type { HeroCardProps } from './types';

const HeroCard = ({ onClick, className }: HeroCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative min-h-[180px] w-full cursor-pointer overflow-hidden rounded-hero bg-green-100 px-6 py-[26px] shadow-hero',
        'transition-transform duration-[120ms] active:scale-[.97]',
        className,
      )}
    >
      <div className="absolute right-[-18px] top-[22px] h-[98px] w-[78px] rounded-[20px] bg-white/55 rotate-12" />
      <div className="absolute right-[26px] top-[44px] flex h-[98px] w-[78px] items-center justify-center rounded-[20px] bg-white -rotate-6">
        <span className="font-nunito text-[17px] font-black text-primary-deep">MIX</span>
      </div>

      <div className="relative flex max-w-[210px] flex-col gap-[10px]">
        <h2 className="text-left text-[25px] font-black leading-[1.32] text-[#1E4630]">
          오늘 우리 조합은
          <br />
          어떨까?
        </h2>
        <p className="text-left text-[13px] font-bold text-[#2E6644] opacity-85">
          MBTI를 조합하고 우리 사이의 케미를 확인해보세요.
        </p>
      </div>

      <div
        className="relative mt-[22px] flex h-[54px] items-center justify-center gap-2 rounded-[18px] bg-white text-[16px] font-black text-[#2E7A4E]"
        style={{ boxShadow: '0 8px 18px rgba(30,70,45,.14)' }}
      >
        ＋ 새로운 케미 테스트
      </div>
    </button>
  );
};

export { HeroCard };