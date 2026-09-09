import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { MyPageView } from '@/views/mypage';

const MyPage = async () => {
  const { user } = await getAuthenticatedClient();
  if (!user) redirect('/login');

  return <MyPageView userId={user.id} />;
};

export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};

export default MyPage;
