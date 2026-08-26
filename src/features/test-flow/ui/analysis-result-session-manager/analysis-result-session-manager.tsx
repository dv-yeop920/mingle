'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  deleteAnalysisResult,
  fetchAnalysisResult,
  putAnalysisResult,
} from '@/features/test-flow/lib/analysis-result-session';
import { deletePendingAnalysisSaveIntent } from '@/features/test-flow/lib/pending-analysis-save-intent-session';
import { deletePendingAnalysisSave } from '@/features/test-flow/lib/pending-analysis-save-session';
import { useTestFlowStore } from '@/features/test-flow/model/store';

const RESULT_PATH = '/result';
const AUTH_PATHS = new Set(['/login', '/signup']);

type ResultFlowState = 'auth-save' | 'outside' | 'result';

const checkIsResultPath = (pathname: string): boolean =>
  pathname === RESULT_PATH || pathname.startsWith(`${RESULT_PATH}/`);

const checkIsResultSavePath = (pathname: string, search: string): boolean =>
  AUTH_PATHS.has(pathname) &&
  new URLSearchParams(search).get('redirect') === RESULT_PATH;

const convertResultFlowState = (
  pathname: string,
  search: string,
): ResultFlowState => {
  if (checkIsResultPath(pathname)) return 'result';
  if (checkIsResultSavePath(pathname, search)) return 'auth-save';
  return 'outside';
};

const AnalysisResultSessionManager = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const initialLocation = useRef({ pathname, search });
  const currentFlowState = useRef<ResultFlowState>(
    convertResultFlowState(pathname, search),
  );
  const previousFlowState = useRef<ResultFlowState | null>(null);

  useEffect(() => {
    const initialFlowState = convertResultFlowState(
      initialLocation.current.pathname,
      initialLocation.current.search,
    );
    const currentResult = useTestFlowStore.getState().analysisResult;

    if (initialFlowState === 'outside') {
      deleteAnalysisResult(window.sessionStorage);
      deletePendingAnalysisSave(window.sessionStorage);
      deletePendingAnalysisSaveIntent(window.sessionStorage);
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

    useTestFlowStore
      .getState()
      .setIsAnalysisResultHydrated(initialFlowState !== 'auth-save');

    return useTestFlowStore.subscribe((state, previousState) => {
      if (state.analysisResult === previousState.analysisResult) return;

      if (state.analysisResult) {
        putAnalysisResult(state.analysisResult, window.sessionStorage);
      } else if (currentFlowState.current !== 'auth-save') {
        deleteAnalysisResult(window.sessionStorage);
      }
    });
  }, []);

  useEffect(() => {
    const nextFlowState = convertResultFlowState(pathname, search);
    currentFlowState.current = nextFlowState;

    if (previousFlowState.current === null) {
      previousFlowState.current = nextFlowState;
      return;
    }

    const previousState = previousFlowState.current;

    if (nextFlowState === 'auth-save') {
      useTestFlowStore.getState().setIsAnalysisResultHydrated(false);
    } else if (previousState === 'auth-save' && nextFlowState === 'result') {
      const currentResult = useTestFlowStore.getState().analysisResult;
      if (!currentResult) {
        const storedResult = fetchAnalysisResult(window.sessionStorage);
        if (storedResult) {
          useTestFlowStore.getState().setAnalysisResult(storedResult);
        }
      }
      useTestFlowStore.getState().setIsAnalysisResultHydrated(true);
    } else if (previousState !== 'outside' && nextFlowState === 'outside') {
      deletePendingAnalysisSave(window.sessionStorage);
      deletePendingAnalysisSaveIntent(window.sessionStorage);
      useTestFlowStore.getState().setAnalysisResult(null);
      useTestFlowStore.getState().setIsAnalysisResultHydrated(true);
    }

    previousFlowState.current = nextFlowState;
  }, [pathname, search]);

  return null;
};

export { AnalysisResultSessionManager };
