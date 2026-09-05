import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { PageSpinner } from '@/shared/ui';

import { fetchProfile } from '@/entities/user/api/queries';
import { isGender } from '@/entities/user/model';

import { SettingsView } from '@/views/mypage';

type SettingsPageProps = {
  searchParams: Promise<{
    redirect?: string;
    required?: string;
  }>;
};

const convertSafeRedirectPath = (value: string | undefined) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return undefined;
  }

  return value;
};

const SettingsContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; required?: string }>;
}) => {
  const { redirect: redirectParam, required } = await searchParams;
  const profile = await fetchProfile();

  if (!profile) {
    redirect('/login');
  }

  return (
    <SettingsView
      userId={profile.id}
      nickname={profile.nickname}
      mbti={profile.mbti}
      gender={isGender(profile.gender) ? profile.gender : null}
      redirectTo={convertSafeRedirectPath(redirectParam)}
      isProfileRequired={required === 'profile'}
    />
  );
};

const SettingsPage = async ({ searchParams }: SettingsPageProps) => {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
};

export const metadata: Metadata = {
  title: '계정 설정',
  robots: { index: false, follow: false },
};
export default SettingsPage;
