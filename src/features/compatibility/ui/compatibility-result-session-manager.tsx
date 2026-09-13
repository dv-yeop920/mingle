'use client';

import { useEffect } from 'react';

import {
  deleteCompatibilityResult,
  fetchCompatibilityResult,
} from '../lib/compatibility-session';
import { useCompatibilityStore } from '../model/store';

const CompatibilityResultSessionManager = () => {
  const analysisResult = useCompatibilityStore((s) => s.analysisResult);
  const setAnalysisResult = useCompatibilityStore((s) => s.setAnalysisResult);
  const setIsResultHydrated = useCompatibilityStore((s) => s.setIsResultHydrated);

  useEffect(() => {
    if (analysisResult) {
      setIsResultHydrated(true);
      return;
    }

    const persisted = fetchCompatibilityResult(sessionStorage);

    if (persisted) {
      setAnalysisResult(persisted);
    }

    setIsResultHydrated(true);

    return () => {
      deleteCompatibilityResult(sessionStorage);
    };
  }, [analysisResult, setAnalysisResult, setIsResultHydrated]);

  return null;
};

export { CompatibilityResultSessionManager };
