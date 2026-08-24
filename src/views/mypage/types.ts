import type { Gender } from '@/shared/types/gender';

export type MyPageContainerViewProps = {
  className?: string;
};

export type SettingsViewProps = {
  nickname: string;
  mbti: string | null;
  gender: Gender | null;
  redirectTo?: string;
  isProfileRequired?: boolean;
  className?: string;
};
