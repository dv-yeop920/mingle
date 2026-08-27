import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AnalysisResultSessionManager } from '@/features/test-flow';

import { MobileFrame } from '@/widgets/mobile-frame';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MobileFrame>
      <Suspense fallback={null}>
        <AnalysisResultSessionManager />
      </Suspense>
      {children}
    </MobileFrame>
  );
};

export default AuthLayout;
