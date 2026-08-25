'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  deleteAnalysisResult,
  fetchAnalysisResult,
  putAnalysisResult,
} from '@/features/test-flow/lib/analysis-result-session';
import { deletePendingAnalysisSave } from '@/features/test-flow/lib/pending-analysis-save-session';
import { useTestFlowStore } from '@/features/test-flow/model/store';

const RESULT_PATH = '/result';
const AUTH_PATHS = new Set(['/login', '/signup']);

const checkIsResultPath = (pathname: string): boolean =>
  pathname === RESULT_PATH || pathname.startsWith(`${RESULT_PATH}/`);

const checkIsResultSavePath = (pathname: string, search: string): boolean =>
  AUTH_PATHS.has(pathname) &&
  new URLSearchParams(search).get('redirect') === RESULT_PATH;

const AnalysisResultSessionManager = () => {
  const pathname = usePathname();
  const initialPathname = useRef(pathname);
  const previousIsInResultFlow = useRef<boolean | null>(null);

  useEffect(() => {
    const isInitialResultFlow =
      checkIsResultPath(initialPathname.current) ||
      checkIsResultSavePath(initialPathname.current, window.location.search);
    const currentResult = useTestFlowStore.getState().analysisResult;

    if (!isInitialResultFlow) {
      deleteAnalysisResult(window.sessionStorage);
      deletePendingAnalysisSave(window.sessionStorage);
      if (currentResult) {
        useTestFlowStore.getState().setAnalysisResult(null);
      }
    } else if (currentResult) {
      putAnalysisResult(currentResult, window.sessionStorage);
    } else {
      const storedResult = fetchAnalysisResult(window.sessionStorage);
      if (storedResult) {
        useTestFlowStore.getState().setAnalysisResult(storedResult);
      }
    }

    useTestFlowStore.getState().setIsAnalysisResultHydrated(true);

    return useTestFlowStore.subscribe((state, previousState) => {
      if (state.analysisResult === previousState.analysisResult) return;

      if (state.analysisResult) {
        putAnalysisResult(state.analysisResult, window.sessionStorage);
      } else {
        deleteAnalysisResult(window.sessionStorage);
      }
    });
  }, []);

  useEffect(() => {
    const isInResultFlow =
      checkIsResultPath(pathname) ||
      checkIsResultSavePath(pathname, window.location.search);

    if (previousIsInResultFlow.current === null) {
      previousIsInResultFlow.current = isInResultFlow;
      return;
    }

    if (previousIsInResultFlow.current && !isInResultFlow) {
      deletePendingAnalysisSave(window.sessionStorage);
      useTestFlowStore.getState().setAnalysisResult(null);
    }

    previousIsInResultFlow.current = isInResultFlow;
  }, [pathname]);

  return null;
};

export { AnalysisResultSessionManager };
