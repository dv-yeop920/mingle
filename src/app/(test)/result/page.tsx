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
export default ResultPage;
