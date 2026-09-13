import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CompatibilityResultSessionManager } from '@/features/compatibility';
import {
  AnalysisResultSessionManager,
  MemberDraftSessionManager,
} from '@/features/test-flow';

import { MobileFrame } from '@/widgets/mobile-frame';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const TestLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MobileFrame>
      <Suspense fallback={null}>
        <AnalysisResultSessionManager />
        <CompatibilityResultSessionManager />
      </Suspense>
      <MemberDraftSessionManager />
      {children}
    </MobileFrame>
  );
};

export default TestLayout;
