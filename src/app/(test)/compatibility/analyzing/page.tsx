import type { Metadata } from 'next';

import { CompatibilityAnalyzingView } from '@/views/compatibility';

export const metadata: Metadata = {
  title: '궁합 분석 중',
  robots: { index: false, follow: false },
};

const CompatibilityAnalyzingPage = () => {
  return <CompatibilityAnalyzingView />;
};

export default CompatibilityAnalyzingPage;
