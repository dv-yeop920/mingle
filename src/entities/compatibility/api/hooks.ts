'use client';

import { useQuery } from '@tanstack/react-query';

import { compatibilityQueryOptions } from './query-options';

const useCompatibility = (userId: string | null, id: string) => {
  return useQuery(compatibilityQueryOptions(userId, id));
};

export { useCompatibility };
