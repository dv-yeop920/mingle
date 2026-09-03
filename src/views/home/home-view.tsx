import { Suspense } from 'react';

import { cn } from '@/shared/lib/utils';

import { HeroCard, SeoIntro } from '@/features/home';

import { HomeHeaderContainer } from './home-header-container';
import { HomeResetEffect } from './home-reset-effect';
import { RecentTestsContainer } from './recent-tests-container';
import type { HomeViewProps } from './types';

const HomeView = ({ className }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <Suspense fallback={null}>
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

export { HomeView };
