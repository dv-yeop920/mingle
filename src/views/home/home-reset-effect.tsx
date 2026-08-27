'use client';

import { useEffect } from 'react';

import { useTestFlowStore } from '@/features/test-flow';

const HomeResetEffect = () => {
  const reset = useTestFlowStore((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return null;
};

export { HomeResetEffect };
