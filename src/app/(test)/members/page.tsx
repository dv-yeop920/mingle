import type { Metadata } from 'next';

import { MemberSetupContainer } from '@/views/members';

export const instant = false;
export const metadata: Metadata = { title: '멤버 추가' };

const MembersPage = () => {
  return <MemberSetupContainer />;
};

export default MembersPage;
