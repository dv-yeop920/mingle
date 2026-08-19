import { cn } from '@/shared/lib/utils';

import { HeroCard, RecentTests } from '@/features/home';

import type { HomeViewProps } from './types';

const HomeView = ({ className }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col gap-6 px-5 pt-6', className)}>
      <HeroCard />
      <RecentTests />
    </div>
  );
};

export { HomeView, type HomeViewProps };
