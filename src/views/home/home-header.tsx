'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { profileQueryOptions } from '@/entities/user';

const MbtiSetupPromptSheet = dynamic(
  () =>
    import(
      '@/features/profile/ui/mbti-setup-prompt-sheet/mbti-setup-prompt-sheet'
    ).then((m) => ({ default: m.MbtiSetupPromptSheet })),
  { ssr: false },
);

const HomeHeader = () => {
  const { data: profile } = useSuspenseQuery(profileQueryOptions());

  const nickname = profile?.nickname ?? null;
  const initials = nickname?.slice(0, 2);
  const isMbtiSetupRequired = Boolean(profile && !profile.mbti);

  return (
    <>
      <div className="flex items-center justify-between px-[24px] pt-[8px]">
        <div className="flex gap-[5px]">
          <h1 className="text-title2 font-black">안녕하세요</h1>
          <h1 className="text-title2 font-black tracking-title text-foreground">
            {nickname && <>{nickname}님</>}
            👋
          </h1>
        </div>
        <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[16px] bg-primary-tonal">
          <span className="font-nunito text-[15px] font-black text-primary-deep">
            {initials}
          </span>
        </div>
      </div>
      {isMbtiSetupRequired && <MbtiSetupPromptSheet isOpen />}
    </>
  );
};

export { HomeHeader };
