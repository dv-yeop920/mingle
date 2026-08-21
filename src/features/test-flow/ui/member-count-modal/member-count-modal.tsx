'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';

import { MAX_MEMBER_COUNT, MIN_MEMBER_COUNT } from './constants';
import type { MemberCountModalProps } from './types';

const MemberCountModal = ({ isOpen, onClose, onConfirm }: MemberCountModalProps) => {
  const [count, setCount] = useState(MIN_MEMBER_COUNT);

  const handleDecrement = () => {
    setCount((prev) => Math.max(MIN_MEMBER_COUNT, prev - 1));
  };

  const handleIncrement = () => {
    setCount((prev) => Math.min(MAX_MEMBER_COUNT, prev + 1));
  };

  const handleConfirm = () => {
    onConfirm(count);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="인원 수 입력">
      <div className="flex flex-col gap-6">
        <p className="text-body text-muted">본인 포함 총 인원 수를 선택하세요</p>

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={count <= MIN_MEMBER_COUNT}
            className={cn(
              'flex h-[48px] w-[48px] items-center justify-center rounded-full text-[24px] font-bold btn-press',
              count <= MIN_MEMBER_COUNT
                ? 'cursor-not-allowed bg-disabled text-disabled-foreground'
                : 'cursor-pointer bg-surface-alt text-foreground',
            )}
          >
            −
          </button>

          <span className="min-w-[48px] text-center font-nunito text-[40px] font-black text-foreground">
            {count}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={count >= MAX_MEMBER_COUNT}
            className={cn(
              'flex h-[48px] w-[48px] items-center justify-center rounded-full text-[24px] font-bold btn-press',
              count >= MAX_MEMBER_COUNT
                ? 'cursor-not-allowed bg-disabled text-disabled-foreground'
                : 'cursor-pointer bg-primary text-primary-foreground',
            )}
          >
            +
          </button>
        </div>

        <p className="text-center text-caption text-hint">
          최소 {MIN_MEMBER_COUNT}명 · 최대 {MAX_MEMBER_COUNT}명
        </p>

        <Button variant="primary" onClick={handleConfirm}>
          확인
        </Button>
      </div>
    </BottomSheet>
  );
};

export { MemberCountModal };
