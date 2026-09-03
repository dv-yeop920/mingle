'use client';

import { useQuery } from '@tanstack/react-query';

import { analysesQueryOptions } from '@/entities/analysis';

import { RecentTests } from '@/features/home';

type RecentTestsSectionProps = {
  userId: string;
};

const RecentTestsSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col">
    <div className="px-[24px] pt-[26px] pb-[10px]">
      <div className="h-[20px] w-[80px] animate-pulse rounded-[6px] bg-muted/30" />
    </div>
    <div className="flex flex-col gap-[11px] px-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-[80px] animate-pulse rounded-[16px] bg-muted/30"
        />
      ))}
    </div>
  </div>
);

const RecentTestsError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col px-5 pt-[26px]">
    <h3 className="text-[16px] font-black text-foreground">최근 테스트</h3>
    <div className="flex min-h-[80px] items-center justify-between gap-3">
      <p role="alert" className="text-body text-muted">
        테스트 기록을 불러오지 못했어요.
      </p>
      <button
        type="button"
        className="min-h-[44px] rounded-[16px] bg-primary-tonal px-4 text-body font-black text-primary-deep"
        onClick={onRetry}
      >
        다시 시도
      </button>
    </div>
  </div>
);

const RecentTestsSection = ({ userId }: RecentTestsSectionProps) => {
  const {
    data: analyses,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery(analysesQueryOptions(userId));
  const isInitialFetching = analyses === undefined && isPending && isFetching;

  return (
    <section aria-busy={isInitialFetching}>
      {isInitialFetching ? (
        <RecentTestsSkeleton />
      ) : isError && analyses === undefined ? (
        <RecentTestsError onRetry={() => void refetch()} />
      ) : (
        <RecentTests analyses={analyses ?? []} />
      )}
    </section>
  );
};

export { RecentTestsSection };
