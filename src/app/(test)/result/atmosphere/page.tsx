import { AtmosphereView } from '@/views/result';

const AtmospherePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;
  return <AtmosphereView analysisId={id} />;
};

export default AtmospherePage;
