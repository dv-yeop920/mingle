'use client';

import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';

import { MAX_MEMBER_COUNT, MIN_MEMBER_COUNT } from './constants';
import type { MemberCountModalProps } from './types';

const MemberCountModal = ({
  isOpen,
  onClose,
  onConfirm,
}: MemberCountModalProps) => {
  const [value, setValue] = useState(String(MIN_MEMBER_COUNT));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setValue(raw);
  };

  const clamp = (v: string) => {
    const num = Number(v);
    if (!v || Number.isNaN(num) || num < MIN_MEMBER_COUNT)
      return MIN_MEMBER_COUNT;
    if (num > MAX_MEMBER_COUNT) return MAX_MEMBER_COUNT;
    return num;
  };

  const handleBlur = () => {
    const convertValueType = String(clamp(value));
    setValue(convertValueType);
  };

  const handleConfirm = () => {
    const clamped = clamp(value);
    setValue(String(clamped));
    onConfirm(clamped);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="인원 수 입력">
      <div className="flex flex-col gap-6">
        <p className="text-body text-muted">
          본인 포함 총 인원 수를 입력하세요
        </p>

        <div className="flex items-center justify-center">
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-[80px] border-b-2 border-primary bg-transparent text-center font-nunito text-[40px] font-black text-foreground outline-none"
          />
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
