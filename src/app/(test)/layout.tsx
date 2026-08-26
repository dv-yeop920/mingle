import type { Metadata } from 'next';

import { MobileFrame } from '@/widgets/mobile-frame';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const TestLayout = ({ children }: { children: React.ReactNode }) => {
  return <MobileFrame>{children}</MobileFrame>;
};

export default TestLayout;
