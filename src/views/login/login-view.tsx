import { cn } from '@/shared/lib/utils';

import { LoginForm } from '@/features/auth';

import type { LoginViewProps } from './types';

const LoginView = ({ className, redirectTo }: LoginViewProps) => {
  return (
    <div className={cn('flex min-h-dvh flex-col px-7 pt-[44px]', className)}>
      <div className="flex flex-col gap-2">
        <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-green-100">
          <span className="font-nunito text-[26px] font-black text-accent-foreground">
            M
          </span>
        </div>
        <h1 className="text-[30px] font-black tracking-title text-foreground">
          다시 만나서 반가워요
        </h1>
        <p className="text-[15px] font-semibold text-subtitle">
          로그인하고 우리 조합을 확인해보세요.
        </p>
      </div>

      <div className="pt-[34px]">
        <LoginForm redirectTo={redirectTo} />
      </div>

      <p className="mt-auto pb-[46px] text-center text-[12px] font-semibold text-disabled-foreground">
        MIXTI는 MBTI 조합을 재미로 분석하는 서비스입니다.
      </p>
    </div>
  );
};

export { LoginView };
