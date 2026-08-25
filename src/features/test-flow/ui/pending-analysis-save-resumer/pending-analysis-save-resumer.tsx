'use client';

import { useEffect, useRef } from 'react';

import { fetchPendingAnalysisSave } from '../../lib/pending-analysis-save-session';

import type { PendingAnalysisSaveResumerProps } from './types';

const PendingAnalysisSaveResumer = ({
  onResume,
}: PendingAnalysisSaveResumerProps) => {
  const hasCheckedPendingSave = useRef(false);

  useEffect(() => {
    if (hasCheckedPendingSave.current) return;
    hasCheckedPendingSave.current = true;

    const pendingSave = fetchPendingAnalysisSave(window.sessionStorage);
    if (!pendingSave) return;

    void onResume(pendingSave);
  }, [onResume]);

  return null;
};

export { PendingAnalysisSaveResumer };
