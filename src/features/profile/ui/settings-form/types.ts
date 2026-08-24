import type { MbtiType } from '@/shared/types/mbti';

type SettingsFormProps = {
  nickname: string;
  mbti: string | null;
  onMbtiChange?: (mbti: MbtiType) => void;
  onLogout?: () => void;
  className?: string;
};

export type { SettingsFormProps };
