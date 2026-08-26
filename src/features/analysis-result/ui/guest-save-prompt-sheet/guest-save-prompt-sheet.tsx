'use client';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';

import type { GuestSavePromptSheetProps } from './types';

const GuestSavePromptSheet = ({
  isOpen,
  onClose,
  onConfirm,
}: GuestSavePromptSheetProps) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="기록을 저장하려면"
    >
      <div className="flex flex-col gap-5">
        <p className="text-body font-semibold text-muted text-pretty">
          회원가입을 하면 기록을 저장할 수 있어요
        </p>

        <div className="flex flex-col gap-3">
          <Button type="button" variant="primary" onClick={onConfirm}>
            회원가입하기
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export { GuestSavePromptSheet };
