import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { SettingsView } from '@/views/mypage';

const SettingsPage = async () => {
  const { user } = await getAuthenticatedClient();
  if (!user) redirect('/login');

  return <SettingsView userId={user.id} />;
};

export const metadata: Metadata = {
  title: '계정 설정',
  robots: { index: false, follow: false },
};

export default SettingsPage;
