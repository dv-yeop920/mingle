'use client';

import { useQuery } from '@tanstack/react-query';

import { profileQueryOptions, userStatsQueryOptions } from './query-options';

const useProfile = (userId: string | null) => {
  return useQuery(profileQueryOptions(userId));
};

const useUserStats = (userId: string | null) => {
  return useQuery(userStatsQueryOptions(userId));
};

export { useProfile, useUserStats };
