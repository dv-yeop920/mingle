import { Suspense } from 'react';

import { cn } from '@/shared/lib/utils';

import { HeroCard, SeoIntro } from '@/features/home';

import { HomeHeaderContainer } from './home-header-container';
import { HomeHeaderPending } from './home-header-pending';
import { HomeResetEffect } from './home-reset-effect';
import { RecentTestsContainer } from './recent-tests-container';

type HomeViewProps = {
  className?: string;
};

const HomeView = ({ className }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <Suspense fallback={<HomeHeaderPending />}>
        <HomeHeaderContainer />
      </Suspense>

      <div className="px-5 pt-5">
        <HeroCard />
      </div>

      <HomeResetEffect />

      <Suspense fallback={null}>
        <RecentTestsContainer />
      </Suspense>

      <SeoIntro />
    </div>
  );
};

export { HomeView, type HomeViewProps };
