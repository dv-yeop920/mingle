type MenuItem = {
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  href: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: '계정 설정', description: '닉네임 · 비밀번호 변경', icon: '⚙️', iconBg: 'bg-insight-surface', href: '/mypage/settings' },
];

export { MENU_ITEMS };
export type { MenuItem };
