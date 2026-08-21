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

    const timer = setTimeout(() => setPhase('fading'), 2000);
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
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500',
        phase === 'fading' && 'opacity-0',
        className,
      )}
      onTransitionEnd={() => setPhase('done')}
    >
      <h1 className="font-nunito text-[42px] font-black tracking-tight text-primary">
        MINGLE
      </h1>
      <p className="mt-2 text-caption text-muted">MBTI 그룹 케미 시뮬레이터</p>

      <div className="mt-12 flex gap-[6px]">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
      </div>
    </div>
  );
};

export { SplashOverlay };
