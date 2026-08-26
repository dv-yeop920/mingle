import type { Metadata } from 'next';

import { AtmosphereView } from '@/views/result';

const AtmospherePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;
  return <AtmosphereView analysisId={id} />;
};

export const instant = false;
export const metadata: Metadata = { title: '그룹 분위기 분석' };
export default AtmospherePage;
