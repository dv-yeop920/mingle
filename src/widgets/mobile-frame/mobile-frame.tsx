import { cn } from '@/shared/lib/utils';

import type { MobileFrameProps } from './types';

const MobileFrame = ({ children, className }: MobileFrameProps) => {
  return (
    <div className={cn('mx-auto max-w-[390px] min-h-dvh bg-background', className)}>
      {children}
    </div>
  );
};

export { MobileFrame };
export type { MobileFrameProps } from './types';
