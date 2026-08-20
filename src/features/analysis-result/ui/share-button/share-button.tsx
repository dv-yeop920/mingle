'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import type { ShareButtonProps } from './types';

const ShareButton = ({ analysisId, className }: ShareButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    const url = analysisId
      ? `${window.location.origin}/result?id=${analysisId}`
      : window.location.href;

    const shareData = {
      title: 'MINGLE 케미 분석 결과',
      text: '우리 그룹의 MBTI 케미를 확인해보세요!',
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled share
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button
      variant="tonal"
      onClick={handleShare}
      className={cn('gap-2', className)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {isCopied ? '링크가 복사되었습니다' : '결과 공유하기'}
    </Button>
  );
};

export { ShareButton, type ShareButtonProps };
