'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getTemperamentStyles } from '@/shared/lib/mbti';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';
import { Button } from '@/shared/ui/button';

import { MbtiPicker } from '@/entities/mbti';
import { useProfile } from '@/entities/user';

import { useCompatibilityStore } from '@/features/compatibility';

type CompatibilityInputViewProps = {
  className?: string;
};

const MbtiSlot = ({
  label,
  mbti,
  onClick,
}: {
  label: string;
  mbti: MbtiType | null;
  onClick: () => void;
}) => {
  const styles = mbti ? getTemperamentStyles(mbti) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[140px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] shadow-sm btn-press',
        mbti ? styles?.bg : 'border-2 border-dashed border-muted/40 bg-surface',
      )}
    >
      <span className="text-[13px] font-bold text-muted">{label}</span>
      {mbti ? (
        <span className={cn('font-nunito text-[28px] font-black', styles?.fg)}>
          {mbti}
        </span>
      ) : (
        <span className="text-[24px] font-black text-muted/40">?</span>
      )}
    </button>
  );
};

const CompatibilityInputView = ({ className }: CompatibilityInputViewProps) => {
  const router = useRouter();
  const { userId } = useAuthUserId();
  const { data: profile } = useProfile(userId);

  const mbtiA = useCompatibilityStore((s) => s.mbtiA);
  const mbtiB = useCompatibilityStore((s) => s.mbtiB);
  const nicknameA = useCompatibilityStore((s) => s.nicknameA);
  const nicknameB = useCompatibilityStore((s) => s.nicknameB);
  const setMbtiA = useCompatibilityStore((s) => s.setMbtiA);
  const setMbtiB = useCompatibilityStore((s) => s.setMbtiB);
  const setNicknameA = useCompatibilityStore((s) => s.setNicknameA);
  const setNicknameB = useCompatibilityStore((s) => s.setNicknameB);

  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null);

  const userMbti = profile?.mbti as MbtiType | null;

  const handleAutoFill = () => {
    if (userMbti && !mbtiA) {
      setMbtiA(userMbti);
      if (profile?.nickname) {
        setNicknameA(profile.nickname);
      }
    }
  };

  const handleSelect = (mbti: MbtiType) => {
    if (pickerTarget === 'A') {
      setMbtiA(mbti);
    } else {
      setMbtiB(mbti);
    }
    setPickerTarget(null);
  };

  const handleStart = () => {
    if (!mbtiA || !mbtiB) return;
    router.push('/compatibility/analyzing');
  };

  const isReady = mbtiA !== null && mbtiB !== null;

  return (
    <div className={cn('flex flex-col gap-6 px-5 pb-8 pt-5', className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-black text-foreground">
          1:1 MBTI 궁합
        </h1>
        <p className="text-[14px] font-bold text-muted">
          두 사람의 MBTI를 선택하면 궁합을 분석해드려요
        </p>
      </div>

      {userMbti && !mbtiA && (
        <button
          type="button"
          onClick={handleAutoFill}
          className="cursor-pointer rounded-[14px] bg-primary/10 px-4 py-3 text-left text-[13px] font-bold text-primary btn-press"
        >
          내 MBTI ({userMbti}) 자동 입력하기
        </button>
      )}

      <div className="flex gap-3">
        <MbtiSlot
          label="첫 번째 사람"
          mbti={mbtiA}
          onClick={() => setPickerTarget('A')}
        />
        <div className="flex items-center">
          <span className="text-[24px] font-black text-muted/60">×</span>
        </div>
        <MbtiSlot
          label="두 번째 사람"
          mbti={mbtiB}
          onClick={() => setPickerTarget('B')}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="닉네임 (선택)"
            value={nicknameA}
            onChange={(e) => setNicknameA(e.target.value.slice(0, 8))}
            className="h-[48px] min-w-0 flex-1 rounded-[14px] bg-surface px-4 text-[14px] font-bold text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            placeholder="닉네임 (선택)"
            value={nicknameB}
            onChange={(e) => setNicknameB(e.target.value.slice(0, 8))}
            className="h-[48px] min-w-0 flex-1 rounded-[14px] bg-surface px-4 text-[14px] font-bold text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <Button
        variant="primary"
        disabled={!isReady}
        onClick={handleStart}
      >
        궁합 분석하기
      </Button>

      <MbtiPicker
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleSelect}
      />
    </div>
  );
};

export { CompatibilityInputView };
