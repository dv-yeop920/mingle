import type { Metadata } from 'next';

import { GroupTypeView } from '@/views/group-type';

export const metadata: Metadata = { title: '그룹 유형 선택' };

const GroupTypePage = () => {
  return <GroupTypeView />;
};

export default GroupTypePage;
