'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { login } from '@/features/auth/api/actions';
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/model/schemas';

import type { LoginFormProps } from './types';

const LoginForm = ({ className }: LoginFormProps) => {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onFormSubmit = (data: LoginFormValues) => {
    startTransition(async () => {
      const result = await login(data);
      if ('error' in result) {
        setError('root', { message: result.error });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className={cn('flex flex-col gap-5', className)}
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

      {errors.root && (
        <p className="text-center text-caption font-bold text-caution-foreground">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? '로그인 중...' : '로그인'}
      </Button>

      <p className="text-center text-[14px] font-bold text-[#8A9C90]">
        아직 계정이 없나요?{' '}
        <Link href="/signup" className="font-extrabold text-primary">
          회원가입
        </Link>
      </p>
    </form>
  );
};

export { LoginForm };
