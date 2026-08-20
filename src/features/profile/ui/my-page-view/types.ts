type Stat = {
  icon: string;
  label: string;
  value: string | number;
};

type MyPageViewProps = {
  nickname: string;
  mbti: string | null;
  stats: Stat[];
  onSettingsClick?: () => void;
  className?: string;
};

export type { MyPageViewProps, Stat };
