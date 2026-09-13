'use client';

import { useQuery } from '@tanstack/react-query';

import { mbtiProfileQueryOptions } from './query-options';

const useMbtiProfile = (userId: string | null, mbti: string) => {
  return useQuery(mbtiProfileQueryOptions(userId, mbti));
};

export { useMbtiProfile };
