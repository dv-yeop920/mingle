import Link from 'next/link';

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

      <div className="flex flex-col gap-3 px-5 pt-5">
        <HeroCard />

        <Link
          href="/analysis"
          className="btn-press flex items-center justify-between rounded-[16px] bg-surface px-5 py-[14px] shadow-sm"
        >
          <span className="text-[14px] font-bold text-foreground">
            더 많은 MBTI 분석 보기
          </span>
          <span className="text-[13px] font-bold text-primary-deep">→</span>
        </Link>
      </div>

      <HomeResetEffect />

      <SeoIntro />

      <HomeRecentTests />
    </div>
  );
};

export { HomeView, type HomeViewProps };
