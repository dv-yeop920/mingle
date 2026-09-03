'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { trackLogin } from '@/shared/lib/analytics';
import { clearAuthQueryCache } from '@/shared/lib/react-query/clear-auth-query-cache';
import { useGuardedAction } from '@/shared/lib/use-guarded-action';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { login } from '@/features/auth/api/actions';
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/model/schemas';

import type { LoginFormProps } from './types';

const LoginForm = ({ className, redirectTo }: LoginFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRemember, setIsRemember] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const [guardedSubmit, isPending] = useGuardedAction(
    async (data: LoginFormValues) => {
      const result = await login(data, redirectTo);
      if ('error' in result) {
        setError('root', { message: result.error });
        return;
      }
      trackLogin();
      await clearAuthQueryCache(queryClient);
      router.push(result.redirectTo);
    },
  );

  return (
    <form
      onSubmit={handleSubmit(guardedSubmit)}
      className={cn('flex flex-col gap-[14px]', className)}
    >
      <TextField
        label="ID"
        placeholder="아이디를 입력하세요"
        error={errors.username?.message}
        {...register('username')}
      />
      <TextField
        label="Password"
        type="password"
        placeholder="비밀번호를 입력하세요"
        error={errors.password?.message}
        {...register('password')}
      />

      <button
        type="button"
        onClick={() => setIsRemember((prev) => !prev)}
        className="flex items-center gap-[9px] px-1 pt-1"
      >
        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-[7px] text-[12px] font-black text-white',
            isRemember ? 'bg-primary' : 'bg-neutral-300',
          )}
        >
          {isRemember && '✓'}
        </div>
        <span className="text-[13px] font-bold text-muted">
          로그인 상태 유지
        </span>
      </button>

      {errors.root && (
        <p className="text-center text-caption font-bold text-caution-foreground">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? '로그인 중...' : '로그인'}
      </Button>

      <p className="mt-[2px] text-center text-[14px] font-bold text-subtitle">
        아직 계정이 없나요?{' '}
        <Link
          href={redirectTo ? `/signup?redirect=${redirectTo}` : '/signup'}
          className="font-extrabold text-primary"
        >
          회원가입
        </Link>
      </p>
    </form>
  );
};

export { LoginForm };
