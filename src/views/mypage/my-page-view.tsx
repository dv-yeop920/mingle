import { cn } from '@/shared/lib/utils';

import { MyPageView } from '@/features/profile';

import type { MyPageContainerViewProps } from './types';

const MyPageContainerView = ({ className }: MyPageContainerViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <MyPageView />
    </div>
  );
};

export { MyPageContainerView, type MyPageContainerViewProps };