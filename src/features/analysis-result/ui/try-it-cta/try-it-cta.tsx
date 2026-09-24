import Link from 'next/link';

import { cn } from '@/shared/lib/utils';

type TryItCtaProps = {
  variant: 'compact' | 'full';
  className?: string;
  onClick?: () => void;
};

const TryItCta = ({ variant, className, onClick }: TryItCtaProps) => {
  if (variant === 'compact') {
    return (
      <Link
        href="/group-type"
        onClick={onClick}
        className={cn(
          'flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-3.5',
          className,
        )}
      >
        <span className="text-[13px] font-bold text-foreground">
          나도 우리 그룹 케미를 알아볼까?
        </span>
        <span className="text-[13px] font-extrabold text-primary">
          해보기 →
        </span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-card-lg bg-surface p-6 shadow-md',
        className,
      )}
    >
      <p className="text-center text-body font-bold text-foreground">
        우리 그룹의 MBTI 케미도 궁금하다면?
      </p>
      <Link
        href="/group-type"
        onClick={onClick}
        className="w-full rounded-button bg-primary py-[14px] text-center text-body font-extrabold text-on-primary btn-press"
      >
        나도 해보기
      </Link>
    </div>
  );
};

export { TryItCta, type TryItCtaProps };
