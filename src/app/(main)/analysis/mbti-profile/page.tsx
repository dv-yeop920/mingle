import type { Metadata } from 'next';

import { MbtiProfileView } from '@/views/mbti-profile';

export const metadata: Metadata = {
  title: '내 MBTI 분석',
  robots: { index: false, follow: false },
};

const MbtiProfilePage = () => {
  return <MbtiProfileView />;
};

export default MbtiProfilePage;
