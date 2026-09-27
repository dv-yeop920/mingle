import type { Metadata } from 'next';
import { connection } from 'next/server';

import { HistoryView } from '@/views/history';

const HistoryPage = async () => {
  await connection();
  return <HistoryView />;
};

export const metadata: Metadata = {
  title: '테스트 기록',
  robots: { index: false, follow: false },
};

export default HistoryPage;
