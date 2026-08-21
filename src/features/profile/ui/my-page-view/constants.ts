type MenuItem = {
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  href: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: '테스트 기록', description: '지금까지의 모든 결과 보기', icon: '🗂', iconBg: 'bg-primary-tonal', href: '/history' },
  { label: '내 그룹', description: '자주 쓰는 조합 저장하기', icon: '👥', iconBg: 'bg-info-surface', href: '/groups' },
  { label: '계정 설정', description: '닉네임 · 비밀번호 변경', icon: '⚙️', iconBg: 'bg-insight-surface', href: '/mypage/settings' },
];

export { MENU_ITEMS };
export type { MenuItem };
