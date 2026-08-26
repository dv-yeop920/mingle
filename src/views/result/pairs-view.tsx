'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { trackResultDetailView } from '@/shared/lib/analytics';
import { cn } from '@/shared/lib/utils';

import { PairCard, useAnalysis } from '@/entities/analysis';

import { useTestFlowStore } from '@/features/test-flow';

import { normalizePairChemistry } from './lib/normalize-analysis';
import type { PairsViewProps } from './types';

const PairsView = ({ analysisId, className }: PairsViewProps) => {
  const router = useRouter();

  useEffect(() => {
    trackResultDetailView('pairs');
  }, []);
  const storeResult = useTestFlowStore((state) => state.analysisResult);
  const isAnalysisResultHydrated = useTestFlowStore(
    (state) => state.isAnalysisResultHydrated,
  );
  const { data: dbAnalysis, isError, isLoading } = useAnalysis(
    analysisId ?? '',
  );

  if ((!analysisId && !isAnalysisResultHydrated) || (analysisId && isLoading)) {
    return (
      <div
        role="status"
        aria-label="결과를 불러오는 중"
        aria-busy="true"
        className={cn(
          'flex min-h-[118px] items-center justify-center py-12',
          className,
        )}
      />
    );
  }

  if (analysisId && isError) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">
          결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
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

  const handlePairClick = (index: number) => {
    const idQuery = analysisId ? `&id=${analysisId}` : '';
    router.push(`/result/pair-detail?pair=${index}${idQuery}`);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-5 px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-4',
        className,
      )}
    >
      <button
        type="button"
        aria-label="결과로 돌아가기"
        onClick={() => router.back()}
        className="flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[14px] border border-border bg-surface btn-press"
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
          aria-hidden="true"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
      </button>

      <header className="flex flex-col gap-2">
        <h1 className="text-title2 font-black tracking-title text-foreground">
          둘 사이의 케미
        </h1>
        <p className="text-body font-semibold text-muted">
          우리 그룹의 모든 조합 {pairs.length}쌍을 확인해보세요.
        </p>
      </header>

      {pairs.length > 0 ? (
        <div className="flex flex-col gap-4">
          {pairs.map((pair, index) => (
            <PairCard
              key={`${pair.memberA.nickname}-${pair.memberB.nickname}`}
              memberA={pair.memberA}
              memberB={pair.memberB}
              score={pair.score}
              summary={pair.summary}
              onClick={() => handlePairClick(index)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-body text-muted">페어 데이터를 찾을 수 없습니다</p>
        </div>
      )}
    </div>
  );
};

export { PairsView };
