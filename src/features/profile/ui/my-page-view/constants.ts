type MenuItem = {
  label: string;
  href: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: '설정', href: '/settings' },
  { label: '공지사항', href: '/notice' },
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
];

export { MENU_ITEMS };
