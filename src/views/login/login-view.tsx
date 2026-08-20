import { cn } from '@/shared/lib/utils';

import { LoginForm } from '@/features/auth';

import type { LoginViewProps } from './types';

const LoginView = ({ className }: LoginViewProps) => {
  return (
    <div className={cn('flex flex-col gap-8 px-5 pt-16', className)}>
      <div className="flex flex-col gap-2">
        <h1 className="font-nunito text-[32px] font-black tracking-tight text-primary">
          MINGLE
        </h1>
        <p className="text-body text-muted">로그인하고 그룹 케미를 확인하세요</p>
      </div>

      <LoginForm />
    </div>
  );
};

export { LoginView };