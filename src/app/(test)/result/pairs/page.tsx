import type { Metadata } from 'next';

import { PairsView } from '@/views/result';

const PairsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;
  return <PairsView analysisId={id} />;
};

export const instant = false;
export const metadata: Metadata = { title: '전체 멤버 케미' };
export default PairsPage;
