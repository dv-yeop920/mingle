'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ToastProvider } from '@/shared/ui';

import {
  AnalysisResultSessionManager,
  MemberDraftSessionManager,
} from '@/features/test-flow';

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AnalysisResultSessionManager />
        <MemberDraftSessionManager />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

export { Providers };
