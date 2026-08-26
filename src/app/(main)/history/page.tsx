import type { Metadata } from 'next';

import { HistoryView } from '@/views/history';

const HistoryPage = () => {
  return <HistoryView />;
};

export const metadata: Metadata = {
  title: '테스트 기록',
  robots: { index: false, follow: false },
};

export default HistoryPage;
