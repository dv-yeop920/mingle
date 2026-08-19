import { cn } from '@/shared/lib/utils';

import { SignupForm } from '@/features/auth';

import type { SignupViewProps } from './types';

const SignupView = ({ className }: SignupViewProps) => {
  return (
    <div className={cn('flex flex-col gap-8 px-5 pt-16', className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-title1 font-black text-foreground">회원가입</h1>
        <p className="text-body text-muted">계정을 만들고 시작하세요</p>
      </div>

      <SignupForm />
    </div>
  );
};

export { SignupView, type SignupViewProps };