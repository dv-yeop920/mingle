'use client';

import { useQuery } from '@tanstack/react-query';

import { analysesQueryOptions, analysisQueryOptions } from './query-options';

const useAnalyses = (groupType?: string) => {
  return useQuery(analysesQueryOptions(groupType));
};

const useAnalysis = (id: string) => {
  return useQuery({ ...analysisQueryOptions(id), enabled: !!id });
};

export { useAnalyses, useAnalysis };
