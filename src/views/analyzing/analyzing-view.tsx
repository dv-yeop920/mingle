'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { trackAnalysisComplete } from '@/shared/lib/analytics';
import { useGuardedAction } from '@/shared/lib/use-guarded-action';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import {
  AnalysisAnimation,
  requestAnalysis,
  useTestFlowStore,
} from '@/features/test-flow';

import type { AnalyzingViewProps } from './types';

const AnalyzingView = ({ className }: AnalyzingViewProps) => {
  const router = useRouter();
  const hasStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const groupType = useTestFlowStore((s) => s.groupType);
  const members = useTestFlowStore((s) => s.members);
  const setAnalysisId = useTestFlowStore((s) => s.setAnalysisId);
  const setAnalysisResult = useTestFlowStore((s) => s.setAnalysisResult);

  const startAnalysis = async () => {
    if (!groupType || members.length < 2) {
      router.replace('/');
      return;
    }

    setError(null);
    setProgress(0);

    try {
      const result = await requestAnalysis({
        groupType,
        members,
        onProgress: setProgress,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      const { analysisId } = result.data;

      trackAnalysisComplete(
        groupType,
        members.length,
        result.data.chemistryScore,
      );

      if (analysisId) {
        setAnalysisId(analysisId);
        router.replace(`/result?id=${analysisId}`);
      } else {
        setAnalysisResult(result.data);
        router.replace('/result');
      }
    } catch {
      setError('분석 요청 중 문제가 발생했어요. 다시 시도해주세요');
    }
  };

  const [guardedStartAnalysis] = useGuardedAction(startAnalysis);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis();
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
      </div>
    );
  }

  return <AnalysisAnimation progress={progress} className={className} />;
};

export { AnalyzingView };
