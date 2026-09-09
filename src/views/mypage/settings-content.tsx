'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { clearAuthQueryCache } from '@/shared/lib/react-query/clear-auth-query-cache';
import { useToast } from '@/shared/ui/toast';

import { isGender, useProfile } from '@/entities/user';

import { logout } from '@/features/auth/api/actions';
import { SettingsForm } from '@/features/profile';

const SettingsSkeleton = () => {
  return (
    <div className="flex flex-col gap-5 px-5">
      <div className="h-[52px] animate-pulse rounded-[16px] bg-muted/20" />
      <div className="h-[52px] animate-pulse rounded-[16px] bg-muted/20" />
      <div className="h-[52px] animate-pulse rounded-[16px] bg-muted/20" />
    </div>
  );
};

const SettingsContent = ({ userId }: { userId: string }) => {
  const [, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const {
    data: profile,
    isPending,
    isError,
    refetch,
  } = useProfile(userId);

  const redirectParam = searchParams.get('redirect');
  const redirectTo =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : undefined;
  const isProfileRequired = searchParams.get('required') === 'profile';

  const handleLogout = () => {
    startTransition(async () => {
      const result = await logout();
      if ('error' in result) {
        showToast({
          message: result.error ?? '로그아웃에 실패했습니다',
          variant: 'error',
        });
        return;
      }

      await clearAuthQueryCache(queryClient);
      router.replace('/login');
    });
  };

  if (isPending) {
    return <SettingsSkeleton />;
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
        <p className="text-body text-muted">
          설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-[13px] font-bold text-primary btn-press"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="px-5">
      <SettingsForm
        userId={userId}
        gender={isGender(profile.gender) ? profile.gender : null}
        isProfileRequired={isProfileRequired}
        nickname={profile.nickname}
        mbti={profile.mbti}
        redirectTo={redirectTo}
        onLogout={handleLogout}
      />
    </div>
  );
};

export { SettingsContent };
