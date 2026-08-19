'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { ProgressBar } from '@/shared/ui/progress-bar';

import { LOADING_MESSAGES } from './constants';
import type { AnalysisAnimationProps } from './types';

const AnalysisAnimation = ({ className }: AnalysisAnimationProps) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + 1));
    }, 80);

    const messageTimer = setInterval(() => {
      setMessageIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, 1600);

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-8 px-6',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-[72px] w-[72px] items-center justify-center">
          <div className="h-[48px] w-[48px] animate-spin rounded-full border-[3px] border-border-inner border-t-primary" />
        </div>
        <p className="text-center text-body font-bold text-foreground">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>

      <div className="w-full max-w-[280px]">
        <ProgressBar value={progress} />
      </div>
    </div>
  );
};

export { AnalysisAnimation, type AnalysisAnimationProps };