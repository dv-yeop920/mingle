'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { clearAuthQueryCache } from '@/shared/lib/react-query/clear-auth-query-cache';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/ui/toast';

import { logout } from '@/features/auth/api/actions';
import { SettingsForm } from '@/features/profile';

import type { SettingsViewProps } from './types';

const SettingsView = ({
  userId,
  gender,
  isProfileRequired,
  nickname,
  mbti,
  redirectTo,
  className,
}: SettingsViewProps) => {
  const [, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogout = () => {
    startTransition(async () => {
      const result = await logout();
      if ('error' in result) {
        showToast({ message: result.error ?? '로그아웃에 실패했습니다', variant: 'error' });
        return;
      }

      await clearAuthQueryCache(queryClient);
      router.replace('/login');
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="px-6 pt-[10px] pb-[20px]">
        <h1 className="text-title1 font-black text-foreground">설정</h1>
      </div>
      <div className="px-5">
        <SettingsForm
          userId={userId}
          gender={gender}
          isProfileRequired={isProfileRequired}
          nickname={nickname}
          mbti={mbti}
          redirectTo={redirectTo}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
};

export { SettingsView };
