import type { Metadata } from 'next';

import { SituationView } from '@/views/situation';

export const metadata: Metadata = { title: '상황 선택' };

const SituationPage = () => {
  return <SituationView />;
};

export default SituationPage;
