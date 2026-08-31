import { Suspense } from 'react';

import { cn } from '@/shared/lib/utils';

import { HeroCard, SeoIntro } from '@/features/home';

import { HomeHeaderContainer } from './home-header-container';
import { HomeResetEffect } from './home-reset-effect';
import { RecentTestsContainer } from './recent-tests-container';
import type { HomeViewProps } from './types';

const HeaderSkeleton = () => (
  <div className="flex items-center justify-between px-[24px] pt-[8px]">
    <div className="flex gap-[5px]">
      <div className="h-[28px] w-[72px] animate-pulse rounded-[8px] bg-muted/30" />
      <div className="h-[28px] w-[80px] animate-pulse rounded-[8px] bg-muted/30" />
    </div>
    <div className="h-[44px] w-[44px] animate-pulse rounded-[16px] bg-muted/30" />
  </div>
);

const RecentTestsSkeleton = () => (
  <div className="flex flex-col">
    <div className="px-[24px] pt-[26px] pb-[10px]">
      <div className="h-[20px] w-[80px] animate-pulse rounded-[6px] bg-muted/30" />
    </div>
    <div className="flex flex-col gap-[11px] px-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[80px] animate-pulse rounded-[16px] bg-muted/30"
        />
      ))}
    </div>
  </div>
);

const HomeView = ({ className }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <Suspense fallback={<HeaderSkeleton />}>
        <HomeHeaderContainer />
      </Suspense>

      <div className="px-5 pt-5">
        <HeroCard />
      </div>

      <HomeResetEffect />

      <Suspense fallback={<RecentTestsSkeleton />}>
        <RecentTestsContainer />
      </Suspense>

      <SeoIntro />
    </div>
  );
};

export { HomeView };
