import Link from 'next/link';

import { cn } from '@/shared/lib/utils';

type CompatibilityCardProps = {
  className?: string;
};

const CompatibilityCard = ({ className }: CompatibilityCardProps) => {
  return (
    <Link
      href="/compatibility"
      aria-label="1:1 MBTI 궁합 분석하기"
      className={cn(
        'btn-press relative block w-full overflow-hidden rounded-hero bg-compat-bg px-6 py-[22px] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-compat focus-visible:ring-inset',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute right-[20px] top-1/2 flex -translate-y-1/2 items-center gap-1"
      >
        <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
          <span className="font-nunito text-[11px] font-black text-compat">ENFP</span>
        </div>
        <span className="text-[14px] font-black text-compat/60">×</span>
        <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
          <span className="font-nunito text-[11px] font-black text-compat-accent">INTJ</span>
        </div>
      </div>

      <div className="relative flex max-w-[180px] flex-col gap-[6px]">
        <h2 className="text-left text-[18px] font-black leading-[1.35] text-compat">
          1:1 MBTI 궁합
        </h2>
        <p className="text-left text-[12px] font-bold text-compat-muted">
          두 사람의 MBTI 궁합을{' '}
          <br />
          AI가 분석해드려요
        </p>
      </div>
    </Link>
  );
};

export { CompatibilityCard, type CompatibilityCardProps };
