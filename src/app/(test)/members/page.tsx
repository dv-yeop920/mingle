import type { Metadata } from 'next';

import { MemberSetupView } from '@/views/members';

export const metadata: Metadata = { title: '멤버 추가' };

const MembersPage = () => {
  return <MemberSetupView />;
};

export default MembersPage;
