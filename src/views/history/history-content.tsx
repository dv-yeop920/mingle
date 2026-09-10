'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';

import { useAnalyses } from '@/entities/analysis';

import { HistoryFilter, HistoryList } from '@/features/history';

const HistoryContentSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col">
    <div className="flex items-center justify-between px-[24px] pt-[10px]">
      <div className="h-[28px] w-[120px] animate-pulse rounded-[8px] bg-muted/20" />
    </div>
    <div className="px-[24px] pt-[16px]">
      <div className="flex gap-[8px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[32px] w-[56px] animate-pulse rounded-full bg-muted/20"
          />
        ))}
      </div>
    </div>
    <div className="flex flex-col gap-[11px] px-5 pt-[18px]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[80px] animate-pulse rounded-[16px] bg-muted/20"
        />
      ))}
    </div>
  </div>
);

const HistoryContent = () => {
  const router = useRouter();
  const { userId, isPending: isAuthPending } = useAuthUserId();
  const [activeFilter, setActiveFilter] = useState('all');
  const { data: analyses, isPending: isDataPending } = useAnalyses(userId);
  const totalCount = analyses?.length ?? 0;

  useEffect(() => {
    if (!isAuthPending && !userId) {
      router.replace('/login');
    }
  }, [isAuthPending, userId, router]);

  if (isAuthPending) return <HistoryContentSkeleton />;
  if (!userId) return null;

  return (
    <>
      <div className="flex items-center justify-between px-[24px] pt-[10px]">
        <h1 className="text-[23px] font-black tracking-title text-foreground">
          테스트 기록
        </h1>
        {!isDataPending && (
          <span className="font-nunito text-[13px] font-extrabold text-hint">
            {totalCount}
          </span>
        )}
      </div>
      <div className="px-[24px] pt-[16px]">
        <HistoryFilter
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>
      <div className="px-5 pt-[18px]">
        <HistoryList userId={userId} filterType={activeFilter} />
      </div>
    </>
  );
};

export { HistoryContent };
