'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { AccountSection } from './account-section';
import { GenderSection } from './gender-section';
import { MbtiSection } from './mbti-section';
import { NicknameSection } from './nickname-section';
import { PasswordSection } from './password-section';
import type { SettingsFormProps } from './types';
import { useSettingsForm } from './use-settings-form';

const MbtiPicker = dynamic(
  () =>
    import('@/entities/mbti/ui/mbti-picker/mbti-picker').then((m) => ({
      default: m.MbtiPicker,
    })),
  { ssr: false },
);

const SettingsForm = ({
  gender,
  isProfileRequired,
  nickname,
  mbti,
  onGenderChange,
  onMbtiChange,
  onLogout,
  redirectTo,
  className,
}: SettingsFormProps) => {
  const [hasEverOpenedMbtiPicker, setHasEverOpenedMbtiPicker] = useState(false);
  const {
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
  } = useSettingsForm({
    gender,
    isProfileRequired,
    mbti,
    nickname,
    onGenderChange,
    onMbtiChange,
    redirectTo,
  });

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {isProfileRequired && (
        <p className="rounded-card bg-primary-tonal px-4 py-3 text-[13px] font-bold text-diplomat-fg">
          테스트를 시작하려면 MBTI와 성별을 먼저 설정해주세요.
        </p>
      )}
      <NicknameSection
        form={nicknameForm}
        isPending={isNicknamePending}
        onSubmit={onNicknameSubmit}
      />
      <MbtiSection
        mbti={currentMbti}
        onMbtiChange={() => {
          setHasEverOpenedMbtiPicker(true);
          handleMbtiChangeClick();
        }}
      />
      <GenderSection
        gender={currentGender}
        isPending={isGenderPending}
        onGenderSelect={handleGenderSelect}
      />
      <PasswordSection
        form={passwordForm}
        isPending={isPasswordPending}
        onSubmit={onPasswordSubmit}
      />
      <AccountSection onLogout={onLogout} />
      {hasEverOpenedMbtiPicker && (
        <MbtiPicker
          isOpen={isMbtiPickerOpen}
          onClose={handleMbtiPickerClose}
          onSelect={handleMbtiSelect}
          disabled={isMbtiPending}
        />
      )}
    </div>
  );
};

export { SettingsForm };
