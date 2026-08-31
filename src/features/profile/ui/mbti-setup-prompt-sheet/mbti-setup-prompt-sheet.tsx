'use client';

import Link from 'next/link';

import { BottomSheet } from '@/shared/ui/bottom-sheet';

import type { MbtiSetupPromptSheetProps } from './types';

const preventDismiss = () => {};

const MbtiSetupPromptSheet = ({
  isOpen,
}: MbtiSetupPromptSheetProps) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={preventDismiss}
      title="프로필 설정이 필요해요"
    >
      <div className="flex flex-col gap-5">
        <p className="text-body font-bold text-muted text-pretty">
          MBTI를 설정하고 이용해 주세요
        </p>
        <Link
          href="/mypage/settings"
          className="flex h-[58px] w-full items-center justify-center rounded-card bg-primary text-[16px] font-extrabold text-primary-foreground shadow-lg btn-press"
        >
          MBTI 설정하기
        </Link>
      </div>
    </BottomSheet>
  );
};

export { MbtiSetupPromptSheet };
