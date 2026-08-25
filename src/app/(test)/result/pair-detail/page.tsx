import { PairDetailView } from '@/views/result';

const PairDetailPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; pair?: string }>;
}) => {
  const { id, pair } = await searchParams;
  const pairIndex = pair ? Number(pair) : undefined;
  return <PairDetailView analysisId={id} pairIndex={pairIndex} />;
};

export const instant = false;
export default PairDetailPage;
