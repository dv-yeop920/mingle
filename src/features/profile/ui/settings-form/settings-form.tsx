'use client';

import { cn } from '@/shared/lib/utils';

import { MbtiPicker } from '@/entities/mbti';

import { AccountSection } from './account-section';
import { MbtiSection } from './mbti-section';
import { NicknameSection } from './nickname-section';
import { PasswordSection } from './password-section';
import type { SettingsFormProps } from './types';
import { useSettingsForm } from './use-settings-form';

const SettingsForm = ({
  nickname,
  mbti,
  onMbtiChange,
  onLogout,
  className,
}: SettingsFormProps) => {
  const {
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
  } = useSettingsForm({ mbti, nickname, onMbtiChange });

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <NicknameSection
        form={nicknameForm}
        isPending={isNicknamePending}
        onSubmit={onNicknameSubmit}
      />
      <PasswordSection
        form={passwordForm}
        isPending={isPasswordPending}
        onSubmit={onPasswordSubmit}
      />
      <MbtiSection mbti={currentMbti} onMbtiChange={handleMbtiChangeClick} />
      <AccountSection onLogout={onLogout} />
      <MbtiPicker
        isOpen={isMbtiPickerOpen}
        onClose={handleMbtiPickerClose}
        onSelect={handleMbtiSelect}
        disabled={isMbtiPending}
      />
    </div>
  );
};

export { SettingsForm };
