export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    detail: () => [...queryKeys.profile.all, 'detail'] as const,
    stats: () => [...queryKeys.profile.all, 'stats'] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: () => [...queryKeys.groups.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.groups.all, 'detail', id] as const,
  },
  analyses: {
    all: ['analyses'] as const,
    list: () => [...queryKeys.analyses.all, 'list'] as const,
    detail: (id: string) =>
      [...queryKeys.analyses.all, 'detail', id] as const,
  },
} as const;
