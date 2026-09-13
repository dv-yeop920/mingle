'use client';

import { Button } from '@/shared/ui';

type GenerateProfileButtonProps = {
  isLoading: boolean;
  isRegenerate: boolean;
  onClick: () => void;
};

const GenerateProfileButton = ({
  isLoading,
  isRegenerate,
  onClick,
}: GenerateProfileButtonProps) => (
  <Button
    variant={isRegenerate ? 'tonal' : 'primary'}
    disabled={isLoading}
    onClick={onClick}
    className="rounded-[16px] py-4 text-[16px] font-bold"
  >
    {isLoading
      ? '분석 중...'
      : isRegenerate
        ? '다시 분석하기'
        : '내 MBTI 분석해보기'}
  </Button>
);

export { GenerateProfileButton };
