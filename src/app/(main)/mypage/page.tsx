import type { Metadata } from 'next';

import { MyPageContainerView } from '@/views/mypage';

const MyPage = () => {
  return <MyPageContainerView />;
};

export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};

export default MyPage;
