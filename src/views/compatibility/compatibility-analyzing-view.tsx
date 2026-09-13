'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { trackCompatibilityComplete } from '@/shared/lib/analytics';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { useGuardedAction } from '@/shared/lib/use-guarded-action';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import type { CompatibilityResult } from '@/entities/compatibility';

import {
  CompatibilityAnimation,
  putCompatibilityResult,
  requestCompatibilityAnalysis,
  saveCompatibilityAnalysis,
  useCompatibilityStore,
} from '@/features/compatibility';

type CompatibilityAnalyzingViewProps = {
  className?: string;
};

const CompatibilityAnalyzingView = ({ className }: CompatibilityAnalyzingViewProps) => {
  const router = useRouter();
  const hasStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { userId } = useAuthUserId();

  const mbtiA = useCompatibilityStore((s) => s.mbtiA);
  const mbtiB = useCompatibilityStore((s) => s.mbtiB);
  const nicknameA = useCompatibilityStore((s) => s.nicknameA);
  const nicknameB = useCompatibilityStore((s) => s.nicknameB);
  const setAnalysisId = useCompatibilityStore((s) => s.setAnalysisId);
  const setAnalysisResult = useCompatibilityStore((s) => s.setAnalysisResult);

  const startAnalysis = async () => {
    if (!mbtiA || !mbtiB) {
      router.replace('/compatibility');
      return;
    }

    setError(null);
    setProgress(0);

    try {
      const result = await requestCompatibilityAnalysis({
        mbtiA,
        mbtiB,
        nicknameA: nicknameA || undefined,
        nicknameB: nicknameB || undefined,
        onProgress: setProgress,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      const analysisData = result.data as CompatibilityResult;

      trackCompatibilityComplete(mbtiA, mbtiB, analysisData.chemistryScore);

      if (userId) {
        const saveResult = await saveCompatibilityAnalysis({
          mbtiA,
          mbtiB,
          nicknameA: nicknameA || undefined,
          nicknameB: nicknameB || undefined,
          chemistryScore: analysisData.chemistryScore,
          result: analysisData,
        });

        if (saveResult.data) {
          setAnalysisId(saveResult.data.id);
          router.replace(`/compatibility/result?id=${saveResult.data.id}`);
          return;
        }
      }

      const persistedResult = {
        ...analysisData,
        mbtiA,
        mbtiB,
        nicknameA: nicknameA || undefined,
        nicknameB: nicknameB || undefined,
      };

      setAnalysisResult(analysisData);
      putCompatibilityResult(persistedResult, sessionStorage);
      router.replace('/compatibility/result');
    } catch {
      setError('궁합 분석 요청 중 문제가 발생했어요. 다시 시도해주세요');
    }
  };

  const [guardedStartAnalysis] = useGuardedAction(startAnalysis);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    guardedStartAnalysis();
    return () => {
      hasStarted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        className={cn(
          'flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6',
          className,
        )}
      >
        <p className="text-center text-body text-caution-foreground">{error}</p>
        <Button
          variant="primary"
          className="w-auto px-6"
          onClick={() => {
            hasStarted.current = false;
            guardedStartAnalysis();
          }}
        >
          다시 시도
        </Button>
        <Button
          variant="secondary"
          className="w-auto px-6"
          onClick={() => router.push('/compatibility')}
        >
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <CompatibilityAnimation
      progress={progress}
      mbtiA={mbtiA ?? undefined}
      mbtiB={mbtiB ?? undefined}
      className={className}
    />
  );
};

export { CompatibilityAnalyzingView };
