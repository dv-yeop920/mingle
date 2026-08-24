'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { queryKeys } from '@/shared/config/query-keys';
import type { MbtiType } from '@/shared/types/mbti';
import { useToast } from '@/shared/ui/toast';

import {
  updateMbti,
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

type UseSettingsFormProps = Pick<
  SettingsFormProps,
  'mbti' | 'nickname' | 'onMbtiChange'
>;

const useSettingsForm = ({
  mbti,
  nickname,
  onMbtiChange,
}: UseSettingsFormProps) => {
  const [isNicknamePending, startNicknameTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [isMbtiPickerOpen, setIsMbtiPickerOpen] = useState(false);
  const [isMbtiPending, setIsMbtiPending] = useState(false);
  const [currentMbti, setCurrentMbti] = useState<MbtiType | null>(
    mbti as MbtiType | null,
  );
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const nicknameForm = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onNicknameSubmit = (data: NicknameFormValues) => {
    startNicknameTransition(async () => {
      try {
        const result = await updateNickname(data);
        if ('error' in result) {
          const message = result.error ?? '닉네임 변경에 실패했습니다';
          nicknameForm.setError('root', { message });
          showToast({ message, variant: 'error' });
        } else {
          nicknameForm.clearErrors('root');
          nicknameForm.reset({ nickname: result.data.nickname });
          await queryClient.invalidateQueries({
            queryKey: queryKeys.profile.all,
          });
          showToast({ message: '닉네임이 변경되었습니다' });
        }
      } catch {
        const message = '닉네임 변경 요청에 실패했습니다';
        nicknameForm.setError('root', { message });
        showToast({ message, variant: 'error' });
      }
    });
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    startPasswordTransition(async () => {
      try {
        const result = await updatePassword(data);
        if ('error' in result) {
          const message = result.error ?? '비밀번호 변경에 실패했습니다';
          passwordForm.setError('root', { message });
          showToast({ message, variant: 'error' });
        } else {
          passwordForm.clearErrors('root');
          passwordForm.reset();
          showToast({ message: '비밀번호가 변경되었습니다' });
        }
      } catch {
        const message = '비밀번호 변경 요청에 실패했습니다';
        passwordForm.setError('root', { message });
        showToast({ message, variant: 'error' });
      }
    });
  };

  const handleMbtiChangeClick = () => {
    setIsMbtiPickerOpen(true);
  };

  const handleMbtiPickerClose = () => {
    if (!isMbtiPending) {
      setIsMbtiPickerOpen(false);
    }
  };

  const handleMbtiSelect = async (selectedMbti: MbtiType) => {
    if (isMbtiPending) return;

    setIsMbtiPending(true);

    try {
      const result = await updateMbti(selectedMbti);
      if ('error' in result) {
        const message = result.error ?? 'MBTI 변경에 실패했습니다';
        showToast({ message, variant: 'error' });
      } else {
        setCurrentMbti(result.data.mbti as MbtiType);
        setIsMbtiPickerOpen(false);
        onMbtiChange?.(result.data.mbti as MbtiType);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.profile.all,
        });
        showToast({ message: 'MBTI가 변경되었습니다' });
      }
    } catch {
      showToast({ message: 'MBTI 변경 요청에 실패했습니다', variant: 'error' });
    } finally {
      setIsMbtiPending(false);
    }
  };

  return {
    currentMbti,
    handleMbtiChangeClick,
    handleMbtiPickerClose,
    handleMbtiSelect,
    isMbtiPending,
    isMbtiPickerOpen,
    isNicknamePending,
    isPasswordPending,
    nicknameForm,
    onNicknameSubmit,
    onPasswordSubmit,
    passwordForm,
  };
};

export { useSettingsForm, type UseSettingsFormProps };
