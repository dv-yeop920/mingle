'use client';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';

import type { MbtiSetupPromptSheetProps } from './types';

const preventDismiss = () => {};

const MbtiSetupPromptSheet = ({
  isOpen,
  onConfirm,
}: MbtiSetupPromptSheetProps) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={preventDismiss}
      title="프로필 설정이 필요해요"
    >
      <div className="flex flex-col gap-5">
        <p className="text-body font-semibold text-muted text-pretty">
          MBTI를 설정하고 이용해 주세요
        </p>
        <Button type="button" variant="primary" onClick={onConfirm}>
          MBTI 설정하기
        </Button>
      </div>
    </BottomSheet>
  );
};

export { MbtiSetupPromptSheet };
