'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { HomeAuthErrorContent } from './home-auth-error-content';

type HomeAuthErrorProps = {
  area: 'header' | 'recent-tests';
};

const HomeAuthError = ({ area }: HomeAuthErrorProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    if (isPending) return;

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <HomeAuthErrorContent
      variant={area}
      isPending={isPending}
      onRetry={handleRetry}
    />
  );
};

export { HomeAuthError };
