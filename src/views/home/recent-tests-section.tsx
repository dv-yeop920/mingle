'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { analysesQueryOptions } from '@/entities/analysis';

import { RecentTests } from '@/features/home';

const RecentTestsSection = () => {
  const { data: analyses } = useSuspenseQuery(analysesQueryOptions());

  return <RecentTests analyses={analyses ?? []} />;
};

export { RecentTestsSection };
