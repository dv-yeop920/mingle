type Stat = {
  label: string;
  value: string | number;
};

type MyPageViewProps = {
  nickname: string;
  mbti: string | null;
  stats: Stat[];
  onSettingsClick?: () => void;
  onLogout?: () => void;
  onMenuClick?: (href: string) => void;
  className?: string;
};

export type { MyPageViewProps, Stat };
