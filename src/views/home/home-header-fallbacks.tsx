const HeaderSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex items-center justify-between px-[24px] pt-[8px]"
  >
    <div className="flex gap-[5px]">
      <div className="h-[28px] w-[72px] animate-pulse rounded-[8px] bg-muted/30" />
      <div className="h-[28px] w-[80px] animate-pulse rounded-[8px] bg-muted/30" />
    </div>
    <div className="h-[44px] w-[44px] animate-pulse rounded-[16px] bg-muted/30" />
  </div>
);

const HeaderError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex min-h-[52px] items-center justify-between gap-3 px-[24px] pt-[8px]">
    <p role="alert" className="text-body text-muted">
      프로필을 불러오지 못했어요.
    </p>
    <button
      type="button"
      className="min-h-[44px] rounded-[16px] bg-primary-tonal px-4 text-body font-black text-primary-deep"
      onClick={onRetry}
    >
      다시 시도
    </button>
  </div>
);

export { HeaderError, HeaderSkeleton };
