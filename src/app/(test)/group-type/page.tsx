import type { Metadata } from 'next';

import { GroupTypeContainer } from '@/views/group-type';

export const instant = false;
export const metadata: Metadata = { title: '그룹 유형 선택' };

const GroupTypePage = () => {
  return <GroupTypeContainer />;
};

export default GroupTypePage;
