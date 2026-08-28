'use client';

import { useQuery } from '@tanstack/react-query';

import { profileQueryOptions, userStatsQueryOptions } from './query-options';

const useProfile = () => {
  return useQuery(profileQueryOptions());
};

const useUserStats = () => {
  return useQuery(userStatsQueryOptions());
};

export { useProfile, useUserStats };
