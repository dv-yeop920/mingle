'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { CHECKLIST_ITEMS, TITLE_MESSAGES } from './constants';
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
        prev < TITLE_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, 2400);

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
    };
  }, []);

  const completedCount = progress < 34 ? 0 : progress < 67 ? 1 : 2;

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-[#F1F9F2]',
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-[34px]">
        <div className="relative h-[200px] w-[250px]">
          <div className="absolute left-[8px] top-[44px] flex h-[112px] w-[86px] animate-mx-float items-center justify-center rounded-[22px] bg-white shadow-md">
            <span className="font-nunito text-[18px] font-black text-analyst-fg">ENTP</span>
          </div>
          <div className="absolute left-[82px] top-[20px] flex h-[112px] w-[86px] animate-mx-float2 items-center justify-center rounded-[22px] bg-white shadow-lg">
            <span className="font-nunito text-[18px] font-black text-diplomat-fg">ENFP</span>
          </div>
          <div className="absolute left-[156px] top-[48px] flex h-[112px] w-[86px] items-center justify-center rounded-[22px] bg-white shadow-md animate-[mx-float_4.8s_ease-in-out_0.4s_infinite]">
            <span className="font-nunito text-[18px] font-black text-sentinel-fg">ISTJ</span>
          </div>
          <div className="absolute bottom-0 left-1/2 flex h-[70px] w-[70px] -translate-x-1/2 animate-mx-pulse items-center justify-center rounded-[26px] bg-green-100 shadow-lg">
            <span className="font-nunito text-[24px] font-black text-[#1E4630]">M</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="whitespace-pre-line text-[22px] font-black tracking-title text-foreground">
            {TITLE_MESSAGES[messageIndex]}
          </p>
          <p className="text-[14px] font-semibold text-[#7A8E80]">
            잠시만 기다려주세요 · 분석 중
          </p>
        </div>

        <div className="flex w-full flex-col gap-[10px]">
          <div className="h-[10px] overflow-hidden rounded-pill bg-[#E1EFE3]">
            <div
              className="h-full rounded-pill bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between font-nunito text-[11.5px] font-extrabold text-[#9AAB9F]">
            <span>성향 조합</span>
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
                <span className="text-[13px] font-extrabold text-primary">✓</span>
              ) : (
                <span className="animate-mx-dot text-[13px] text-[#B3C2B7]">●</span>
              )}
              <span
                className={cn(
                  'text-[13px]',
                  isCompleted
                    ? 'font-extrabold text-primary'
                    : 'font-bold text-[#B3C2B7]',
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

export { AnalysisAnimation };
