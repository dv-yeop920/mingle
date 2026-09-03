'use client';

import { useEffect } from 'react';

import { useTestFlowStore } from '@/features/test-flow';

const HomeResetEffect = () => {
  const reset = useTestFlowStore((s) => s.reset);

  useEffect(() => {
    window.scrollTo(0, 0);
    reset();
  }, [reset]);

  return null;
};

export { HomeResetEffect };
