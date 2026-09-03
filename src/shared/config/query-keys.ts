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
} as const;
