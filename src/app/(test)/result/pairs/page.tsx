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
export default PairsPage;
