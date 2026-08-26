import type { Metadata } from 'next';

import { AnalyzingView } from '@/views/analyzing';

const AnalyzingPage = () => {
  return <AnalyzingView />;
};

export const metadata: Metadata = { title: '케미 분석 중' };
export default AnalyzingPage;
