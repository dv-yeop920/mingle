export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: (userId: string | null) =>
      [...queryKeys.auth.all, userId ?? 'guest'] as const,
  },
  profile: {
    all: (userId: string | null) =>
      [...queryKeys.auth.user(userId), 'profile'] as const,
    detail: (userId: string | null) =>
      [...queryKeys.profile.all(userId), 'detail'] as const,
    stats: (userId: string | null) =>
      [...queryKeys.profile.all(userId), 'stats'] as const,
  },
  groups: {
    all: (userId: string | null) =>
      [...queryKeys.auth.user(userId), 'groups'] as const,
    list: (userId: string | null) =>
      [...queryKeys.groups.all(userId), 'list'] as const,
    detail: (userId: string | null, id: string) =>
      [...queryKeys.groups.all(userId), 'detail', id] as const,
  },
  analyses: {
    all: (userId: string | null) =>
      [...queryKeys.auth.user(userId), 'analyses'] as const,
    list: (userId: string | null, groupType?: string) =>
      [
        ...queryKeys.analyses.all(userId),
        'list',
        ...(groupType ? [groupType] : []),
      ] as const,
    detail: (userId: string | null, id: string) =>
      [...queryKeys.analyses.all(userId), 'detail', id] as const,
  },
  mbtiProfile: {
    all: (userId: string | null) =>
      [...queryKeys.auth.user(userId), 'mbti-profile'] as const,
    detail: (userId: string | null, mbti: string) =>
      [...queryKeys.mbtiProfile.all(userId), 'detail', mbti] as const,
  },
  characterMatch: {
    all: (userId: string | null) =>
      [...queryKeys.auth.user(userId), 'character-match'] as const,
    detail: (userId: string | null, mbti: string, workId: string) =>
      [
        ...queryKeys.characterMatch.all(userId),
        'detail',
        mbti,
        workId,
      ] as const,
  },
  compatibility: {
    all: (userId: string | null) =>
      [...queryKeys.auth.user(userId), 'compatibility'] as const,
    detail: (userId: string | null, id: string) =>
      [...queryKeys.compatibility.all(userId), 'detail', id] as const,
  },
} as const;
