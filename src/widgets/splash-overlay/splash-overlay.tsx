'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { cn } from '@/shared/lib/utils';

import type { SplashOverlayProps } from './types';

const STORAGE_KEY = 'mingle:splash-shown';

type Phase = 'visible' | 'fading' | 'done';

const noop = () => {};
const emptySubscribe = () => noop;

const getClientSnapshot = () => {
  try {
    return !sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return true;
  }
};

const getServerSnapshot = () => true;

const SplashOverlay = ({ className }: SplashOverlayProps) => {
  const shouldShow = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [phase, setPhase] = useState<Phase>('visible');

  useEffect(() => {
    if (!shouldShow) return;

    const timer = setTimeout(() => setPhase('fading'), 1200);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  useEffect(() => {
    if (phase !== 'done') return;

    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  }, [phase]);

  if (!shouldShow || phase === 'done') return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed top-0 bottom-0 left-1/2 z-50 flex w-full max-w-[390px] -translate-x-1/2 flex-col bg-green-100 transition-opacity duration-350',
        phase === 'fading' && 'opacity-0 will-change-[opacity]',
        className,
      )}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget) setPhase('done');
      }}
    >
      <div className="absolute left-[44px] top-[120px] flex h-[120px] w-[96px] animate-mx-float items-center justify-center rounded-[24px] bg-white shadow-[0_12px_26px_rgba(30,70,45,.16)]">
        <span className="font-nunito text-[22px] font-black text-analyst-fg">
          ENTP
        </span>
      </div>

      <div className="absolute right-[40px] top-[170px] flex h-[120px] w-[96px] animate-mx-float2 items-center justify-center rounded-[24px] bg-white shadow-[0_12px_26px_rgba(30,70,45,.16)]">
        <span className="font-nunito text-[22px] font-black text-sentinel-fg">
          ISFJ
        </span>
      </div>

      <div className="m-auto flex flex-col items-center gap-[18px]">
        <div className="flex h-[104px] w-[104px] animate-mx-pulse items-center justify-center rounded-[34px] bg-white shadow-[0_16px_34px_rgba(30,70,45,.18)]">
          <span className="font-nunito text-[44px] font-black text-primary">
            M
          </span>
        </div>
        <span className="font-nunito text-[46px] font-black tracking-[.01em] text-accent-foreground">
          MIXTI
        </span>
        <span className="text-[17px] font-bold text-accent-foreground opacity-[.78]">
          MBTI로 알아보는 우리 사이의 케미
        </span>
      </div>

      <div className="flex justify-center gap-2 pb-[74px]">
        <span className="h-[9px] w-[9px] animate-mx-dot rounded-full bg-white" />
        <span className="h-[9px] w-[9px] animate-mx-dot rounded-full bg-white [animation-delay:.15s]" />
        <span className="h-[9px] w-[9px] animate-mx-dot rounded-full bg-white [animation-delay:.3s]" />
      </div>
    </div>
  );
};

export { SplashOverlay };
