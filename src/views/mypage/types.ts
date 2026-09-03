import type { Gender } from '@/shared/types/gender';

export type MyPageContainerViewProps = {
  userId: string;
  className?: string;
};

export type SettingsViewProps = {
  userId: string;
  nickname: string;
  mbti: string | null;
  gender: Gender | null;
  redirectTo?: string;
  isProfileRequired?: boolean;
  className?: string;
};
