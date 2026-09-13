'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { CHECKLIST_ITEMS, TITLE_MESSAGES } from './constants';

type CompatibilityAnimationProps = {
  progress?: number;
  mbtiA?: string;
  mbtiB?: string;
  className?: string;
};

const CompatibilityAnimation = ({
  progress: externalProgress,
  mbtiA = 'ENFP',
  mbtiB = 'INTJ',
  className,
}: CompatibilityAnimationProps) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const [uncontrolledMessageIndex, setUncontrolledMessageIndex] = useState(0);

  const isControlled = externalProgress !== undefined;
  const progress = isControlled ? externalProgress : internalProgress;

  useEffect(() => {
    if (isControlled) return;

    const progressTimer = setInterval(() => {
      setInternalProgress((prev) => (prev >= 95 ? 95 : prev + 1));
    }, 200);

    const messageTimer = setInterval(() => {
      setUncontrolledMessageIndex((prev) =>
        prev < TITLE_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, 2400);

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
    };
  }, [isControlled]);

  const messageIndex = isControlled
    ? (progress >= 67 ? 2 : progress >= 34 ? 1 : 0)
    : uncontrolledMessageIndex;

  const completedCount = progress < 34 ? 0 : progress < 67 ? 1 : 2;

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-compat-bg',
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-[34px]">
        <div className="relative flex h-[200px] w-[220px] items-center justify-center">
          <div className="absolute left-[16px] top-[40px] flex h-[112px] w-[86px] animate-mx-float items-center justify-center rounded-[22px] bg-white shadow-md">
            <span className="font-nunito text-[18px] font-black text-compat">{mbtiA}</span>
          </div>
          <div className="absolute right-[16px] top-[40px] flex h-[112px] w-[86px] animate-mx-float2 items-center justify-center rounded-[22px] bg-white shadow-md">
            <span className="font-nunito text-[18px] font-black text-compat-accent">{mbtiB}</span>
          </div>
          <div className="absolute bottom-0 left-1/2 flex h-[70px] w-[70px] -translate-x-1/2 animate-mx-pulse items-center justify-center rounded-[26px] bg-compat-surface shadow-lg">
            <span className="text-[28px]">💕</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="whitespace-pre-line text-[22px] font-black tracking-title text-foreground">
            {TITLE_MESSAGES[messageIndex]}
          </p>
          <p className="text-[14px] font-bold text-compat-muted">
            잠시만 기다려주세요 · 분석 중
          </p>
        </div>

        <div className="flex w-full flex-col gap-[10px]">
          <div className="h-[10px] overflow-hidden rounded-pill bg-compat-surface">
            <div
              className="h-full w-full origin-left rounded-pill bg-compat transition-transform duration-200 ease-out will-change-transform"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <div className="flex justify-between font-nunito text-[11.5px] font-extrabold text-compat-muted">
            <span>궁합 분석</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[9px] px-[34px] pb-[60px]">
        {CHECKLIST_ITEMS.map((item, i) => {
          const isCompleted = i < completedCount;
          const isInProgress = i === completedCount;

          if (!isCompleted && !isInProgress) return null;

          return (
            <div key={item} className="flex items-center gap-[9px]">
              {isCompleted ? (
                <span className="text-[13px] font-extrabold text-compat">✓</span>
              ) : (
                <span className="animate-mx-dot text-[13px] text-compat-hint">●</span>
              )}
              <span
                className={cn(
                  'text-[13px]',
                  isCompleted
                    ? 'font-extrabold text-compat'
                    : 'font-bold text-compat-hint',
                )}
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { CompatibilityAnimation };
