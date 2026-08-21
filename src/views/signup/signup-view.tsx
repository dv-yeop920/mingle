import { cn } from '@/shared/lib/utils';

import { SignupForm } from '@/features/auth';

import type { SignupViewProps } from './types';

const SignupView = ({ className }: SignupViewProps) => {
  return (
    <div className={cn('flex flex-col gap-6 px-7 pt-7', className)}>
      <div className="flex flex-col gap-[6px]">
        <h1 className="text-[27px] font-black tracking-title text-foreground">
          3초면 시작할 수 있어요
        </h1>
        <p className="text-[14px] font-semibold text-[#7A8E80]">
          닉네임만 정하면 준비 완료입니다.
        </p>
      </div>

      <SignupForm />
    </div>
  );
};

export { SignupView };
