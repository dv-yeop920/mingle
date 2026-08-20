'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { MbtiBadge } from '@/entities/mbti';

import {
  updateNickname,
  updatePassword,
} from '@/features/profile/api/actions';
import {
  nicknameSchema,
  passwordSchema,
  type NicknameFormValues,
  type PasswordFormValues,
} from '@/features/profile/model/schemas';

import type { SettingsFormProps } from './types';

const SettingsForm = ({
  nickname,
  mbti,
  onMbtiChange,
  onLogout,
  className,
}: SettingsFormProps) => {
  const [isNicknamePending, startNicknameTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const nicknameForm = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onNicknameSubmit = (data: NicknameFormValues) => {
    startNicknameTransition(async () => {
      const result = await updateNickname(data);
      if ('error' in result) {
        nicknameForm.setError('root', { message: result.error });
      }
    });
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    startPasswordTransition(async () => {
      const result = await updatePassword(data);
      if ('error' in result) {
        passwordForm.setError('root', { message: result.error });
      } else {
        passwordForm.reset();
      }
    });
  };

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">닉네임 변경</h3>
        <TextField
          label="닉네임"
          placeholder="새 닉네임 입력"
          error={nicknameForm.formState.errors.nickname?.message}
          {...nicknameForm.register('nickname')}
        />
        {nicknameForm.formState.errors.root && (
          <p className="text-caption font-bold text-caution-foreground">
            {nicknameForm.formState.errors.root.message}
          </p>
        )}
        <Button
          variant="secondary"
          disabled={isNicknamePending}
          onClick={nicknameForm.handleSubmit(onNicknameSubmit)}
        >
          {isNicknamePending ? '변경 중...' : '닉네임 변경'}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">비밀번호 변경</h3>
        <TextField
          label="현재 비밀번호"
          type="password"
          placeholder="현재 비밀번호 입력"
          error={passwordForm.formState.errors.currentPassword?.message}
          {...passwordForm.register('currentPassword')}
        />
        <TextField
          label="새 비밀번호"
          type="password"
          placeholder="새 비밀번호 입력"
          error={passwordForm.formState.errors.newPassword?.message}
          {...passwordForm.register('newPassword')}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          placeholder="새 비밀번호 다시 입력"
          error={passwordForm.formState.errors.confirmPassword?.message}
          {...passwordForm.register('confirmPassword')}
        />
        {passwordForm.formState.errors.root && (
          <p className="text-caption font-bold text-caution-foreground">
            {passwordForm.formState.errors.root.message}
          </p>
        )}
        <Button
          variant="secondary"
          disabled={isPasswordPending}
          onClick={passwordForm.handleSubmit(onPasswordSubmit)}
        >
          {isPasswordPending ? '변경 중...' : '비밀번호 변경'}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">MBTI 재설정</h3>
        <div className="flex items-center gap-3">
          <span className="text-body text-muted">현재 MBTI:</span>
          {mbti ? <MbtiBadge mbti={mbti as MbtiType} /> : <span className="text-body text-hint">미설정</span>}
        </div>
        <Button variant="tonal" onClick={onMbtiChange}>
          MBTI 변경
        </Button>
      </section>

      <section className="flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="cursor-pointer text-left text-caption text-caution"
        >
          로그아웃
        </button>
        <button
          type="button"
          className="cursor-pointer text-left text-caption text-hint"
        >
          회원탈퇴
        </button>
      </section>
    </div>
  );
};

export { SettingsForm, type SettingsFormProps };
