'use client';

type HomeAuthErrorContentProps = {
  onRetry: () => void;
  isPending: boolean;
  variant: 'header' | 'recent-tests';
};

const HomeAuthErrorContent = ({
  onRetry,
  isPending,
  variant,
}: HomeAuthErrorContentProps) => (
  <div
    aria-busy={isPending}
    className={
      variant === 'header'
        ? 'flex min-h-[52px] items-center justify-between gap-3 px-[24px] pt-[8px]'
        : 'mx-[24px] flex items-center justify-between gap-3 rounded-card bg-surface p-4'
    }
  >
    <p role="alert" className="text-body text-muted">
      로그인 상태를 확인하지 못했어요.
    </p>
    <button
      type="button"
      onClick={onRetry}
      disabled={isPending}
      className="min-h-[44px] shrink-0 rounded-[16px] bg-primary-tonal px-4 text-body font-black text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus disabled:opacity-50"
    >
      {isPending ? '확인 중' : '다시 시도'}
    </button>
  </div>
);

export { HomeAuthErrorContent };
