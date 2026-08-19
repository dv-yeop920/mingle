import { cn } from '@/shared/lib/utils';

import type { SplashViewProps } from './types';

const SplashView = ({ className }: SplashViewProps) => {
  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col items-center justify-center bg-background',
        className,
      )}
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

export { SplashView, type SplashViewProps };