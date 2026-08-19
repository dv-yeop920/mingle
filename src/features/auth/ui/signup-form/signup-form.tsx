'use client';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import type { SignupFormProps } from './types';

const SignupForm = ({ onSubmit, onLoginClick, className }: SignupFormProps) => {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <TextField label="닉네임" placeholder="8글자 이하" />
      <TextField label="아이디" placeholder="영어, 숫자만 가능" />
      <TextField label="비밀번호" type="password" placeholder="영어 + 숫자 + 특수문자, 6자 이상" />
      <TextField label="비밀번호 확인" type="password" placeholder="비밀번호를 다시 입력하세요" />

      <Button variant="primary" onClick={onSubmit}>
        회원가입
      </Button>

      <p className="text-center text-caption text-muted">
        이미 계정이 있으신가요?{' '}
        <button type="button" onClick={onLoginClick} className="cursor-pointer font-bold text-primary-deep underline">
          로그인
        </button>
      </p>
    </div>
  );
};

export { SignupForm };
export type { SignupFormProps } from './types';
