import type { Metadata } from 'next';

import { CompatibilityInputView } from '@/views/compatibility';

export const metadata: Metadata = {
  title: '1:1 MBTI 궁합',
  description: '두 사람의 MBTI를 입력하면 AI가 궁합을 분석해드려요',
};

const CompatibilityPage = () => {
  return <CompatibilityInputView />;
};

export default CompatibilityPage;
