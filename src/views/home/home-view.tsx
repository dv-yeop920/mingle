import { Suspense } from 'react';

import { cn } from '@/shared/lib/utils';

import { HeroCard } from '@/features/home';
import { MbtiSetupPromptSheet } from '@/features/profile';

import { HomeResetEffect } from './home-reset-effect';
import { RecentTestsSection } from './recent-tests-section';
import type { HomeViewProps } from './types';

const HomeView = ({ nickname, isMbtiSetupRequired, className }: HomeViewProps) => {
  const initials = nickname?.slice(0, 2);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-[24px] pt-[8px]">
        {nickname ? (
          <>
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-bold text-hint">안녕하세요</span>
              <span className="text-[21px] font-black tracking-title text-foreground">
                {nickname}님 👋
              </span>
            </div>
            <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[16px] bg-primary-tonal">
              <span className="font-nunito text-[15px] font-black text-primary-deep">
                {initials}
              </span>
            </div>
          </>
        ) : (
          <span className="text-[21px] font-black tracking-title text-foreground">
            안녕하세요 👋
          </span>
        )}
      </div>
      <div className="px-5 pt-5">
        <HeroCard />
      </div>
      <HomeResetEffect />
      {nickname && (
        <Suspense>
          <RecentTestsSection />
        </Suspense>
      )}
      <MbtiSetupPromptSheet isOpen={isMbtiSetupRequired} />
    </div>
  );
};

export { HomeView };
