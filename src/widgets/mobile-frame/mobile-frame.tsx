import { cn } from '@/shared/lib/utils';

import type { MobileFrameProps } from './types';

const MobileFrame = ({ children, className }: MobileFrameProps) => {
  return (
    <div
      className={cn(
        'mx-auto min-h-dvh w-full max-w-[390px] overflow-x-clip bg-background pt-[max(12px,env(safe-area-inset-top))]',
        className,
      )}
    >
      {children}
    </div>
  );
};

export { MobileFrame };
