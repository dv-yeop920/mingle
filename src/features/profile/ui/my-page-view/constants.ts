type MockStat = {
  icon: string;
  label: string;
  value: string | number;
};

const MOCK_STATS: MockStat[] = [
  { icon: '\u{1F9EA}', label: '총 테스트 수', value: 12 },
  { icon: '\u{1F465}', label: '분석한 그룹', value: 8 },
  { icon: '\u{2B50}', label: '최고 케미 점수', value: '92%' },
];

type MockMenuItem = {
  label: string;
  href: string;
};

const MOCK_MENU_ITEMS: MockMenuItem[] = [
  { label: '설정', href: '/settings' },
  { label: '공지사항', href: '/notice' },
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
];

export { MOCK_MENU_ITEMS, MOCK_STATS };
