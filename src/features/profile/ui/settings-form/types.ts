type SettingsFormProps = {
  nickname: string;
  mbti: string | null;
  onMbtiChange?: () => void;
  onLogout?: () => void;
  className?: string;
};

export type { SettingsFormProps };
