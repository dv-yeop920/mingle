'use client';

import { useQuery } from '@tanstack/react-query';

import { analysesQueryOptions, analysisQueryOptions } from './query-options';

const useAnalyses = (userId: string | null, groupType?: string) => {
  return useQuery(analysesQueryOptions(userId, groupType));
};

const useAnalysis = (userId: string | null, id: string) => {
  return useQuery({
    ...analysisQueryOptions(userId, id),
    enabled: Boolean(id),
  });
};

export { useAnalyses, useAnalysis };
