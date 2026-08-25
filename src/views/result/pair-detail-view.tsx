'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { useAnalysis } from '@/entities/analysis';

import { PairDetail } from '@/features/analysis-result';
import { useTestFlowStore } from '@/features/test-flow';

import { normalizePairChemistry } from './lib/normalize-analysis';
import type { PairDetailViewProps } from './types';

const PairDetailView = ({
  analysisId,
  pairIndex,
  className,
}: PairDetailViewProps) => {
  const router = useRouter();
  const storeResult = useTestFlowStore((state) => state.analysisResult);
  const isAnalysisResultHydrated = useTestFlowStore(
    (state) => state.isAnalysisResultHydrated,
  );
  const { data: dbAnalysis, isLoading } = useAnalysis(analysisId ?? '');

  if ((!analysisId && !isAnalysisResultHydrated) || (analysisId && isLoading)) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">불러오는 중...</p>
      </div>
    );
  }

  const dbMembers =
    (
      dbAnalysis?.groups as {
        members: { nickname: string; mbti: string }[];
      } | null
    )?.members ?? [];
  const pairs = normalizePairChemistry(
    analysisId ? dbAnalysis?.pair_chemistry : storeResult?.pairChemistry,
    analysisId ? dbMembers : (storeResult?.members ?? []),
  );
  const pair = pairs[pairIndex ?? 0] ?? null;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-4',
        className,
      )}
    >
      <button
        type="button"
        aria-label="결과로 돌아가기"
        onClick={() => router.back()}
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] border border-border bg-surface btn-press"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
      </button>
      <PairDetail pair={pair} />
    </div>
  );
};

export { PairDetailView };
