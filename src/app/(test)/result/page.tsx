import type { Metadata } from 'next';

import { ResultView } from '@/views/result';

const ResultPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;
  return <ResultView analysisId={id} />;
};

export const instant = false;
export const metadata: Metadata = { title: 'MBTI 그룹 케미 결과' };
export default ResultPage;
