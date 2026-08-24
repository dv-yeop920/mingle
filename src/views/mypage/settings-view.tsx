'use client';

import { useTransition } from 'react';

import { cn } from '@/shared/lib/utils';

import { logout } from '@/features/auth/api/actions';
import { SettingsForm } from '@/features/profile';

import type { SettingsViewProps } from './types';

const SettingsView = ({
  gender,
  isProfileRequired,
  nickname,
  mbti,
  redirectTo,
  className,
}: SettingsViewProps) => {
  const [, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <h1 className="text-title1 font-black text-foreground">설정</h1>
      <SettingsForm
        gender={gender}
        isProfileRequired={isProfileRequired}
        nickname={nickname}
        mbti={mbti}
        redirectTo={redirectTo}
        onLogout={handleLogout}
      />
    </div>
  );
};

export { SettingsView };
