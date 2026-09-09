import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { HistoryView } from '@/views/history';

const HistoryPage = async () => {
  const { user } = await getAuthenticatedClient();
  if (!user) redirect('/login');

  return <HistoryView userId={user.id} />;
};

export const metadata: Metadata = {
  title: '테스트 기록',
  robots: { index: false, follow: false },
};

export default HistoryPage;
