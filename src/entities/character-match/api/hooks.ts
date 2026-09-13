'use client';

import { useQuery } from '@tanstack/react-query';

import { characterMatchQueryOptions } from './query-options';

const useCharacterMatch = (
  userId: string | null,
  mbti: string,
  workId: string,
) => {
  return useQuery(characterMatchQueryOptions(userId, mbti, workId));
};

export { useCharacterMatch };
