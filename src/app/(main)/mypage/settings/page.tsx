import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { fetchProfile } from '@/entities/user';

import { SettingsView } from '@/views/mypage';

const SettingsPage = async () => {
  await connection();
  const profile = await fetchProfile();

  if (!profile) {
    redirect('/login');
  }

  return <SettingsView nickname={profile.nickname} mbti={profile.mbti} />;
};

export const instant = false;
export default SettingsPage;
