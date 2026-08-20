'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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

const LoginForm = ({ onSignupClick, className }: LoginFormProps) => {
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
        label="아이디"
        placeholder="아이디를 입력하세요"
        error={errors.username?.message}
        {...register('username')}
      />
      <TextField
        label="비밀번호"
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

      <p className="text-center text-caption text-muted">
        계정이 없으신가요?{' '}
        <button
          type="button"
          onClick={onSignupClick}
          className="cursor-pointer font-bold text-primary-deep underline"
        >
          회원가입
        </button>
      </p>
    </form>
  );
};

export { LoginForm, type LoginFormProps };
