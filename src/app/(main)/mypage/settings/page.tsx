import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

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

const SettingsPage = async ({ searchParams }: SettingsPageProps) => {
  await connection();
  const { redirect: redirectParam, required } = await searchParams;
  const profile = await fetchProfile();

  if (!profile) {
    redirect('/login');
  }

  return (
    <SettingsView
      nickname={profile.nickname}
      mbti={profile.mbti}
      gender={isGender(profile.gender) ? profile.gender : null}
      redirectTo={convertSafeRedirectPath(redirectParam)}
      isProfileRequired={required === 'profile'}
    />
  );
};

export const instant = false;
export const metadata: Metadata = {
  title: '계정 설정',
  robots: { index: false, follow: false },
};
export default SettingsPage;
