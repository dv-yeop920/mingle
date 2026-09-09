import { cn } from '@/shared/lib/utils';

import { MyPageContent } from './my-page-content';

type MyPageViewProps = {
  userId: string;
  className?: string;
};

const MyPageView = ({ userId, className }: MyPageViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="px-6 pt-[10px] pb-[20px]">
        <h1 className="text-[23px] font-black tracking-title text-foreground">
          My
        </h1>
      </div>
      <MyPageContent userId={userId} />
    </div>
  );
};

export { MyPageView, type MyPageViewProps };
