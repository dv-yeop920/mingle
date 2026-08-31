'use client';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';

import type { DeleteAccountSheetProps } from './types';

const DeleteAccountSheet = ({
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: DeleteAccountSheetProps) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="정말 탈퇴하시겠어요?">
      <div className="flex flex-col gap-5">
        <p className="text-body font-bold text-muted text-pretty">
          탈퇴하면 모든 테스트 기록과 분석 결과가 삭제되며 복구할 수 없어요.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onConfirm}
            className="!border-caution !text-caution"
          >
            {isPending ? '탈퇴 처리 중...' : '탈퇴하기'}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={onClose}
          >
            취소
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export { DeleteAccountSheet };
