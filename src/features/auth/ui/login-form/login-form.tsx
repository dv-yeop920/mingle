'use client';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import type { LoginFormProps } from './types';

const LoginForm = ({ onSubmit, onSignupClick, className }: LoginFormProps) => {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <TextField label="아이디" placeholder="아이디를 입력하세요" />
      <TextField label="비밀번호" type="password" placeholder="비밀번호를 입력하세요" />

      <Button variant="primary" onClick={onSubmit}>
        로그인
      </Button>

      <p className="text-center text-caption text-muted">
        계정이 없으신가요?{' '}
        <button type="button" onClick={onSignupClick} className="cursor-pointer font-bold text-primary-deep underline">
          회원가입
        </button>
      </p>
    </div>
  );
};

export { LoginForm };
export type { LoginFormProps } from './types';
