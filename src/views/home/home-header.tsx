'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { profileQueryOptions } from '@/entities/user';

import { HeaderError, HeaderSkeleton } from './home-header-fallbacks';

const MbtiSetupPromptSheet = dynamic(
  () =>
    import('@/features/profile/ui/mbti-setup-prompt-sheet/mbti-setup-prompt-sheet').then(
      (m) => ({ default: m.MbtiSetupPromptSheet }),
    ),
  { ssr: false },
);

type HomeHeaderProps = {
  userId: string | null;
};

type HeaderContentProps = {
  nickname: string | null;
  isMbtiSetupRequired?: boolean;
};

const HeaderContent = ({
  nickname,
  isMbtiSetupRequired = false,
}: HeaderContentProps) => {
  const initials = nickname?.slice(0, 2);

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

const MemberHomeHeader = ({ userId }: { userId: string }) => {
  const {
    data: profile,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery(profileQueryOptions(userId));
  const isInitialFetching = profile === undefined && isPending && isFetching;

  return (
    <div aria-busy={isInitialFetching}>
      {isInitialFetching ? (
        <HeaderSkeleton />
      ) : isError && profile === undefined ? (
        <HeaderError onRetry={() => void refetch()} />
      ) : (
        <HeaderContent
          nickname={profile?.nickname ?? null}
          isMbtiSetupRequired={Boolean(profile && !profile.mbti)}
        />
      )}
    </div>
  );
};

const HomeHeader = ({ userId }: HomeHeaderProps) => {
  if (!userId) {
    return <HeaderContent nickname={null} />;
  }

  return <MemberHomeHeader userId={userId} />;
};

export { HomeHeader };
