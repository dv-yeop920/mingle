import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

type SettingsFormProps = {
  userId: string;
  nickname: string;
  mbti: string | null;
  gender: Gender | null;
  onMbtiChange?: (mbti: MbtiType) => void;
  onGenderChange?: (gender: Gender) => void;
  onLogout?: () => void;
  redirectTo?: string;
  isProfileRequired?: boolean;
  className?: string;
};

export type { SettingsFormProps };
