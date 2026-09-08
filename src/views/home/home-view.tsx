import { cn } from '@/shared/lib/utils';

import { HeroCard, SeoIntro } from '@/features/home';

import { HomeHeader } from './home-header';
import { HomeRecentTests } from './home-recent-tests';
import { HomeResetEffect } from './home-reset-effect';

type HomeViewProps = {
  className?: string;
};

const HomeView = ({ className }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <HomeHeader />

      <div className="px-5 pt-5">
        <HeroCard />
      </div>

      <HomeResetEffect />

      <HomeRecentTests />

      <SeoIntro />
    </div>
  );
};

export { HomeView, type HomeViewProps };
