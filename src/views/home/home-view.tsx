import { cn } from '@/shared/lib/utils';

import { HeroCard, SeoIntro } from '@/features/home';

import { HomeHeader } from './home-header';
import { HomeResetEffect } from './home-reset-effect';
import { RecentTestsSection } from './recent-tests-section';
import type { HomeViewProps } from './types';

const HomeView = ({ className, userId }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <HomeHeader userId={userId} />

      <div className="px-5 pt-5">
        <HeroCard />
      </div>

      <HomeResetEffect />

      {userId && <RecentTestsSection userId={userId} />}

      <SeoIntro />
    </div>
  );
};

export { HomeView };
