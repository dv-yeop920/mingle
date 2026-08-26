'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { queryKeys } from '@/shared/config/query-keys';
import { trackSignup } from '@/shared/lib/analytics';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { signup } from '@/features/auth/api/actions';
import {
  signupSchema,
  type SignupFormValues,
} from '@/features/auth/model/schemas';

import type { SignupFormProps } from './types';

const SignupForm = ({ className, redirectTo }: SignupFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onFormSubmit = (data: SignupFormValues) => {
    startTransition(async () => {
      const result = await signup(data, redirectTo);
      if ('error' in result) {
        setError('root', { message: result.error });
        return;
      }
      trackSignup();
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      router.push(result.redirectTo);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className={cn('flex flex-1 flex-col', className)}
    >
      <div className="flex flex-col gap-[13px]">
        <TextField
          label="Nickname"
          placeholder="8글자 이하"
          error={errors.nickname?.message}
          {...register('nickname')}
        />
        <TextField
          label="ID"
          placeholder="영어, 숫자만 가능"
          error={errors.username?.message}
          {...register('username')}
        />
        <TextField
          label="Password"
          type="password"
          placeholder="영어 + 숫자 + 특수문자, 6자 이상"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Password Confirm"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </div>

      {errors.root && (
        <p className="mt-4 text-center text-caption font-bold text-caution-foreground">
          {errors.root.message}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-[14px] pb-[46px]">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '가입 중...' : '가입하고 시작하기'}
        </Button>

        <p className="text-center text-[13px] font-bold text-[#8A9C90]">
          이미 계정이 있나요?{' '}
          <Link
            href={redirectTo ? `/login?redirect=${redirectTo}` : '/login'}
            className="font-extrabold text-primary"
          >
            로그인
          </Link>
        </p>
      </div>
    </form>
  );
};

export { SignupForm };
