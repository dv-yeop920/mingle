import type { Metadata } from 'next';

import { AnalysisView } from '@/views/analysis';

export const metadata: Metadata = {
  title: '분석',
  description: 'MBTI 궁합, 성격 분석, 캐릭터 매칭을 AI로 체험해보세요',
};

const AnalysisPage = () => {
  return <AnalysisView />;
};

export default AnalysisPage;
