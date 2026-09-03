'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { queryKeys } from '@/shared/config/query-keys';
import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';
import { useToast } from '@/shared/ui/toast';

import {
  updateGender,
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
  | 'userId'
  | 'gender'
  | 'isProfileRequired'
  | 'mbti'
  | 'nickname'
  | 'onGenderChange'
  | 'onMbtiChange'
  | 'redirectTo'
>;

const useSettingsForm = ({
  userId,
  gender,
  isProfileRequired = false,
  mbti,
  nickname,
  onGenderChange,
  onMbtiChange,
  redirectTo,
}: UseSettingsFormProps) => {
  const [isNicknamePending, startNicknameTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [isMbtiPickerOpen, setIsMbtiPickerOpen] = useState(false);
  const [isMbtiPending, setIsMbtiPending] = useState(false);
  const [isGenderPending, setIsGenderPending] = useState(false);
  const [currentMbti, setCurrentMbti] = useState<MbtiType | null>(
    mbti as MbtiType | null,
  );
  const [currentGender, setCurrentGender] = useState<Gender | null>(gender);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useToast();

  const nicknameForm = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const handleProfileCompletionRedirect = (
    nextMbti: MbtiType | null,
    nextGender: Gender | null,
  ) => {
    if (isProfileRequired && redirectTo && nextMbti && nextGender) {
      router.replace(redirectTo);
    }
  };

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
            queryKey: queryKeys.profile.all(userId),
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
          queryKey: queryKeys.profile.all(userId),
        });
        showToast({ message: 'MBTI가 변경되었습니다' });
        handleProfileCompletionRedirect(
          result.data.mbti as MbtiType,
          currentGender,
        );
      }
    } catch {
      showToast({ message: 'MBTI 변경 요청에 실패했습니다', variant: 'error' });
    } finally {
      setIsMbtiPending(false);
    }
  };

  const handleGenderSelect = async (selectedGender: Gender) => {
    if (isGenderPending) return;

    setIsGenderPending(true);

    try {
      const result = await updateGender(selectedGender);
      if ('error' in result) {
        const message = result.error ?? '성별 변경에 실패했습니다';
        showToast({ message, variant: 'error' });
      } else {
        setCurrentGender(result.data.gender);
        onGenderChange?.(result.data.gender);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.profile.all(userId),
        });
        showToast({ message: '성별이 변경되었습니다' });
        handleProfileCompletionRedirect(currentMbti, result.data.gender);
      }
    } catch {
      showToast({ message: '성별 변경 요청에 실패했습니다', variant: 'error' });
    } finally {
      setIsGenderPending(false);
    }
  };

  return {
    currentGender,
    currentMbti,
    handleGenderSelect,
    handleMbtiChangeClick,
    handleMbtiPickerClose,
    handleMbtiSelect,
    isGenderPending,
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
