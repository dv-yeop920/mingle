'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

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

  const groupType = useTestFlowStore((s) => s.groupType);
  const customName = useTestFlowStore((s) => s.customName);
  const members = useTestFlowStore((s) => s.members);
  const setAnalysisId = useTestFlowStore((s) => s.setAnalysisId);
  const setAnalysisResult = useTestFlowStore((s) => s.setAnalysisResult);

  const startAnalysis = useCallback(async () => {
    if (!groupType || members.length < 2) {
      router.replace('/');
      return;
    }

    setError(null);

    const result = await requestAnalysis({
      groupType,
      customName: customName || undefined,
      members,
    });

    if ('error' in result) {
      setError(result.error);
      return;
    }

    const { analysisId } = result.data;

    if (analysisId) {
      setAnalysisId(analysisId);
      router.replace(`/result?id=${analysisId}`);
    } else {
      setAnalysisResult(result.data);
      router.replace('/result');
    }
  }, [groupType, customName, members, setAnalysisId, setAnalysisResult, router]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis();
  }, [startAnalysis]);

  if (error) {
    return (
      <div
        className={cn(
          'flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F1F9F2] px-6',
          className,
        )}
      >
        <p className="text-center text-body text-caution-foreground">{error}</p>
        <button
          type="button"
          onClick={() => {
            hasStarted.current = false;
            startAnalysis();
          }}
          className="rounded-lg bg-primary px-6 py-3 text-label font-bold text-primary-foreground"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <AnalysisAnimation className={className} />;
};

export { AnalyzingView };
