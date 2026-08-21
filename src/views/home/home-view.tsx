'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { useProfile } from '@/entities/user';

import { HeroCard, RecentTests } from '@/features/home';

import type { HomeViewProps } from './types';

const HomeView = ({ className }: HomeViewProps) => {
  const router = useRouter();
  const { data: profile } = useProfile();
  const nickname = profile?.nickname ?? '';
  const initials = nickname.slice(0, 2);

  return (
    <div className={cn('flex flex-col gap-5 px-5 pt-2', className)}>
      <div className="flex items-center justify-between">
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
      </div>
      <HeroCard onClick={() => router.push('/group-type')} />
      <RecentTests />
    </div>
  );
};

export { HomeView };
