'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { CompatibilityResultView } from '@/views/compatibility';

const CompatibilityResultContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? undefined;

  return <CompatibilityResultView analysisId={id} />;
};

const CompatibilityResultPage = () => {
  return (
    <Suspense fallback={null}>
      <CompatibilityResultContent />
    </Suspense>
  );
};

export default CompatibilityResultPage;
